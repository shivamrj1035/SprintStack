import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

// dist/server/server.js is produced by `npm run build` on Vercel (VERCEL=1 disables
// the Cloudflare plugin so TanStack Start / Nitro outputs a standard Web Fetch handler).
type AppModule = {
  default: {
    fetch(req: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
};

let app: AppModule["default"] | null = null;

async function getApp(): Promise<AppModule["default"]> {
  if (!app) {
    // String-literal import so @vercel/nft can trace the file and its deps.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - dist/server/index.js is dynamically built and may not exist yet or lack declarations
    const mod = (await import("../dist/server/index.js")) as unknown as AppModule;
    app = mod.default;
  }
  return app;
}

function buildWebRequest(req: IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const host =
      (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "localhost";
    const url = `${proto}://${host}${req.url ?? "/"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      (Array.isArray(value) ? value : [value]).forEach((v) => headers.append(key, v));
    }

    if (req.method === "GET" || req.method === "HEAD") {
      resolve(new Request(url, { method: req.method, headers }));
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      resolve(new Request(url, { method: req.method!, headers, body: body.length ? body : null }));
    });
    req.on("error", reject);
  });
}

async function sendWebResponse(webRes: Response, nodeRes: ServerResponse): Promise<void> {
  nodeRes.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => nodeRes.setHeader(key, value));

  if (webRes.body) {
    await new Promise<void>((resolve, reject) => {
      // Readable.fromWeb available in Node.js 17+ (Vercel uses 18+).
      const readable = Readable.fromWeb(
        webRes.body as unknown as import("stream/web").ReadableStream,
      );
      readable.pipe(nodeRes);
      readable.on("error", reject);
      nodeRes.on("finish", resolve);
      nodeRes.on("error", reject);
    });
  } else {
    nodeRes.end();
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const fetch = await getApp();
    const webReq = await buildWebRequest(req);
    const webRes = await fetch.fetch(webReq, {}, {});
    await sendWebResponse(webRes, res);
  } catch (err) {
    console.error("[vercel:ssr]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  }
}
