import { pgTable, text, serial, integer, boolean, json, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced User schema with email as main identifier and token tracking
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // Email is now the primary identifier
  password: text("password").notNull(),
  displayName: text("display_name"), // Optional display name instead of username
  tokenUsage: integer("token_usage").default(0),
  generationCount: integer("generation_count").default(0),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Keep username for backward compatibility, but mark as optional
  username: text("username").unique(),
});

// For regular registration we pick required fields
export const baseInsertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
}).extend({
  displayName: z.string().optional(),
  username: z.string().optional(), // Now optional
});

// For token usage recovery or system ops we allow ID and token fields
export const insertUserSchema = baseInsertUserSchema.extend({
  id: z.number().optional(),
  tokenUsage: z.number().optional(),
  generationCount: z.number().optional()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().optional(), // Optional display name
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterCredentials = z.infer<typeof registerSchema>;

// Enhanced Settings for AI prompt enhancement
export const enhancedSettingsSchema = z.object({
  isActive: z.boolean().default(true),
});

export type EnhancedSettings = z.infer<typeof enhancedSettingsSchema>;

// Project schema - Enhanced to support multi-file projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").unique(), // Unique session ID for continuing projects
  slug: text("slug").unique(), // URL-friendly slug like "hello-world-spark"
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  thumbnail: text("thumbnail"), // Base64 or URL for project preview
  templateId: text("template_id").notNull(),
  category: text("category").notNull(),
  html: text("html"), // Kept for backward compatibility
  css: text("css"), // Kept for backward compatibility
  files: json("files"), // New: Array of {name: string, content: string, language: string} for multi-file support
  prompts: json("prompts"), // New: Array of conversation history for follow-up editing
  currentCommit: text("current_commit"), // New: Track current version/commit
  settings: json("settings"),
  published: boolean("published").default(false),
  publishPath: text("publish_path"),
  userId: integer("user_id").references(() => users.id), // Nullable to allow anonymous projects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  html: true,
  css: true,
  published: true,
  publishPath: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Template schema
export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  thumbnail: text("thumbnail"),
  html: text("html").notNull(),
  css: text("css").notNull(),
});

export const insertTemplateSchema = createInsertSchema(templates);

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Settings schema for project customization
export const settingsSchema = z.object({
  colors: z.object({
    primary: z.string().default("#3b82f6"),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  }),
  font: z.string().default("Inter"),
  layout: z.string().default("Standard"),
});

export type Settings = z.infer<typeof settingsSchema>;

// API configuration schema
export const apiConfigSchema = z.object({
  provider: z.string().default("SambaNova (DeepSeek-V3-0324)"),
  apiKey: z.string().optional(),
  saveToken: z.boolean().default(true),
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

// DeepSite structure schema
export const siteStructureSchema = z.object({
  sections: z.array(z.string()).default(["hero", "features", "testimonials", "about", "contact"]),
  contentDepth: z.enum(["basic", "detailed", "comprehensive"]).default("detailed"),
});

export type SiteStructure = z.infer<typeof siteStructureSchema>;

// DeepSite request schema
export const deepSiteSchema = z.object({
  prompt: z.string().min(10, "Please provide a more detailed description"),
  templateId: z.string(),
  category: z.string(),
  settings: settingsSchema,
  siteStructure: siteStructureSchema.optional(),
  apiConfig: apiConfigSchema.optional(),
});

export type DeepSiteRequest = z.infer<typeof deepSiteSchema>;

// Generation request schema
export const generatePageSchema = z.object({
  prompt: z.string().min(10, "Please provide a more detailed description"),
  templateId: z.string(),
  category: z.string(),
  settings: settingsSchema,
  apiConfig: apiConfigSchema.optional(),
});

export type GeneratePageRequest = z.infer<typeof generatePageSchema>;

// Export schema
export const exportSchema = z.object({
  projectId: z.number(),
  format: z.enum(["html", "pdf"]),
});

export type ExportRequest = z.infer<typeof exportSchema>;

// Publish schema
export const publishSchema = z.object({
  projectId: z.number(),
  siteName: z.string().min(3, "Site name must be at least 3 characters"),
  useCustomDomain: z.boolean().default(false),
  customDomain: z.string().optional(),
});

export type PublishRequest = z.infer<typeof publishSchema>;

// Deployment schema to track user deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  html: text("html").notNull(),
  css: text("css"),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  visitCount: integer("visit_count").default(0),
  lastVisitedAt: timestamp("last_visited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  visitCount: true,
  lastVisitedAt: true,
  createdAt: true, 
  updatedAt: true
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

// Project versions schema - Tracks version history like v3
export const projectVersions = pgTable("project_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  versionNumber: integer("version_number").notNull(), // 1, 2, 3, etc.
  prompt: text("prompt").notNull(), // The prompt that created this version
  files: json("files").notNull(), // Snapshot of all files at this version
  commitTitle: text("commit_title"), // Similar to v3's commit title
  isFollowUp: boolean("is_follow_up").default(false), // Whether this was a follow-up edit
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectVersionSchema = createInsertSchema(projectVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectVersion = z.infer<typeof insertProjectVersionSchema>;
export type ProjectVersion = typeof projectVersions.$inferSelect;
