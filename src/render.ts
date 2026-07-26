import { runTurn } from "./claude/runTurn.js";

export type TextDocument = {
  text: string;
};

const DESIGN_PRINCIPLES = `- 自己完結: 外部CDN・Webフォント・外部画像への参照は使わない。すべてインラインCSSで完結させる
- テーマ対応: ページ全体の背景は既に #ffffff（ダーク時 #1a1a1a）に設定済みです。
  コンテンツのルート要素の背景色はこれと同じ値にするか、指定しない（透明のまま）でください。
  文字色などその他の配色はCSS変数で管理し、prefers-color-schemeで自動切り替えしてください
- レスポンシブ: 横に長くなりうる要素だけoverflow-x: autoで囲む。本文全体を横スクロールさせない
- 過剰装飾を避ける: 装飾のための装飾、内容量に見合わない演出はしない
- グラフィカルに: 構造・関係・フローなど図で示せる内容があれば、インラインSVGで簡単な図を積極的に使う（箱と矢印など）。文字だけで説明しない`;

export async function renderDocument(doc: TextDocument): Promise<string> {
  const prompt = `次のテキストの内容を、見やすいReact JSXとして表示してください。

デザイン原則:
${DESIGN_PRINCIPLES}

出力は「<div>...</div>」のようなJSX要素（またはフラグメント<>...</>）そのもの1つだけにしてください。
次のものは一切書かないでください: const/function/exportなどの変数・関数宣言、
ReactDOM.createRootやroot.renderの呼び出しコード、説明文、コードブロックの \`\`\`、
TypeScriptの型注釈やasキャスト（プレーンなJavaScript + JSXのみ、ブラウザのBabel standaloneでそのまま実行されます）。
出力の1文字目は必ず "<" にしてください。

テキスト:
${doc.text}`;

  const { result } = await runTurn(prompt);
  const jsxElement = stripCodeFence(result);
  return `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(${jsxElement});
`;
}

export async function editDocument(currentText: string, instruction: string): Promise<string> {
  const prompt = `次のテキストを、以下の指示に従って書き換えてください。
書き換えた後の全文だけを返してください。説明文やコードブロックの \`\`\` は不要です。

指示:
${instruction}

現在のテキスト:
${currentText}`;

  const { result } = await runTurn(prompt);
  const fenced = extractFencedContent(result);
  return fenced !== null ? fenced : result.trim();
}

function extractFencedContent(text: string): string | null {
  const fenceMatch = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  return fenceMatch ? fenceMatch[1] : null;
}

function stripCodeFence(text: string): string {
  const fenced = extractFencedContent(text);
  if (fenced !== null) {
    return fenced;
  }

  const firstTagIndex = text.indexOf("<");
  if (firstTagIndex >= 0) {
    return text.slice(firstTagIndex).trim();
  }

  return text.trim();
}
