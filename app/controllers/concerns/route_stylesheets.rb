# frozen_string_literal: true

module RouteStylesheets
  extend ActiveSupport::Concern

  ECLECTICON_CONTROLLERS = %w[
    bayesometer binomilator cipher coloursquare diffractor edemo encryptor
    eyam fgraph forces gradientor guitemplate harmonograph inequalityplotter
    insult integra julia matrixtransformations momentum movie2xyt normalstats
    neudec orbits poweraid projectile quadratica shm slope soundanalyser
    soundsnipper spherium standingwaves factorizer transformer trigonometrica
    waveformer eclecticonapps spaceshooter
  ].freeze

  PAGE_ENTRIES = {
    "posts" => "page-posts",
    "images" => "page-images",
    "projects" => "page-projects",
    "legal" => "page-legal",
    "privacy" => "page-privacy",
    "data" => "page-data",
    "dmca" => "page-dmca",
    "licensing" => "page-licensing",
    "credits" => "page-credits",
    "miscellaneous" => "page-miscellaneous",
    "doomdisclaimer" => "page-doomdisclaimer",
    "waveform" => "page-waveform",
    "taskstack" => "page-taskstack",
    "robustext" => "page-robustext",
    "home_control" => "page-home-control"
  }.freeze

  included do
    before_action :assign_route_stylesheets
  end

  private

  def assign_route_stylesheets
    @route_stylesheet_entries = []

    if controller_name == "homepage"
      @route_stylesheet_entries << "entries/homepage.scss"
    end

    if ECLECTICON_CONTROLLERS.include?(controller_name)
      @route_stylesheet_entries << "entries/eclecticon.scss"
    end

    if (entry = PAGE_ENTRIES[controller_name])
      @route_stylesheet_entries << "entries/#{entry}.scss"
    end
  end
end
