---
name: htllm
description: Claudeが説明する内容（構造化データ、データの変化、計画など）に応じて、その場で専用の動的Webページを生成しブラウザに表示する。固定テンプレートは持たない。「〜を見せて」「わかりやすく表示して」「ページで確認したい」と言われたときに使う。
---

# htllm

htllmは、Claudeが説明する内容ごとに専用の動的Webページをその場で生成し、
ブラウザに表示するための薄いサーバー。固定のテンプレートやコンポーネント
実装は持たない。内容ごとに表現もJSXも都度Claudeが選んで書く。

## ワークフロー

### Step 1: 内容を理解し表現方法を決める

説明したい対象（構造化データ、データの変化、処理の流れなど）から、
どう見せると伝わるかを考える。

- 一覧で見せれば十分か、変化を強調すべきか
- `references/patterns.md` に近いパターンがあれば参考にする。無ければ
  その場で新しいJSXを組み立ててよい（後で良いパターンだと分かれば
  `references/patterns.md` に追記する）

### Step 2: JSXを組み立てて配信する

`src/server.ts` の `createServer(jsx: string)` にJSXソースコードの
文字列を渡す。React CDN + Babel standalone でビルドレスにレンダリング
される。

```js
import { createServer } from "./server.js";

const jsx = `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<JSXツリー>);
`;

createServer(jsx).listen(3000);
```

### Step 3: ビルドして起動する

Node.jsのネイティブTS実行は `.js` import から `.ts` ファイルへの解決に
対応していないため、tscでビルドしてから実行する。

```bash
npx tsc
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill 2>/dev/null
node dist/index.js &
timeout 15 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

### Step 4: ブラウザで確認する

指示がなくても自動的にブラウザで開く。

- WSL2: `explorer.exe "http://localhost:3000"`（WSL2はlocalhostを自動フォワードするため直接開ける）
- Linuxデスクトップ: `xdg-open http://localhost:3000`
- macOS: `open http://localhost:3000`

headless Chromiumでの自動スクリーンショットは、このNix環境では
共有ライブラリ不足・glibc ABI不一致で動かないことを確認済み。
確認は上記の方法でブラウザを直接開く。

## デザイン原則

- **ビルドレス**: bundlerを挟まない。CDN経由のReact + その場トランス
  パイル（Babel standalone）を使う。生成のたびに重くなるビルドステップ
  を避けるのがhtllmの核心。
- **都度生成**: 表現ロジックを固定関数・テンプレートエンジンとして
  実装・テストしない。内容に応じてJSXをその場で書く。
- **自己完結**: 外部CDN（React/ReactDOM/Babel）以外への依存を増やさない。

## Notes

- パターン集は `references/patterns.md`。表現の型を増やしたら追記する。
- サーバー本体の実装（`src/server.ts`）はテスト対象。「渡されたJSXを
  正しくHTMLとして配信できるか」はテストするが、「何を表現するか」は
  テストしない。
