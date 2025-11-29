import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import { extractText, retrieveChunks, chunkText, storeChunksFromText } from "./helper.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
    res.status(200).send({
        message: "Hello from codex (with RAG)!",
    });
});

app.post("/", upload.single("file"), async (req, res) => {
    try {
        const query = req.body.prompt;
        let newChunksStored = 0;
        let freshDocs = [];
        // Case 1: File upload exists
        if (req.file) {
            const filePath = req.file.path;
            const mimetype = req.file.mimetype;
            const source = `${req.file.originalname}__${Date.now()}`;
            const fullText = await extractText(filePath, mimetype, req.file.originalname);
            // store chunks and get back the inserted docs
            const storeRes = await storeChunksFromText(fullText, openai, source);
            newChunksStored = storeRes.count;
            freshDocs = storeRes.documents || []; //just uploaded file contents
        }

        // Case 2: Query RAG flow
        const dbResults = await retrieveChunks(query, openai);
        let contextParts = [];
        let context = [];
        // use top matching chunks from the just-uploaded file, because MongoDB Atlas Vector Search (dbResults) does not care about insertion order or timestamps. it may not provide the last added chunks
        if (freshDocs.length > 0) {
            const freshLimit = parseInt(process.env.FRESH_UPLOAD_CHUNK_LIMIT || "10");
            const topFresh = freshDocs.slice(0, freshLimit).map((d) => d.text); // limit to fetch only 10 chunks of text - if needed can increased
            contextParts.push(...topFresh);
        } else {
         // ONLY use DB vector search when NO new file is uploaded
            const existingTexts = new Set(); //use Set because much faster than scanning an array repeatedly.
            for (let r of dbResults) {
                if (!existingTexts.has(r.text)) { //check and insert only the non duplicate text
                    contextParts.push(r.text);
                    existingTexts.add(r.text); //updates the Set used for duplicate checking.
                }
            }
        }
        context = contextParts.join("\n\n");

        const prompt = `
        You are an AI assistant. Use the following context to answer accurately.
        Context:
        ${context}

        Question:
        ${query}

        If the answer is NOT in the context, answer using general knowledge and SAY SO clearly.
        `;

        const reply = await openai.responses.create({
            model: process.env.CHAT_MODEL,
            input: prompt,
            max_output_tokens: 3000,
        });

        res.status(200).send({
            uploaded: req.file ? req.file.originalname : null,
            chunksAdded: newChunksStored,
            bot: reply.output_text,
            // contextUsed: results,
        });
    } catch (error) {
        console.error("RAG ERROR:", error);
        res.status(500).send(error.message || "Something went wrong");
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI server started on port ${PORT}`));
