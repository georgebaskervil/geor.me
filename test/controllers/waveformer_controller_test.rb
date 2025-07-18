require "test_helper"

class WaveformerControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get waveformer_index_url
    assert_response :success
  end
end
