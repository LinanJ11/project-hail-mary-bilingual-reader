(() => {
  const contentsList = document.getElementById("contents-list");
  const chapterMount = document.getElementById("chapter-mount");
  const status = document.getElementById("reader-status");
  const dialog = document.getElementById("translation-dialog");
  const translationText = document.getElementById("translation-text");
  const sourceText = document.getElementById("source-text");
  const closeButton = dialog.querySelector(".close-dialog");
  const progressBar = document.getElementById("progress-bar");
  let activeSentence = null;
  let manifest = [];

  function chapterNumberFromUrl() {
    const queryValue = new URLSearchParams(location.search).get("chapter");
    if (queryValue && /^\d+$/.test(queryValue)) return Number(queryValue);
    const legacyHash = location.hash.match(/^#chapter-(\d+)$/);
    return legacyHash ? Number(legacyHash[1]) : null;
  }

  function chapterUrl(number) {
    return `?chapter=${number}#chapter-${number}`;
  }

  function renderContents(selectedNumber) {
    contentsList.replaceChildren();
    for (const chapter of manifest) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = chapterUrl(chapter.number);
      link.innerHTML = `<span>Chapter</span><strong>${chapter.number}</strong>`;
      link.setAttribute("aria-label", chapter.title);
      if (chapter.number === selectedNumber) link.setAttribute("aria-current", "page");
      item.append(link);
      contentsList.append(item);
    }
  }

  function navigationLink(chapter, direction) {
    if (!chapter) return '<span aria-hidden="true"></span>';
    const arrow = direction === "previous" ? "← " : " →";
    return `<a href="${chapterUrl(chapter.number)}">${
      direction === "previous" ? arrow + chapter.title : chapter.title + arrow
    }</a>`;
  }

  function renderChapter(payload) {
    const currentIndex = manifest.findIndex((chapter) => chapter.number === payload.number);
    const previous = currentIndex > 0 ? manifest[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < manifest.length - 1
      ? manifest[currentIndex + 1]
      : null;

    chapterMount.innerHTML = `
      <section class="chapter" id="chapter-${payload.number}" aria-labelledby="chapter-${payload.number}-title">
        <header class="chapter-header">
          <p class="chapter-kicker">Project Hail Mary</p>
          <h2 id="chapter-${payload.number}-title">${payload.title}</h2>
        </header>
        <article class="chapter-body" aria-label="${payload.title} English text">
          ${payload.contentHtml}
        </article>
        <nav class="chapter-nav" aria-label="${payload.title} navigation">
          ${navigationLink(previous, "previous")}
          <a href="./#contents">Contents</a>
          ${navigationLink(next, "next")}
        </nav>
      </section>`;
    document.title = `${payload.title} — Project Hail Mary Bilingual Reader`;
    status.hidden = true;
    requestAnimationFrame(() => {
      document.getElementById(`chapter-${payload.number}`).scrollIntoView();
      updateProgress();
    });
  }

  async function loadJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }

  async function initialize() {
    try {
      const manifestPayload = await loadJson("data/chapters.json");
      manifest = manifestPayload.chapters;
      const selectedNumber = chapterNumberFromUrl();
      renderContents(selectedNumber);

      if (selectedNumber === null) {
        status.hidden = true;
        return;
      }

      const selected = manifest.find((chapter) => chapter.number === selectedNumber);
      if (!selected) {
        status.textContent = `Chapter ${selectedNumber} is not available yet.`;
        status.classList.add("reader-error");
        return;
      }

      status.textContent = `Loading ${selected.title}…`;
      renderChapter(await loadJson(selected.path));
    } catch (error) {
      status.textContent = "The reader could not load this chapter. Please refresh the page.";
      status.classList.add("reader-error");
      console.error(error);
    }
  }

  function openTranslation(sentence) {
    if (activeSentence) activeSentence.classList.remove("is-active");
    activeSentence = sentence;
    activeSentence.classList.add("is-active");
    translationText.textContent = sentence.dataset.zh;
    sourceText.textContent = sentence.textContent.trim();
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    closeButton.focus({ preventScroll: true });
  }

  function closeTranslation() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  document.addEventListener("click", (event) => {
    const sentence = event.target.closest(".sentence");
    if (sentence) openTranslation(sentence);
  });

  document.addEventListener("keydown", (event) => {
    const sentence = event.target.closest(".sentence");
    if (!sentence || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openTranslation(sentence);
  });

  closeButton.addEventListener("click", closeTranslation);
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closeTranslation();
  });
  dialog.addEventListener("close", () => {
    if (activeSentence) {
      activeSentence.classList.remove("is-active");
      activeSentence.focus({ preventScroll: true });
    }
  });

  function updateProgress() {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maximum > 0
      ? Math.min(100, Math.max(0, window.scrollY / maximum * 100))
      : 0;
    progressBar.style.width = `${progress}%`;
  }

  addEventListener("scroll", updateProgress, { passive: true });
  addEventListener("resize", updateProgress);
  updateProgress();
  initialize();
})();
