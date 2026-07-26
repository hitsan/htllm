import { runTurn } from "./claude/runTurn.js";

export type TextDocument = {
  text: string;
};

const DESIGN_PRINCIPLES = `- 自己完結: 外部CDN・Webフォント・外部画像への参照は使わない。すべてインラインCSSで完結させる
- テーマ対応: CSS変数でライト/ダークを管理し、prefers-color-schemeで自動切り替えする
- レスポンシブ: 横に長くなりうる要素だけoverflow-x: autoで囲む。本文全体を横スクロールさせない
- 過剰装飾を避ける: 装飾のための装飾、内容量に見合わない演出はしない`;

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

function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    return fenceMatch[1];
  }

  const firstTagIndex = text.indexOf("<");
  if (firstTagIndex >= 0) {
    return text.slice(firstTagIndex).trim();
  }

  return text.trim();
}
