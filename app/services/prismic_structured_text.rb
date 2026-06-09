# frozen_string_literal: true

class PrismicStructuredText
  BLOCK_TAGS = {
    "heading1" => "h1",
    "heading2" => "h2",
    "heading3" => "h3",
    "heading4" => "h4",
    "heading5" => "h5",
    "heading6" => "h6",
    "paragraph" => "p",
    "list-item" => "li",
    "o-list-item" => "li"
  }.freeze

  def self.to_html(field)
    new(field).to_html
  end

  def self.to_plain_text(field)
    new(field).to_plain_text
  end

  def initialize(field)
    @blocks = field.is_a?(Hash) ? field["value"] || [] : []
  end

  def to_plain_text
    @blocks.map { |block| block["text"].to_s }.join(" ").strip
  end

  def to_html
    html = +""
    list_type = nil

    @blocks.each do |block|
      type = block["type"]
      tag = BLOCK_TAGS[type]

      if type == "list-item"
        if list_type != :ul
          html << "</ol>" if list_type == :ol
          html << "<ul>" if list_type != :ul
          list_type = :ul
        end
        html << "<li class=\"posts-text\">#{inline_html(block)}</li>"
        next
      end

      if type == "o-list-item"
        if list_type != :ol
          html << "</ul>" if list_type == :ul
          html << "<ol>" if list_type != :ol
          list_type = :ol
        end
        html << "<li class=\"posts-text\">#{inline_html(block)}</li>"
        next
      end

      if list_type == :ul
        html << "</ul>"
        list_type = nil
      elsif list_type == :ol
        html << "</ol>"
        list_type = nil
      end

      next unless tag

      html << "<#{tag} class=\"posts-text\">#{inline_html(block)}</#{tag}>"
    end

    html << "</ul>" if list_type == :ul
    html << "</ol>" if list_type == :ol
    html
  end

  private

  def inline_html(block)
    text = block["text"].to_s
    spans = block["spans"] || []
    return ERB::Util.html_escape(text) if spans.empty?

    parts = []
    cursor = 0

    spans.sort_by { |span| span["start"].to_i }.each do |span|
      start_at = span["start"].to_i
      end_at = span["end"].to_i
      next if start_at > text.length

      parts << ERB::Util.html_escape(text[cursor...start_at]) if start_at > cursor
      segment = ERB::Util.html_escape(text[start_at...end_at])
      parts << wrap_span(span, segment)
      cursor = end_at
    end

    parts << ERB::Util.html_escape(text[cursor..]) if cursor < text.length
    parts.join
  end

  def wrap_span(span, segment)
    case span["type"]
    when "hyperlink"
      url = span.dig("data", "url").to_s
      return segment if url.blank?

      %(<a href="#{ERB::Util.html_escape(url)}" class="posts-text">#{segment}</a>)
    when "strong"
      %(<strong>#{segment}</strong>)
    when "em"
      %(<em>#{segment}</em>)
    else
      segment
    end
  end
end
