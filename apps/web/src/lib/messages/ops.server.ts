import "@tanstack/react-start/server-only"
import { and, asc, desc, eq, getTableName } from "drizzle-orm"
import { type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { db } from "~/db"
import { type NotificationEntityType } from "~/db/schema"
import {
  type EngagementContentType,
  getMessageParentBinding,
  isEngagementContentType,
  type MessageParentType,
  resolveContentOwner,
} from "~/lib/engagement/registry.server"
import { invariant } from "~/lib/invariant"
import { logRejection } from "~/lib/logger"
import { extractMentionedUserIds } from "~/lib/mentions/parse"
import { resolvePreview } from "~/lib/mentions/resolve.server"
import { type MessageParentType as SchemaMessageParentType } from "~/lib/messages/schemas"
import {
  createNotification,
  deleteNotificationsForMessage,
} from "~/lib/notifications/helpers.server"

/**
 * Every `{entity}_messages` table shares these columns. The registry owns the
 * tables as opaque `PgTable`s; this is the column surface the message ops
 * operate over, regardless of which parent type resolved the table.
 */
type MessageColumns = {
  id: AnyPgColumn
  content: AnyPgColumn
  createdAt: AnyPgColumn
  userId: AnyPgColumn
}
type MessageTable = PgTable & MessageColumns

/** Resolve the registry-owned message table for a parent type. */
export const getTableByType = (type: MessageParentType): MessageTable =>
  getMessageParentBinding(type).messageTable as unknown as MessageTable

/** snake_case table name → the camelCase key Drizzle's relational query uses. */
const toRelationalKey = (snake: string): string =>
  snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/**
 * Resolve the *property* key for a column on its table. Drizzle's `.values()`
 * and `.set()` are keyed by the table's TS property names (e.g. `postId`), not
 * the DB column name (`post_id`); the registry stores the column reference, so
 * we map it back to its property key by identity — no string reconstruction.
 */
const parentColumnKey = (table: PgTable, column: AnyPgColumn): string => {
  const entry = Object.entries(
    table as unknown as Record<string, unknown>,
  ).find(([, value]) => value === column)
  invariant(entry, `column "${column.name}" not found on its table`)
  return entry[0]
}

/** User fields exposed on a listed message's author and likers. */
type MessageUser = { avatarId: string | null; id: number; name: string }

/**
 * The public shape of a listed message, identical across every parent type.
 * Declared explicitly so the server-fn return type (and therefore every UI
 * consumer) stays stable even though the underlying relational query is
 * resolved dynamically through the registry.
 */
export type ListedMessage = {
  id: number
  content: string
  createdAt: Date
  userId: number
  user: MessageUser
  likes: { user: MessageUser }[]
}

/**
 * Relational query accessor keyed by table export name. The registry owns which
 * table each parent type resolves to; we look the accessor up by that table's
 * name so the list query is registry-driven, not a hand-copied switch. The
 * result is typed as `ListedMessage[]` — every message table shares this shape.
 */
type RelationalQuery = {
  findMany: (config: Record<string, unknown>) => Promise<ListedMessage[]>
}
const relationalQueryFor = (table: MessageTable): RelationalQuery => {
  const key = toRelationalKey(getTableName(table as never))
  const query = (db.query as unknown as Record<string, RelationalQuery>)[key]
  invariant(query, `no relational query for message table "${key}"`)
  return query
}

/** Slim user projection shared by message authors and likers. */
const userColumns = { avatarId: true, id: true, name: true } as const

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

/**
 * Resolve the notification-facing identity of a message's parent. `entityType`
 * is the engagement content type when the parent is one (used for owner
 * resolution and the real entity id); `mentionEntityType` is what mention and
 * message-like notifications file under, falling back to "chat" for chat.
 */
function resolveMessageEntity(type: MessageParentType): {
  entityType: Extract<MessageParentType, EngagementContentType> | undefined
  mentionEntityType: NotificationEntityType
} {
  const entityType = isEngagementContentType(type) ? type : undefined
  return { entityType, mentionEntityType: entityType ?? "chat" }
}

type NotifyMentionsArgs = {
  recipientIds: number[]
  author: AuthenticatedContext["user"]
  entityType: NotificationEntityType
  entityId: number
  preview: string
  messageId: number
}

/** Fire a mention notification to each already-filtered recipient. */
function notifyMentions({
  recipientIds,
  author,
  entityType,
  entityId,
  preview,
  messageId,
}: NotifyMentionsArgs): void {
  for (const recipientId of recipientIds) {
    createNotification({
      userId: recipientId,
      actorId: author.id,
      type: "mention",
      entityType,
      entityId,
      data: {
        actorName: author.name,
        actorAvatarId: author.avatarId,
        entityPreview: preview,
        messageId,
      },
    }).catch(logRejection("messages.notify"))
  }
}

type CreateMessageArgs = {
  context: AuthenticatedContext
  data: {
    content: string
    id: number | -1
    type: MessageParentType
  }
}

export async function createMessage({
  data: input,
  context,
}: CreateMessageArgs) {
  const userId = context.user.id

  const { content, id, type } = input

  const { messageTable, parentColumn } = getMessageParentBinding(type)

  // Build the insert values for the registry-owned message table. Non-chat
  // parents carry a foreign key to their parent record; chat has none. Drizzle
  // `.values()` keys are the table's *property* names, so we resolve the parent
  // column's property key off the registry-owned column reference — never
  // reconstructed from `${type}Id`.
  const values: Record<string, unknown> = { content, userId }
  if (parentColumn) {
    values[parentColumnKey(messageTable, parentColumn)] = id
  }

  const [row] = await db
    .insert(messageTable)
    .values(values as never)
    .returning()
  const messageId = (row as { id: number }).id

  const preview = await resolvePreview(content)

  // Create comment notification for the content owner (non-chat only). Chat
  // messages have no content owner, so this resolves through the registry only
  // for engagement content types.
  const { entityType, mentionEntityType } = resolveMessageEntity(type)
  let ownerId: number | null | undefined
  if (entityType) {
    ownerId = await resolveContentOwner(entityType, id)
    if (ownerId && ownerId !== userId) {
      createNotification({
        userId: ownerId,
        actorId: userId,
        type: "comment",
        entityType,
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityPreview: preview,
          messageId,
        },
      }).catch(logRejection("messages.notify"))
    }
  }

  // Notify @mentioned users (works for all message types including chat)
  const recipientIds = extractMentionedUserIds(content).filter(
    (uid) => uid !== userId && uid !== ownerId,
  )
  notifyMentions({
    recipientIds,
    author: context.user,
    entityType: mentionEntityType,
    entityId: entityType ? id : 0,
    preview,
    messageId,
  })
}

