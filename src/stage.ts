// スキャンする人の役割 (stage) の定義。
// フロントエンド (script.ts) とサーバー側 (api.ts/buffer.ts) の両方から import するため、
// Deno API や dist/config.ts に依存する import を一切持たせないこと。
// nyko-server の db.ts (STAGES) と同じ値。リポジトリが別なので、変更時は両方を揃える。

export const STAGES = ["manager", "requestor"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  manager: "管理課",
  requestor: "担当者",
};

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v);
}
