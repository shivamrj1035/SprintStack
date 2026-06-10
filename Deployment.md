# Deploying OrbitOS to Vercel

This guide outlines the steps required to deploy the OrbitOS application to **Vercel**.

## 1. Configuration Changes

OrbitOS is a TanStack Start application built with React, Vite, and Drizzle. By default, it is configured to build for Cloudflare Workers/Pages. To support deploying to Vercel, the configuration in [vite.config.ts](file:///d:/Shivam/OrbitOS/vite.config.ts) has been updated to automatically disable Cloudflare-specific plugins when building on Vercel:

- **File modified**: [vite.config.ts](file:///d:/Shivam/OrbitOS/vite.config.ts)
- **Tweak applied**:
  ```typescript
  cloudflare: process.env.VERCEL ? false : undefined,
  ```
  This ensures that when Vercel runs the build command, the Cloudflare Vite plugin is bypassed, allowing the standard TanStack Start (Vinxi/Nitro) engine to build for Vercel's Serverless environment.

---

## 2. Setting Up the Database (Neon Postgres)

OrbitOS uses Neon Serverless Postgres with Drizzle ORM.

1. **Create a Neon Database**:
   - Go to [Neon Console](https://console.neon.tech/) and create a new project.
   - Copy the connection string.
2. **Push the Schema**:
   - Run the following command locally to push the database schema to your Neon database (ensure you have the connection string in your local [.env](file:///d:/Shivam/OrbitOS/.env) or pass it directly):
     ```bash
     npx drizzle-kit push
     ```

---

## 3. Deployment Steps on Vercel

1. **Import the Repository**:
   - Go to the Vercel Dashboard and click **Add New** > **Project**.
   - Import your git repository.
2. **Configure Project Settings**:
   - **Framework Preset**: Vercel will automatically detect the framework. Select **Other** or **TanStack Start** (if available).
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave as default (Vercel automatically detects the Nitro build output).
3. **Configure Environment Variables**:
   Add the following environment variables in the project settings:

   | Variable Name                | Description / Value                                        |
   | ---------------------------- | ---------------------------------------------------------- |
   | `DATABASE_URL`               | Neon Postgres Connection String (e.g., `postgresql://...`) |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key (from Clerk dashboard)               |
   | `CLERK_SECRET_KEY`           | Clerk Secret Key (from Clerk dashboard)                    |
   | `CLERK_SIGN_IN_URL`          | `/login`                                                   |
   | `CLERK_SIGN_UP_URL`          | `/login`                                                   |

4. **Deploy**:
   - Click **Deploy**. Vercel will compile the client assets, build the SSR server entry, and deploy the application as Serverless/Edge functions.
