import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (kept from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  templateId: text("template_id").notNull(),
  category: text("category").notNull(),
  html: text("html"),
  css: text("css"),
  settings: json("settings"),
  published: boolean("published").default(false),
  publishPath: text("publish_path"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
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
  provider: z.string().default("SambaNova (DeepSeek-Coder-V3-0324)"),
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
