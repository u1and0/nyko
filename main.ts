// main.ts
import {
  APIV1,
  handleBufferList,
  handleScan,
  handleUpload,
} from "./src/api.ts";
import { loadBuffer } from "./src/buffer.ts";
import { indexHtml, scriptJs, styleCss } from "./dist/assets.ts";
import { NYKO_UPLOAD_HOST } from "./dist/config.ts";

await loadBuffer(); // 前回未アップロード分を復元

const localPort = 5538;

Deno.serve({ port: localPort }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/" && req.method === "GET") {
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/style.css" && req.method === "GET") {
    return new Response(styleCss, {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }
  if (url.pathname === "/script.js" && req.method === "GET") {
    return new Response(scriptJs, {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
  if (url.pathname === `${APIV1}/scan` && req.method === "POST") {
    return await handleScan(req);
  }
  if (url.pathname === `${APIV1}/buffer` && req.method === "GET") {
    return handleBufferList();
  }
  if (url.pathname === `${APIV1}/upload` && req.method === "POST") {
    return await handleUpload();
  }
  if (url.pathname === "/health") {
    let status;
    try {
      const timeout = 5_000;
      await Promise.race([
        fetch(`${NYKO_UPLOAD_HOST}/health`).then((r) => r.json()).then((d) =>
          d.status
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout after 5s")), timeout)
        ),
      ]);
      status = "ok";
    } catch (err) {
      console.error("Health check failed:", err);
      status = "Timeout error";
    }
    return Response.json({
      local_status: "ok",
      remote_status: status,
    });
  }
  return new Response("Not Found", { status: 404 });
});
