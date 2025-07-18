require "test_helper"

class ProxyControllerTest < ActionDispatch::IntegrationTest
  test "should get umami_script" do
    get proxy_umami_script_url
    assert_response :success
  end
end
