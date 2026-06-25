import { signSessionToken } from "../src/lib/auth-server";
import dotenv from "dotenv";

dotenv.config({ path: ".dev.vars" });

async function main() {
  const token = await signSessionToken({
    userId: "test-super-admin-id",
    email: "srjtheinfinity1035@gmail.com",
    name: "Super Admin",
    avatarUrl: null,
  });
  console.log("Generated Token:", token);
}

main();
