import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URI!);
console.log("init neon");
export const db = drizzle({ client: sql });