export async function updateMessage({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    content: string
    id: number
    type: MessageParentType
  }
}) {
  const userId = context.user.id

  const { content, id, type } = input

  const table = getTableByType(type)

  const existing = await db
    .select({ content: table.content })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId)))
    .then((rows) => rows[0])

  await db
    .update(table)
    .set({ content, userId })
    .where(and(eq(table.id, id), eq(table.userId, userId)))

  if (existing) {
    const existingContent = existing.content as string
    const oldMentions = new Set(extractMentionedUserIds(existingContent))
    const newMentions = extractMentionedUserIds(content).filter(
      (uid) => !oldMentions.has(uid),
    )

    const { entityType, mentionEntityType } = resolveMessageEntity(type)
    const mentionEntityId = entityType
      ? await getMessageParentEntityId(type, id)
      : 0
    const preview = await resolvePreview(content)

    notifyMentions({
      recipientIds: newMentions.filter((uid) => uid !== userId),
      author: context.user,
      entityType: mentionEntityType,
      entityId: mentionEntityId,
      preview,
      messageId: id,
    })
  }
}

export async function deleteMessage({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    type: MessageParentType
  }
}) {
  const userId = context.user.id

  const table = getTableByType(input.type)

  // Clean up message_like notifications before deleting. Non-chat parents file
  // under their parent entity type; chat files under "chat".
  const { mentionEntityType } = resolveMessageEntity(input.type)
  deleteNotificationsForMessage(mentionEntityType, input.id).catch(
    logRejection("messages.notify"),
  )

  await db
    .delete(table)
    .where(and(eq(table.id, input.id), eq(table.userId, userId)))
}

/**
 * Look up the parent entity ID for a message.
 * For chat messages, returns 0 (no parent entity).
 */
