# frozen_string_literal: true

require "test_helper"

class PrismicStructuredTextTest < ActiveSupport::TestCase
  test "renders headings and paragraphs with posts-text class" do
    field = {
      "value" => [
        { "type" => "heading1", "text" => "Title", "spans" => [] },
        { "type" => "paragraph", "text" => "Body copy", "spans" => [] }
      ]
    }

    html = PrismicStructuredText.to_html(field)

    assert_includes html, '<h1 class="posts-text">Title</h1>'
    assert_includes html, '<p class="posts-text">Body copy</p>'
  end

  test "renders hyperlinks from spans" do
    field = {
      "value" => [
        {
          "type" => "paragraph",
          "text" => "Read more",
          "spans" => [
            { "start" => 0, "end" => 9, "type" => "hyperlink", "data" => { "url" => "https://example.com" } }
          ]
        }
      ]
    }

    html = PrismicStructuredText.to_html(field)

    assert_includes html, 'href="https://example.com"'
    assert_includes html, "Read more"
  end
end
