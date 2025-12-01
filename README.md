Codex — RAG-Powered Chatbot using Node.js, Express & MongoDB

Codex is an intelligent chatbot that uses Retrieval-Augmented Generation (RAG) to provide accurate, context-aware responses from custom documents.
It uses:

Node.js + Express (backend API)

OpenAI Responses API (GPT-4.1-mini)

MongoDB Atlas Vector Search for embeddings

OpenAI Embeddings API

Custom RAG pipeline (retrieval + context injection)

Codex allows users to upload documents, stores them as embeddings, and answers queries using the most relevant chunks.


workflow
```
UPLOAD DOC
   |
   | (Embedding Model)
   v
 Vectorized Document -----> Mongo Atlas (stored)
                                    ^
                                    |
USER QUESTION             (Query embedding)
   |                               |
   | (Embedding Model)             |
   v                               |
  Query Vector --------------------
            |
            v
  Vector Search (Atlas)
            |
            v
  Matched Chunks
            |
            v
        GPT / LLM
            |
            v
         Answer

```

🔧 Installation
1. Clone the repository
git clone https://github.com/Marudhu0807/codex.git
cd codex

2. Install dependencies
npm install

3. Create a .env file
OPENAI_API_KEY=your_key_here
MONGODB_URI=your_mongo_atlas_uri
CHAT_MODEL=gpt-4.1-mini-2025-04-14
EMBEDDING_MODEL=text-embedding-3-large

▶️ Run the Server
node server.js


Server will start on:

http://localhost:5000

## ▶️ Run the Frontend

If you have a frontend (React/Vite/Next.js) inside a `/client` folder, run:

```sh
cd client
npm install
npm start        # or: npm run dev (for Vite/Next.js) ```

Portal will run on:

http://localhost:5173


