export type TextDocument = {
  text: string;
};

export function renderDocument(doc: TextDocument): string {
  return `
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>${JSON.stringify(doc.text)}</pre>);
`;
}
