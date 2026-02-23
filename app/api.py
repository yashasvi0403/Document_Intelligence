import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# ✅ Import your router factory
from app.routes import create_routes

# ✅ Import/build your vector store (adjust this import to your project)
from app.vector_store import get_vector_store  # <-- rename if your function is different

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ✅ If your frontend folder is outside app/, adjust the path:
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")  # typical structure: backend/app.py + ../frontend
# If frontend is inside same folder as app.py, use:
# FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = FastAPI(title="Document Intelligence API")

# ✅ (Optional) CORS - useful if you ever separate frontend later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # you can lock this later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Serve frontend static files (css/js/images)
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


# ✅ Home route => index.html
@app.get("/")
def home():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    return FileResponse(index_path)


# ✅ Optional route => answer.html
@app.get("/answer")
def answer_page():
    answer_path = os.path.join(FRONTEND_DIR, "answer.html")
    return FileResponse(answer_path)


# ✅ Load vector store once at startup (best practice for Render)
vector_store = get_vector_store()

# ✅ Include your router with vector_store injected
app.include_router(create_routes(vector_store))