# config/initializers/better_html.rb
BetterHtml.config = BetterHtml::Config.new(
  YAML.load_file(Rails.root.join(".better-html.yml"), permitted_classes: [ Regexp ])
)
