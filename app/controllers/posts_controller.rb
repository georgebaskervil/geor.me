# frozen_string_literal: true

class PostsController < ApplicationController
  SLUG_PATTERN = /\A[a-zA-Z0-9._-]+\z/

  def index
    # @all_posts populated in ApplicationController
  end

  def show
    if @article && @article[:format] == :pdf
      send_article_file(@article[:file_path])
    else
      super
    end
  end

  def file
    identifier = params[:id].to_s
    unless safe_post_identifier?(identifier)
      return render plain: "File not found", status: :not_found
    end

    article = @articles.find { |a| a[:slug] == identifier }
    return render plain: "File not found", status: :not_found unless article

    send_article_file(article[:file_path])
  end

  private

  def send_article_file(path)
    safe_path = safe_articles_file_path(path)
    return render plain: "File not found", status: :not_found unless safe_path

    content_type = Rack::Mime.mime_type(File.extname(safe_path)) || "application/octet-stream"
    send_file safe_path, type: content_type, disposition: "inline"
  end

  def safe_post_identifier?(identifier)
    identifier.present? &&
      identifier == File.basename(identifier) &&
      !identifier.include?("..") &&
      identifier.match?(SLUG_PATTERN)
  end
end
