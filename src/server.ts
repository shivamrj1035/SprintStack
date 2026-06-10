/* eslint-disable @typescript-eslint/no-explicit-any */
import "./lib/error-capture";

if (typeof globalThis !== "undefined" && !(globalThis as any).app) {
  (globalThis as any).app = {
    config: {
      server: {
        experimental: {
          asyncContext: true,
        },
      },
    },
  };
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

// Wrap unctx "nitro-app" to provide a fallback event when context is not available (e.g. during dev/SSR load)
if (typeof globalThis !== "undefined") {
  const unctx = (globalThis as any).__unctx__;
  if (unctx) {
    const nitroApp = unctx.get("nitro-app");
    if (nitroApp) {
      const originalUse = nitroApp.use;
      nitroApp.use = function (...args: unknown[]) {
        try {
          return originalUse.apply(nitroApp, args);
        } catch (error) {
          return {
            event: {
              context: new Proxy(
                {},
                {
                  get(target, prop) {
                    if (typeof prop === "string") {
                      const processEnv = (globalThis as any).process?.env ?? {};
                      return processEnv[prop] ?? processEnv[`VITE_${prop}`];
                    }
                    return undefined;
                  },
                },
              ),
            },
          };
        }
      };
    }
  }
}

const ssrHandler = createStartHandler(defaultStreamHandler) as any;

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const response = await ssrHandler(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
