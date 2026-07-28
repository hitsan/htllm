import { createServer as createHttpServer } from "node:http";

export type TurnHandler = (nodeId: string, instruction: string) => Promise<{ jsx: string }>;
export type AskHandler = (selectedText: string, question: string) => Promise<{ answer: string }>;

function renderPage(jsx: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    :root {
      --bg: #f5f4ed;
      --surface: #ffffff;
      --surface-sunken: #ece8da;
      --ink: #3d3929;
      --ink-soft: #6b6558;
      --border: #e3dfcf;
      --accent: #c1602f;
      --accent-soft: #f1e0d2;
      --good: #4b7a4f;
      --good-soft: #e6efe3;
      --bad: #b3483f;
      --bad-soft: #f6e4e0;
      --shadow: rgba(61, 57, 41, 0.15);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #262624;
        --surface: #30302e;
        --surface-sunken: #1f1e1c;
        --ink: #e8e6dc;
        --ink-soft: #a39e90;
        --border: #403d35;
        --accent: #da7756;
        --accent-soft: #40291d;
        --good: #7fb583;
        --good-soft: #24352a;
        --bad: #d97a6f;
        --bad-soft: #3a241f;
        --shadow: rgba(0, 0, 0, 0.4);
      }
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      padding-right: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
    }

    #root {
      width: 100%;
      max-width: 700px;
      padding: 4.5rem 2rem 6rem;
    }

    [data-htllm-root] h2 {
      font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
      font-size: 1.7rem;
      font-weight: 600;
      line-height: 1.5;
      color: var(--ink);
      margin: 0 0 1.3rem;
    }
    [data-htllm-root] h2:not(:first-child) {
      margin-top: 2.6rem;
    }
    [data-htllm-root] p {
      font-size: 1.02rem;
      line-height: 1.9;
      color: var(--ink-soft);
      margin: 0 0 1.4rem;
    }
    [data-htllm-root] ol {
      margin: 0 0 1.4rem;
      padding-left: 1.4rem;
      font-size: 1.02rem;
      line-height: 1.9;
      color: var(--ink-soft);
    }
    [data-htllm-root] ol li {
      margin-bottom: 0.3rem;
    }
    .htllm-callout {
      margin: 0 0 1.4rem;
      padding: 0.9rem 1.1rem;
      background: var(--accent-soft);
      border-left: 3px solid var(--accent);
      border-radius: 6px;
      font-size: 0.98rem;
      line-height: 1.7;
      color: var(--ink);
    }
    [data-htllm-root] table {
      display: block;
      overflow-x: auto;
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1.4rem;
      font-size: 0.95rem;
    }
    [data-htllm-root] th,
    [data-htllm-root] td {
      text-align: left;
      padding: 0.5rem 0.8rem;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    [data-htllm-root] thead th {
      background: var(--surface-sunken);
      font-weight: 600;
      color: var(--ink);
    }
    [data-htllm-root] td {
      color: var(--ink-soft);
    }
    [data-htllm-root] pre {
      margin: 0 0 1.4rem;
      padding: 1rem 1.2rem;
      background: var(--surface-sunken);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow-x: auto;
    }
    [data-htllm-root] pre code {
      font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.9rem;
      color: var(--ink);
      white-space: pre;
    }
    .htllm-card {
      margin: 0 0 1.4rem;
      padding: 1.1rem 1.3rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 1px 3px var(--shadow);
    }
    .htllm-card h3 {
      margin: 0 0 0.5rem;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--ink);
    }
    .htllm-card p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--ink-soft);
    }
    .htllm-diagram {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0 0 1.4rem;
    }
    .htllm-diagram-box {
      padding: 0.5rem 0.9rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.92rem;
      color: var(--ink);
      white-space: nowrap;
    }
    .htllm-diagram-arrow {
      color: var(--ink-soft);
      font-size: 1rem;
    }
    .htllm-hero {
      margin: 0 0 2.4rem;
    }
    .htllm-hero-eyebrow {
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-soft);
      margin: 0 0 0.8rem;
    }
    .htllm-hero h1 {
      font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
      font-size: clamp(1.7rem, 4vw, 2.3rem);
      font-weight: 700;
      line-height: 1.35;
      color: var(--ink);
      margin: 0 0 1rem;
    }
    .htllm-hero-lede {
      font-size: 1.1rem;
      line-height: 1.8;
      color: var(--ink-soft);
      margin: 0;
    }
    .htllm-compare {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.9rem;
      margin: 0 0 1.4rem;
    }
    @media (min-width: 640px) {
      .htllm-compare {
        grid-template-columns: 1fr 1fr;
      }
    }
    .htllm-compare-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem 1.2rem;
      background: var(--surface);
    }
    .htllm-compare-card[data-tone="bad"] {
      border-color: var(--bad);
      background: var(--bad-soft);
    }
    .htllm-compare-card[data-tone="good"] {
      border-color: var(--good);
      background: var(--good-soft);
    }
    .htllm-compare-label {
      font-weight: 600;
      font-size: 0.92rem;
      margin-bottom: 0.4rem;
      color: var(--ink);
    }
    .htllm-compare-card[data-tone="bad"] .htllm-compare-label {
      color: var(--bad);
    }
    .htllm-compare-card[data-tone="good"] .htllm-compare-label {
      color: var(--good);
    }
    .htllm-compare-card p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--ink-soft);
    }
    .htllm-flow {
      display: flex;
      align-items: stretch;
      flex-wrap: wrap;
      gap: 0.6rem;
      justify-content: center;
      margin: 0 0 1.4rem;
      padding: 1.3rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .htllm-flow-node {
      flex: 1 1 8rem;
      min-width: 7rem;
      border-radius: 8px;
      padding: 0.8rem 0.9rem;
      text-align: center;
      border: 1px solid var(--border);
      background: var(--surface-sunken);
    }
    .htllm-flow-k {
      display: block;
      font-size: 0.66rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-soft);
      margin-bottom: 0.25rem;
    }
    .htllm-flow-v {
      display: block;
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--ink);
    }
    .htllm-flow-s {
      display: block;
      font-size: 0.76rem;
      color: var(--ink-soft);
      margin-top: 0.2rem;
    }
    .htllm-flow-node[data-role="input"] {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .htllm-flow-node[data-role="input"] .htllm-flow-v {
      color: var(--accent);
    }
    .htllm-flow-node[data-role="core"] {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .htllm-flow-node[data-role="core"] .htllm-flow-v {
      color: var(--accent);
    }
    .htllm-flow-node[data-role="output"] {
      border-color: var(--good);
      background: var(--good-soft);
    }
    .htllm-flow-node[data-role="output"] .htllm-flow-v {
      color: var(--good);
    }
    .htllm-flow-arrow {
      display: flex;
      align-items: center;
      color: var(--ink-soft);
      font-size: 1.2rem;
      padding: 0 0.1rem;
    }
    .htllm-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
      gap: 0.8rem;
      margin: 0 0 1.4rem;
    }
    .htllm-gallery-item {
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 0.9rem 1rem;
      background: var(--surface);
    }
    .htllm-gallery-item h4 {
      margin: 0 0 0.4rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--ink);
    }
    .htllm-gallery-item p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ink-soft);
      line-height: 1.6;
    }
    .htllm-timeline {
      display: flex;
      flex-direction: column;
      margin: 0 0 1.4rem;
    }
    .htllm-timeline-step {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      padding: 0.4rem 0;
    }
    .htllm-timeline-marker {
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 0.85rem;
      font-weight: 600;
      flex: none;
    }
    .htllm-timeline-body {
      padding-bottom: 0.9rem;
    }
    .htllm-timeline-body b {
      font-size: 0.98rem;
      color: var(--ink);
    }
    .htllm-timeline-body p {
      margin: 0.2rem 0 0;
      font-size: 0.88rem;
      color: var(--ink-soft);
    }
    .htllm-timeline-step[data-emphasis="true"] .htllm-timeline-marker {
      background: var(--good);
    }
    .htllm-timeline-step[data-emphasis="true"] .htllm-timeline-body {
      background: var(--good-soft);
      border-radius: 8px;
      padding: 0.7rem 0.9rem;
    }
    .htllm-recommendation {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      border-radius: 10px;
      padding: 1.4rem 1.6rem;
      margin: 0 0 1.4rem;
    }
    .htllm-recommendation h3 {
      margin: 0 0 0.8rem;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--ink);
    }
    .htllm-recommendation ol {
      margin: 0;
      padding-left: 1.2rem;
    }
    .htllm-recommendation li {
      margin-bottom: 0.5rem;
      color: var(--ink-soft);
      font-size: 0.96rem;
    }
    .htllm-qa {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      margin: 0 0 1.4rem;
    }
    .htllm-qa-item {
      display: flex;
      gap: 0.7rem;
      font-size: 0.92rem;
      background: var(--surface-sunken);
      border-radius: 8px;
      padding: 0.8rem 1rem;
    }
    .htllm-qa-label {
      color: var(--accent);
      font-weight: 600;
      flex: none;
    }
    .htllm-qa-text {
      color: var(--ink-soft);
    }

    #htllm-comments-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      overflow-y: auto;
      padding: 20px 16px;
      background: var(--surface-sunken);
      border-left: 1px solid var(--border);
      font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif;
      font-size: 13px;
      color: var(--ink);
    }
    #htllm-comments-panel:empty::before {
      content: "テキストを選択して質問・指示するとここに表示されます";
      color: var(--ink-soft);
    }
    .htllm-comment-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .htllm-comment-quote {
      font-size: 12px;
      color: var(--ink-soft);
      border-left: 2px solid var(--accent);
      padding-left: 8px;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }
    .htllm-comment-label {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      background: var(--accent-soft);
      color: var(--accent);
      margin-bottom: 6px;
    }
    .htllm-comment-message {
      white-space: pre-wrap;
      margin-bottom: 8px;
      color: var(--ink);
    }
    .htllm-comment-answer {
      white-space: pre-wrap;
      color: var(--ink-soft);
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }

    #htllm-selection-popup {
      position: absolute;
      z-index: 1000;
      display: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 4px 16px var(--shadow);
      padding: 8px;
      font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif;
      font-size: 13px;
      color: var(--ink);
    }
    #htllm-selection-input-area { display: flex; flex-direction: column; gap: 8px; }
    #htllm-selection-buttons-row { display: flex; gap: 6px; justify-content: flex-end; }
    #htllm-selection-buttons-row button {
      cursor: pointer;
      border: none;
      background: var(--accent);
      color: #ffffff;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }
    #htllm-selection-buttons-row button:hover {
      filter: brightness(1.08);
    }
    #htllm-selection-input {
      font-family: inherit;
      font-size: 15px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--ink);
      width: 360px;
      resize: vertical;
    }
  </style>
