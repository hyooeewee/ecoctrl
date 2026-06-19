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
import { Readable } from "node:stream";
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

      // loginA.php needs its <script> tags stripped, so buffer + rewrite it.
      // The login page is small, so buffering is fine here.
      if (wildcard.includes("loginA.php")) {
        const payload = Buffer.from(await upstreamRes.arrayBuffer());
        const html = payload.toString("utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        reply.header("content-type", "text/html; charset=UTF-8");
        reply.header("content-length", Buffer.byteLength(html));
        return reply.send(html);
      }

      // com_index.php renders the upstream's own top nav bar (title + user
      // avatar) via JS. We embed it inside the admin shell, which already has
      // its own header, so hide the duplicate nav and reclaim its 55px offset.
      if (wildcard.includes("com_index.php")) {
        const source = Buffer.from(await upstreamRes.arrayBuffer()).toString("utf8");
        const style =
          "<style>#id_sNav{display:none !important;}" +
          "#id_sMainContainer{top:0 !important;}" +
          "aside.sidebar-menu{padding-top:0 !important;}</style>";
        // Inject before </head> if present, otherwise prepend to the document.
        const html = /<\/head>/i.test(source)
          ? source.replace(/<\/head>/i, `${style}</head>`)
          : style + source;
        reply.header("content-type", "text/html; charset=UTF-8");
        reply.header("content-length", Buffer.byteLength(html));
        return reply.send(html);
      }

      // Stream everything else (images, JS, CSS) straight through without
      // buffering — large assets like floor-plan base maps would otherwise
      // block on a full in-memory read before any byte reaches the client.
      if (upstreamRes.body) {
        return reply.send(
          Readable.fromWeb(upstreamRes.body as Parameters<typeof Readable.fromWeb>[0]),
        );
      }
      return reply.send();
    } catch (err) {
      request.log.error({ err, upstreamUrl }, "webtalk proxy request failed");
      return reply.status(502).send({ error: "Upstream unreachable" });
    }
  });
}
