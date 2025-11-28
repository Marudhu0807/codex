import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import OpenAI from 'openai'
import { connectDB } from "./db.js";

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from codex (with RAG)!'
  })
})
//embedding function
async function embedQuery(text) {
  const res = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL,
    input: text
  });
  return res.data[0].embedding;
}
//RAG retrieval function
async function retrieveChunks(query) {
  const db = await connectDB();
  const col = db.collection("kb_chunks");

  // Convert query to embedding
  const queryVector = await embedQuery(query);

  // MongoDB Atlas vector search pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryVector,
        numCandidates: 200,
        limit: 5
      }
    },
    {
      $project: {
        text: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ];

  return await col.aggregate(pipeline).toArray();
}

app.post("/", async (req, res) => {
  try {
    const query = req.body.prompt;

//retrieve relevant docs

    const results = await retrieveChunks(query);
    const context = results.map(r => r.text).join("\n\n");


// build GPT with prompt context

    const prompt = `
        You are an AI assistant. Use the following context to answer the question.
        Context:
        ${context}
        Question:
        ${query}
        If the answer is not in the context, say:
        "I cannot find the answer in the document."
        `;


// call GPT with RAG prompt

const response = await openai.responses.create({
      model: process.env.CHAT_MODEL,
      input: prompt,
      max_output_tokens: 3000
    });

    res.status(200).send({
      bot: response.output_text,
      contextUsed: results   // optional: send retrieved chunks to UI
    });

  } catch (error) {
    console.error("RAG ERROR:", error);
    res.status(500).send(error?.message || "Something went wrong");
  }
});

//start server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI server started on port ${PORT}`));