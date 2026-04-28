import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { registrationsTable } from "./registrations";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  registrationId: uuid("registration_id")
    .notNull()
    .references(() => registrationsTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;
export type InsertPushSubscriptionRow =
  typeof pushSubscriptionsTable.$inferInsert;
