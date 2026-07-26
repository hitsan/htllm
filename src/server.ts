import { createServer as createHttpServer } from "node:http";

export type TurnHandler = (prompt: string) => Promise<{ jsx: string }>;

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
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #1a1a1a;
      }
    }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">${jsx}</script>
</body>
</html>`;
}

export function createServer(jsx: string, onTurn: TurnHandler) {
  let currentJsx = jsx;

  return createHttpServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/turn") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { prompt } = JSON.parse(body);
        const turn = await onTurn(prompt);
        currentJsx = turn.jsx;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsx: turn.jsx }));
      });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(currentJsx));
  });
}
