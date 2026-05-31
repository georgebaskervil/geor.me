# frozen_string_literal: true

require "test_helper"

class LiveStatsTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup { LiveStats.reset_state! }
  teardown { LiveStats.reset_state! }

  test "publish_snapshot_if_changed broadcasts only when display fields change" do
    first = LiveStats.build_snapshot
    LiveStats.publish_snapshot_if_changed!(first)

    assert_equal 1, broadcasts(LiveStatsChannel::STREAM_NAME).size
    assert_equal LiveStats.cable_payload(first), broadcasts(LiveStatsChannel::STREAM_NAME).last

    stale_timestamp = first.merge(
      timestamp: 1.hour.from_now.iso8601,
      next_poll_seconds: 30.0
    )
    LiveStats.publish_snapshot_if_changed!(stale_timestamp)

    assert_equal 1, broadcasts(LiveStatsChannel::STREAM_NAME).size

    new_day = first.merge(current_day: "Monday")
    LiveStats.publish_snapshot_if_changed!(new_day)

    assert_equal 2, broadcasts(LiveStatsChannel::STREAM_NAME).size
    assert_equal "Monday", broadcasts(LiveStatsChannel::STREAM_NAME).last["current_day"]
  end
end
