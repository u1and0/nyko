バーコード(CODE39)とその読み込み日時をjsonlとして保持し、サーバー側のSQLITE3
DBへアップロードするアプリケーション。

## Build

### 標準的なビルド手順

```sh
$ deno task gen:config -- <HOST> <PORT>
$ deno task exe
```

管理課用・担当者用の区別はビルド時ではなく、画面上のモード切替で行う (後述)。
exe は 1 種類のみ。

内容は `deno.json/tasks` を参照。

1. gen:config
   dist/config.tsを出力する。このファイルはHTMLに埋め込まれて配信される。
2. build:js:
   dist/script.jsを出力する。このファイルはHTMLに埋め込まれて配信される。
3. gen:assets: dist/assets.ts
   を出力する。このファイルはHTMLに埋め込むファイルのパスを記載する。
4. dev: 開発用にデプロイする。 `deno task build:js`, `deno task gen:assets`
   を実行に含む。
5. build: Mac, Linux用に実行ファイル化する。 `deno task build:js`,
   `deno task gen:assets` を実行に含む。
6. exe: Windows用に実行ファイル化する。 `deno task build:js`,
   `deno task gen:assets` , `deno task set:icon`を実行に含む
7. set:icon: Windows用の実行ファイルにアイコンを付与する。

## Requirements

set:iconには rcedit.exe がWindowsまたはWSL2上で実行できる必要がある。

```sh
$ cd scripts && curl -L -o rcedit-x64.exe https://github.com/electron/rcedit/releases/latest/download/rcedit-x64.exe
```

## Deploy

nyko.exe を適切なパスにコピーする。

## ファイル構成

```text
.
├── deno.json
├── deno.lock - 直接編集禁止
├── main.ts                 - scriptのエントリーポイント。APIエンドポイントが書かれている。
├── dist
│   ├── assets.ts           - html,css,scriptをまとめた配信ファイル。直接編集禁止
│   ├── config.ts           - リモートサーバー設定を書き込む設定。直接編集禁止
│   └── script.js           - scriptタグに書かれるjs。直接編集禁止
├── scan_buffer.jsonl       - code39と日時を書き込むバッファ
├── scripts
│   ├── build_assets.ts     - 配信ファイルdist/assets.tsの書き込み指示書
│   └── build_config.ts     - 配信ファイルdist/config.tsの書き込み指示書
├── src
│   ├── api.ts              - データの取扱とサーバーサイドへの処理
│   ├── buffer.ts           - その日のスキャン結果を保持する
│   ├── stage.ts            - モード(stage)の定義。フロント/サーバー共用
│   └── script.ts           - フロントエンドのスキャナー読み込みの動作
└── static
    ├── index.html          - 配信されるHTMLの元ファイル。dist/assets.ts に書き込まれる
    └── style.css           - 配信されるCSSの元ファイル。dist/assets.ts に書き込まれる
```

## Run

nyko.exe により自動で開くブラウザにカーソルを合わせる。
もしブラウザが開かない場合は、ブラウザアドレス欄に `http://localhost:5538`
を打ち込む。

## 運用

### モード切替

スキャンは 2 か所で行われ、画面上部のボタンで切り替える。

| モード                    | 読み取る人     | 意味                                             | 背景色 |
| ------------------------- | -------------- | ------------------------------------------------ | ------ |
| 管理課 受領 (`manager`)   | 管理課         | 物品が管理課に到着 (PNSearch の進捗 7「受領済」) | 濃紺   |
| 担当者 引取 (`requestor`) | 要求元の担当者 | 物品を引き取り (PNSearch の進捗 8「引取済」)     | 濃紫   |

- 既定は **管理課 受領** モード。PC ごとに初回だけ正しいモードを選ぶ。
  選択内容はブラウザの `localStorage` (`nyko.stage`)
  に保存され、次回起動時も維持される。
- 現在のモードは画面上部のバナー文字と、待機中の背景色で常時わかる。
  一時的に表示される緑 (登録成功)、黄 (重複)、赤 (エラー) はモード色とは別物。
- モードはスキャンした時点で 1 件ごとに記録される。
  スキャン後にモードを切り替えても、すでにバッファにある分の記録は変わらない。
- 同一バーコードでも、モードが違えば両方記録される (管理課で受領 →
  担当者が引取)。 同一モードでの 2
  回目は「本日すでに読み取り済み」として無視する (先勝ち)。

### 誤スキャンの訂正

誤ったモードでスキャンしアップロードしてしまった場合は、サーバー側の
`data/entry_log.db` を直接修正する (アプリに上書き機能は無い)。

```sql
-- 確認
SELECT barcode, stage, entry_completed_at FROM entry_log WHERE barcode = '*1234567890*';
-- 誤った stage の行を削除 (barcode は * を含めて保存されている)
DELETE FROM entry_log WHERE barcode = '*1234567890*' AND stage = 'requestor';
```

アップロード前であれば、`scan_buffer.jsonl` の当該行を削除してから nyko
を再起動する。
