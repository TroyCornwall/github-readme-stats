// Cloudflare Worker entry point for github-readme-stats.
// Sets up a process.env shim so all existing src/ code works unchanged,
// then routes requests to the same handlers Vercel uses.

const ROUTES = {
  "/api": () => import("../api/index.js"),
  "/api/pin": () => import("../api/pin.js"),
  "/api/top-langs": () => import("../api/top-langs.js"),
  "/api/wakatime": () => import("../api/wakatime.js"),
  "/api/gist": () => import("../api/gist.js"),
  "/api/status/up": () => import("../api/status/up.js"),
  "/api/status/pat-info": () => import("../api/status/pat-info.js"),
};

export default {
  async fetch(request, env) {
    // Shim process.env so all existing process.env.PAT_* / process.env.* reads work.
    globalThis.process ??= {};
    globalThis.process.env = { ...env };

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Root redirect (mirrors vercel.json)
    if (path === "/") {
      return Response.redirect(
        "https://github.com/anuraghazra/github-readme-stats",
        302,
      );
    }

    const loader = ROUTES[path];
    if (!loader) {
      return new Response("Not Found", { status: 404 });
    }

    const mod = await loader();
    const handler = mod.default;

    // Build a Vercel-compatible req/res pair.
    const query = Object.fromEntries(url.searchParams.entries());
    const req = { query };

    const headers = new Headers();
    let body = "";

    const res = {
      setHeader(key, value) {
        headers.set(key, value);
      },
      send(data) {
        body = data;
      },
    };

    await handler(req, res);

    return new Response(body, { headers });
  },
};
