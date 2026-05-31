# frozen_string_literal: true

module Api
  module V1
    class StatsController < ApplicationController
      # Skip CSRF for API endpoints
      skip_before_action :verify_authenticity_token
      skip_before_action :set_custom_headers
      skip_before_action :load_images
      skip_before_action :load_articles
      skip_before_action :set_all_posts
      skip_before_action :set_latest_posts
      skip_before_action :set_article

      def live
        render json: LiveStats.snapshot
      end

      def time_since
        snapshot = LiveStats.snapshot
        render json: snapshot[:time_since].merge(timestamp: snapshot[:timestamp])
      end

      def current_day
        snapshot = LiveStats.snapshot
        render json: {
          day: snapshot[:current_day],
          timestamp: snapshot[:timestamp]
        }
      end
    end
  end
end
