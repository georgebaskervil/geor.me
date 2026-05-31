# frozen_string_literal: true

# Action Cable permessage-deflate: tune for fast compress/inflate on small JSON frames
# (live stats, cable pings), not maximum wire savings.
require "permessage_deflate"

module ActionCable
  module Connection
    class ClientSocket
      alias original_initialize initialize

      def initialize(env, event_target, event_loop, protocols)
        original_initialize(env, event_target, event_loop, protocols)

        deflate = PermessageDeflate.configure(
          level: Zlib::BEST_SPEED,
          mem_level: Zlib::MAX_MEM_LEVEL,
          strategy: Zlib::HUFFMAN_ONLY,
          no_context_takeover: true,
          request_no_context_takeover: true,
          max_window_bits: 11,
          request_max_window_bits: 11
        )
        @driver.add_extension(deflate)
        Rails.logger.info(
          "ActionCable permessage-deflate: level=#{Zlib::BEST_SPEED} " \
          "mem_level=#{Zlib::MAX_MEM_LEVEL} strategy=HUFFMAN_ONLY window_bits=11 " \
          "no_context_takeover=true"
        )
      rescue StandardError => e
        Rails.logger.error "ActionCable permessage-deflate setup failed: #{e.message}"
        raise
      end
    end
  end
end
