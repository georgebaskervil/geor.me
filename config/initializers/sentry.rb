if Rails.env.production?
  Sentry.init do |config|
    config.dsn = "https://9037f39780e6400bac586d00e38790dc@app.glitchtip.com/12062"
    
    # GDPR-friendly server-side configuration
    config.before_send = lambda do |event, _hint|
      # Remove IP addresses and sensitive request data
      if event.request
        event.request.delete(:headers)
        event.request.delete(:cookies)
        event.request.delete(:data) if event.request[:data].is_a?(Hash)
      end
      
      # Remove user context
      event.user = {}
      
      # Keep minimal breadcrumbs for debugging context
      if event.breadcrumbs
        event.breadcrumbs.values = event.breadcrumbs.values.last(3) # Keep only last 3
        # Remove potentially sensitive breadcrumb data
        event.breadcrumbs.values.each do |breadcrumb|
          breadcrumb.delete(:data) if breadcrumb[:data].is_a?(Hash)
        end
      end
      
      event
    end
    
    # Minimal breadcrumbs - only essential ones
    config.breadcrumbs_logger = []
    
    # Disable performance monitoring
    config.traces_sample_rate = 0.0
    
    # Don't send environment variables or local variables
    config.send_default_pii = false
    
    # Limit stack trace length
    config.max_breadcrumbs = 3
  end
end
