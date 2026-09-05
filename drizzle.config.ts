import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL ?? "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const isLocalFile = connectionString.startsWith("file:");

export default defineConfig(
  isLocalFile
    ? {
        schema: "./drizzle/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url: connectionString },
      }
    : {
        schema: "./drizzle/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url: connectionString, authToken },
      }
);
