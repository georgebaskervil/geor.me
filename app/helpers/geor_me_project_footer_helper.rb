# frozen_string_literal: true

module GeorMeProjectFooterHelper
  COMPLIANCE_BASE = "https://compliance.geor.me/books/georme-compliance-documentation"

  # Compliance links for the first-party project footer (and public embed assets).
  def geor_me_project_footer_links
    [
      { label: "Legal", href: COMPLIANCE_BASE },
      { label: "Privacy", href: "#{COMPLIANCE_BASE}/page/privacy-policy" },
      { label: "Licensing", href: "#{COMPLIANCE_BASE}/page/licensing" },
      { label: "DMCA", href: "#{COMPLIANCE_BASE}/page/dmca-policy" },
      { label: "Credits", href: "#{COMPLIANCE_BASE}/page/site-credits-page" },
      { label: "Doom", href: "#{COMPLIANCE_BASE}/page/doom-shareware-useage-disclaimer" },
    ]
  end
end
