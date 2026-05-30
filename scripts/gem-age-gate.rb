#!/usr/bin/env ruby
# frozen_string_literal: true

require 'net/http'
require 'json'
require 'date'

MIN_AGE_DAYS = 7
MIN_AGE_SECONDS = MIN_AGE_DAYS * 24 * 60 * 60
CUTOFF_DATE = Time.zone.now - MIN_AGE_SECONDS

RED = "\e[31m"
YELLOW = "\e[33m"
GREEN = "\e[32m"
RESET = "\e[0m"

puts "\n#{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━#{RESET}"
puts "#{GREEN}  🔒 GEM AGE GATE - SECURITY CHECK#{RESET}"
puts "#{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━#{RESET}"
puts "   Minimum age: #{MIN_AGE_DAYS} days"
puts "   Cutoff date: #{CUTOFF_DATE.strftime('%Y-%m-%d')}"
puts "#{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━#{RESET}\n"

def parse_gemfile_lock
  content = File.read(File.join(__dir__, '..', 'Gemfile.lock'))
  gems = {}
  in_specs = false

  content.each_line do |line|
    if /^GEM$/.match?(line)
      in_specs = false
    elsif /^  specs:$/.match?(line)
      in_specs = true
    elsif in_specs && line =~ /^    ([\w\-_.]+) \(([^)]+)\)$/
      gems[Regexp.last_match(1)] = Regexp.last_match(2).split(',').first.strip
    elsif line =~ /^PLATFORMS/ || line =~ /^DEPENDENCIES/
      in_specs = false
    end
  end

  gems
end

def get_publish_date(name, version)
  uri = URI("https://rubygems.org/api/v2/rubygems/#{name}/versions/#{version}.json")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.open_timeout = 5
  http.read_timeout = 5

  response = http.request(Net::HTTP::Get.new(uri))
  return nil unless response.code == '200'

  DateTime.parse(JSON.parse(response.body)['created_at']).to_time
rescue StandardError
  nil
end

def validate
  gems = parse_gemfile_lock
  if gems.empty?
    puts "#{RED}❌ No gems found - cannot validate safety#{RESET}"
    puts "   Defaulting to BLOCK for security.\n"
    exit 1
  end

  puts "   Checking #{gems.length} gems in parallel...\n"
  recent_gems = []
  checked = 0
  mutex = Mutex.new

  gems.each_slice(20) do |batch|
    threads = batch.map do |name, version|
      Thread.new do
        published = get_publish_date(name, version)
        mutex.synchronize do
          checked += 1
          recent_gems << { name: name, version: version, published: published } if published && published > CUTOFF_DATE
          print "   #{checked}/#{gems.length} checked...\r"
          $stdout.flush
        end
      end
    end
    threads.each(&:join)
    sleep 0.5
  end

  puts "\n"

  if recent_gems.any?
    puts "\n#{RED}❌ GEM AGE GATE BLOCKED#{RESET}"
    puts "   #{recent_gems.length} gem(s) are newer than #{MIN_AGE_DAYS} days:\n"
    recent_gems.each do |g|
      days_ago = ((Time.zone.now - g[:published]) / (24 * 60 * 60)).to_i
      puts "   #{RED}• #{g[:name]} (#{g[:version]})#{RESET}"
      puts "     Published: #{g[:published].strftime('%Y-%m-%d')} (#{days_ago} days ago)"
    end
    unlock_date = recent_gems.map { |g| g[:published] }.max + MIN_AGE_SECONDS
    puts "\n#{YELLOW}   ⏳ Available after: #{unlock_date.strftime('%Y-%m-%d')}#{RESET}"
    puts "\n   Operation BLOCKED.\n"
    exit 1
  end

  puts "#{GREEN}✅ All #{gems.length} gems meet the #{MIN_AGE_DAYS}-day minimum age.#{RESET}\n"
end

validate
