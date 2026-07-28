// api.ts
import { addScan, archiveAndClear, getBuffer, ScanRecord } from "./buffer.ts";

// サーバー側の受信APIエンドポイント。環境に応じて起動引数/envで上書き。
const HOST = Deno.env.get("NYKO_UPLOAD_HOST") ?? "http://localhost:3000";
export const APIV1 = "/api/v1";

const BARCODE_RE = /^\d{10}$|^\d{13}$/;

export async function handleScan(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const barcode = body?.barcode;

  if (typeof barcode !== "string" || !BARCODE_RE.test(barcode)) {
    return Response.json(
      { result: "INVALID_FORMAT", barcode },
      { status: 400 },
    );
  }

  const record = await addScan(barcode);
  if (record === null) {
    return Response.json({ result: "DUPLICATE_IN_SESSION", barcode });
  }
  return Response.json({ result: "BUFFERED", ...record });
}

export function handleBufferList(): Response {
  return Response.json({ buffer: getBuffer() });
}

export async function handleUpload(): Promise<Response> {
  const records: ScanRecord[] = getBuffer();
  if (records.length === 0) {
    return Response.json({ result: "EMPTY" });
  }

  try {
    const res = await fetch(`${HOST}${APIV1}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) {
      return Response.json(
        { result: "UPLOAD_FAILED", status: res.status },
        { status: 502 },
      );
    }
  } catch (e) {
    // LAN未接続時はここに来る。バッファは消さずに残す。
    return Response.json(
      { result: "NETWORK_ERROR", message: String(e) },
      { status: 503 },
    );
  }

  await archiveAndClear();
  return Response.json({ result: "UPLOADED", count: records.length });
}
