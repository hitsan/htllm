import { createServer as createHttpServer } from "node:http";

export type CreateThreadHandler = (params: {
  nodeId: string;
  start: number;
  end: number;
  mode: "question" | "instruct";
  message: string;
}) => Promise<{ threadId: string; jsx: string }>;
export type ReplyThreadHandler = (threadId: string, message: string) => Promise<{ jsx: string; answer: string }>;
export type GetThreadHandler = (
  threadId: string,
) => Promise<{ pending: boolean; answer: string; jsx: string } | null>;
export type DeleteThreadHandler = (threadId: string) => Promise<{ jsx: string } | null>;

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
      --highlight-bg: #fff176;
      --highlight-ink: #3f3600;
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
        --highlight-bg: #8a6d1a;
        --highlight-ink: #fff8e1;
        --shadow: rgba(0, 0, 0, 0.4);
      }
    }
    :root[data-theme="light"] {
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
      --highlight-bg: #fff176;
      --highlight-ink: #3f3600;
      --shadow: rgba(24, 36, 48, 0.12);
    }
    :root[data-theme="dark"] {
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
      --highlight-bg: #8a6d1a;
      --highlight-ink: #fff8e1;
      --shadow: rgba(0, 0, 0, 0.4);
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
      padding: 16px;
      background: var(--surface-sunken);
      border-left: 1px solid var(--border);
      font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif;
      font-size: 13px;
      color: var(--ink);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    @media (max-width: 900px) {
      body {
        padding-right: 0;
      }
      #htllm-comments-panel {
        display: none;
      }
    }
    #htllm-theme-toggle {
      flex: none;
      align-self: flex-end;
      background: var(--surface);
      color: var(--ink-soft);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    #htllm-theme-toggle:hover {
      color: var(--ink);
      border-color: var(--border-strong);
    }
    #htllm-composer {
      flex: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
    }
    #htllm-composer-quote {
      display: none;
      font-size: 12px;
      color: var(--ink-soft);
      border-left: 2px solid var(--accent);
      padding-left: 8px;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }
    #htllm-composer-input {
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 13px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--ink);
      resize: vertical;
      margin-bottom: 8px;
    }
    #htllm-composer-buttons {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    #htllm-composer-buttons button {
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
    #htllm-composer-buttons button:hover {
      filter: brightness(1.08);
    }
    #htllm-threads:empty::before {
      content: "テキストを選択して質問・指示するか、ハイライトをクリックするとここにスレッドが表示されます";
      color: var(--ink-soft);
    }
    .htllm-thread-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      position: relative;
    }
    .htllm-comment-quote {
      font-size: 12px;
      color: var(--ink-soft);
      border-left: 2px solid var(--accent);
      padding-left: 8px;
      padding-right: 48px;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }
    .htllm-thread-delete {
      position: absolute;
      top: 12px;
      right: 14px;
      background: none;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      color: var(--muted);
      font-size: 11px;
      padding: 2px 10px;
      cursor: pointer;
    }
    .htllm-thread-delete:hover {
      color: var(--danger);
      border-color: var(--danger);
    }
    .htllm-thread-messages {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    .htllm-thread-msg {
      white-space: pre-wrap;
    }
    .htllm-thread-msg-user {
      color: var(--ink);
      font-weight: 600;
    }
    .htllm-thread-msg-assistant {
      color: var(--ink-soft);
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .htllm-thread-msg-assistant[data-pending="true"] {
      font-style: italic;
      color: var(--muted);
    }
    .htllm-thread-reply-input {
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 12px;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--ink);
      resize: vertical;
    }
    mark[data-thread-id] {
      background: var(--highlight-bg);
      color: var(--highlight-ink);
      border-radius: 3px;
      padding: 0 2px;
      cursor: pointer;
    }
    mark[data-thread-id]:hover {
      filter: brightness(0.95);
    }
  </style>
</head>
<body>
<div id="root"></div>
<div id="htllm-comments-panel">
  <button type="button" id="htllm-theme-toggle" aria-label="ライト/ダークモード切り替え"></button>
  <div id="htllm-composer">
    <div id="htllm-composer-quote"></div>
    <textarea id="htllm-composer-input" placeholder="テキストを選択して質問または指示を入力" rows="3"></textarea>
    <div id="htllm-composer-buttons">
      <button type="button" id="htllm-composer-question-btn">質問</button>
      <button type="button" id="htllm-composer-instruct-btn">指示</button>
    </div>
  </div>
  <div id="htllm-threads"></div>
</div>
<script>
(function () {
  var panel = document.getElementById("htllm-comments-panel");
  var quoteEl = document.getElementById("htllm-composer-quote");
  var input = document.getElementById("htllm-composer-input");
  var questionBtn = document.getElementById("htllm-composer-question-btn");
  var instructBtn = document.getElementById("htllm-composer-instruct-btn");
  var threadsEl = document.getElementById("htllm-threads");
  var themeToggle = document.getElementById("htllm-theme-toggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀ ライトモード" : "☾ ダークモード";
  }

  var savedTheme = localStorage.getItem("htllm-theme");
  var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || systemTheme);

  themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("htllm-theme", next);
    applyTheme(next);
  });

  var selectedNodeId = null;
  var selectedStart = null;
  var selectedEnd = null;
  var selectedQuote = "";

  function getOffsetsWithinNode(range, nodeEl) {
    var preRange = document.createRange();
    preRange.selectNodeContents(nodeEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    var start = preRange.toString().length;
    var end = start + range.toString().length;
    return { start: start, end: end };
  }

  document.addEventListener("mouseup", function (e) {
    if (panel.contains(e.target)) {
      return;
    }
    var selection = window.getSelection();
    var text = selection ? selection.toString().trim() : "";
    if (text.length === 0) {
      return;
    }
    var range = selection.getRangeAt(0);
    var container = range.commonAncestorContainer;
    var el = container.nodeType === 1 ? container : container.parentElement;
    var nodeEl = el ? el.closest("[data-node-id]") : null;
    if (!nodeEl) {
      return;
    }
    var offsets = getOffsetsWithinNode(range, nodeEl);
    selectedNodeId = nodeEl.getAttribute("data-node-id");
    selectedStart = offsets.start;
    selectedEnd = offsets.end;
    selectedQuote = text;
    quoteEl.textContent = "選択中: " + text;
    quoteEl.style.display = "block";
    input.focus();
  });

  function resetComposer() {
    input.value = "";
    quoteEl.textContent = "";
    quoteEl.style.display = "none";
    selectedNodeId = null;
    selectedStart = null;
    selectedEnd = null;
    selectedQuote = "";
  }

  var threadsCache = {};
  var activeThreadId = null;

  function attachHighlightClickHandlers() {
    var marks = document.querySelectorAll("mark[data-thread-id]");
    marks.forEach(function (mark) {
      mark.addEventListener("click", function () {
        showThread(mark.getAttribute("data-thread-id"));
      });
    });
  }

  function attachHighlightClickHandlersAfterPaint() {
    requestAnimationFrame(function () {
      requestAnimationFrame(attachHighlightClickHandlers);
    });
  }

  function rerender(jsx) {
    var code = Babel.transform(jsx, { presets: [["react", { runtime: "classic" }]] }).code;
    (0, eval)(code);
    attachHighlightClickHandlersAfterPaint();
  }

  function renderThreadPanel() {
    threadsEl.innerHTML = "";
    var thread = activeThreadId ? threadsCache[activeThreadId] : null;
    if (!thread) {
      return;
    }

    var card = document.createElement("div");
    card.className = "htllm-thread-card";
    card.setAttribute("data-thread-id", activeThreadId);

    var quoteDiv = document.createElement("div");
    quoteDiv.className = "htllm-comment-quote";
    quoteDiv.textContent = thread.quote;
    card.appendChild(quoteDiv);

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "htllm-thread-delete";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", function () {
      deleteThread(activeThreadId);
    });
    card.appendChild(deleteBtn);

    var messagesEl = document.createElement("div");
    messagesEl.className = "htllm-thread-messages";
    thread.messages.forEach(function (msg) {
      var msgEl = document.createElement("div");
      msgEl.className = "htllm-thread-msg htllm-thread-msg-" + msg.role;
      msgEl.textContent = msg.text;
      if (msg.pending) {
        msgEl.setAttribute("data-pending", "true");
      }
      messagesEl.appendChild(msgEl);
    });
    card.appendChild(messagesEl);

    var replyInput = document.createElement("textarea");
    replyInput.className = "htllm-thread-reply-input";
    replyInput.placeholder = "続けて聞く...";
    replyInput.rows = 2;
    replyInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        submitReply(activeThreadId, replyInput);
      }
    });
    card.appendChild(replyInput);

    threadsEl.appendChild(card);
  }

  function showThread(threadId) {
    if (!threadsCache[threadId]) {
      return;
    }
    activeThreadId = threadId;
    renderThreadPanel();
  }

  function pollThread(threadId) {
    fetch("/api/threads/" + threadId)
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            return;
          }
          if (data.pending) {
            setTimeout(function () {
              pollThread(threadId);
            }, 700);
            return;
          }
          var thread = threadsCache[threadId];
          if (thread) {
            var lastMsg = thread.messages[thread.messages.length - 1];
            if (lastMsg && lastMsg.pending) {
              lastMsg.text = data.answer;
              delete lastMsg.pending;
            }
            if (activeThreadId === threadId) {
              renderThreadPanel();
            }
          }
          rerender(data.jsx);
        });
      });
  }

  function submitReply(threadId, replyInput) {
    var value = replyInput.value.trim();
    var thread = threadsCache[threadId];
    if (value.length === 0 || !thread) {
      return;
    }
    thread.messages.push({ role: "user", text: value });
    var pendingMsg = { role: "assistant", text: "回答を生成中…", pending: true };
    thread.messages.push(pendingMsg);
    renderThreadPanel();

    fetch("/api/threads/" + threadId + "/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: value }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (res.ok) {
            pendingMsg.text = data.answer;
            rerender(data.jsx);
          } else {
            pendingMsg.text = "エラー: " + data.error;
          }
          delete pendingMsg.pending;
          if (activeThreadId === threadId) {
            renderThreadPanel();
          }
        });
      });
  }

  function deleteThread(threadId) {
    fetch("/api/threads/" + threadId, { method: "DELETE" })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            return;
          }
          delete threadsCache[threadId];
          if (activeThreadId === threadId) {
            activeThreadId = null;
            renderThreadPanel();
          }
          rerender(data.jsx);
        });
      });
  }

  function submit(mode) {
    var value = input.value.trim();
    if (value.length === 0 || !selectedNodeId) {
      return;
    }
    var nodeId = selectedNodeId;
    var start = selectedStart;
    var end = selectedEnd;
    var quote = selectedQuote;
    resetComposer();

    fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: nodeId, start: start, end: end, mode: mode, message: value }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (res.ok) {
            threadsCache[data.threadId] = {
              quote: quote,
              messages: [
                { role: "user", text: value },
                { role: "assistant", text: "回答を生成中…", pending: true },
              ],
            };
            showThread(data.threadId);
            rerender(data.jsx);
            pollThread(data.threadId);
          } else {
            var errId = "error-" + Date.now();
            threadsCache[errId] = {
              quote: quote,
              messages: [
                { role: "user", text: value },
                { role: "assistant", text: "エラー: " + data.error },
              ],
            };
            showThread(errId);
          }
        });
      });
  }

  questionBtn.addEventListener("click", function () {
    submit("question");
  });
  instructBtn.addEventListener("click", function () {
    submit("instruct");
  });
  attachHighlightClickHandlersAfterPaint();
})();
</script>
<script type="text/babel" id="htllm-jsx-script">${jsx}</script>
</body>
</html>`;
}

export function createServer(
  jsx: string,
  onCreateThread: CreateThreadHandler,
  onReply: ReplyThreadHandler,
  onGetThread: GetThreadHandler,
  onDeleteThread: DeleteThreadHandler,
) {
  let currentJsx = jsx;

  return createHttpServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/threads") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { nodeId, start, end, mode, message } = JSON.parse(body);
        try {
          const thread = await onCreateThread({ nodeId, start, end, mode, message });
          currentJsx = thread.jsx;

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(thread));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;
    }

    const replyMatch = req.url?.match(/^\/api\/threads\/([^/]+)\/reply$/);
    if (req.method === "POST" && replyMatch) {
      const threadId = replyMatch[1];
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { message } = JSON.parse(body);
        try {
          const reply = await onReply(threadId, message);
          currentJsx = reply.jsx;

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(reply));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;
    }

    const getMatch = req.url?.match(/^\/api\/threads\/([^/]+)$/);
    if (req.method === "GET" && getMatch) {
      const threadId = getMatch[1];
      onGetThread(threadId).then((result) => {
        if (result === null) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `thread not found: ${threadId}` }));
          return;
        }
        currentJsx = result.jsx;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      });
      return;
    }

    const deleteMatch = req.url?.match(/^\/api\/threads\/([^/]+)$/);
    if (req.method === "DELETE" && deleteMatch) {
      const threadId = deleteMatch[1];
      onDeleteThread(threadId)
        .then((result) => {
          if (result === null) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `thread not found: ${threadId}` }));
            return;
          }
          currentJsx = result.jsx;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        })
        .catch((err) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(currentJsx));
  });
}
