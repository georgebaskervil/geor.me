# frozen_string_literal: true

require "English"
require "Etc"

# -- CPU core detection (favor physical cores where possible)
def hardware_cores
  case RUBY_PLATFORM
  when /linux/
    begin
      output = `lscpu`
      if $CHILD_STATUS.success?
        output.each_line do |line|
          # Physical cores per socket; approximate total by sockets * cores per socket if available
          next unless line =~ /^Core\(s\) per socket:\s+(\d+)/

          cores_per_socket = Regexp.last_match(1).to_i
          sockets = 1
          output.each_line do |l|
            sockets = Regexp.last_match(1).to_i if l =~ /^Socket\(s\):\s+(\d+)/
          end
          return [ cores_per_socket * sockets, 1 ].max
        end
      end
      if File.exist?("/proc/cpuinfo")
        logical = File.read("/proc/cpuinfo").scan(/^processor\s*:/).count
        return [ logical / 2, 1 ].max if logical.positive?
      end
    rescue StandardError => e
      warn("hardware_cores(linux) detection failed: #{e.class}: #{e.message}")
    end
  when /darwin/
    begin
      out = `sysctl -n hw.physicalcpu`
      return out.strip.to_i if $CHILD_STATUS.success?
    rescue StandardError => e
      warn("hardware_cores(darwin) detection failed: #{e.class}: #{e.message}")
    end
  when /win32|mingw|cygwin/
    begin
      out = `wmic cpu get NumberOfCores`
      if $CHILD_STATUS.success?
        out.each_line do |line|
          return line.to_i if /^\d+$/.match?(line.strip)
        end
      end
    rescue StandardError => e
      warn("hardware_cores(windows) detection failed: #{e.class}: #{e.message}")
    end
  end
  cores = Etc.nprocessors
  cores /= 2 if cores > 1
  [ cores, 1 ].max
end

# Detect common reverse-proxy platforms to decide static serving and SSL assumptions
def behind_reverse_proxy?
  ENV.key?("DYNO") || # Heroku
    ENV.key?("RAILWAY_ENVIRONMENT") || # Railway
    ENV.key?("RENDER") || # Render
    ENV.key?("FLY_APP_NAME") || # Fly.io
    ENV.key?("GITPOD_WORKSPACE_ID")
end

rails_env = ENV.fetch("RAILS_ENV") { ENV.fetch("RACK_ENV") { "development" } }

# Size Puma for I/O-bound workloads.
cpu = hardware_cores
# Scale to full hardware in all environments: workers = cores * 2 (min 2, no upper cap)
default_workers_prod = [ cpu * 2, 2 ].max
default_workers_dev  = [ cpu * 2, 2 ].max
min_threads = ENV.fetch("RAILS_MIN_THREADS") { 5 }.to_i
max_threads = ENV.fetch("RAILS_MAX_THREADS") { [ (cpu * 2) - 4, 5 ].max.clamp(5, 20) }.to_i

if %w[production development].include?(rails_env)
  env_override = begin
    Integer(ENV["WEB_CONCURRENCY"]) if ENV.key?("WEB_CONCURRENCY")
  rescue ArgumentError
    nil
  end
  workers_count = if rails_env == "development"
  # In dev, scale to full hardware by default; only honor positive overrides.
  env_override&.positive? ? env_override : default_workers_dev
  else
  env_override&.positive? ? env_override : default_workers_prod
  end
  workers workers_count if workers_count.positive?
end
threads min_threads, max_threads

port ENV.fetch("PORT") { 3000 }
environment rails_env

# Preload app for copy-on-write savings in clustered mode
preload_app!

# Reduce request timeouts but keep them reasonable for I/O
first_data_timeout 30 if respond_to?(:first_data_timeout)
worker_timeout 60 if respond_to?(:worker_timeout)

# Allow more headers/body like iodine tuning (handled by Rack middlewares generally)

lowlevel_error_handler do |ex, _env|
  warn "Puma lowlevel error: #{ex.class}: #{ex.message}\n#{ex.backtrace&.join("\n")}"
  [ 500, { "Content-Type" => "text/plain" }, [ "Internal Server Error" ] ]
end

on_worker_boot do
  # Enable YJIT in worker processes (after fork) for better CoW behavior
  if defined?(RubyVM::YJIT) && RubyVM::YJIT.respond_to?(:enable)
    begin
      needs_enable = !RubyVM::YJIT.respond_to?(:enabled?) || !RubyVM::YJIT.enabled?
      RubyVM::YJIT.enable if needs_enable
      Rails.logger.info "YJIT clause executed"
    rescue StandardError => e
      warn "YJIT enable failed: #{e.class}: #{e.message}"
    end
  end
  # Re-establish DB connection if using ActiveRecord
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

before_fork do
  # Hint to GC for copy-on-write
  GC.copy_on_write_friendly = true if GC.respond_to?(:copy_on_write_friendly=)
end

# Log summary
stdout_redirect ENV["PUMA_STDOUT"], ENV["PUMA_STDERR"], true if ENV["PUMA_STDOUT"] || ENV["PUMA_STDERR"]

plugin :tmp_restart
