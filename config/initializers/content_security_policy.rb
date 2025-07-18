Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src   :self, :https, :data
    policy.img_src    :self, :https, :data
    policy.object_src :none
    policy.script_src :self, :https, :unsafe_inline, :unsafe_eval, :blob
    policy.style_src  :self, :https, :unsafe_inline
    policy.worker_src :self, :blob
    policy.connect_src :self, :https, :data

    # Allow @vite/client and Million Lint in development
    if Rails.env.development?
      policy.script_src(*policy.script_src, :unsafe_eval, "http://#{ViteRuby.config.host_with_port}")
      policy.connect_src(*policy.connect_src, "ws://#{ViteRuby.config.host_with_port}", "http://localhost:42423", "ws://localhost:42423")
    end

    policy.frame_src  :self, :https
    policy.media_src  :self, :blob
  end

  config.content_security_policy_report_only = false
end
