import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

const USERS_PATH = path.join(__dirname, ".agent", "identity", "users.json");
const PERMISSIONS_PATH = path.join(__dirname, ".agent", "identity", "permissions.json");
const AUTHORITIES_PATH = path.join(__dirname, ".agent", "governance", "authorities.json");

// Helper to read and parse JSON files safely
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers for API accessibility
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle `/api/verify-access` endpoint
  if (req.url === "/api/verify-access" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { userId, action, workspaceId } = payload;

        if (!userId || !action) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields: userId and action" }));
          return;
        }

        // 1. Read users database
        const users = await readJsonFile(USERS_PATH);
        if (!users) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to read users database" }));
          return;
        }

        // 2. Find the user profile
        const user = users.find((u) => u.id === userId);
        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `User with ID '${userId}' not found` }));
          return;
        }

        let role = "member"; // Default fallback role

        // 3. Determine workspace/global role
        if (user.global_role === "super_admin") {
          role = "super_admin";
        } else {
          // Check authorities database for workspace role mapping
          const authorities = await readJsonFile(AUTHORITIES_PATH);
          if (authorities) {
            const membership = authorities.find(
              (a) => a.user_id === userId && (!workspaceId || a.workspace_id === workspaceId),
            );
            if (membership) {
              role = membership.role;
            }
          }
        }

        // 4. Read permissions mapping
        const permissions = await readJsonFile(PERMISSIONS_PATH);
        if (!permissions) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to read permissions mapping" }));
          return;
        }

        // 5. Verify action authority
        const rolePermissions = permissions.find((p) => p.role === role);
        const allowed = rolePermissions ? rolePermissions.allowed_actions.includes(action) : false;

        if (allowed) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ allowed: true, role, userId, action }));
        } else {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              allowed: false,
              role,
              reason: `Action '${action}' is forbidden for workspace role '${role}'`,
            }),
          );
        }
      } catch (err) {
        console.error("API Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  } else {
    // 404 Route handler
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Access Validation Server is running on port ${PORT}`);
});
