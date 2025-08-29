# frozen_string_literal: true

require "test_helper"

class LegalControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get legal_index_url
    assert_response :success
  end
end
