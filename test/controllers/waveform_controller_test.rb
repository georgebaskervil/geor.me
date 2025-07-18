require "test_helper"

class WaveformControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get waveform_index_url
    assert_response :success
  end
end
