import type { Session } from "electron";

export function configureYouTubeSession(session: Session): void {
  session.webRequest.onBeforeSendHeaders(
    { urls: ["https://*.youtube.com/*", "https://*.youtube-nocookie.com/*"] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };
      for (const key of Object.keys(headers))
        if (key.toLowerCase() === "referer") delete headers[key];
      callback({ requestHeaders: { ...headers, Referer: "https://com.atmosfera.iris/" } });
    },
  );
}
