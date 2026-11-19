import { describe, expect, test } from "bun:test"

import { assertReadOnly } from "~/mcp/sql-guard"

describe("assertReadOnly", () => {
  test.each([
    'select "id", "name" from "users" where "users"."id" = ? limit ?',
    "  SELECT count(*) FROM posts",
    "with recent as (select * from posts) select * from recent",
    "select 1;",
  ])("allows %s", (sql) => {
    expect(() => assertReadOnly(sql)).not.toThrow()
  })

  test.each([
    "delete from users",
    "update users set name = 'x'",
    "with x as (select 1) delete from users",
    "select 1; drop table users",
    "select 1 ; select 2",
    "pragma table_info(users)",
    "attach database 'x' as y",
  ])("refuses %s", (sql) => {
    expect(() => assertReadOnly(sql)).toThrow("single SELECT")
  })

  test.each([
    "select * from auth_codes",
    'select * from "rate_limits"',
    "select * from presence",
    "select * from notifications",
    "select * from user_notification_settings",
  ])("blocks private table in %s", (sql) => {
    expect(() => assertReadOnly(sql)).toThrow("off limits")
  })

  test.each(["select email from users", 'select "users"."email" from "users"'])(
    "blocks hidden column in %s",
    (sql) => {
      expect(() => assertReadOnly(sql)).toThrow("column is off limits")
    },
  )

  test("does not mistake a table name for the email column", () => {
    expect(() => assertReadOnly("select * from email_reminders_sent")).toThrow(
      "table is off limits",
    )
  })
})
