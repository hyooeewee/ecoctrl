// ========================================
// WebTalk reverse proxy
// ========================================
//
// Transparently forwards browser requests to the upstream WebTalk server so
// the iframe stays same-origin with the admin app. This solves the cross-origin
// cookie problem: the upstream server sets session cookies for its own domain,
// which modern browsers block in a third-party (cross-origin) iframe context.
//
// By proxying through our own server, all requests appear to come from the same
// origin, and cookies work normally.

import type { FastifyInstance } from "fastify";
import { env } from "@/lib/env";

const UPSTREAM = env.BASE_URL?.replace(/\/+$/, "") || "";

// Hop-by-hop headers that must not be forwarded.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

// Response headers that fetch already decoded/recomputed — forwarding the
// upstream values would conflict with the actual (decompressed) payload.
const STRIP_RESPONSE_HEADERS = new Set([...HOP_BY_HOP, "content-encoding", "content-length"]);

function filterHeaders(
  source: Record<string, string | string[] | undefined>,
  drop: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(source)) {
    if (val === undefined || drop.has(key.toLowerCase())) continue;
    out[key] = Array.isArray(val) ? val.join(", ") : val;
  }
  return out;
}

export default async function webtalkRoutes(fastify: FastifyInstance) {
  if (!UPSTREAM) {
    fastify.log.warn("BASE_URL not configured — webtalk proxy disabled");
    return;
  }

  fastify.all("/*", async (request, reply) => {
    // The "*" param captures the path after the /api/webtalk prefix, e.g.
    // "_cur/loginA.php". request.url would include the full prefixed path, so
    // use the wildcard param and re-attach any query string manually.
    const wildcard = (request.params as Record<string, string>)["*"] ?? "";
    const queryIndex = request.url.indexOf("?");
    const queryString = queryIndex >= 0 ? request.url.slice(queryIndex) : "";
    const upstreamUrl = `${UPSTREAM}/_webtalk/${wildcard}${queryString}`;

    const headers = filterHeaders(request.headers as Record<string, string>, HOP_BY_HOP);
    delete headers["host"];
    // undici recomputes content-length from the Buffer body; a stale value
    // from the original request would cause a mismatch.
    delete headers["content-length"];

    const init: RequestInit = { method: request.method, headers };

    // Forward the captured body for POST/PUT/PATCH.
    if (request.body) {
      init.body = request.body as unknown as BodyInit;
    }

    try {
      const upstreamRes = await fetch(upstreamUrl, init);

      // Relay all response headers.
      for (const [key, val] of upstreamRes.headers.entries()) {
        if (!STRIP_RESPONSE_HEADERS.has(key)) reply.header(key, val);
      }

      // getSetCookie() preserves multiple Set-Cookie headers (fetch merges them
      // into a single comma-separated value by default, which breaks cookies).
      const setCookies = upstreamRes.headers.getSetCookie();
      if (setCookies.length > 0) {
        reply.removeHeader("set-cookie");
        for (const cookie of setCookies) {
          reply.header("set-cookie", cookie);
        }
      }

      reply.status(upstreamRes.status);

      const body = await upstreamRes.arrayBuffer();
      const payload = Buffer.from(body);

      // Strip <script> tags from loginA.php responses. The upstream login page
      // includes a popup script that is unnecessary inside the sandboxed iframe
      // (and would interfere with the meta-refresh redirect).
      if (wildcard.includes("loginA.php")) {
        const html = payload.toString("utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        reply.header("content-type", "text/html; charset=UTF-8");
        reply.header("content-length", Buffer.byteLength(html));
        return reply.send(html);
      }

      return reply.send(payload);
    } catch (err) {
      request.log.error({ err, upstreamUrl }, "webtalk proxy request failed");
      return reply.status(502).send({ error: "Upstream unreachable" });
    }
  });
}
