import { db } from "../db";
import { sql } from "drizzle-orm";
import { users, sessions } from "@shared/schema";

export async function migrateReplitAuth() {
  console.log("Starting Replit Auth database migration...");

  // Check if sessions table exists and create it if not
  try {
    const sessionsCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      );
    `);
    
    if (!sessionsCheck.rows[0].exists) {
      console.log("Creating sessions table...");
      await db.execute(sql`
        CREATE TABLE "sessions" (
          "sid" VARCHAR NOT NULL PRIMARY KEY,
          "sess" JSONB NOT NULL,
          "expire" TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");
      `);
    } else {
      console.log("Sessions table already exists");
    }

    // Migrate users table
    console.log("Migrating users table to support Replit Auth...");
    
    // First check if we need to alter the table
    const usersIdTypeCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    
    if (usersIdTypeCheck.rows.length > 0 && usersIdTypeCheck.rows[0].data_type !== 'character varying') {
      // Drop foreign key constraints temporarily
      console.log("Dropping foreign key constraints...");
      await db.execute(sql`
        DO $$ 
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'projects' AND constraint_type = 'FOREIGN KEY')
          LOOP
            EXECUTE 'ALTER TABLE "projects" DROP CONSTRAINT ' || quote_ident(r.constraint_name);
          END LOOP;
          
          FOR r IN (SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'deployments' AND constraint_type = 'FOREIGN KEY')
          LOOP
            EXECUTE 'ALTER TABLE "deployments" DROP CONSTRAINT ' || quote_ident(r.constraint_name);
          END LOOP;
        END $$;
      `);
      
      // Alter the users table id column from integer to varchar
      console.log("Altering users table structure...");
      
      // Create a temporary table with the new structure
      await db.execute(sql`
        CREATE TABLE "users_new" (
          "id" VARCHAR PRIMARY KEY NOT NULL,
          "username" VARCHAR NOT NULL UNIQUE,
          "email" VARCHAR UNIQUE,
          "password" VARCHAR,
          "first_name" VARCHAR,
          "last_name" VARCHAR,
          "bio" TEXT,
          "profile_image_url" VARCHAR,
          "token_usage" INTEGER DEFAULT 0,
          "generation_count" INTEGER DEFAULT 0,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "last_login" TIMESTAMP
        );
      `);
      
      // Copy data with ID conversion
      await db.execute(sql`
        INSERT INTO "users_new" ("id", "username", "email", "password", "first_name", "last_name", "bio", "profile_image_url", "token_usage", "generation_count", "created_at", "updated_at", "last_login")
        SELECT 
          CAST("id" AS VARCHAR) as id,
          "username", 
          "email", 
          "password",
          "first_name", 
          "last_name", 
          "bio", 
          "profile_image_url", 
          "token_usage", 
          "generation_count", 
          "created_at", 
          "updated_at",
          "last_login"
        FROM "users";
      `);
      
      // Drop the old table and rename the new one
      await db.execute(sql`DROP TABLE "users";`);
      await db.execute(sql`ALTER TABLE "users_new" RENAME TO "users";`);
      
      console.log("Users table successfully migrated to support Replit Auth");
      
      // Update projects table foreign key to use varchar
      console.log("Updating projects table foreign key...");
      await db.execute(sql`
        ALTER TABLE "projects" 
        ALTER COLUMN "user_id" TYPE VARCHAR USING CAST("user_id" AS VARCHAR);
        
        ALTER TABLE "projects"
        ADD CONSTRAINT "projects_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      `);
      console.log("Projects table updated successfully");
      
      // Update deployments table foreign key to use varchar
      console.log("Updating deployments table foreign key...");
      await db.execute(sql`
        ALTER TABLE "deployments" 
        ALTER COLUMN "user_id" TYPE VARCHAR USING CAST("user_id" AS VARCHAR);
        
        ALTER TABLE "deployments"
        ADD CONSTRAINT "deployments_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      `);
      console.log("Deployments table updated successfully");
    } else {
      console.log("Users table already supports Replit Auth (id is varchar)");
    }
    
    console.log("Replit Auth database migration completed successfully");
    return true;
  } catch (error) {
    console.error("Error during Replit Auth migration:", error);
    return false;
  }
}

// For ESM modules, check if this is the main module
// We'll just export the function for now and call it from index.ts
export async function runMigration() {
  try {
    await migrateReplitAuth();
    console.log("Replit Auth migration complete");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}