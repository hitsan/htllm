import { createServer as createHttpServer } from "node:http";

export type TurnHandler = (nodeId: string, instruction: string) => Promise<{ jsx: string }>;
export type AskHandler = (selectedText: string, question: string) => Promise<{ answer: string }>;

function renderPage(jsx: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    :root {
      --bg: #f7f9fb;
      --surface: #ffffff;
      --surface-sunken: #eef2f6;
      --ink: #182430;
      --ink-soft: #46586a;
      --muted: #6d7f90;
      --border: #dbe3ea;
      --border-strong: #c2cdd7;
      --accent: #37559c;
      --accent-soft: #e7ecf7;
      --fixed: #1c7a68;
      --fixed-soft: #e0f0ec;
      --llm: #b06a12;
      --llm-soft: #f6ebda;
      --danger: #b0403a;
      --danger-soft: #f6e4e0;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
      --shadow: rgba(24, 36, 48, 0.12);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f151b;
        --surface: #161f27;
        --surface-sunken: #1c262f;
        --ink: #e4ebf2;
        --ink-soft: #b3c1cd;
        --muted: #8698a6;
        --border: #28333d;
        --border-strong: #37444f;
        --accent: #8aa4e0;
        --accent-soft: #1e2836;
        --fixed: #4fbfa8;
        --fixed-soft: #123029;
        --llm: #d69a4e;
        --llm-soft: #33260f;
        --danger: #e08079;
        --danger-soft: #3a241f;
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
      max-width: min(92vw, 68rem);
      padding: 4.5rem clamp(1.2rem, 4vw, 3rem) 6rem;
    }

    [data-htllm-root] h2 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.5;
      color: var(--ink);
      margin: 0 0 1.3rem;
    }
    .htllm-heading-badge {
      font-family: var(--mono);
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      border: 1px solid var(--border-strong);
      border-radius: 6px;
      padding: 0.05rem 0.45rem;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle;
      margin-right: 0.6rem;
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
      font-family: var(--mono);
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
      font-family: var(--mono);
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 0.9rem;
    }
    .htllm-hero h1 {
      font-size: clamp(1.8rem, 4vw, 2.7rem);
      font-weight: 750;
      letter-spacing: -0.02em;
      line-height: 1.15;
      text-wrap: balance;
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
      border-color: var(--danger);
      background: var(--danger-soft);
    }
    .htllm-compare-card[data-tone="good"] {
      border-color: var(--fixed);
      background: var(--fixed-soft);
    }
    .htllm-compare-label {
      font-weight: 600;
      font-size: 0.92rem;
      margin-bottom: 0.4rem;
      color: var(--ink);
    }
    .htllm-compare-card[data-tone="bad"] .htllm-compare-label {
      color: var(--danger);
    }
    .htllm-compare-card[data-tone="good"] .htllm-compare-label {
      color: var(--fixed);
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
      font-family: var(--mono);
      font-size: 0.66rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
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
      border-color: var(--llm);
      background: var(--llm-soft);
    }
    .htllm-flow-node[data-role="input"] .htllm-flow-v {
      color: var(--llm);
    }
    .htllm-flow-node[data-role="core"] {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .htllm-flow-node[data-role="core"] .htllm-flow-v {
      color: var(--accent);
    }
    .htllm-flow-node[data-role="output"] {
      border-color: var(--fixed);
      background: var(--fixed-soft);
    }
    .htllm-flow-node[data-role="output"] .htllm-flow-v {
      color: var(--fixed);
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
      background: var(--fixed);
    }
    .htllm-timeline-step[data-emphasis="true"] .htllm-timeline-body {
      background: var(--fixed-soft);
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
      font-family: var(--mono);
      font-size: 0.85rem;
      color: var(--llm);
      font-weight: 600;
      flex: none;
    }
    .htllm-qa-text {
      color: var(--ink-soft);
    }
    .htllm-mockup {
      position: relative;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      padding: 2.2rem 1.2rem 1.2rem;
      margin: 0 0 1.4rem;
      font-size: 0.92rem;
    }
    .htllm-mockup::before {
      content: "";
      position: absolute;
      top: 0.85rem;
      left: 1rem;
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background: var(--border-strong);
      box-shadow: 1rem 0 0 var(--border-strong), 2rem 0 0 var(--border-strong);
    }
    .htllm-mockup-line {
      margin-bottom: 0.6rem;
    }
    .htllm-mockup-line:last-child {
      margin-bottom: 0;
    }
    .htllm-mockup-line[data-kind="quote"] {
      border-left: 2px solid var(--border-strong);
      padding-left: 0.7rem;
      color: var(--ink-soft);
      font-size: 0.88rem;
    }
    .htllm-mockup-line[data-kind="label"] {
      font-weight: 700;
      color: var(--ink);
    }
    .htllm-mockup-line[data-kind="answer"] {
      position: relative;
      padding-left: 1.1rem;
      color: var(--ink-soft);
    }
    .htllm-mockup-line[data-kind="answer"]::before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--muted);
    }
    .htllm-mockup-line[data-kind="input"] {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-sunken);
      padding: 0.6rem 0.8rem;
      color: var(--muted);
    }
    .htllm-mockup-line[data-kind="button"] {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      border-radius: 999px;
      padding: 0.35rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .htllm-mockup-line[data-kind="note"] {
      font-size: 0.78rem;
      color: var(--muted);
      font-style: italic;
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
    @media (max-width: 900px) {
      body {
        padding-right: 0;
      }
      #htllm-comments-panel {
        display: none;
      }
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
