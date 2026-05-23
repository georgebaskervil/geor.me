# frozen_string_literal: true

require "oj"

# Replace the stdlib JSON module with Oj's faster implementation.
# mimic_JSON patches JSON.parse, JSON.generate, JSON.dump, JSON.load, etc.
Oj.mimic_JSON

# Patch ActiveSupport::JSON (used by to_json on objects, etc.)
# so that ActiveSupport's encode/decode path also goes through Oj.
Oj.optimize_rails