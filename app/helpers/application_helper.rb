module ApplicationHelper
  include BetterHtml::Helpers

  def domain
    "geor.me"
  end

  def base_url
    "https://#{domain}"
  end

  def homepage
    "#{base_url}/"
  end

  def theme_color
    "#161820"
  end

  def locale
    "en_GB"
  end

  def twitter_handle
    "@georgebaskervil"
  end

  def social_links
    [
      { name: "X", url: "https://x.com/georgebaskervil" },
      {
        name: "Signal",
        url:
          "https://signal.me/#eu/Ui1-KTmlgnCbNj491iq3HSOJtrkY1aVHm4n0v97dvkGDbCqWsExOu66Fzg7-7iC9"
      },
      { name: "GitHub", url: "https://github.com/georgebaskervil" }
    ]
  end

  def page_title(page_specific_title = nil)
    base_title = "George Baskerville's Personal Website"
    route_title = if page_specific_title.present?
      page_specific_title
    elsif request.path == "/"
      nil
    else
      request.path.split("/").reject(&:empty?).map(&:titleize).join(" - ")
    end

    route_title.present? ? "#{base_title} - #{route_title}" : base_title
  end

  def site_name
    "George Baskerville's Personal Website"
  end

  def page_specific_title(article = nil)
    if article.present? && article[:title].present?
      article[:title]
    elsif request.path == "/"
      nil
    else
      request.path.split("/").reject(&:empty?).map(&:titleize).join(" - ")
    end
  end

  def meta_description(article = nil)
    if article.present? && article[:description].present?
      article[:description]
    else
      "I'm George, a mad (computer) scientist. Here's my website."
    end
  end

  def meta_keywords(article = nil)
    base_keywords = %w[George Baskerville geor.me personal website programming]
    if article.present?
      # Add article-specific keywords
      article_keywords = article[:tags] || []
      base_keywords + article_keywords
    else
      current_section = request.path.split("/").reject(&:empty?).first
      base_keywords + [ current_section ].compact
    end.join(", ")
  end

  def meta_image
    # Use a fixed default image since preview images will be generated programmatically in the future
    vite_asset_path("~/images/site-screenshot.png")
  end

  def page_name(article = nil)
    if article.present?
      "George Baskerville - #{article[:title]}"
    else
      current_page_title = yield(:page_title).presence
      "George Baskerville#{current_page_title.present? ? " - #{current_page_title}" : ''}"
    end
  end

  def article_published_date(article = nil)
    article&.dig(:published_at)&.iso8601 if article.present?
  end

  def article_modified_date(article = nil)
    article&.dig(:updated_at)&.iso8601 if article.present?
  end

  def article_author(article = nil)
    article&.dig(:author) || "George Baskerville"
  end

  def page_type(article = nil)
    if article.present?
      "article"
    else
      "website"
    end
  end

  def canonical_url(article = nil)
    base_url = "https://geor.me"
    if article.present? && article[:slug].present?
      "#{base_url}/posts/#{article[:slug]}"
    else
      "#{base_url}#{request.path}"
    end
  end

  def article_section(article = nil)
    if article.present? && article[:section].present?
      article[:section]
    elsif request.path.start_with?("/posts")
      "Blog"
    else
      request.path.split("/").reject(&:empty?).first&.titleize
    end
  end

  def article_tags(article = nil)
    return [] if article.blank?

    article[:tags] || []
  end

  def article_metadata(article = nil)
    return {} if article.blank?

    {
      author: article_author(article),
      published_date: article_published_date(article),
      modified_date: article_modified_date(article),
      section: article_section(article),
      tags: article_tags(article),
      canonical_url: canonical_url(article),
      type: "article"
    }
  end
end
