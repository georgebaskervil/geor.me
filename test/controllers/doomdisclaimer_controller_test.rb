require "test_helper"

class DoomdisclaimerControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get doomdisclaimer_index_url
    assert_response :success
  end
end
