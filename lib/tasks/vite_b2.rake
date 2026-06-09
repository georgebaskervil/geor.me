# frozen_string_literal: true

namespace :vite do
  desc "Upload public/vite output to Backblaze B2 and strip bulky files on success"
  task upload_to_b2: :environment do
    if B2AssetsStorage.upload_vite_output!
      Rake::Task["vite:strip_from_image"].invoke
    end
  end

  desc "Remove bulky vite output from the image after B2 upload"
  task strip_from_image: :environment do
    B2AssetsStorage.strip_from_image!
  end
end