async function getMessageParentEntityId(
  type: MessageParentType,
  messageId: number,
): Promise<number> {
  const { messageTable, parentColumn } = getMessageParentBinding(type)
  if (!parentColumn) return 0

  const table = messageTable as unknown as MessageTable

  const row = await db
    .select({ parentId: parentColumn })
    .from(table)
    .where(eq(table.id, messageId))
    .then((rows) => rows[0])

  return (row?.parentId as number | null) ?? 0
}

/**
 * Compile-time guard: the client-safe `MessageParentType` declared in
 * `schemas.ts` must stay exactly equal to the registry-derived union. If a
 * parent type is added to or removed from `MESSAGE_PARENT_REGISTRY` without the
 * matching change to the Zod schema (or vice versa), this assignment fails to
 * type-check — the dispatch and the validation can never silently drift.
 */
type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never
const _messageParentTypesMatch: AssertEqual<
  MessageParentType,
  SchemaMessageParentType
> = true
void _messageParentTypesMatch

type ListMessagesInput =
  | { type: "chat"; id: -1; focus?: number }
  | { type: Exclude<MessageParentType, "chat">; id: number }

/**
 * List messages for a parent. The message table is resolved through the
 * registry for every content type; chat keeps its 28-day window + focus-mode
 * behavior, and record types share one registry-driven relational query.
 */
export async function listMessages(input: ListMessagesInput) {
  if (input.type === "chat") {
    return listChatMessages(input.focus)
  }
  return listRecordMessages(input.type, input.id)
}

async function listChatMessages(focus?: number) {
  const chatTable = getTableByType("chat")
  const query = relationalQueryFor(chatTable)

  const chatMessagesWith = {
    likes: { with: { user: { columns: userColumns } } },
    user: { columns: userColumns },
  } as const

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)

  // Get all messages from the last 28 days
  const recentMessages = await query.findMany({
    orderBy: asc(chatTable.createdAt),
    where: (fields: Record<string, AnyPgColumn>, ops: { gte: typeof eq }) =>
      ops.gte(fields.createdAt, twentyEightDaysAgo),
    with: chatMessagesWith,
  })

  let defaultMessages = recentMessages

  // If fewer than 100 messages, fetch older ones to reach 100
  if (recentMessages.length < 100) {
    const olderMessages = await query.findMany({
      orderBy: desc(chatTable.createdAt),
      limit: 100 - recentMessages.length,
      where: (fields: Record<string, AnyPgColumn>, ops: { lt: typeof eq }) =>
        ops.lt(fields.createdAt, twentyEightDaysAgo),
      with: chatMessagesWith,
    })

    defaultMessages = [...olderMessages.toReversed(), ...recentMessages]
  }

  // Focus mode: if the target message is in the default window, just use that.
  // Otherwise load a small window around the target message.
  if (focus && !defaultMessages.some((m) => m.id === focus)) {
    const beforeMessages = await query.findMany({
      orderBy: desc(chatTable.id),
      limit: 10,
      where: (fields: Record<string, AnyPgColumn>, ops: { lt: typeof eq }) =>
        ops.lt(fields.id, focus),
      with: chatMessagesWith,
    })

    const targetAndAfter = await query.findMany({
      orderBy: asc(chatTable.id),
      limit: 11,
      where: (fields: Record<string, AnyPgColumn>, ops: { gte: typeof eq }) =>
        ops.gte(fields.id, focus),
      with: chatMessagesWith,
    })

    return {
      type: "chatMessages" as const,
      focused: true as const,
      messages: [...beforeMessages.toReversed(), ...targetAndAfter],
    }
  }

  return {
    type: "chatMessages" as const,
    focused: false as const,
    messages: defaultMessages,
  }
}

async function listRecordMessages(
  type: Exclude<MessageParentType, "chat">,
  parentId: number,
) {
  const { messageTable, parentColumn } = getMessageParentBinding(type)
  invariant(
    parentColumn,
    `record message type "${type}" must have a parent column`,
  )

  const table = messageTable as unknown as MessageTable & {
    createdAt: AnyPgColumn
  }
  const query = relationalQueryFor(table)

  const messages = await query.findMany({
    orderBy: asc(table.createdAt),
    where: eq(parentColumn, parentId),
    with: {
      likes: { with: { user: { columns: userColumns } } },
      user: { columns: userColumns },
    },
  })

  return {
    type: `${type}Messages` as const,
    focused: false as const,
    parentId,
    messages,
  }
}
