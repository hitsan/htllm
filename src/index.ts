import { createServer } from "./server.js";

const jsx = `
const root = ReactDOM.createRoot(document.getElementById('root'));

function renderJsx(jsxExpr) {
  const transpiled = Babel.transform(\`(\${jsxExpr})\`, { presets: [['react', { runtime: 'classic' }]] }).code;
  const element = new Function('React', \`return \${transpiled}\`)(React);
  root.render(element);
}

async function sendTurn(prompt) {
  const res = await fetch('/api/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  renderJsx(data.jsx);
}

function App() {
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 720, margin: '40px auto' }}>
      <h1>htllm</h1>
      <p>Claudeへの指示を送ると、応答がこのページに反映されます。</p>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: '60%', padding: 6 }}
        placeholder="例: 赤いh1タグでHelloと表示して"
      />
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await sendTurn(prompt);
          setLoading(false);
        }}
        style={{ padding: '6px 16px', marginLeft: 8 }}
      >
        {loading ? '送信中...' : '送信'}
      </button>
    </div>
  );
}

root.render(<App />);
`;

const port = 3000;
createServer(jsx).listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
