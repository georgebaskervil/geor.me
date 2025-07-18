class VideosController < ApplicationController
  skip_before_action :increment_request_counter

  def gta_optimised
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def mc_optimised
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def soapcarving_optimised
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def subwaysurfers_optimised
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def georlist
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def libreverse
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def robustext
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def spaceshooter
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def taskstack
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def uwuifier
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end

  def home_control_panel
    respond_to do |format|
      format.m3u8 { render content_type: "application/x-mpegURL" }
    end
  end
end
