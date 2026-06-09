# frozen_string_literal: true

require "aws-sdk-s3"

class B2AssetsStorage
  ENDPOINT = ENV.fetch("B2_ASSETS_ENDPOINT", "https://s3.us-east-005.backblazeb2.com")
  BUCKET = ENV.fetch("B2_ASSETS_BUCKET", "geor-me-assets")
  REGION = ENV.fetch("B2_ASSETS_REGION", "us-east-005")
  PREFIX = "vite"
  MANIFEST_KEEP_PATTERN = %r{\A\.vite/manifest(-assets)?\.json\z}.freeze

  class << self
    def configured?
      ENV["B2_ASSETS_KEY_ID"].present? && ENV["B2_ASSETS_SECRET"].present?
    end

    def enabled?
      cast_boolean(ENV.fetch("VITE_ASSETS_B2_ENABLED", Rails.env.production?))
    end

    def cast_boolean(value)
      value = value.to_s.downcase
      %w[1 true yes on].include?(value)
    end

    def object_key(relative_path)
      "#{PREFIX}/#{relative_path}"
    end

    def public_base_url
      ENV.fetch("B2_ASSETS_PUBLIC_URL", "https://#{BUCKET}.s3.#{REGION}.backblazeb2.com")
    end

    def public_object_url(path)
      "#{public_base_url}/#{object_key(path)}"
    end

    def vite_output_dir
      Rails.root.join("public/vite")
    end

    def upload_vite_output!
      unless configured?
        warn "[vite:upload_to_b2] skipped — B2 credentials not configured"
        return false
      end

      unless vite_output_dir.directory?
        warn "[vite:upload_to_b2] skipped — #{vite_output_dir} not found"
        return false
      end

      resource = Aws::S3::Resource.new(client: client)
      bucket = resource.bucket(BUCKET)
      uploaded = 0
      skipped = 0
      keys = []

      Dir.glob(vite_output_dir.join("**/*")).sort.each do |absolute|
        next unless File.file?(absolute)

        relative = Pathname.new(absolute).relative_path_from(vite_output_dir).to_s
        next if relative.start_with?(".vite/")

        key = object_key(relative)
        keys << key
        local_size = File.size(absolute)

        if skip_upload?(key, local_size)
          skipped += 1
          next
        end

        bucket.object(key).upload_file(absolute)
        uploaded += 1
      end

      pruned = prune_stale_objects!(keys)

      puts "[vite:upload_to_b2] uploaded #{uploaded}, skipped #{skipped}, pruned #{pruned} — s3://#{BUCKET}/#{PREFIX}/"
      true
    end

    def strip_from_image!(root: vite_output_dir, full_image: nil)
      full_image = root == vite_output_dir if full_image.nil?
      removed = 0

      if root.directory?
        Dir.glob(root.join("**/*")).sort.reverse_each do |absolute|
          next unless File.file?(absolute)

          relative = Pathname.new(absolute).relative_path_from(root).to_s
          next if relative.match?(MANIFEST_KEEP_PATTERN)

          FileUtils.rm(absolute)
          removed += 1
        end

        Dir.glob(root.join("**/*")).sort.reverse_each do |absolute|
          FileUtils.rmdir(absolute) if File.directory?(absolute)
        rescue Errno::ENOTEMPTY, Errno::ENOENT
          nil
        end
      end

      if full_image
        node_modules = Rails.root.join("node_modules")
        if node_modules.directory?
          FileUtils.rm_rf(node_modules)
          puts "[vite:strip_from_image] removed node_modules"
        end

        Dir.glob(Rails.root.join("app/videos/**/*.m2ts")).each do |video|
          FileUtils.rm(video)
          removed += 1
        end
      end

      puts "[vite:strip_from_image] removed #{removed} vite/media files (manifests kept)"
      true
    end

    def client
      @client ||= Aws::S3::Client.new(
        endpoint: ENDPOINT,
        region: REGION,
        access_key_id: ENV.fetch("B2_ASSETS_KEY_ID"),
        secret_access_key: ENV.fetch("B2_ASSETS_SECRET"),
        force_path_style: false
      )
    end

    private

    def skip_upload?(key, local_size)
      head = client.head_object(bucket: BUCKET, key: key)
      head.content_length == local_size
    rescue Aws::S3::Errors::NotFound
      false
    end

    def prune_stale_objects!(keep_keys)
      keep = keep_keys.to_set
      deleted = 0
      continuation_token = nil

      loop do
        response = client.list_objects_v2(
          bucket: BUCKET,
          prefix: "#{PREFIX}/",
          continuation_token: continuation_token
        )

        Array(response.contents).each do |item|
          next if keep.include?(item.key)

          client.delete_object(bucket: BUCKET, key: item.key)
          deleted += 1
        end

        break unless response.is_truncated

        continuation_token = response.next_continuation_token
      end

      deleted
    end
  end
end
