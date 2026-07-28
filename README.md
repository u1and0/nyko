バーコード(CODE39)とその読み込み日時をjsonlとして保持し、サーバー側のSQLITE3 DBへアップロードするアプリケーション。

## ビルド
詳細は `deno.json/tasks` を参照。

1. build:js: dist/script.jsを出力する。このjsはHTMLに埋め込まれて配信される。
2. gen:assets: dist/assets.ts を出力する。このtsはHTMLに埋め込むファイルのパスを記載する。
3. dev: 開発用にデプロイする。 `deno task build:js`, `deno task gen:assets` を実行に含む。


### ファイル構想
.
├── deno.json
├── deno.lock - 直接編集禁止
├── dist
│   ├── assets.ts           - html,css,scriptをまとめた配信ファイル。直接編集禁止
│   ├── config.ts           - リモートサーバー設定を書き込む設定。直接編集禁止
│   └── script.js           - scriptタグに書かれるjs。直接編集禁止
├── main.ts                 - scriptのエントリーポイント。APIエンドポイントが書かれている。
├── scan_buffer.jsonl       - code39と日時を書き込むバッファ
├── scripts
│   ├── build_assets.ts     - 配信ファイルdist/assets.tsの書き込み指示書
│   └── build_config.ts     - 配信ファイルdist/config.tsの書き込み指示書
├── src
│   ├── api.ts              - データの取扱とサーバーサイドへの処理
│   ├── buffer.ts           - その日のスキャン結果を保持する
│   └── script.ts           - フロントエンドのスキャナー読み込みの動作
└── static
    ├── index.html          - 配信されるHTMLの元ファイル。dist/assets.ts に書き込まれる
    └── style.css           - 配信されるCSSの元ファイル。dist/assets.ts に書き込まれる

