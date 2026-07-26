import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { connect } from "./db.js";
import { renderDocument } from "./render.js";

const config = loadConfig(".htllm");
const db = await connect(config.mongodbUri);
const collection = db.collection<{ text: string }>("documents");

let doc = await collection.findOne({});
if (!doc) {
  const initial = { text: "htllmへようこそ。ここはMongoDBに保存されたテキストです。" };
  const { insertedId } = await collection.insertOne(initial);
  doc = { ...initial, _id: insertedId };
}

const jsx = renderDocument(doc);

const port = 3000;
createServer(jsx).listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
