import { createServer as createHttpServer } from "node:http";

function renderPage(jsx: string): string {
  return `<!doctype html>
<html>
<head>
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
  return createHttpServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderPage(jsx));
  });
}
