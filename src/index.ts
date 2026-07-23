import { createServer } from "./server.js";

const jsx = `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<h1>Hello htllm</h1>);
`;

const port = 3000;
createServer(jsx).listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
