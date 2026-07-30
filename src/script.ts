// フロントエンドのスキャナー読み込みの動作
// esbuildでdist/script.jsへバンドルして、index.htmlと共に配信される。

import { APIV1 } from "./api.ts";

type UiState =
  | "idle"
  | "scanning"
  | "success"
  | "warn"
  | "error";

interface ScanRecord {
  barcode: string;
  entry_completed_at: string;
}

interface ScanResponse {
  result: "INVALID_FORMAT" | "DUPLICATE_IN_SESSION" | "BUFFERED";
  barcode: string;
}

const AUTO_RESET_MS = 3000;

const body = document.body;
const messageEl = document.getElementById("message") as HTMLParagraphElement;
const detailEl = document.getElementById("detail") as HTMLParagraphElement;
const countEl = document.getElementById("count") as HTMLSpanElement;
const listEl = document.getElementById("list") as HTMLDivElement;
const scanInput = document.getElementById(
  "scan-input",
) as HTMLInputElement;
const uploadBtnElem = document.getElementById(
  "upload-btn",
) as HTMLButtonElement;

function setState(state: UiState, message: string, detail?: string) {
  body.className = state;
  messageEl.textContent = message;
  detailEl.textContent = detail || "";
  if (state !== "idle") {
    setTimeout(
      () => setState("idle", "スキャンしてください", ""),
      AUTO_RESET_MS,
    );
  }
}

/**
 * スキャナー読み込み
 * /api/v1/scan へCODE39と日時情報をPOST
 */
async function submitBarcode(barcode: string) {
  try {
    const res = await fetch(`${APIV1}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode }),
    });
    const data: ScanResponse = await res.json();

    if (data.result === "INVALID_FORMAT") {
      setState("error", "桁数不正です", barcode);
    } else if (data.result === "DUPLICATE_IN_SESSION") {
      setState("warn", "本日すでに読み取り済みです", barcode);
    } else if (data.result === "BUFFERED") {
      setState("success", "登録しました", barcode);
      refreshBuffer();
    }
  } catch (e) {
    setState("error", "通信エラー", String(e));
  }
}

async function refreshBuffer() {
  const res = await fetch(`${APIV1}/buffer`);
  const data = await res.json();
  countEl.textContent = "本日: " + data.buffer.length + "件";
  listEl.innerHTML = data.buffer
    .slice()
    .reverse()
    .map((r: ScanRecord) => `<div>${r.barcode} — ${r.entry_completed_at}</div>`)
    .join("");
}

uploadBtnElem.addEventListener("click", async () => {
  setState("scanning", "アップロード中…", "");
  try {
    const res = await fetch(`${APIV1}/upload`, { method: "POST" });
    const data = await res.json();
    if (data.result === "UPLOADED") {
      setState("success", "アップロード完了", data.count + "件");
      refreshBuffer();
    } else if (data.result === "EMPTY") {
      setState("warn", "アップロード対象がありません", "");
    } else if (data.result === "NETWORK_ERROR") {
      setState(
        "error",
        "サーバーに接続できません",
        "LAN接続を確認してください",
      );
    } else {
      setState("error", "アップロード失敗", JSON.stringify(data));
    }
  } catch (e) {
    setState("error", "アップロード失敗", String(e));
  }
});

function refocusInput() {
  scanInput.focus();
}

document.addEventListener("click", refocusInput);
globalThis.addEventListener("focus", refocusInput);
scanInput.addEventListener("blur", () => setTimeout(refocusInput, 0));

scanInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const barcode = scanInput.value.trim();
  scanInput.value = "";
  if (barcode.length === 0) return;
  submitBarcode(barcode);
});

refocusInput();
refreshBuffer();
