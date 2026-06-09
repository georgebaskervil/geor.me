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

    result = b2_proxy.fetch(path, range: request.headers["Range"])
    return head :not_found if result.nil?
    return head :bad_gateway if result == :bad_gateway

    result.headers.each { |name, value| response.headers[name] = value }
    self.status = result.status
    self.response_body = result.body
  end

  private

  def b2_proxy
    @b2_proxy ||= B2AssetProxy.new
  end

  def safe_vite_path?(path)
    path.present? &&
      !path.include?("..") &&
      !path.start_with?("/") &&
      !path.include?("\0") &&
      path.match?(VITE_PATH_PATTERN) &&
      path.split("/").none? { |segment| segment.in?(%w[. ..]) }
  end
end
