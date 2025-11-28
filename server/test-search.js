import { connectDB } from "./db.js";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedQuery(text) {
    const res = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: text,
    });
    return res.data[0].embedding;
}

async function test() {
    const db = await connectDB();
    const col = db.collection("kb_chunks");

    const query = "What is this document about?";
    const qVec = await embedQuery(query);

    const pipeline = [
        {
            $vectorSearch: {
                index: "vector_index", //Name of your vector index in MongoDB
                path: "embedding", //Field containing the embedding in each document
                queryVector: qVec, //The embedding of the user's query
                numCandidates: 100, //Number of candidate vectors to compare
                limit: 5, //Number of top results to return
            },
        },
        {
            $project: {
                text: 1, //Include the chunk text in the result
                score: { $meta: "vectorSearchScore" }, //	Include similarity score using metadata - $meta: "vectorSearchScore" = the similarity score given by MongoDB for each match.
            },
        },
    ];

    const results = await col.aggregate(pipeline).toArray();
    console.log(results);
}

test();
