# md-edit-and-viewer

## 概要

ブラウザだけで完結する、自分用の Markdown エディタ／プレビュー Web アプリです。

- 左にエディタ（CodeMirror 6）、右にプレビュー（react-markdown）を並べて表示しながら編集できます
- **サーバー側にはファイルを一切保存しません。** 編集内容はブラウザの localStorage への自動保存と、
  File System Access API（対応ブラウザ）またはダウンロードによる保存のみで完結します
- 対象環境：LAN 内（`192.168.0.110`）で稼働する、認証なしの個人用ツール

## 仕様

### MUST（実装済み）

| # | 機能 | 補足 |
|---|---|---|
| 1 | ファイルを開く | File System Access API 対応ブラウザでは `showOpenFilePicker`、非対応ブラウザでは `<input type="file">` にフォールバック。ドラッグ&ドロップにも対応 |
| 2 | 左右分割・表示切替 | ドラッグでリサイズ可能な分割バー。「エディタのみ／分割／プレビューのみ」を切替可能 |
| 3 | リアルタイムプレビュー | 入力を 150ms デバウンスして再描画 |
| 4 | スクロール同期 | Markdown のソース行位置（`data-line`）を頼りにエディタ⇄プレビューを同期。ON/OFF 切替可 |
| 5 | 保存 | **File System Access で開いた（=ハンドルを持つ）ファイルのみ** Ctrl+S で上書き保存。それ以外（新規作成含む）は常にダウンロード。「名前を付けて保存」はブラウザが対応していれば保存ダイアログを表示 |
| 6 | 新規作成 | 空のタブを追加 |
| 7 | 自動保存・復元 | 編集内容を localStorage に保存し、リロード/再訪時に復元（File System のハンドルはブラウザの仕様上、再読み込み後は復元できないためダウンロード保存に切り替わる） |
| 8 | GFM | テーブル／取り消し線／タスクリスト／自動リンク／脚注 |
| 9 | シンタックスハイライト＋コピー | rehype-highlight（lowlight）。コードブロック右上にコピー用ボタン |
| 10 | ステータスバー | ファイル名・文字数・行数・未保存マーク（●） |
| 11 | ダーク/ライトテーマ | システム設定連動＋手動切替（localStorage に保持） |
| 12 | レスポンシブ | スマホ幅（767px 以下）ではエディタ/プレビューのタブ切替表示になる |

### SHOULD（実装済み）

