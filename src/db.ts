import { MongoClient, type Db } from "mongodb";

export async function connect(uri: string): Promise<Db> {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db();
}
