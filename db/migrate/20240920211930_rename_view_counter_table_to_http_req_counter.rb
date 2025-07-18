class RenameViewCounterTableToHttpReqCounter < ActiveRecord::Migration[7.1]
  def change
    rename_table :view_counters, :http_req_counters
  end
end
