import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".dev.vars" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  const sql = neon(url);

  try {
    const orgs = await sql`SELECT * FROM organizations;`;
    const memberships = await sql`SELECT * FROM organization_memberships;`;
    const projectsList = await sql`SELECT * FROM projects;`;
    const tasksList = await sql`SELECT * FROM tasks;`;

    console.log("Organizations:", JSON.stringify(orgs, null, 2));
    console.log("Memberships:", JSON.stringify(memberships, null, 2));
    console.log("Projects:", JSON.stringify(projectsList, null, 2));
    console.log("Tasks:", JSON.stringify(tasksList, null, 2));
  } catch (err) {
    console.error("Error querying db:", err.message || err);
  }
}

main();
