import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sqlPlaceholder = neon("http://localhost");
const dummyDb = drizzle(sqlPlaceholder, { schema });
type DbType = typeof dummyDb;

let cachedDb: DbType | null = null;

function getDb(): DbType {
  if (!cachedDb) {
    const url = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }
    const sql = neon(url);
    cachedDb = drizzle(sql, { schema });
  }
  return cachedDb;
}

export const db = new Proxy({} as DbType, {
  get(target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

