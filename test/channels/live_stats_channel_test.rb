# frozen_string_literal: true

require "test_helper"

class LiveStatsChannelTest < ActionCable::Channel::TestCase
  tests LiveStatsChannel

  test "subscribes and streams live_stats" do
    subscribe

    assert subscription.confirmed?
    assert_has_stream LiveStatsChannel::STREAM_NAME

    snapshot = transmissions.last
    assert snapshot["time_since"].key?("years")
    assert snapshot.key?("current_day")
  end

  test "broadcast delivers snapshot to subscribers" do
    subscribe

    payload = LiveStats.cable_payload(LiveStats.snapshot)
    LiveStats.broadcast_snapshot!

    assert_broadcast_on(LiveStatsChannel::STREAM_NAME, payload)
  end
end
