# CLAUDE.md（md-edit-and-viewer）

> 10_develop 配下の共通規約（`../CLAUDE.md`）を前提に、本プロジェクト固有の情報のみ記載する。

## プロジェクト構成

- アプリ本体は `app/` 配下（Vite プロジェクト）。ルート直下は Docker / デプロイ関連ファイルのみ
- サーバー保存なし・認証なしの完全クライアント完結アプリ（バックエンド API は存在しない）
- 詳細なディレクトリ構成・モジュール一覧は [README.md](README.md) を参照

## 技術選定理由（README.md に無い補足）

- **TypeScript は `~6.0.3` に固定している。** `npm view typescript` の `latest` は TS7（ネイティブ移植版コンパイラ）だが、
  本プロジェクトが使う `typescript-eslint@8.70` の peerDependencies は `>=4.8.4 <6.1.0` までしかサポートしていない。
  TS7 を使うと lint が壊れるため、意図的に 6.0.x へ固定している。将来 `typescript-eslint` が TS7 に対応したら見直してよい
- **shadcn/ui は CLI で生成せず手書きしている。** Tailwind v4（CSS ファースト設定）＋ React 19 の組み合わせでの
  互換性調整を自分たちで完結させるため。`components.json` は将来 CLI を併用する場合の参考として残してある
- **Mermaid は動的 `import()` で遅延読み込みしている。** 静的 import すると ELK レイアウトエンジン込みで
  メインバンドルが 2MB 近く肥大化するため、実際に Mermaid ブロックを描画するタイミングまで読み込みを遅らせている
- **HTML エクスポートはプレビュー DOM のスナップショット方式。** remark/rehype パイプラインを書き出し用に
  二重管理しない設計。KaTeX のフォントは書き出し時に `fetch` して data URI に変換し埋め込むが、
  取得に失敗した場合はそのまま（フォント欠落）で出力する（エクスポートは SHOULD 要件のため許容している）
- **保存の挙動は「開き方」で決まる。** File System Access API の `showOpenFilePicker` で開いた（＝ハンドルを保持している）
  ファイルのみ Ctrl+S で上書き保存する。新規作成したファイルはブラウザが FSA に対応していてもダウンロードになる
  （毎回ネイティブの保存ダイアログが出るのを避けるため）。FSA のネイティブダイアログを明示的に使いたい場合は
  「名前を付けて保存」を使う
- **スクロール同期のループ防止に `requestAnimationFrame` を使ってはいけない。** 以前は rAF でガードを
  解除していたが、(1) プログラムから書き込んだスクロールの `scroll` イベントがガード解除後に届くと
  反対側のハンドラがユーザーの操作したペインを書き戻す、(2) タブ非表示・ウィンドウ遮蔽時は rAF が
  止まりガードが永久に解除されず同期が完全停止する、という2つの不具合があった。
  現在は `useScrollSync` で「操作したペインが駆動権を持ち、追従側は書き込み直後の一定時間だけ
  `scroll` を無視する」方式を `performance.now()` ベースで実装している。描画に依存しないこと、
  および入力手段（ホイール/スクロールバー/キーボード）を問わないことが選定理由
- **rehype-sanitize に加えて react-markdown 自体の `urlTransform` も上書きしている。** react-markdown は既定で
  `data:` スキームの URL（href/src とも）を丸ごと除去するため、貼り付け画像の data URI 埋め込み機能が動かない。
  `src/lib/markdown/plugins.ts` の `markdownUrlTransform` で `img` の `src` に限り `data:image/*` を許可している

## 開発コマンド

```bash
cd app
pnpm install
pnpm dev            # 開発サーバー
pnpm build           # tsc -b && vite build
pnpm lint            # ESLint（react-hooks の静的解析ルールが厳しめなので注意）
pnpm format          # Prettier（prettier-plugin-tailwindcss でクラス順も整形）
pnpm test            # Vitest
pnpm test:coverage
```

Docker 経由の開発・運用コマンドは [README.md](README.md) の「日常運用」を参照。

## コーディング規約（本プロジェクト固有）

- パスエイリアス `@/*` → `app/src/*`
- UI コンポーネントは `src/components/ui/`（shadcn 風、Radix UI + class-variance-authority）。
  新しい shadcn 風コンポーネントを追加する際もこのディレクトリ・命名規則に合わせる
- Markdown 変換パイプライン（remark/rehype プラグイン構成）は `src/lib/markdown/` に集約する。
  新しいプラグインを追加する際は `plugins.ts` の `remarkPlugins`/`rehypePlugins` に追加し、
  必要なら `sanitizeSchema.ts` の allowlist も更新する（sanitize は常に最後段に置くこと）
- 状態管理は Zustand。新しいグローバル状態が必要になっても Context 濫用より Zustand ストアへの追加を優先する
- UI 文言・エラーメッセージはすべて日本語（ユーザー共通設定に準拠）

## 今後の拡張余地

### サーバー保存への移行方針（将来必要になった場合）

- 現状は `app/` のみで完結しているが、サーバー保存を追加する場合は `docker-compose.yml` に
  ファイル保存用のサービス（例: 軽量な Node/Go API + `./data/` へのバインドマウント）を追加する構成を想定
- `src/lib/fileSystemAccess.ts` と同じインターフェース（`OpenedFile` / 保存関数群）を維持したまま、
  内部実装だけサーバー API 呼び出しに差し替えられるように設計してある（呼び出し側の `App.tsx` は
  抽象化された関数しか使っていない）

### 認証への移行方針（将来必要になった場合）

- LAN 内限定・単一ユーザー用途のため現状は認証なし
- 必要になった場合は Cloudflare Access（Cloudflare Tunnel 経由での公開を前提とする場合）か、
  nginx の Basic 認証（`nginx.conf` に `auth_basic` を追加）のいずれかを想定。
  アプリ側のコード変更は不要な想定
