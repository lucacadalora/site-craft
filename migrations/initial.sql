-- Initial database migration

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  thumbnail TEXT,
  html TEXT NOT NULL,
  css TEXT NOT NULL
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  template_id TEXT NOT NULL,
  category TEXT NOT NULL,
  html TEXT,
  css TEXT,
  settings JSONB,
  published BOOLEAN DEFAULT FALSE,
  publish_path TEXT,
  user_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);