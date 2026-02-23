from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# ---- Internal Imports ----
from app.ingest import load_documents
from app.chunking import fixed_chunk
from app.embeddings import embed_texts
from app.vector_store import VectorStore
from app.api import create_routes

app = FastAPI(
    title="Document Intelligence System",
    description="HR Document RAG Assistant API",
    version="1.0.0"
)

# =====================================================
# 🌐 CORS MIDDLEWARE
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for demo; lock later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# ✅ BUILD VECTOR STORE ON STARTUP (Render-friendly)
# =====================================================
@app.on_event("startup")
def startup_event():
    print("Loading documents from data folder...")
    docs = load_documents("data")

    all_chunks = []
    sources = []

    for doc in docs:
        chunks = fixed_chunk(doc["text"])
        all_chunks.extend(chunks)
        sources.extend([doc["source"]] * len(chunks))

    print(f"Total documents loaded: {len(docs)}")
    print(f"Total chunks created: {len(all_chunks)}")

    print("Creating embeddings...")
    embeddings = embed_texts(all_chunks)

    dimension = len(embeddings[0])
    print(f"Embedding dimension detected: {dimension}")

    vector_store = VectorStore(dimension)
    vector_store.add(embeddings, all_chunks, sources)

    app.state.vector_store = vector_store
    print("Vector store ready!")

    # ✅ include router AFTER vector_store exists
    app.include_router(create_routes(app.state.vector_store))
    print("✅ API routes loaded!")

# =====================================================
# ✅ SERVE FRONTEND UI (same Render URL)
# =====================================================
frontend_dir = Path(__file__).resolve().parent.parent / "Frontend"

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
    print(f"✅ Frontend served from: {frontend_dir}")
else:
    print(f"⚠️ Frontend folder not found at: {frontend_dir}")

print("🚀 FastAPI Application Ready!")