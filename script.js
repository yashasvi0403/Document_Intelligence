// ============================
// script.js (GitHub Pages + Remote Backend ready)
// Works when frontend is on GitHub Pages and backend is on HuggingFace/Render/etc.
// ============================

const STORAGE_KEY = "di_last_result";

/**
 * ✅ SET YOUR BACKEND URL HERE
 * Example (Hugging Face Space):
 *   https://your-space-name.hf.space
 * Example (Render):
 *   https://your-service.onrender.com
 */
const BACKEND_BASE = "https://yashasvi0409-document-intelligence.hf.space";

function $(id) { return document.getElementById(id); }

function setStatus(text, ok) {
  const el = $("apiStatus");
  if (!el) return;

  el.textContent = text;

  const dot = document.querySelector(".dot");
  if (!dot) return;

  dot.style.background = ok ? "#22c55e" : "#f59e0b";
  dot.style.boxShadow = ok
    ? "0 0 0 5px rgba(34,197,94,0.12)"
    : "0 0 0 5px rgba(245,158,11,0.12)";
}

function apiUrl(path) {
  // Ensure no double slashes
  const base = (BACKEND_BASE || "").replace(/\/+$/, "");
  const p = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function pingAPI() {
  // For remote backend, ping backend openapi
  try {
    const res = await fetch(apiUrl("/openapi.json"), { method: "GET" });
    if (res.ok) setStatus("API: Online", true);
    else setStatus("API: Issue", false);
  } catch {
    setStatus("API: Offline", false);
  }
}

function showError(msg) {
  const box = $("errorBox");
  if (!box) return;
  box.textContent = msg;
  box.classList.remove("hidden");
}

function clearError() {
  const box = $("errorBox");
  if (!box) return;
  box.textContent = "";
  box.classList.add("hidden");
}

async function askQuestion(question) {
  const res = await fetch(apiUrl("/ask-recruiter"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { answer: text || "Unexpected response from server." };
  }

  if (!res.ok) {
    const msg = data?.detail
      ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))
      : (data?.answer || "Request failed.");
    throw new Error(msg);
  }

  return data;
}

function formatSourceDocs(source_documents) {
  if (!source_documents) return "—";
  if (Array.isArray(source_documents) && source_documents.length > 0) return source_documents.join(", ");
  return "—";
}

function toFixedMaybe(value, digits = 4) {
  const n = Number(value);
  if (Number.isFinite(n)) return n.toFixed(digits);
  return String(value ?? "—");
}

/* =========================
   INDEX PAGE LOGIC
========================= */
async function initIndex() {
  await pingAPI();

  const askBtn = $("askBtn");
  const clearBtn = $("clearBtn");
  const questionEl = $("question");

  if (!askBtn || !questionEl) return;

  clearBtn?.addEventListener("click", () => {
    questionEl.value = "";
    clearError();
    questionEl.focus();
  });

  askBtn.addEventListener("click", async () => {
    clearError();
    const q = (questionEl.value || "").trim();

    if (!q) {
      showError("Please enter a question.");
      return;
    }

    askBtn.disabled = true;
    askBtn.textContent = "Processing...";

    try {
      const data = await askQuestion(q);

      // Save result for answer page
      const payload = { question: q, ...data };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // ✅ GitHub Pages safe navigation (relative)
      window.location.href = "answer.html";
    } catch (err) {
      showError("Error: " + (err?.message || "Something went wrong."));
    } finally {
      askBtn.disabled = false;
      askBtn.innerHTML = `<span class="btn-icon">✨</span> Ask & Get Answer`;
    }
  });
}

/* =========================
   ANSWER PAGE LOGIC
========================= */
function initAnswer() {
  const backBtn = $("backBtn");
  const copyBtn = $("copyBtn");

  backBtn?.addEventListener("click", () => {
    // ✅ GitHub Pages safe navigation (relative)
    window.location.href = "index.html";
  });

  copyBtn?.addEventListener("click", async () => {
    const ans = $("answerView")?.textContent || "";
    try {
      await navigator.clipboard.writeText(ans);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.innerHTML = `<span class="btn-icon">📋</span> Copy Answer`), 900);
    } catch {
      // ignore
    }
  });

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if ($("questionView")) $("questionView").textContent = "No question found. Please go back and ask a question.";
    if ($("answerView")) $("answerView").textContent = "—";
    if ($("confidence")) $("confidence").textContent = "—";
    if ($("similarity")) $("similarity").textContent = "—";
    if ($("sourceDocs")) $("sourceDocs").textContent = "—";
    return;
  }

  const data = JSON.parse(raw);

  if ($("questionView")) $("questionView").textContent = data.question ?? "—";
  if ($("answerView")) $("answerView").textContent = data.answer ?? "—";
  if ($("confidence")) $("confidence").textContent = String(data.confidence ?? "—").toUpperCase();
  if ($("similarity")) $("similarity").textContent = toFixedMaybe(data.similarity_score, 4);
  if ($("sourceDocs")) $("sourceDocs").textContent = formatSourceDocs(data.source_documents);
}

/* =========================
   BOOT
========================= */
(function boot() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.endsWith("/answer.html") || path.endsWith("answer.html")) initAnswer();
  else initIndex();
})();
