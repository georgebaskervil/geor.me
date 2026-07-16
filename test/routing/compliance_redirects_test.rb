# frozen_string_literal: true

require "test_helper"

class ComplianceRedirectsTest < ActionDispatch::IntegrationTest
  COMPLIANCE_DOC = "https://compliance.geor.me/books/georme-compliance-documentation"

  {
    "/legal" => COMPLIANCE_DOC,
    "/privacy" => "#{COMPLIANCE_DOC}/page/privacy-policy",
    "/licensing" => "#{COMPLIANCE_DOC}/page/licensing",
    "/dmca" => "#{COMPLIANCE_DOC}/page/dmca-policy",
    "/credits" => "#{COMPLIANCE_DOC}/page/site-credits-page",
    "/doomdisclaimer" => "#{COMPLIANCE_DOC}/page/doom-shareware-useage-disclaimer"
  }.each do |path, target|
    test "#{path} redirects to compliance docs" do
      get path
      assert_redirected_to target
      assert_response :moved_permanently
    end
  end
end
