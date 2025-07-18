class CreateViewCounters < ActiveRecord::Migration[7.1]
  def change
    create_table :view_counters do |t|
      t.integer :count

      t.timestamps
    end
  end
end
