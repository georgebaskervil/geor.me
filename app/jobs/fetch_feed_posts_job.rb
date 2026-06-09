# frozen_string_literal: true

class FetchFeedPostsJob < ApplicationJob
  queue_as :default

  def perform
    FeedPostsService.refresh!
  end
end
