# frozen_string_literal: true

class ViteAssetsController < ApplicationController
  VITE_PATH_PATTERN = %r{\A[a-zA-Z0-9._/%-]+\z}.freeze

  skip_forgery_protection only: :show

  skip_before_action :load_images
  skip_before_action :load_articles
  skip_before_action :set_all_posts
  skip_before_action :set_latest_posts
  skip_before_action :set_article
  skip_before_action :assign_route_stylesheets
  skip_after_action :apply_automatic_caching

  def show
    path = params[:path].to_s
    return head :not_found unless safe_vite_path?(path)

    local_path = Rails.root.join("public/vite", path)
    if local_path.file?
      return send_file(
        local_path,
        disposition: "inline",
        type: Rack::Mime.mime_type(File.extname(path)) || "application/octet-stream"
      )
    end

    return head :not_found unless B2AssetsStorage.enabled?

    redirect_to B2AssetsStorage.public_object_url(path), allow_other_host: true, status: :found
  end

  private

  def safe_vite_path?(path)
    path.present? &&
      !path.include?("..") &&
      !path.start_with?("/") &&
      !path.include?("\0") &&
      path.match?(VITE_PATH_PATTERN) &&
      path.split("/").none? { |segment| segment.in?(%w[. ..]) }
  end
end
