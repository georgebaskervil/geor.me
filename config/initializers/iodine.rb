# frozen_string_literal: true

# Iodine setup — CLI flags override these when provided.
return unless defined?(Iodine)

Iodine.threads = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
Iodine.workers = ENV.fetch("WEB_CONCURRENCY", 1).to_i

if defined?(Rails) && Rails.env.development?
  Iodine::DEFAULT_SETTINGS[:port] = "3000"
  Iodine::DEFAULT_SETTINGS[:address] = "localhost"
elsif ENV["PORT"]
  Iodine::DEFAULT_SETTINGS[:port] = ENV.fetch("PORT")
end

Iodine.on_state(:enter_child) do
  next unless defined?(Rails) && Rails.env.production?

  if defined?(RubyVM::YJIT) && RubyVM::YJIT.respond_to?(:enable)
    needs_enable = !RubyVM::YJIT.respond_to?(:enabled?) || !RubyVM::YJIT.enabled?
    RubyVM::YJIT.enable if needs_enable
  end
end
