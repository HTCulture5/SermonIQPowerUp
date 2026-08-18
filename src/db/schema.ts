import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table using Firebase Auth uid with complete normalization & tenant isolation fields
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  role: text('role').default('pastor'),
  churchName: text('church_name'),
  churchAddress: text('church_address'),
  phone: text('phone'),
  serviceDate: text('service_date'),
  memberCount: integer('member_count'),
  subscriptionPlan: text('subscription_plan').default('Growth'),
  tenantId: text('tenant_id'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  dataIsolationMode: text('data_isolation_mode').default('strict_tenant'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  securityPreferences: text('security_preferences'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define the 'church_leads' table
export const churchLeads = pgTable('church_leads', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  churchName: text('church_name').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  serviceDate: text('service_date').notNull(),
  memberCount: integer('member_count').notNull(),
  subscriptionPlan: text('subscription_plan'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'sermon_notes' table
export const sermonNotes = pgTable('sermon_notes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid),
  title: text('title').notNull(),
  theme: text('theme'),
  scriptureReferences: text('scripture_references'),
  transcript: text('transcript'),
  summary: text('summary'),
  theologicalInsights: text('theological_insights'),
  engagementScore: integer('engagement_score'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  sermons: many(sermonNotes),
}));

export const sermonNotesRelations = relations(sermonNotes, ({ one }) => ({
  author: one(users, {
    fields: [sermonNotes.userId],
    references: [users.uid],
  }),
}));
