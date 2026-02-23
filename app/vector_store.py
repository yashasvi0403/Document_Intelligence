import faiss
import numpy as np

class VectorStore:
    def __init__(self, dimension: int):
        # Inner Product index (works well if you normalize embeddings)
        self.index = faiss.IndexFlatIP(dimension)
        self.text_chunks = []
        self.metadata = []

    def add(self, embeddings, chunks, sources):
        """
        embeddings: list/np.array of shape (N, dim)
        chunks: list[str] length N
        sources: list[Any] length N
        """
        emb = np.array(embeddings, dtype="float32")

        # FAISS expects 2D array
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)

        self.index.add(emb)
        self.text_chunks.extend(chunks)
        self.metadata.extend(sources)

    def search(self, query_embedding, top_k: int = 3):
        """
        query_embedding: np.array shape (1, dim) or (dim,)
        returns list of dicts with text/source/score
        """
        q = np.array(query_embedding, dtype="float32")

        # FAISS expects 2D array: (1, dim)
        if q.ndim == 1:
            q = q.reshape(1, -1)

        scores, indices = self.index.search(q, top_k)

        results = []
        for idx, score in zip(indices[0], scores[0]):
            # FAISS can return -1 when not enough results
            if idx == -1:
                continue

            # Extra safety: avoid index errors
            if idx >= len(self.text_chunks):
                continue

            results.append({
                "text": self.text_chunks[idx],
                "source": self.metadata[idx],
                "score": float(score)
            })

        return results