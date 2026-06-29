# frozen_string_literal: true

require "net/http"
require "json"

class GithubRepoStatsService
  API_BASE = "https://api.github.com/repos"
  CACHE_TTL = 1.hour

  class << self
    def fetch(repo)
      if cacheable?
        Rails.cache.fetch("github_repo_stats-#{repo}", expires_in: CACHE_TTL) { fetch_from_network(repo) }
      else
        fetch_from_network(repo)
      end
    rescue StandardError => e
      Rails.logger.error "GithubRepoStatsService: #{e.message}"
      nil
    end

    private

    def fetch_from_network(repo)
      repo_data = get_json("#{API_BASE}/#{repo}")
      return nil unless repo_data

      languages = get_json("#{API_BASE}/#{repo}/languages") || {}
      commits = get_json("#{API_BASE}/#{repo}/commits?per_page=3") || []

      {
        full_name: repo_data["full_name"],
        description: repo_data["description"],
        html_url: repo_data["html_url"],
        stars: repo_data["stargazers_count"],
        forks: repo_data["forks_count"],
        open_issues: repo_data["open_issues_count"],
        pushed_at: repo_data["pushed_at"] ? Time.parse(repo_data["pushed_at"]) : nil,
        languages: languages,
        recent_commits: commits.first(3).map { |c| { message: c.dig("commit", "message").to_s.lines.first.to_s.strip, date: c.dig("commit", "author", "date") } }
      }
    end

    def get_json(url)
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 10
      http.read_timeout = 10

      request = Net::HTTP::Get.new(uri)
      request["User-Agent"] = "Geor.me Bot"
      request["Accept"] = "application/vnd.github+json"

      response = http.request(request)
      return nil unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue StandardError => e
      Rails.logger.error "GithubRepoStatsService: failed to fetch #{url}: #{e.message}"
      nil
    end

    def cacheable?
      !Rails.cache.is_a?(ActiveSupport::Cache::NullStore)
    end
  end
end
