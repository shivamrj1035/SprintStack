# Deploying OrbitOS to Vercel

This guide outlines the steps required to deploy the OrbitOS application to **Vercel**.

## 1. Configuration Changes

OrbitOS is a TanStack Start application built with React, Vite, and Drizzle. By default, it is configured to build for Cloudflare Workers/Pages. To support deploying to Vercel, the configuration in [vite.config.ts](file:///d:/Shivam/OrbitOS/vite.config.ts) has been updated to automatically disable Cloudflare-specific plugins when building on Vercel:

- **File modified**: [vite.config.ts](file:///d:/Shivam/OrbitOS/vite.config.ts)
- **Tweak applied**:
  ```typescript
  cloudflare: process.env.VERCEL ? false : undefined,
  tanstackStart: process.env.VERCEL
    ? undefined
    : {
        server: { entry: "server" },
      },
  ```
  This ensures that when Vercel runs the build command, the Cloudflare Vite plugin is bypassed and the server entry point is not overridden with the Cloudflare Worker adapter, allowing the standard TanStack Start (Vinxi/Nitro) engine to build cleanly for Vercel's Serverless environment.

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

   | Variable Name            | Description / Value                                                  |
   | ------------------------ | -------------------------------------------------------------------- |
   | `DATABASE_URL`           | Neon Postgres Connection String (e.g., `postgresql://...`)           |
   | `VITE_GOOGLE_CLIENT_ID`  | Google OAuth 2.0 Client ID (from Google Cloud Console)              |
   | `JWT_SECRET`             | Secure random string for signing session tokens                     |

4. **Whitelist Production Domain in Google Cloud Console**:
   - Once your project has built and you receive your Vercel deployment domain (e.g., `https://orbitos-app.vercel.app`), go back to your **Google Cloud Console**.
   - Navigate to **APIs & Services** > **Credentials**.
   - Edit your Web OAuth Client ID.
   - Under **Authorized JavaScript origins**, add your Vercel URL (e.g., `https://orbitos-app.vercel.app`).
   - Click **Save**.

5. **Deploy**:
   - Click **Deploy**. Vercel will compile the client assets, build the SSR server entry, and deploy the application as Serverless/Edge functions.
