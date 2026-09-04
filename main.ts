import {
  APIV1,
  handleBufferList,
  handleScan,
  handleUpload,
} from "./src/api.ts";
import { loadBuffer } from "./src/buffer.ts";
import { faviconBase64, indexHtml, scriptJs, styleCss } from "./dist/assets.ts";
import { NYKO_UPLOAD_HOST } from "./dist/config.ts";

const VERSION = "v0.1.1";
const DESCRIPTION =
  "入庫管理用バーコードのスキャン時刻を記録します。別途 nyko-server の起動が必要です。";
const PORT = parseInt(Deno.env.get("NYKO_PORT") ?? "5538", 10);
const URL_TO_OPEN = `http://localhost:${PORT}`;

function showHelp() {
  if (Deno.args.includes("-v")) {
    console.log(`nyko ${VERSION}`);
    Deno.exit(0);
  }
  if (Deno.args.includes("-h")) {
    console.log(`nyko ${VERSION}\n${DESCRIPTION}`);
    Deno.exit(0);
  }
}

/**
 * Windows 限定でexe実行時に
 * クライアントアプリケーション用としてブラウザを開く
 */
function openBrowser() {
  if (Deno.build.os !== "windows") return;
  new Deno.Command("rundll32", {
    args: ["url.dll,FileProtocolHandler", URL_TO_OPEN],
  }).spawn();
}

showHelp();
await loadBuffer(); // 前回未アップロード分を復元
openBrowser();

Deno.serve({
  port: PORT,
  onListen: () => {
    const details = `
  Ctrl+クリックでアクセスしてください👉 http://localhost:${PORT}
  💻 Remote host: ${NYKO_UPLOAD_HOST}/health がokステータスであることを確認してください。`;
    console.log(`✅ ${DESCRIPTION}${details}`);
  },
}, async (req) => {
  const url = new URL(req.url);

  // Static files
  if (url.pathname === "/" && req.method === "GET") {
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/favicon.ico" && req.method === "GET") {
    const bytes = Uint8Array.from(atob(faviconBase64), (c) => c.charCodeAt(0));
    return new Response(bytes, {
      headers: { "Content-Type": "image/x-icon" },
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

  // API
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
      name: "nyko",
      version: VERSION,
      description: DESCRIPTION,
      local_status: "ok",
      remote_host: NYKO_UPLOAD_HOST,
      remote_status: status,
    });
  }
  return new Response("Not Found", { status: 404 });
});
