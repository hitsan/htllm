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
    body {
      margin: 0;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      background: #ffffff;
      color: #1a1a1a;
      padding-right: 320px;
      box-sizing: border-box;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #1a1a1a;
        color: #e5e5e5;
      }
    }

    #htllm-comments-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 12px;
      background: #fafafa;
      border-left: 1px solid #d8d8d8;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
    }
    @media (prefers-color-scheme: dark) {
      #htllm-comments-panel {
        background: #222222;
        border-color: #444444;
        color: #e5e5e5;
      }
    }
    #htllm-comments-panel:empty::before {
      content: "テキストを選択して質問・指示するとここに表示されます";
      color: #999999;
    }
    .htllm-comment-card {
      border: 1px solid #d8d8d8;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
    }
    @media (prefers-color-scheme: dark) {
      .htllm-comment-card {
        border-color: #444444;
      }
    }
    .htllm-comment-quote {
      font-size: 12px;
      color: #888888;
      border-left: 2px solid #d8d8d8;
      padding-left: 6px;
      margin-bottom: 6px;
      white-space: pre-wrap;
    }
    .htllm-comment-label {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #eeeeee;
      margin-bottom: 4px;
    }
    @media (prefers-color-scheme: dark) {
      .htllm-comment-label {
        background: #383838;
      }
    }
    .htllm-comment-message {
      white-space: pre-wrap;
      margin-bottom: 6px;
    }
    .htllm-comment-answer {
      white-space: pre-wrap;
      color: #444444;
      border-top: 1px solid #eeeeee;
      padding-top: 6px;
    }
    @media (prefers-color-scheme: dark) {
      .htllm-comment-answer {
        color: #bbbbbb;
        border-color: #3a3a3a;
      }
    }

    #htllm-selection-popup {
      position: absolute;
      z-index: 1000;
      display: none;
      background: #ffffff;
      border: 1px solid #d8d8d8;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
      padding: 6px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
    }
    @media (prefers-color-scheme: dark) {
      #htllm-selection-popup {
        background: #2a2a2a;
        border-color: #444444;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        color: #e5e5e5;
      }
    }
    #htllm-selection-input-area { display: flex; flex-direction: column; gap: 6px; }
    #htllm-selection-buttons-row { display: flex; gap: 6px; justify-content: flex-end; }
    #htllm-selection-buttons-row button {
      cursor: pointer;
      border: 1px solid #d8d8d8;
      background: #f5f5f7;
      color: inherit;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 13px;
      white-space: nowrap;
    }
    @media (prefers-color-scheme: dark) {
      #htllm-selection-buttons-row button {
        border-color: #444444;
        background: #383838;
      }
    }
    #htllm-selection-input {
      font-family: inherit;
      font-size: 15px;
      padding: 8px 10px;
      border: 1px solid #d8d8d8;
      border-radius: 6px;
      background: #ffffff;
      color: inherit;
      width: 360px;
      resize: vertical;
    }
    @media (prefers-color-scheme: dark) {
      #htllm-selection-input {
        border-color: #444444;
        background: #1f1f1f;
      }
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
