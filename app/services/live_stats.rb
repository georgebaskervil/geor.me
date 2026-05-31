# frozen_string_literal: true

# Process-wide live stats cache. Ticks on an Iodine timer (non-blocking) and pushes
# updates through Action Cable so WebSocket connections do not hold Rack threads.
module LiveStats
  TICK_INTERVAL = 60
  TICK_CHECK_MS = 1000

  class << self
    def snapshot
      tick_if_due!
      @snapshot ||= build_snapshot
    end

    def build_snapshot
      now = Time.zone.now
      duration = now - site_start
      years = (duration / (86_400 * 365)).to_i
      remaining_days = duration % (86_400 * 365)
      months = (remaining_days / (86_400 * 30)).to_i
      days = ((remaining_days % (86_400 * 30)) / 86_400).to_i

      {
        time_since: { years: years, months: months, days: days },
        current_day: now.to_date.strftime("%A"),
        timestamp: now.iso8601,
        next_poll_seconds: next_tick_interval_seconds
      }
    end

    def tick_if_due!
      ensure_state!
      now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      due = false

      @mutex.synchronize do
        if now >= @next_tick_mono
          due = true
          @next_tick_mono = now + next_tick_interval_seconds
        end
      end

      return unless due

      publish_snapshot_if_changed!(build_snapshot)
    end

    def publish_snapshot_if_changed!(snapshot)
      @snapshot = snapshot
      return if @last_broadcast_display == display_fields(snapshot)

      @last_broadcast_display = display_fields(snapshot)
      broadcast_snapshot!
    end

    def broadcast_snapshot!
      ActionCable.server.broadcast(LiveStatsChannel::STREAM_NAME, cable_payload(@snapshot))
    end

    def cable_payload(snapshot)
      {
        time_since: snapshot[:time_since],
        current_day: snapshot[:current_day],
        timestamp: snapshot[:timestamp]
      }
    end

    def display_fields(snapshot)
      {
        time_since: snapshot[:time_since],
        current_day: snapshot[:current_day]
      }
    end

    def reset_state!
      @mutex = nil
      @snapshot = nil
      @last_broadcast_display = nil
      @next_tick_mono = nil
    end

    def next_tick_interval_seconds
      now = Time.zone.now
      next_minute = now.beginning_of_minute + TICK_INTERVAL
      next_midnight = now.beginning_of_day + 1.day
      [(next_minute - now), (next_midnight - now), TICK_INTERVAL].min.to_f.clamp(1.0, TICK_INTERVAL.to_f)
    end

    private

    def ensure_state!
      @mutex ||= Mutex.new
      @snapshot ||= build_snapshot
      @next_tick_mono ||= Process.clock_gettime(Process::CLOCK_MONOTONIC)
    end

    def site_start
      Time.zone.local(2019, 5, 7)
    end
  end
end
