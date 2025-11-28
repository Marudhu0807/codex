import fs from "fs";
import OpenAI from "openai";
import { connectDB } from "./db.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(text, max = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = start + max;
        chunks.push(text.slice(start, end));
        start += max - overlap;
    }
    return chunks;
}

async function embed(texts) {
    const result = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: texts,
    });
    return result.data.map((i) => i.embedding);
}

async function ingest(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const chunks = chunkText(text);

    console.log(`📝 Total chunks: ${chunks.length}`);

    const embeddings = await embed(chunks);
    console.log("🔢 Embeddings generated");

    const db = await connectDB();
    const col = db.collection(process.env.KB_COLLECTION);

    const docs = chunks.map((c, i) => ({
        source: filePath,
        chunk_id: i,
        text: c,
        embedding: embeddings[i],
        createdAt: new Date(),
    }));

    try {
        await col.insertMany(docs);
        console.log("✅ Ingest complete!");
    } catch (err) {
        console.log(err?.errorResponse?.message || err?.message || err);
    }
}

ingest("./data/sample.txt");
