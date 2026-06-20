# frozen_string_literal: true

module ApplicationHelper
  include BetterHtml::Helpers

  def domain
    "geor.me"
  end

  def theme_color
    "#161820"
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

  # Manifest path without asset_host — required for SVG feImage (Safari rejects cross-origin CDN URLs).
  def same_origin_vite_asset_path(name, **options)
    ViteRuby.instance.manifest.path_for(name, **options)
  end
end
