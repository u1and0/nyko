// buffer.ts
// その日のスキャン結果を保持する。
// 「正本」はリモートのentry_log.db。ここはアップロード前の一時領域。

export interface ScanRecord {
  barcode: string;
  entry_completed_at: string; // ISO8601
}

const BUFFER_PATH = "./scan_buffer.jsonl";

let memBuffer: ScanRecord[] = [];

/** 起動時に前回未アップロード分があれば読み込む */
export async function loadBuffer(): Promise<ScanRecord[]> {
  try {
    const text = await Deno.readTextFile(BUFFER_PATH);
    memBuffer = text
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
  } catch {
    memBuffer = []; // ファイルなし = 初回起動
  }
  return memBuffer;
}

function getJPDateTimeNow() {
  const now = new Date();
  // スウェーデンロケールは日付区切りにハイフンをつけるため。
  const jstString = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now).replace(" ", "T");
  return jstString;
}

/** スキャン1件を追記。同一barcodeの重複は無視（先勝ち） */
export async function addScan(barcode: string): Promise<ScanRecord | null> {
  if (memBuffer.some((r) => r.barcode === barcode)) {
    return null; // 本日分ですでにスキャン済み
  }
  const record: ScanRecord = {
    barcode,
    entry_completed_at: getJPDateTimeNow(),
  };
  memBuffer.push(record);
  await Deno.writeTextFile(BUFFER_PATH, JSON.stringify(record) + "\n", {
    append: true,
  });
  return record;
}

export function getBuffer(): ScanRecord[] {
  return [...memBuffer];
}

/** アップロード成功後、jsonlをarchiveへ退避しバッファをクリア */
export async function archiveAndClear(): Promise<void> {
  const stamp = getJPDateTimeNow().replace(/[:.]/g, "-");
  try {
    await Deno.rename(BUFFER_PATH, `./nyko_archive/scan_buffer_${stamp}.jsonl`);
  } catch {
    // archiveディレクトリが無ければ作成してリトライ
    await Deno.mkdir("./nyko_archive", { recursive: true });
    await Deno.rename(BUFFER_PATH, `./nyko_archive/scan_buffer_${stamp}.jsonl`);
  }
  memBuffer = [];
}
