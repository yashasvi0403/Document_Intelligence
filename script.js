// ============================
// Frontend/script.js (Render-ready)
// Works when frontend + backend are served from the SAME Render URL
// ============================

// Storage key used in sessionStorage
const STORAGE_KEY = "di_last_result";

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

async function pingAPI() {
  // If server is up, /openapi.json will respond
  try {
    const res = await fetch("/openapi.json", { method: "GET" });
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
  const res = await fetch("/ask-recruiter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  // Handle non-JSON errors safely
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

      // Save full response + question for the answer page
      const payload = { question: q, ...data };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // Go to answer page (absolute path for Render safety)
      window.location.href = "/answer.html";
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
    window.location.href = "/index.html";
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
    // If user directly opened answer.html
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
