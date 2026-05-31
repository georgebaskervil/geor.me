# frozen_string_literal: true

class LiveStatsChannel < ApplicationCable::Channel
  STREAM_NAME = "live_stats"

  def subscribed
    stream_from STREAM_NAME
    transmit LiveStats.cable_payload(LiveStats.snapshot)
  end
end
