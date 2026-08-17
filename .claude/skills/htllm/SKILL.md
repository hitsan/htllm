---
name: htllm
description: Claudeが説明する内容（構造化データ、データの変化、計画など）に応じて、その場で専用の動的Webページを生成しブラウザに表示する。「〜を見せて」「わかりやすく表示して」「ページで確認したい」と言われたときに使う。
---

# htllm

htllmは、説明したい内容をテキストで渡すと、部品カタログから構成された
Webページに変換して配信するサーバー。ページ下部のチャットに文字を打つと、
どの部品についての発言かが推測され、質問なら回答が返り、指示ならその部品が
書き換わる。

## 仕組み

```
テキスト → buildTree(LLM) → doc.json (Node[]) → renderTree → JSX → ブラウザ
                                  ↑                              ↓
                              respond(LLM) ←──── スレッド(チャットの質問/指示)
```

Claudeが書くのは**テキストだけ**。JSXは`buildTree`が選んだ部品から
`renderTree`が組み立てる。部品カタログは`src/render.ts`の
`COMPONENT_CATALOG`にあり、実際の描画は`src/tree.ts`の`renderNode`、
CSSは`src/server.ts`にある。

## ワークフロー

### Step 1: 見せたい内容をテキストで書く

見出し・段落・手順・表・比較・フローなどの構造が伝わるように書く。
どの部品に振り分けるかは`buildTree`が決めるので、JSXやHTMLは書かない。

### Step 2: ビルドして起動する

Node.jsのネイティブTS実行は`.js` importから`.ts`ファイルへの解決に
対応していないため、tscでビルドしてから実行する。

```bash
npx tsc
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill 2>/dev/null
node dist/index.js input.md &
timeout 15 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

第1引数にテキストファイルを渡すとページを再生成する。引数なしで起動すると
既存の`doc.json`をそのまま配信する（初回のみ、空なら初期テキストから生成）。

再生成しても、表示テキストが変わっていない部品はidを引き継ぐため、
その部品に紐づくスレッドは残る。内容が変わった部品のスレッドは消える。

### Step 3: ブラウザで確認する

指示がなくても自動的にブラウザで開く。

- WSL2: `explorer.exe "http://localhost:3000"`（WSL2はlocalhostを自動フォワードするため直接開ける）
- Linuxデスクトップ: `xdg-open http://localhost:3000`
- macOS: `open http://localhost:3000`

headless Chromiumでの自動スクリーンショットは、このNix環境では
共有ライブラリ不足・glibc ABI不一致で動かないことを確認済み。
確認は上記の方法でブラウザを直接開く。

## 部品を増やすとき

新しい表現が必要になったら、部品カタログに型を1つ足す。触るのは3箇所:

1. `src/tree.ts`の`Node`型に定義を追加
2. `src/tree.ts`の`renderNode`に描画、`nodeToText`に表示テキスト化を追加
3. `src/render.ts`の`COMPONENT_CATALOG`に説明を1行追加（buildTreeへの指示）

`nodeToText`は再生成時のid引き継ぎ（`reconcileIds`）に使われるので、
必ず一緒に実装する。

## デザイン原則

- **ビルドレス**: bundlerを挟まない。CDN経由のReact + その場トランス
  パイル（Babel standalone）を使う。生成のたびに重くなるビルドステップ
  を避けるのがhtllmの核心。
- **自己完結**: 外部CDN（React/ReactDOM/Babel）以外への依存を増やさない。

## Notes

- サーバー本体（`src/server.ts`）と部品の描画（`src/tree.ts`）はテスト対象。
  「渡されたNodeを正しくJSXにできるか」はテストするが、「何を表現するか」は
  テストしない。