- Mermaid 図（`mermaid ブロック）、KaTeX 数式（`$...$` / `$$...$$`）
- ツールバー（太字/斜体/取り消し線/見出し/引用/リンク/インラインコード/箇条書き/番号付きリスト/タスクリスト/表挿入）とショートカット（Ctrl+B 太字 / Ctrl+I 斜体 / Ctrl+K リンク）
- 見出しから生成した目次（TOC）パネル。クリックで該当行へジャンプ
- 画像は貼り付け時に data URI として本文に直接埋め込み（サーバー保存なしのため）
- プレビューをスタイル込みの単一 HTML ファイルとしてエクスポート
- 複数ファイルをタブで開く（タブはダブルクリックでリネーム可）

### やらないこと

- サーバーへのファイル保存、ユーザー認証、共同編集

### セキュリティ（XSS 対策）

- `react-markdown` は既定で生 HTML を解釈しない（`rehype-raw` を使用していない）ため、本文中の `<script>` 等はテキストとして扱われます
- `rehype-sanitize` で最終的な HTML 構造を allowlist 方式でサニタイズ（KaTeX / シンタックスハイライトの出力に必要な最小限の属性のみ追加許可）
- リンク（`href`）・画像（`src`）は react-markdown の URL サニタイズを通過させ、`javascript:` 等の危険なスキームを除去。画像の埋め込みに必要な `data:image/*` のみ例外的に許可

## システムアーキテクチャ

- **フロントエンド**: Vite + React 19 + TypeScript（strict）
- **UI**: Tailwind CSS v4 ＋ 自前実装の shadcn/ui 風コンポーネント（Radix UI プリミティブ + class-variance-authority）
- **エディタ**: CodeMirror 6（`@uiw/react-codemirror`）＋ Markdown 言語サポート（フェンスコードの言語別ハイライト付き）
- **Markdown 変換**: `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-highlight` + `rehype-sanitize` + `rehype-slug`
- **状態管理**: Zustand（開いているドキュメント一覧・アクティブタブ管理）
- **配信**: ビルド成果物（静的ファイル）を nginx（Docker コンテナ）で配信。バックエンド API は無し
- **外部サービス連携**: 無し（完全にオフラインで動作。フォント・アイコン等もすべてバンドルに含めており CDN を利用しない）

### 技術選定の理由（抜粋）

| 項目 | 選定 | 理由 |
|---|---|---|
| TypeScript | `~6.0.3` に固定 | 2026年時点の `typescript` の `latest` は TS7（ネイティブ移植版）だが、`typescript-eslint@8.70` が対応する範囲（`>=4.8.4 <6.1.0`）に収まる最新の 6.0.x を採用 |
| コードハイライト | rehype-highlight（lowlight の `common` セット） | shiki より依存関係が軽く、CSS ベースでテーマ切替がしやすいため |
| Mermaid | 動的 `import()` で遅延読み込み | mermaid 本体 + レイアウトエンジン（ELK 等）が非常に大きいため、Mermaid ブロックを実際に描画するときだけ読み込むようにしてメインバンドルを軽量に保っている |
| HTML エクスポート | プレビュー DOM をそのままスナップショット | 変換パイプラインを二重管理せずに済み、Mermaid/KaTeX の描画結果も含めてそのまま書き出せる |
| shadcn/ui | CLI 生成ではなく手書き | 依存を最小限にし、Tailwind v4 の構成に合わせて調整するため |

## システム構成

### サーバー構成

- OS: Ubuntu Server 24.04 LTS（VirtualBox 上、IP: `192.168.0.110`）
- Docker Compose（本番: `docker-compose.yml` / 開発: `docker-compose.dev.yml`）
- 公開ポート: `.env` の `APP_PORT`（既定 `8090`）
- ヘルスチェック: `GET /healthz` が `200 ok` を返すことを確認

### ディレクトリ構成

```
md-edit-and-viewer/
├── app/                      # フロントエンドのソース一式（Vite プロジェクト）
│   ├── src/
│   │   ├── components/       # UI コンポーネント（ui / layout / editor / preview / toolbar / tabs / toc）
│   │   ├── hooks/            # useTheme, useScrollSync, useDebouncedValue など
│   │   ├── lib/              # markdown 変換設定、File System Access ラッパ、永続化、HTML エクスポート
│   │   ├── store/            # Zustand ストア（開いているドキュメント管理）
│   │   ├── types/            # 型定義（ドキュメント型、File System Access のアンビエント型）
│   │   └── test/             # Vitest セットアップ
│   ├── package.json / pnpm-lock.yaml
│   └── vite.config.ts ほか各種設定
├── Dockerfile                # 本番用 multi-stage（node でビルド → nginx:alpine で配信）
├── docker-compose.yml        # 本番用
├── docker-compose.dev.yml    # 開発用（bind mount + vite dev server）
├── nginx.conf
├── Makefile
├── deploy.sh
├── .env.example / .env
└── .dockerignore
```

### 環境変数（`.env.example`）

| 変数名 | 既定値 | 説明 |
|---|---|---|
| `APP_PORT` | `8090` | ホスト側の公開ポート（本番・開発 dev サーバー共通） |

## クラス／モジュール構成

| モジュール | 役割 |
|---|---|
| `src/App.tsx` | 画面全体のレイアウト・状態配線（アクティブドキュメント、保存/エクスポート/ショートカット等） |
| `src/store/documentsStore.ts` | 開いているドキュメント（タブ）一覧、File System のハンドル、localStorage への自動保存（デバウンス） |
| `src/lib/fileSystemAccess.ts` | File System Access API のラッパー（機能検出・`<input type="file">` フォールバック・ドラッグ&ドロップ読込・保存） |
| `src/lib/persistence.ts` | localStorage への保存/復元（スキーマバージョン付き） |
| `src/lib/markdown/plugins.ts` | remark/rehype プラグイン構成（GFM・数式・ハイライト・サニタイズ・行位置付与） |
| `src/lib/markdown/sanitizeSchema.ts` | `rehype-sanitize` の許可スキーマ（KaTeX/ハイライト出力に必要な最小限を追加） |
| `src/lib/markdown/toc.ts` | 見出し抽出（TOC 用。`github-slugger` で id を生成） |
| `src/lib/editorCommands.ts` | ツールバー／ショートカットから CodeMirror を操作するコマンド群 |
| `src/lib/exportHtml.ts` | プレビュー DOM をスタイル込みの単一 HTML として書き出す |
| `src/components/editor/CodeEditor.tsx` | CodeMirror 6 のラッパー（Markdown 言語・画像貼り付け拡張など） |
| `src/components/preview/MarkdownPreview.tsx` | react-markdown のラッパー（コードブロック・リンクのカスタム描画） |
| `src/components/preview/Mermaid.tsx` | Mermaid 図の遅延読み込み＋描画 |
| `src/hooks/useScrollSync.ts` | エディタ⇄プレビューのスクロール同期ロジック |
| `src/hooks/useTheme.tsx` | ダーク/ライト/システムテーマの管理 |

## セットアップ手順

### 初回セットアップ（Ubuntu サーバー上）

```bash
git clone <このリポジトリのURL> md-edit-and-viewer
cd md-edit-and-viewer
cp .env.example .env
make up
```

起動後、`http://192.168.0.110:8090`（`.env` の `APP_PORT` を変更した場合はそのポート）にアクセスしてください。

### 日常運用（make コマンド一覧）

| コマンド | 内容 |
|---|---|
| `make up` | ビルド＋起動（`docker compose up -d --build`）。本番は毎回ビルドが必要な構成です |
| `make down` | 停止 |
| `make restart` | 再起動 |
| `make logs` | ログ表示（`logs -f --tail=100`） |
| `make rebuild` | キャッシュなしで再ビルド＋起動 |
| `make update` | `git pull` → `make up` |
| `make dev` | 開発モード起動（`docker-compose.dev.yml`。ホットリロード） |
| `make dev-down` | 開発モード停止 |
| `make ps` | 状態確認 |
| `make sh` | コンテナ内シェルに入る |
| `make clean` | コンテナ・イメージ・未使用ボリュームの削除 |

デプロイは `./deploy.sh`（コードのみ、常に再ビルド）／ `./deploy.sh all`（設定ファイルも転送し、down してから再ビルド）を使用してください。

### ローカル開発（Docker を使わない場合）

```bash
cd app
corepack enable
pnpm install
pnpm dev        # http://localhost:5173
```

主なコマンド：

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 型チェック＋本番ビルド（`dist/`） |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm typecheck` | 型チェックのみ |
| `pnpm test` | Vitest（単体テスト） |
| `pnpm test:coverage` | カバレッジ付きテスト |

### トラブルシュート

- **ポート競合（`8090` が使用中）**: `.env` の `APP_PORT` を空いているポートに変更し、`make up` を再実行してください（10_develop 内の既存プロジェクトが使用中のポート: `7291` / `8010` / `8020` / `3010`）
- **`make up` 後に画面が表示されない**: `make logs` でコンテナのログを確認し、`make ps` で `healthy` になっているか確認してください
- **保存したはずの内容が消えた**: File System Access 非対応ブラウザ、またはハンドルを持たない新規ファイルはページを閉じると保存先の紐付けが失われます。重要な内容は「名前を付けて保存」または Ctrl+S でのダウンロードを行ってください
- **Mermaid/数式が表示されない**: コードブロックの言語指定が ```` ```mermaid ```` になっているか、数式が `$...$` / `$$...$$` で囲まれているかを確認してください

## 今後の拡張余地

サーバー保存・認証への移行方針は [CLAUDE.md](CLAUDE.md) を参照してください。
