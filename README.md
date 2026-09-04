バーコード(CODE39)とその読み込み日時をjsonlとして保持し、サーバー側のSQLITE3 DBへアップロードするアプリケーション。

## Build
### 標準的なビルド手順

#### 管理課用

```sh
$ deno task gen:config -- <HOST> <PORT>
$ deno task exe
```

#### 担当者用

```sh
$ deno task gen:config -- <HOST> <PORT> requestor
$ deno task exe:requestor
```


内容は `deno.json/tasks` を参照。

1. gen:config dist/config.tsを出力する。このファイルはHTMLに埋め込まれて配信される。
2. build:js: dist/script.jsを出力する。このファイルはHTMLに埋め込まれて配信される。
3. gen:assets: dist/assets.ts を出力する。このファイルはHTMLに埋め込むファイルのパスを記載する。
4. dev: 開発用にデプロイする。 `deno task build:js`, `deno task gen:assets` を実行に含む。
5. build: Mac, Linux用に実行ファイル化する。 `deno task build:js`, `deno task gen:assets` を実行に含む。
6. exe: Windows用に実行ファイル化する。 `deno task build:js`, `deno task gen:assets` , `deno task set:icon`を実行に含む
7. set:icon: Windows用の実行ファイルにアイコンを付与する。


## Requirements
set:iconには rcedit.exe がWindowsまたはWSL2上で実行できる必要がある。

```sh
$ cd scripts && curl -L -o rcedit-x64.exe https://github.com/electron/rcedit/releases/latest/download/rcedit-x64.exe
```


## Deploy
nyko.exe を適切なパスにコピーする。

## ファイル構成
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
│   └── script.ts           - フロントエンドのスキャナー読み込みの動作
└── static
    ├── index.html          - 配信されるHTMLの元ファイル。dist/assets.ts に書き込まれる
    └── style.css           - 配信されるCSSの元ファイル。dist/assets.ts に書き込まれる

## Run
nyko.exe により自動で開くブラウザにカーソルを合わせる。
もしブラウザが開かない場合は、ブラウザアドレス欄に `http://localhost:5538` を打ち込む。
