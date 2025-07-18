require "test_helper"

class EncryptorControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get encryptor_index_url
    assert_response :success
  end
end
