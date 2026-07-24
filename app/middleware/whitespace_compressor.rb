# frozen_string_literal: true

class WhitespaceCompressor
  def initialize(app)
    @app = app
    # Compile Ruby regex patterns once during initialization
    # Case-insensitive so e.g. <SCRIPT> is preserved (CodeQL rb/bad-tag-filter).
    @preserve_pattern = %r{(<textarea>[\s\S]*?</textarea>|<pre>[\s\S]*?</pre>|<script>[\s\S]*?</script>|<iframe>[\s\S]*?</iframe>)}i
    @pattern_comments = /<!--[\s\S]*?-->/
    @pattern_between_tags = />\s+</
    @pattern_spaces = /\s{2,}/
    @pattern_attr_eq = /(<[^>]*?)\s*=\s*([^>]*>)/
    @pattern_attr_sp = /(<[^>]*?)\s{2,}([^>]*>)/
  end

  def call(env)
    status, headers, body = @app.call(env)
    return [ status, headers, body ] unless headers["Content-Type"]&.include?("text/html")
    return [ status, headers, body ] if env["PATH_INFO"] == "/robustext-embed.html"

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

    # Step 4: Reassemble HTML and return response
    html = parts.join

    headers["Content-Length"] = html.bytesize.to_s
    headers.delete("Content-Encoding")
    [ status, headers, [ html ] ]
  end
end
