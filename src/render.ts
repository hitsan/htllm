import { markdownToHtml } from "./markdown.js";

export type TextDocument = {
  text: string;
};

export function renderDocument(doc: TextDocument): string {
  const html = markdownToHtml(doc.text);
  return `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<div style={{ fontFamily: 'sans-serif', maxWidth: 720, margin: '40px auto' }} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />);
`;
}
