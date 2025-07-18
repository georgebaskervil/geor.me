# frozen_string_literal: true

require "json"

class WhitespaceCompressor
  def initialize(app)
    @app = app
    # Compile Ruby regex patterns once during initialization
    @preserve_pattern = %r{(<textarea>[\s\S]*?</textarea>|<pre>[\s\S]*?</pre>|<script>[\s\S]*?</script>|<iframe>[\s\S]*?</iframe>)}
    @pattern_comments = /<!--[\s\S]*?-->/
    @pattern_between_tags = />\s+</
    @pattern_spaces = /\s{2,}/
    @pattern_attr_eq = /(<[^>]*?)\s*=\s*([^>]*>)/
    @pattern_attr_sp = /(<[^>]*?)\s{2,}([^>]*>)/
  end

  def call(env)
    status, headers, body = @app.call(env)
    return [ status, headers, body ] unless headers["Content-Type"]&.include?("text/html")

    # Step 1: Assemble HTML efficiently
    chunks = []
    body.each { |chunk| chunks << chunk.encode("UTF-8", invalid: :replace, undef: :replace) }
    html = chunks.join

    # Step 2: Split into preserve and non-preserve parts
    parts = html.split(@preserve_pattern, -1)

    # Step 3: Process only non-preserve parts
    i = 0
    len = parts.length
    while i < len
      unless i.odd?
        part = parts[i]
        part = part.gsub(@pattern_comments, "")
        part = part.gsub(@pattern_between_tags, "><")
        part = part.gsub(@pattern_spaces, " ")
        part = part.gsub(@pattern_attr_eq, '\1=\2')
        part = part.gsub(@pattern_attr_sp, '\1 \2')
        parts[i] = part
      end
      i += 1
    end

    # Step 4: Reassemble HTML
    html = parts.join

    # Step 5: Minify JSON-LD scripts
    html = minify_jsonld_scripts(html)

    # Step 6: Update headers and return response
    headers["Content-Length"] = html.bytesize.to_s
    headers.delete("Content-Encoding")
    [ status, headers, [ html ] ]
  end

  private

  # Minify JSON-LD scripts by parsing and re-serializing JSON content
  def minify_jsonld_scripts(html)
    html.gsub(%r{<script[^>]*type=["']application/ld\+json["'][^>]*>([\s\S]*?)</script>}i) do
      full_match = Regexp.last_match(0)
      json_content = Regexp.last_match(1)
      script_opening = full_match[/<script[^>]*>/i]
      script_closing = "</script>"

      begin
        # Remove CDATA wrapper if present
        clean_content = json_content.gsub(/^\s*<!\[CDATA\[(.*?)\]\]>\s*$/m, '\1')

        # Clean up the content - remove extra whitespace but preserve the JSON structure
        clean_content = clean_content.strip

        # Only process if it looks like JSON (starts with { or [)
        if clean_content.start_with?("{", "[")
          # Parse and re-serialize JSON to remove whitespace
          parsed_json = JSON.parse(clean_content)
          minified_json = JSON.generate(parsed_json)

          # Return the complete script tag with minified JSON
          "#{script_opening}#{minified_json}#{script_closing}"
        else
          # If it doesn't look like JSON, return original
          full_match
        end
      rescue JSON::ParserError
        # If JSON is invalid, return original script tag unchanged
        full_match
      end
    end
  end
end
