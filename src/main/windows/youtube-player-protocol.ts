import { app, net, protocol } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { env } from "../env";

export function registerYoutubePlayer(): void {
  // A separate origin keeps the official API away from the file/dev console and its IPC.
  // Only bundled assets are served in production; it never exposes Iris home files.
  protocol.handle("iris-player", async (request) => {
    const url = new URL(request.url);
    const isDevelopment = !app.isPackaged && Boolean(env.rendererUrl);
    if (
      request.method !== "GET" ||
      url.host !== "app" ||
      (!isDevelopment &&
        !/^\/(?:youtube-player\.html|assets\/[\w.-]+\.(?:js|css))$/.test(url.pathname))
    )
      return new Response(null, { status: 404 });
    const target = isDevelopment
      ? new URL(url.pathname + url.search, env.rendererUrl).href
      : pathToFileURL(join(__dirname, "../renderer", url.pathname.slice(1))).href;
    try {
      const response = await net.fetch(target);
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set(
        "Content-Type",
        url.pathname.endsWith(".html")
          ? "text/html"
          : url.pathname.endsWith(".css")
            ? "text/css"
            : "text/javascript",
      );
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
