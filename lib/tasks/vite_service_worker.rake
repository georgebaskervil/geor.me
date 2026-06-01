# frozen_string_literal: true

namespace :vite do
  desc "Copy Workbox service worker to public root for site-wide scope"
  task install_service_worker: :environment do
    vite_sw = Rails.root.join("public/vite/service-worker.js")
    root_sw = Rails.root.join("public/service-worker.js")

    unless vite_sw.exist?
      warn "[vite:install_service_worker] #{vite_sw} not found — run vite:build first"
      next
    end

    FileUtils.cp(vite_sw, root_sw)
    puts "[vite:install_service_worker] installed #{root_sw}"
  end
end

if Rake::Task.task_defined?("vite:build")
  Rake::Task["vite:build"].enhance do
    Rake::Task["vite:install_service_worker"].invoke
  end
end
