import { createServer } from "./server.js";

// htllm skillを使って「このリポジトリ自体」を説明する例。
const jsx = `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <>
    <style>{\`
      body { font-family: sans-serif; max-width: 720px; margin: 40px auto; color: #222; }
      h1 { margin-bottom: 4px; }
      .sub { color: #666; margin-top: 0; }
      section { margin: 24px 0; }
      h2 { border-bottom: 2px solid #eee; padding-bottom: 4px; }
      ul { line-height: 1.8; }
      .file { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
      table { border-collapse: collapse; width: 100%; }
      td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
      .hash { font-family: monospace; color: #999; white-space: nowrap; }
    \`}</style>
    <h1>htllm</h1>
    <p className="sub">Claudeの計画・成果物を、その場で動的Webページにして見せるプロジェクト</p>

    <section>
      <h2>Vision</h2>
      <ul>
        <li>Claudeが説明する内容ごとに、その場で専用の動的Webページを生成して見せる</li>
        <li>成果物・計画をインタラクティブに人が修正できる</li>
        <li>わからないところをすぐ聞ける</li>
      </ul>
    </section>

    <section>
      <h2>現在の構成</h2>
      <ul>
        <li><span className="file">src/server.ts</span> — JSXを受け取りHTMLとして配信するサーバー本体（ビルドレス: React/ReactDOM/Babel standaloneをCDNで読み込む）</li>
        <li><span className="file">src/index.ts</span> — 動作確認用のエントリポイント（このページ自身もこれで生成されている）</li>
        <li><span className="file">src/server.test.ts</span> — server.tsのテスト（8件、全てGreen）</li>
        <li><span className="file">.claude/skills/htllm/</span> — 表現パターン集のskill。「何を表現するか」はコードとして固定・テストせず、ここに蓄積する</li>
        <li><span className="file">flake.nix</span> — Node.js 22の開発環境（Nix）</li>
      </ul>
    </section>

    <section>
      <h2>コミット履歴</h2>
      <table>
        <tbody>
          <tr><td className="hash">0c40b2d</td><td>Add react-dom CDN script and entry point for browser verification</td></tr>
          <tr><td className="hash">4dd85ec</td><td>Add minimal dynamic HTML server (React CDN + Babel standalone, buildless)</td></tr>
          <tr><td className="hash">0329f46</td><td>Add project vision/process docs and Nix dev environment</td></tr>
        </tbody>
      </table>
    </section>
  </>
);
`;

const port = 3000;
createServer(jsx).listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
