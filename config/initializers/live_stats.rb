# frozen_string_literal: true

# Iodine schedules tick checks on its event loop (no blocking Rack thread / SSE loop).
Rails.application.config.after_initialize do
  next unless defined?(Iodine)
  next if Rails.env.test?

  Iodine.run_every(LiveStats::TICK_CHECK_MS) do
    LiveStats.tick_if_due!
  rescue StandardError => e
    Rails.logger.warn("LiveStats tick failed: #{e.message}")
  end
end
