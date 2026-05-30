# frozen_string_literal: true

require "test_helper"

class SpaceshooterControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get spaceshooter_index_url
    assert_response :success
  end
end
