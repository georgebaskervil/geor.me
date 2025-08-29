# frozen_string_literal: true

class PostsController < ApplicationController
  def index
    # @all_posts populated in ApplicationController
  end

  def file
    identifier = params[:id]
    article = @articles.find { |a| a[:slug] == identifier }
    return render plain: "File not found", status: :not_found unless article

    path = article[:file_path]
    return render plain: "File not found", status: :not_found unless File.exist?(path)

    # Stream the original file (PDF or MD) with the right content type
    content_type = Rack::Mime.mime_type(File.extname(path)) || "application/octet-stream"
    send_file path, type: content_type, disposition: "inline"
  end
end
