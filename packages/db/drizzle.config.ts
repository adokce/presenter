import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/web/.env",
});

const isLocal = process.env.USE_LOCAL_DB === "yessir";
const dbUrl = isLocal
  ? process.env.DATABASE_URL_LOCAL || ""
  : process.env.DATABASE_URL || "";
const dbAuthToken = isLocal
  ? process.env.DATABASE_AUTH_TOKEN_LOCAL
  : process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: isLocal ? "sqlite" : "turso",
  dbCredentials: isLocal
    ? { url: dbUrl }
    : { url: dbUrl, authToken: dbAuthToken! },
});
