# frozen_string_literal: true

require "aws-sdk-s3"
require "net/http"

class B2AssetsStorage
  ENDPOINT = ENV.fetch("B2_ASSETS_ENDPOINT", "https://s3.us-east-005.backblazeb2.com")
  BUCKET = ENV.fetch("B2_ASSETS_BUCKET", "geor-me-assets")
  REGION = ENV.fetch("B2_ASSETS_REGION", "us-east-005")
  PREFIX = "vite"
  MANIFEST_KEEP_PATTERN = %r{\A\.vite/manifest(-assets)?\.json\z}.freeze
  # feImage in the CRT SVG filter must stay same-origin — Safari rejects cross-origin CDN URLs.
  CRT_DISPLACEMENT_KEEP_PREFIX = "assets/crt-displacement-map"

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
      ENV.fetch("B2_ASSETS_PUBLIC_URL", "https://geor-me-static.libreverse.io/file/#{BUCKET}")
    end

    def public_object_url(path)
      "#{public_base_url}/#{object_key(path)}"
    end

    # Manifest paths look like "/vite/assets/foo.js"; map to the public CDN URL.
    def cdn_url_for_manifest_path(manifest_path)
      return manifest_path unless cdn_urls?

      relative = manifest_path.to_s.delete_prefix("/vite/").delete_prefix("#{PREFIX}/")
      public_object_url(relative)
    end

    def cdn_urls?
      enabled? && !Rails.env.development? && !Rails.env.test?
    end

    def mime_type_for(relative_path)
      ext = File.extname(relative_path)
      Rack::Mime.mime_type(ext).presence || case ext.downcase
      when ".mjs" then "application/javascript"
      when ".m2ts" then "video/mp2t"
      when ".m3u8" then "application/vnd.apple.mpegurl"
      else "application/octet-stream"
      end
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

        if skip_upload?(key, local_size, relative)
          skipped += 1
          next
        end

        bucket.object(key).upload_file(absolute, content_type: mime_type_for(relative))
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
          next if keep_in_image?(relative)

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

    def test_connection!
      unless configured?
        warn "B2 not configured — set B2_ASSETS_KEY_ID and B2_ASSETS_SECRET"
        return false
      end

      key_id = ENV["B2_ASSETS_KEY_ID"].to_s
      puts "endpoint: #{ENDPOINT}"
      puts "bucket:   #{BUCKET}"
      puts "region:   #{REGION}"
      puts "key id:   #{key_id[0, 8]}… (#{key_id.length} chars)"

      client.list_objects_v2(bucket: BUCKET, prefix: "#{PREFIX}/", max_keys: 1)
      puts "list:     ok"

      test_key = "#{PREFIX}/_connection-test-#{Time.now.to_i}.txt"
      body = "geor.me b2 test #{Time.now.utc.iso8601}"
      client.put_object(bucket: BUCKET, key: test_key, body: body, content_type: "text/plain")
      puts "upload:   ok (#{test_key})"

      client.head_object(bucket: BUCKET, key: test_key)
      puts "head:     ok"

      public_url = "#{public_base_url}/#{test_key}"
      uri = URI(public_url)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) do |http|
        http.get(uri.request_uri)
      end
      unless response.is_a?(Net::HTTPSuccess)
        warn "public:   failed — HTTP #{response.code} for #{public_url}"
        return false
      end
      puts "public:   ok (#{public_url})"

      client.delete_object(bucket: BUCKET, key: test_key)
      puts "delete:   ok"
      puts "B2 connection test passed"
      true
    rescue Aws::S3::Errors::ServiceError => e
      warn "B2 failed at #{e.class}: #{e.message}"
      warn "Common fixes: swap key ID vs application key, scope key to bucket #{BUCKET}, enable list/read/write/delete"
      false
    end

    def keep_in_image?(relative)
      relative.match?(MANIFEST_KEEP_PATTERN) ||
        relative.start_with?(CRT_DISPLACEMENT_KEEP_PREFIX)
    end

    private

    def skip_upload?(key, local_size, relative_path)
      head = client.head_object(bucket: BUCKET, key: key)
      expected_type = mime_type_for(relative_path)
      actual_type = head.content_type.to_s.split(";", 2).first.strip
      head.content_length == local_size && actual_type == expected_type
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
