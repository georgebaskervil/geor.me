Rails.application.routes.draw do
  get "/taskstack", to: "taskstack#index"
  get "/neudec", to: "neudec#index"
  get "/eclecticonapps", to: "eclecticonapps#index"
  get "/waveformer", to: "waveformer#index"
  get "/trigonometrica", to: "trigonometrica#index"
  get "/transformer", to: "transformer#index"
  get "/factorizer", to: "factorizer#index"
  get "/standingwaves", to: "standingwaves#index"
  get "/spherium", to: "spherium#index"
  get "/soundsnipper", to: "soundsnipper#index"
  get "/soundanalyser", to: "soundanalyser#index"
  get "/slope", to: "slope#index"
  get "/shm", to: "shm#index"
  get "/quadratica", to: "quadratica#index"
  get "/projectile", to: "projectile#index"
  get "/poweraid", to: "poweraid#index"
  get "/orbits", to: "orbits#index"
  get "/normalstats", to: "normalstats#index"
  get "/movie2xyt", to: "movie2xyt#index"
  get "/momentum", to: "momentum#index"
  get "/matrixtransformations", to: "matrixtransformations#index"
  get "/julia", to: "julia#index"
  get "/integra", to: "integra#index"
  get "/insult", to: "insult#index"
  get "/inequalityplotter", to: "inequalityplotter#index"
  get "/harmonograph", to: "harmonograph#index"
  get "/guitemplate", to: "guitemplate#index"
  get "/gradientor", to: "gradientor#index"
  get "/forces", to: "forces#index"
  get "/fgraph", to: "fgraph#index"
  get "/eyam", to: "eyam#index"
  get "/encryptor", to: "encryptor#index"
  get "/edemo", to: "edemo#index"
  get "/diffractor", to: "diffractor#index"
  get "/coloursquare", to: "coloursquare#index"
  get "/cipher", to: "cipher#index"
  get "/binomilator", to: "binomilator#index"
  get "/bayesometer", to: "bayesometer#index"
  get "/streaming/gta_optimised_video", to: "videos#gta_optimised", defaults: { format: :m3u8 }
  get "/streaming/mc_optimised_video", to: "videos#mc_optimised", defaults: { format: :m3u8 }
  get "/streaming/soapcarving_optimised_video", to: "videos#soapcarving_optimised", defaults: { format: :m3u8 }
  get "/streaming/subwaysurfers_optimised_video", to: "videos#subwaysurfers_optimised", defaults: { format: :m3u8 }
  get "/streaming/georlist_video", to: "videos#georlist", defaults: { format: :m3u8 }
  get "/streaming/libreverse_video", to: "videos#libreverse", defaults: { format: :m3u8 }
  get "/streaming/robustext_video", to: "videos#robustext", defaults: { format: :m3u8 }
  get "/streaming/spaceshooter_video", to: "videos#spaceshooter", defaults: { format: :m3u8 }
  get "/streaming/taskstack_video", to: "videos#taskstack", defaults: { format: :m3u8 }
  get "/streaming/uwuifier_video", to: "videos#uwuifier", defaults: { format: :m3u8 }
  get "/streaming/home_control_panel_video", to: "videos#home_control_panel", defaults: { format: :m3u8 }
  get "/neudec", to: "neudec#index"
  get "/doomdisclaimer", to: "doomdisclaimer#index"
  get "/posts", to: "posts#index"
  get "/posts/:id", to: "posts#show", as: :post
  get "/images", to: "images#index"
  get "/legal", to: "legal#index"
  get "/miscellaneous", to: "miscellaneous#index"
  get "/waveform", to: "waveform#index"
  get "/privacy", to: "privacy#index"
  get "/licensing", to: "licensing#index"
  get "/credits", to: "credits#index"
  get "/data", to: "data#index"
  get "/dmca", to: "dmca#index"

  # Proxy routes for analytics and other functionality requiring specific headers
  get "/umami/script.js", to: "proxy#umami_script"

  # Home Control Panel routes
  get "/homecontrolpanel", to: "home_control#index"
  get "/homecontrolpanel/manage", to: "home_control#manage"

  root "homepage#index"

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # API routes for live updates
  namespace :api do
    namespace :v1 do
      get "stats/request_count", to: "stats#request_count"
      get "stats/time_since", to: "stats#time_since"
      get "stats/current_day", to: "stats#current_day"
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
