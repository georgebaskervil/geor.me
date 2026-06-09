# frozen_string_literal: true

class PostsController < ApplicationController
  SLUG_PATTERN = /\A[a-zA-Z0-9._-]+\z/

  def index
    # @all_posts populated in ApplicationController
  end

  def show
    if @article && @article[:format] == :pdf
      redirect_to_pdf(@article[:file_url])
    else
      super
    end
  end

  def file
    identifier = params[:id].to_s
    return render plain: "File not found", status: :not_found unless safe_post_identifier?(identifier)

    article = @articles.find { |a| a[:slug] == identifier }
    return render plain: "File not found", status: :not_found unless article&.dig(:file_url)

    redirect_to_pdf(article[:file_url])
  end

  private

  def redirect_to_pdf(url)
    return render plain: "File not found", status: :not_found if url.blank?

    redirect_to url, allow_other_host: true
  end

  def safe_post_identifier?(identifier)
    identifier.present? &&
      identifier == File.basename(identifier) &&
      !identifier.include?("..") &&
      identifier.match?(SLUG_PATTERN)
  end
end
