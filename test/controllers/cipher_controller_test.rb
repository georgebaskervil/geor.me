require "test_helper"

class CipherControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get cipher_index_url
    assert_response :success
  end
end
