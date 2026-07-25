import { createServer as createHttpServer } from "node:http";
import { runTurn } from "./claude/runTurn.js";

function renderPage(jsx: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel">${jsx}</script>
</body>
</html>`;
}

export function createServer(jsx: string) {
  let currentJsx = jsx;
  let currentSessionId: string | undefined;

  return createHttpServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/turn") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const { prompt } = JSON.parse(body);
        const turn = await runTurn(prompt, { resumeSessionId: currentSessionId });
        currentJsx = turn.result;
        currentSessionId = turn.sessionId;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsx: turn.result,
            sessionId: turn.sessionId,
            stopReason: turn.stopReason,
          }),
        );
      });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(currentJsx));
  });
}
