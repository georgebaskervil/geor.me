# frozen_string_literal: true

# Toggle Rails static file server depending on reverse proxy presence.
# Iodine can serve static files natively, but we keep Rails public_file_server for middleware compatibility.

def behind_reverse_proxy?
  ENV.key?("DYNO") || # Heroku
    ENV.key?("RAILWAY_ENVIRONMENT") ||
    ENV.key?("RENDER") ||
    ENV.key?("FLY_APP_NAME") ||
    ENV.key?("GITPOD_WORKSPACE_ID")
end

Rails.application.config.after_initialize do
  if Rails.env.production?
    enable_static = !behind_reverse_proxy?
    Rails.application.config.public_file_server.enabled = enable_static
    Rails.logger.info "Static files via Rails public_file_server: #{enable_static ? 'enabled (no proxy detected)' : 'disabled (reverse proxy detected)'}"
  else
    Rails.application.config.public_file_server.enabled = true
  end
end
