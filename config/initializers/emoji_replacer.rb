class EmojiReplacer
  require "unicode"

  EMOJI_REGEX = /(?:\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)|[\u{1F1E6}-\u{1F1FF}]{2}/

  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, body = @app.call(env)

    if headers["Content-Type"]&.include?("text/html")

      new_body = ""
      body.each do |part|
        new_part = part.gsub(EMOJI_REGEX) do |emoji|
          # Re-enable caching
          img_tag = Rails.cache.fetch(cache_key(emoji), expires_in: 12.hours) do
            build_img_tag(emoji)
          end

          if img_tag
            img_tag
          else
            Rails.logger.warn "EmojiReplacer: Failed to build img tag for emoji '#{emoji}'. Using original emoji."
            emoji
          end
        end

        new_body << new_part
      end

      # Update the body and Content-Length
      body = [ new_body ]
      headers["Content-Length"] = new_body.bytesize.to_s
    end

    # Return the modified response
    [ status, headers, body ]
  rescue StandardError => e
    Rails.logger.error "EmojiReplacer: Error processing request: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    [ 500, { "Content-Type" => "text/plain" }, [ "Internal Server Error" ] ]
  end

  private

  def cache_key(emoji)
    "emoji_replacer/#{emoji}"
  end

  def build_img_tag(emoji)
    codepoints = emoji.codepoints.reject { |cp| cp == 0xFE0F }.map { |cp| cp.to_s(16) }.join("-")

    svg_path = ViteRuby.instance.manifest.path_for("emoji/#{codepoints}.svg")

    if svg_path.blank?
      Rails.logger.warn "EmojiReplacer: SVG path not found for emoji '#{emoji}' with codepoints '#{codepoints}'."
      return emoji
    end

    %(<img src="#{svg_path}" alt="#{emoji}" class="emoji" loading="eager" decoding="sync" fetchpriority="low" draggable="false" tabindex="-1">)
  rescue StandardError => e
    Rails.logger.error "EmojiReplacer: Failed to build img tag for emoji '#{emoji}': #{e.message}"
    emoji
  end
end
