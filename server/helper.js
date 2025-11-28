import fs from "fs";
import mammoth from "mammoth";
import connectDB from "./db.js";
import path from "path";
import { createRequire } from "module";
// Load CommonJS pdf-parse
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
// Load pdf-parse dynamically because it's CommonJS
// let pdfParse;
// (async () => {
//   const mod = await import("pdf-parse");
//   pdfParse = mod.default || mod;
// })();

//extract text from uploaded file

async function extractText(filePath, mimetype, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    console.log("Detected extension:", ext);

    if (ext === ".pdf" || mimetype === "application/pdf") {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    }

    if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    const textLikeExtensions = [
        ".txt",
        ".md",
        ".csv",
        ".json",
        ".js",
        ".ts",
        ".html",
        ".css",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".yaml",
        ".yml",
        ".log",
    ];

    if (textLikeExtensions.includes(ext)) {
        return fs.readFileSync(filePath, "utf8");
    }

    if (mimetype.startsWith("text/")) {
        return fs.readFileSync(filePath, "utf8");
    }

    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        throw new Error("Unsupported file type: " + mimetype);
    }
}
//embedding function
async function embedQuery(text, openai) {
    const res = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: text,
    });
    return res.data[0].embedding;
}
//RAG retrieval function
async function retrieveChunks(query, openai) {
    const db = await connectDB();
    const col = db.collection("kb_chunks");

    // Convert query to embedding
    const queryVector = await embedQuery(query, openai);

    // MongoDB Atlas vector search pipeline
    const pipeline = [
        {
            $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: queryVector,
                numCandidates: 200,
                limit: 5,
            },
        },
        {
            $project: {
                text: 1,
                score: { $meta: "vectorSearchScore" },
            },
        },
    ];

    return await col.aggregate(pipeline).toArray();
}
//return the uploaded file into chunks
async function chunkText(text, chunkSize = 500) {
    const sentences = text.split(".");
    let chunks = [];
    let chunk = "";

    for (let s of sentences) {
        if ((chunk + s).length > chunkSize) {
            chunks.push(chunk);
            chunk = "";
        }
        chunk += s + ".";
    }
    if (chunk) chunks.push(chunk);

    return chunks;
}
//create embeddings for each chunk and save into Mongo
async function storeChunksFromText(text, openai, source) {
    const db = await connectDB();
    const collection = db.collection("kb_chunks");

    const chunks = await chunkText(text);
    let stored = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const emb = await openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL,
            input: chunk,
        });

        const doc = {
            source, // file path used in index
            chunk_id: i, // chunk number used in index
            text: chunk,
            embedding: emb.data[0].embedding,
            createdAt: new Date(),
        };

        // Insert or skip duplicate based on unique index
        try {
            const response = await collection.insertOne(doc);
            doc._id = response.insertedId; // include Mongo-assigned _id for later reference
            stored.push(doc);
        } catch (err) {
            if (err.code === 11000) {
                console.log(`Skipped duplicate: source=${source}, chunk_id=${i}`);
            } else {
                throw err;
            }
        }
    }

    return {
        count: stored.length,
        documents: stored,
    };
}

export { extractText, embedQuery, retrieveChunks, chunkText, storeChunksFromText };
