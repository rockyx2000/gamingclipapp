ActiveRecord::Schema.define(version: 2022_09_02_022701) do
  enable_extension "plpgsql"

  create_table "clips", force: :cascade do |t|
    t.text "title"
    t.text "description"
    t.text "video"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
  end
end
