# frozen_string_literal: true

require "test_helper"

module Api
  module V1
    class StatsControllerTest < ActionDispatch::IntegrationTest
      test "live returns json snapshot fields" do
        get api_v1_stats_live_url

        assert_response :success
        body = response.parsed_body
        assert body.key?("time_since")
        assert body.key?("current_day")
        assert body.key?("timestamp")
        assert body.key?("next_poll_seconds")
        assert body["time_since"].key?("years")
      end

      test "time_since returns json snapshot fields" do
        get api_v1_stats_time_since_url

        assert_response :success
        body = response.parsed_body
        assert body.key?("years")
        assert body.key?("months")
        assert body.key?("days")
        assert body.key?("timestamp")
      end

      test "current_day returns json snapshot fields" do
        get api_v1_stats_current_day_url

        assert_response :success
        body = response.parsed_body
        assert body.key?("day")
        assert body.key?("timestamp")
      end
    end
  end
end
