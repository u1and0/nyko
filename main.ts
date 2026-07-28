// main.ts
import {
  APIV1,
  handleBufferList,
  handleScan,
  handleUpload,
} from "./src/api.ts";
import { indexHtml, scriptJs, styleCss } from "./dist/assets.ts";
import { loadBuffer } from "./src/buffer.ts";

await loadBuffer(); // 前回未アップロード分を復元

Deno.serve({ port: 3000 }, async (req) => {
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
    return Response.json({ status: "ok" });
  }
  return new Response("Not Found", { status: 404 });
});
