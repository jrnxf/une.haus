// The token is read-only, so this guard is a second lock, not the only one.
// It also stops a mistake early, with a clear message, before any request.
const READ_ONLY = /^\s*(select|with)\b/i
// A leading SELECT or WITH is not enough on its own:
// - SQLite allows `WITH x AS (...) DELETE FROM ...`
// - `SELECT 1; DROP TABLE users` is two statements, and D1 runs both
// So also refuse any write keyword anywhere, and any `;` before the end.
// Values always travel as params, never inside the SQL text, so a false
// positive on a string literal is rare and easy to fix by using a param.
const WRITE_KEYWORD =
  /\b(insert|update|delete|replace|upsert|drop|alter|create|attach|detach|pragma|vacuum|reindex|analyze)\b/i
const SECOND_STATEMENT = /;\s*\S/
// Tables that hold secrets or private state. No tool may read them.
const BLOCKED_TABLES =
  /\b(auth_codes|rate_limits|presence|notifications|user_notification_settings|email_reminders_sent)\b/i

export function assertReadOnly(sql: string) {
  if (
    !READ_ONLY.test(sql) ||
    WRITE_KEYWORD.test(sql) ||
    SECOND_STATEMENT.test(sql)
  ) {
    throw new Error("only a single SELECT statement may run against prod")
  }
  if (BLOCKED_TABLES.test(sql)) {
    throw new Error("that table is off limits to the MCP server")
  }
}

export function isBlockedTable(name: string) {
  return BLOCKED_TABLES.test(name)
}
