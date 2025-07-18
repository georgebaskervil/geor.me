module Api
  module V1
  class StatsController < ApplicationController
  # Skip CSRF for API endpoints
  skip_before_action :verify_authenticity_token
  # Skip request counter for API endpoints
  skip_before_action :increment_request_counter

  def request_count
    count = HttpReqCounter.first&.count || 0
    render json: {
      count: count,
      timestamp: Time.current.iso8601
    }
  end

  def time_since
    site_start_date = Time.zone.local(2019, 5, 7)
    duration = Time.zone.now - site_start_date
    years = (duration / (86_400 * 365)).to_i
    remaining_days = duration % (86_400 * 365)
    months = (remaining_days / (86_400 * 30)).to_i
    days = ((remaining_days % (86_400 * 30)) / 86_400).to_i

    render json: {
      years: years,
      months: months,
      days: days,
      timestamp: Time.current.iso8601
    }
  end

  def current_day
    render json: {
      day: Time.zone.today.strftime("%A"),
      timestamp: Time.current.iso8601
    }
  end
  end
  end
end
