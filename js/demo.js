/* SocialReply teaser page demo (autoplay). */
(() => {
  const SELECTORS = {
    shell: "[data-demo-shell]",
    track: "[data-demo-feed-track]",
    targetPost: "[data-demo-target-post]",
    targetComment: "[data-demo-target-comment]",
    replyBtn: "[data-demo-reply-btn]",
    popup: "[data-demo-popup]",
    stepLabel: "[data-demo-step]",
    cursor: "[data-demo-cursor]",
    generateBtn: "[data-demo-generate]",
    insertBtn: "[data-demo-insert]",
    suggestionText: "[data-demo-suggestion-text]",
    suggestionsCount: "[data-demo-suggestions-count]",
    suggestionCard: "[data-demo-suggestion-card]",
    insertedReply: "[data-demo-inserted-reply]",
  };

  const EASING = {
    scroll: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  };

  const SUGGESTION =
    "Great question—when everything feels important, I anchor on the goal and constraints (customer impact, time, reversibility). Then I rank options by impact vs effort and pick 1–2 “must-win” bets for the week. What’s the one outcome you’d be happiest to ship even if everything else slips?";

  const STEPS = [
    "1. Scroll your feed (LinkedIn, YouTube, Instagram).",
    "2. Click Reply on a comment.",
    "3. Get an AI-generated response in a focused popup.",
    "4. Click Insert to post it instantly.",
  ];

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function setPressedClass(el) {
    el.classList.add("is-pressed");
    window.setTimeout(() => el.classList.remove("is-pressed"), 160);
  }

  function setCursorVisible(cursor, isVisible) {
    cursor.classList.toggle("is-visible", isVisible);
  }

  function setStep(stepEl, text) {
    stepEl.textContent = text ?? "";
    stepEl.classList.toggle("is-visible", Boolean(text));
  }

  function positionCursorOver(cursor, shell, el) {
    const shellRect = shell.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const x = rect.left - shellRect.left + rect.width * 0.65;
    const y = rect.top - shellRect.top + rect.height * 0.7;
    cursor.style.setProperty("--cursor-x", `${x}px`);
    cursor.style.setProperty("--cursor-y", `${y}px`);
  }

  function setTrackOffset(track, px, durationMs) {
    track.style.transition = durationMs ? `transform ${durationMs}ms ${EASING.scroll}` : "none";
    track.style.transform = `translate3d(0, ${-px}px, 0)`;
  }

  function openPopup(popup) {
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  function closePopup(popup) {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
  }

  async function typeInto(el, text) {
    el.textContent = "";
    for (let i = 0; i < text.length; i += 1) {
      el.textContent += text[i];
      // Small human-ish jitter; faster on spaces.
      const base = text[i] === " " ? 14 : 22;
      const jitter = Math.random() * 22;
      await sleep(base + jitter);
    }
  }

  function setStaticFinalState(root) {
    root.classList.add("demo--static");
  }

  async function runOnce(els) {
    const {
      shell,
      track,
      targetPost,
      targetComment,
      replyBtn,
      popup,
      stepLabel,
      cursor,
      generateBtn,
      insertBtn,
      suggestionText,
      suggestionsCount,
      suggestionCard,
      insertedReply,
    } = els;

    // Reset.
    closePopup(popup);
    setCursorVisible(cursor, false);
    setStep(stepLabel, STEPS[0]);
    targetComment.classList.remove("is-responding");
    suggestionCard.classList.remove("is-typing");
    suggestionsCount.textContent = "0";
    suggestionText.textContent = "Generating…";
    insertedReply.classList.remove("is-shown");
    insertedReply.setAttribute("aria-hidden", "true");
    insertedReply.querySelector(".reply-text").textContent = "";

    shell.classList.add("is-resetting");
    setTrackOffset(track, 0, 0);
    await sleep(250);
    shell.classList.remove("is-resetting");
    await sleep(300);

    // Stop-and-go scrolling (approximate).
    const viewport = shell.querySelector(".feed-viewport");
    const viewportH = viewport?.clientHeight ?? 420;
    const maxOffset = Math.max(0, track.scrollHeight - viewportH);

    const targetTop = targetPost.offsetTop;
    const targetOffset = clamp(targetTop - 130, 0, maxOffset);

    setTrackOffset(track, clamp(120, 0, maxOffset), 900);
    await sleep(980);
    await sleep(460);

    setTrackOffset(track, clamp(260, 0, maxOffset), 820);
    await sleep(900);
    await sleep(420);

    setTrackOffset(track, targetOffset, 950);
    await sleep(1030);
    await sleep(550);

    // Cursor moves to Reply and clicks.
    setStep(stepLabel, STEPS[1]);
    targetComment.classList.add("is-responding");
    setCursorVisible(cursor, true);
    positionCursorOver(cursor, shell, replyBtn);
    await sleep(420);
    setPressedClass(replyBtn);
    await sleep(180);

    // Popup opens.
    openPopup(popup);
    await sleep(420);

    // Click Generate, then type the suggestion.
    setStep(stepLabel, STEPS[2]);
    setPressedClass(generateBtn);
    suggestionCard.classList.add("is-typing");
    suggestionsCount.textContent = "1";
    await sleep(260);
    await typeInto(suggestionText, SUGGESTION);
    suggestionCard.classList.remove("is-typing");
    await sleep(320);

    // Cursor clicks Insert.
    setStep(stepLabel, STEPS[3]);
    positionCursorOver(cursor, shell, insertBtn);
    await sleep(300);
    setPressedClass(insertBtn);
    await sleep(160);

    // Popup closes, reply appears.
    closePopup(popup);
    setCursorVisible(cursor, false);
    targetComment.classList.remove("is-responding");
    insertedReply.querySelector(".reply-text").textContent = SUGGESTION;
    insertedReply.classList.add("is-shown");
    insertedReply.setAttribute("aria-hidden", "false");
    await sleep(1100);

    // Keep scrolling a little, then loop.
    setTrackOffset(track, clamp(targetOffset + 220, 0, maxOffset), 900);
    await sleep(980);
    await sleep(650);
  }

  function getElements() {
    const shell = document.querySelector(SELECTORS.shell);
    if (!shell) return null;

    const els = {
      shell,
      track: shell.querySelector(SELECTORS.track),
      targetPost: shell.querySelector(SELECTORS.targetPost),
      targetComment: shell.querySelector(SELECTORS.targetComment),
      replyBtn: shell.querySelector(SELECTORS.replyBtn),
      popup: shell.querySelector(SELECTORS.popup),
      stepLabel: shell.querySelector(SELECTORS.stepLabel),
      cursor: shell.querySelector(SELECTORS.cursor),
      generateBtn: shell.querySelector(SELECTORS.generateBtn),
      insertBtn: shell.querySelector(SELECTORS.insertBtn),
      suggestionText: shell.querySelector(SELECTORS.suggestionText),
      suggestionsCount: shell.querySelector(SELECTORS.suggestionsCount),
      suggestionCard: shell.querySelector(SELECTORS.suggestionCard),
      insertedReply: shell.querySelector(SELECTORS.insertedReply),
    };

    const missing = Object.entries(els)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length) return null;
    return els;
  }

  async function start() {
    const els = getElements();
    if (!els) return;

    if (prefersReducedMotion) {
      setStaticFinalState(document.documentElement);
      setStep(els.stepLabel, STEPS[3]);
      els.targetComment.classList.add("is-responding");
      // Show the “after” state without motion.
      openPopup(els.popup);
      els.suggestionsCount.textContent = "1";
      els.suggestionText.textContent = SUGGESTION;
      els.insertedReply.querySelector(".reply-text").textContent = SUGGESTION;
      els.insertedReply.classList.add("is-shown");
      els.insertedReply.setAttribute("aria-hidden", "false");
      return;
    }

    let running = true;

    const stopIfHidden = () => {
      if (document.hidden) running = false;
      if (!document.hidden && !running) {
        running = true;
        loop();
      }
    };

    document.addEventListener("visibilitychange", stopIfHidden);
    window.addEventListener("pagehide", () => {
      running = false;
    });

    async function loop() {
      // Loop until tab is hidden (then resume).
      while (running) {
        await runOnce(els);
        await sleep(800);
      }
    }

    loop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

