import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { connect } from "./db.js";
import { renderDocument, rewriteFragment, replaceFragment, answerQuestion } from "./render.js";

const config = loadConfig(".htllm");
const db = await connect(config.mongodbUri);
const collection = db.collection<{ text: string }>("documents");

let doc = await collection.findOne({});
if (!doc) {
  const initial = { text: "htllmへようこそ。ここはMongoDBに保存されたテキストです。" };
  const { insertedId } = await collection.insertOne(initial);
  doc = { ...initial, _id: insertedId };
}

async function onTurn(selectedText: string, instruction: string): Promise<{ jsx: string }> {
  const current = await collection.findOne({});
  const currentText = current?.text ?? "";
  const newFragment = await rewriteFragment(selectedText, instruction);
  const newText = replaceFragment(currentText, selectedText, newFragment);

  if (current) {
    await collection.updateOne({ _id: current._id }, { $set: { text: newText } });
  } else {
    await collection.insertOne({ text: newText });
  }

  const jsx = await renderDocument({ text: newText });
  return { jsx };
}

async function onAsk(selectedText: string, question: string): Promise<{ answer: string }> {
  const current = await collection.findOne({});
  const answer = await answerQuestion(current?.text ?? "", selectedText, question);
  return { answer };
}

const jsx = await renderDocument(doc);

const port = 3000;
createServer(jsx, onTurn, onAsk).listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
