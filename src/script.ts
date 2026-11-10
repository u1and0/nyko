// フロントエンドのスキャナー読み込みの動作
// esbuildでdist/script.jsへバンドルして、index.htmlと共に配信される。

import { APIV1 } from "./api.ts";
import { isStage, Stage, STAGE_LABEL } from "./stage.ts";

type UiState =
  | "idle"
  | "scanning"
  | "success"
  | "warn"
  | "error";

interface ScanRecord {
  barcode: string;
  entry_completed_at: string;
  stage: Stage;
}

interface ScanResponse {
  result:
    | "INVALID_FORMAT"
    | "INVALID_STAGE"
    | "DUPLICATE_IN_SESSION"
    | "BUFFERED";
  barcode: string;
}

const AUTO_RESET_MS = 3000;
const STAGE_STORAGE_KEY = "nyko.stage";
/** localStorage に保存が無い初回起動時のモード */
const DEFAULT_STAGE: Stage = "manager";
/** モードごとのバナー文言 */
const STAGE_BANNER: Record<Stage, string> = {
  manager: `${STAGE_LABEL.manager} 受領モード`,
  requestor: `${STAGE_LABEL.requestor} 引取モード`,
};

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
const stageBannerEl = document.getElementById(
  "stage-banner",
) as HTMLParagraphElement;
const stageBtnElems = Array.from(
  document.querySelectorAll<HTMLButtonElement>("button[data-stage]"),
);

/** 現在のモード。初回起動時は DEFAULT_STAGE */
let currentStage: Stage = DEFAULT_STAGE;

/** localStorage はプライベートモード等で例外を投げ得る */
function readStoredStage(): Stage {
  try {
    const v = localStorage.getItem(STAGE_STORAGE_KEY);
    return isStage(v) ? v : DEFAULT_STAGE;
  } catch {
    return DEFAULT_STAGE;
  }
}

function storeStage(stage: Stage) {
  try {
    localStorage.setItem(STAGE_STORAGE_KEY, stage);
  } catch {
    // 保存できなくても動作は継続する (次回起動時は既定モード)
  }
}

/** モードを画面へ反映する */
function applyStage(stage: Stage) {
  currentStage = stage;
  document.documentElement.dataset.stage = stage;
  stageBannerEl.textContent = STAGE_BANNER[stage];
  for (const btn of stageBtnElems) {
    btn.classList.toggle("selected", btn.dataset.stage === stage);
  }
}

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
  const stage = currentStage;
  try {
    const res = await fetch(`${APIV1}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode, stage }),
    });
    const data: ScanResponse = await res.json();

    if (data.result === "INVALID_FORMAT") {
      setState("error", "桁数不正です", barcode);
    } else if (data.result === "INVALID_STAGE") {
      setState("error", "モードが不正です", "モードを選び直してください");
    } else if (data.result === "DUPLICATE_IN_SESSION") {
      setState(
        "warn",
        `本日すでに「${STAGE_LABEL[stage]}」で読み取り済みです`,
        barcode,
      );
    } else if (data.result === "BUFFERED") {
      setState(
        "success",
        `「${STAGE_LABEL[stage]}」として登録しました`,
        barcode,
      );
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
    .map((r: ScanRecord) =>
      `<div>[${
        STAGE_LABEL[r.stage] ?? r.stage
      }] ${r.barcode} — ${r.entry_completed_at}</div>`
    )
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

// モード切替。確認ダイアログは出さない (stage は各レコードに埋め込み済みで、
// 影響は切替後のスキャンのみ)。document の click で入力欄へフォーカスが戻る。
for (const btn of stageBtnElems) {
  btn.addEventListener("click", () => {
    const stage = btn.dataset.stage;
    if (!isStage(stage)) return;
    applyStage(stage);
    storeStage(stage);
    setState("idle", "スキャンしてください", "");
  });
}

applyStage(readStoredStage());
refocusInput();
refreshBuffer();
