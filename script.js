/* ===============================
   PAGE DETECTION
================================= */
const isLoader = document.body.classList.contains("loader-page");
const isReader = document.body.classList.contains("reader-page");

/* ===============================
   LOADER PAGE LOGIC
================================= */
if (isLoader) {
  const textInput = document.getElementById("textInput");
  const pdfInput = document.getElementById("pdfInput");
  const startBtn = document.getElementById("startBtn");

  function sanitize(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function detectChapters(text) {
    const lines = text.split(/\n+/);
    const chapters = [];

    lines.forEach((line, i) => {
      if (/chapter|CHAPTER|Chapter/.test(line) || line.length > 60) {
        chapters.push({ index: i, title: line.trim() });
      }
    });

    return chapters;
  }

  async function loadPDF(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let full = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      full += content.items.map(x => x.str).join(" ") + " ";
    }
    return sanitize(full);
  }

  startBtn.onclick = async () => {
    let text = textInput.value.trim();

    if (pdfInput.files.length > 0) {
      text = await loadPDF(pdfInput.files[0]);
    }

    if (!text) {
      alert("Please paste text or upload a PDF.");
      return;
    }

    const chapters = detectChapters(text);

    localStorage.setItem("rsvp_text", text);
    localStorage.setItem("rsvp_chapters", JSON.stringify(chapters));
    localStorage.setItem("rsvp_progress", "0");

    window.location.href = "reader.html";
  };
}

/* ===============================
   READER PAGE LOGIC
================================= */
if (isReader) {
  const pauseBtn = document.getElementById("pauseBtn");
  const wpmInput = document.getElementById("wpm");
  const fontSizeInput = document.getElementById("fontSize");
  const modeSelect = document.getElementById("mode");
  const wordBox = document.getElementById("wordBox");
  const progressBar = document.getElementById("progressBar");

  let text = localStorage.getItem("rsvp_text") || "";
  let words = text.split(" ").filter(Boolean);

  let index = parseInt(localStorage.getItem("rsvp_progress") || "0");
  let paused = false;
  let timer = null;

  function pivotIndex(word) {
    if (word.length <= 1) return 0;
    if (word.length <= 5) return 1;
    if (word.length <= 9) return 2;
    if (word.length <= 13) return 3;
    return 4;
  }

  function renderWord(word) {
    const mode = modeSelect.value;

    if (mode !== "pivot") {
      if (mode === "highlight") {
        wordBox.innerHTML = `<span class="highlight">${word}</span>`;
      } else if (mode === "underline") {
        wordBox.innerHTML = `<span class="underline">${word}</span>`;
      }
      return;
    }

    const p = pivotIndex(word);
    const before = word.slice(0, p);
    const pivot = word[p];
    const after = word.slice(p + 1);

    wordBox.innerHTML = `
      <div class="word-left">${before}</div>
      <div class="word-pivot">${pivot}</div>
      <div class="word-right">${after}</div>
    `;
  }

  function isSentenceEnd(word) {
    return /[.!?]$/.test(word);
  }

  function updateProgress() {
    const pct = (index / words.length) * 100;
    progressBar.style.width = pct + "%";
    localStorage.setItem("rsvp_progress", index);
  }

  function next() {
    if (paused) return;

    if (index >= words.length) {
      paused = true;
      pauseBtn.classList.add("paused");
      pauseBtn.textContent = "Resume";
      return;
    }

    const word = words[index];
    renderWord(word);
    updateProgress();
    index++;

    clearTimeout(timer);

    let delay = 60000 / parseInt(wpmInput.value);

    if (isSentenceEnd(word)) delay *= 2.2;

    timer = setTimeout(next, delay);
  }

  pauseBtn.onclick = () => {
    paused = !paused;
    if (paused) {
      pauseBtn.classList.add("paused");
      pauseBtn.textContent = "Resume";
    } else {
      pauseBtn.classList.remove("paused");
      pauseBtn.textContent = "Pause";
      next();
    }
  };

  fontSizeInput.oninput = () => {
    document.documentElement.style.setProperty("--fontSize", fontSizeInput.value + "px");
  };

  next();
}
