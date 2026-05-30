# frozen_string_literal: true

require 'bundler/plugin/api'

# Automatic age gate enforcement before bundle install
Bundler::Plugin::API.hook('before-install-all') do |_dependencies|
  next if ENV['BUNDLER_AGE_GATE_RAN'] == '1'

  ENV['BUNDLER_AGE_GATE_RAN'] = '1'
  abort 'Gem age gate failed - bundle install blocked' unless system(Gem.ruby, File.join(Bundler.root, 'scripts/gem-age-gate.rb'))
end