</head>
<body>
<div id="root"></div>
<div id="htllm-selection-popup">
  <div id="htllm-selection-input-area">
    <textarea id="htllm-selection-input" placeholder="質問または指示を入力" rows="3"></textarea>
    <div id="htllm-selection-buttons-row">
      <button type="button" id="htllm-selection-question-btn">質問</button>
      <button type="button" id="htllm-selection-instruct-btn">指示</button>
    </div>
  </div>
</div>
<div id="htllm-comments-panel"></div>
<script>
(function () {
  var popup = document.getElementById("htllm-selection-popup");
  var input = document.getElementById("htllm-selection-input");
  var panel = document.getElementById("htllm-comments-panel");
  var questionBtn = document.getElementById("htllm-selection-question-btn");
  var instructBtn = document.getElementById("htllm-selection-instruct-btn");
  var selectedText = "";
  var selectedNodeId = null;

  function resetPopup() {
    input.value = "";
  }

  function hidePopup() {
    popup.style.display = "none";
    resetPopup();
  }

  document.addEventListener("mouseup", function (e) {
    if (popup.contains(e.target)) {
      return;
    }
    var selection = window.getSelection();
    var text = selection ? selection.toString().trim() : "";
    if (text.length === 0) {
      hidePopup();
      return;
    }
    selectedText = text;
    var range = selection.getRangeAt(0);
    var container = range.commonAncestorContainer;
    var el = container.nodeType === 1 ? container : container.parentElement;
    var nodeEl = el ? el.closest("[data-node-id]") : null;
    selectedNodeId = nodeEl ? nodeEl.getAttribute("data-node-id") : null;
    var rect = range.getBoundingClientRect();
    popup.style.left = (rect.left + window.scrollX) + "px";
    popup.style.top = (rect.bottom + window.scrollY + 6) + "px";
    popup.style.display = "block";
    resetPopup();
    input.focus();
  });

  function addCommentCard(quote, modeLabel, message) {
    var card = document.createElement("div");
    card.className = "htllm-comment-card";

    var quoteEl = document.createElement("div");
    quoteEl.className = "htllm-comment-quote";
    quoteEl.textContent = quote;
    card.appendChild(quoteEl);

    var labelEl = document.createElement("div");
    labelEl.className = "htllm-comment-label";
    labelEl.textContent = modeLabel;
    card.appendChild(labelEl);

    var messageEl = document.createElement("div");
    messageEl.className = "htllm-comment-message";
    messageEl.textContent = message;
    card.appendChild(messageEl);

    var answerEl = document.createElement("div");
    answerEl.className = "htllm-comment-answer";
    answerEl.textContent = "考え中...";
    card.appendChild(answerEl);

    panel.appendChild(card);
    panel.scrollTop = panel.scrollHeight;
    return answerEl;
  }

  function rerender(jsx) {
    var code = Babel.transform(jsx, { presets: [["react", { runtime: "classic" }]] }).code;
    (0, eval)(code);
  }

  function submit(mode) {
    var value = input.value.trim();
    if (value.length === 0) {
      return;
    }
    var quote = selectedText;
    var modeLabel = mode === "question" ? "質問" : "指示";
    var answerEl = addCommentCard(quote, modeLabel, value);
    hidePopup();

    if (mode === "question") {
      fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText: quote, question: value }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          answerEl.textContent = data.answer;
        });
    } else {
      if (!selectedNodeId) {
        answerEl.textContent = "エラー: この選択範囲は更新できる部品に含まれていません";
        return;
      }
      fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selectedNodeId, instruction: value }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (res.ok) {
              answerEl.textContent = "反映しました";
              rerender(data.jsx);
            } else {
              answerEl.textContent = "エラー: " + data.error;
            }
          });
        });
    }
  }

  questionBtn.addEventListener("click", function () {
    submit("question");
  });
  instructBtn.addEventListener("click", function () {
    submit("instruct");
  });
})();
</script>
<script type="text/babel" id="htllm-jsx-script">${jsx}</script>
</body>
</html>`;
}

export function createServer(jsx: string, onTurn: TurnHandler, onAsk: AskHandler) {
  let currentJsx = jsx;

  return createHttpServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/turn") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { nodeId, instruction } = JSON.parse(body);
        try {
          const turn = await onTurn(nodeId, instruction);
          currentJsx = turn.jsx;

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ jsx: turn.jsx }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/ask") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { selectedText, question } = JSON.parse(body);
        const { answer } = await onAsk(selectedText, question);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ answer }));
      });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(currentJsx));
  });
}
