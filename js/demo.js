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
    intentGroup: "[data-demo-intent-group]",
    intentAgree: "[data-demo-intent-agree]",
    intentCompliment: "[data-demo-intent-compliment]",
    toneGroup: "[data-demo-tone-group]",
    toneFriendly: "[data-demo-tone-friendly]",
    toneProfessional: "[data-demo-tone-professional]",
    suggestionLoading: "[data-demo-suggestion-loading]",
    suggestionText: "[data-demo-suggestion-text]",
    suggestionsCount: "[data-demo-suggestions-count]",
    suggestionCard: "[data-demo-suggestion-card]",
    insertedReply: "[data-demo-inserted-reply]",
  };

  const EASING = {
    scroll: "cubic-bezier(0.2, 0.9, 0.2, 1)",
  };

  const SUGGESTION =
    "Great question. I start with safety + calm: teach a “look at me”, a hand target (“touch”), and a quick U-turn for escaping tough moments. Then I build tiny wins with distance and high-value treats. What’s the hardest situation right now—barking, pulling, or jumping?";

  const STEPS = [
    "1. Scroll your feed (LinkedIn, YouTube, Instagram).",
    "2. Click Reply on a comment.",
    "3. Get an AI-generated reply",
    "4. Click Insert to post it instantly",
  ];

  const WAIT_AFTER_SCROLL_MS = 300;
  const WAIT_AFTER_POPUP_OPEN_MS = 300;
  const WAIT_AFTER_INTENT_SELECT_MS = 600;
  const WAIT_AFTER_TONE_SELECT_MS = 600;
  const GENERATION_LOADING_MS = 1000;
  const WAIT_AFTER_AI_REPLY_MS = 1500;
  const WAIT_AFTER_MOVE_TO_INSERT_MS = 600;
  const WAIT_AFTER_POST_MS = 2000;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function makeAbortError() {
    // DOMException isn't available in some older browsers; keep it simple.
    const err = new Error("Aborted");
    err.name = "AbortError";
    return err;
  }

  function isAbortError(err) {
    return err?.name === "AbortError";
  }

  const sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(makeAbortError());
      const id = window.setTimeout(resolve, ms);
      if (!signal) return;
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(id);
          reject(makeAbortError());
        },
        { once: true }
      );
    });

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

  function pulseCursorClick(cursor) {
    cursor.classList.add("is-clicking");
    window.setTimeout(() => cursor.classList.remove("is-clicking"), 160);
  }

  function resetDemoState(els) {
    const {
      shell,
      track,
      targetComment,
      replyBtn,
      popup,
      stepLabel,
      cursor,
      generateBtn,
      intentGroup,
      intentAgree,
      toneGroup,
      toneProfessional,
      suggestionLoading,
      suggestionText,
      suggestionsCount,
      suggestionCard,
      insertedReply,
    } = els;

    // Clear UI state.
    closePopup(popup);
    setCursorVisible(cursor, false);
    cursor.classList.remove("is-clicking");
    cursor.style.removeProperty("--cursor-x");
    cursor.style.removeProperty("--cursor-y");

    setStep(stepLabel, STEPS[0]);
    targetComment.classList.remove("is-responding");

    // Clear any "pressed" artifacts if a cycle was aborted mid-click.
    replyBtn.classList.remove("is-pressed");
    generateBtn.classList.remove("is-pressed");
    Array.from(intentGroup?.querySelectorAll(".popup-switch-option.is-pressed") ?? []).forEach((n) =>
      n.classList.remove("is-pressed")
    );
    Array.from(toneGroup?.querySelectorAll(".popup-switch-option.is-pressed") ?? []).forEach((n) =>
      n.classList.remove("is-pressed")
    );
    suggestionCard.classList.remove("is-pressed");

    // Suggestions area.
    suggestionCard.classList.remove("is-loading", "is-ready");
    setLoading(suggestionLoading, false);
    suggestionsCount.textContent = "0";
    suggestionText.textContent = "";

    // Inserted reply bubble.
    insertedReply.classList.remove("is-shown");
    insertedReply.setAttribute("aria-hidden", "true");
    insertedReply.querySelector(".reply-text").textContent = "";

    // Radio selections back to defaults.
    setRadioGroupSelection(intentGroup, intentAgree);
    setRadioGroupSelection(toneGroup, toneProfessional);

    // Feed scroll reset.
    shell.classList.add("is-resetting");
    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0px, 0)";
  }

  function setStep(stepEl, text) {
    if (!text) {
      stepEl.textContent = "";
      stepEl.classList.remove("is-visible");
      return;
    }

    const match = String(text).match(/^(\d+)\.\s*(.*)$/);
    const stepNum = match?.[1] ?? "";
    const stepText = match?.[2] ?? String(text);

    stepEl.innerHTML = `<span class="demo-step-num" aria-hidden="true">${stepNum}</span><span class="demo-step-text">${stepText}</span>`;
    stepEl.classList.add("is-visible");
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

  function getTopWithinTrack(el, track) {
    const elRect = el.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    return elRect.top - trackRect.top;
  }

  function openPopup(popup) {
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  function closePopup(popup) {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
  }

  function setStaticFinalState(root) {
    root.classList.add("demo--static");
  }

  function setLoading(loadingEl, isLoading) {
    loadingEl.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }

  function setRadioGroupSelection(groupEl, selectedEl) {
    const radios = Array.from(groupEl?.querySelectorAll('[role="radio"]') ?? []);
    for (const radio of radios) {
      const isSelected = radio === selectedEl;
      radio.classList.toggle("is-selected", isSelected);
      radio.setAttribute("aria-checked", isSelected ? "true" : "false");
    }
  }

  async function runOnce(els, signal) {
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
      intentGroup,
      intentAgree,
      intentCompliment,
      toneGroup,
      toneFriendly,
      toneProfessional,
      suggestionLoading,
      suggestionText,
      suggestionsCount,
      suggestionCard,
      insertedReply,
    } = els;

    // Reset.
    resetDemoState(els);
    // Keep the reset tight so timing matches the scripted steps.
    await sleep(60, signal);
    shell.classList.remove("is-resetting");
    await sleep(0, signal);

    // Stop-and-go scrolling (scripted).
    const viewport = shell.querySelector(".feed-viewport");
    const viewportH = viewport?.clientHeight ?? 420;
    const maxOffset = Math.max(0, track.scrollHeight - viewportH);

    // Step 1: scroll down once.
    const scroll1Offset = clamp(viewportH * 0.4, 0, maxOffset);
    setTrackOffset(track, scroll1Offset, 650);
    await sleep(670, signal);
    await sleep(WAIT_AFTER_SCROLL_MS, signal);

    // Step 2: scroll down twice so Mina’s comment sits in the top third.
    // Keep the headline on "Scroll your feed".
    setStep(stepLabel, STEPS[0]);
    const commentTop = getTopWithinTrack(targetComment, track);
    const desiredOffset = clamp(commentTop - viewportH * 0.25, 0, maxOffset);
    const scroll2aOffset = clamp(scroll1Offset + (desiredOffset - scroll1Offset) * 0.55, 0, maxOffset);
    setTrackOffset(track, scroll2aOffset, 520);
    await sleep(540, signal);
    setTrackOffset(track, desiredOffset, 520);
    await sleep(540, signal);
    await sleep(WAIT_AFTER_SCROLL_MS, signal);

    // Cursor moves to Reply and clicks.
    setStep(stepLabel, STEPS[1]);
    targetComment.classList.add("is-responding");
    setCursorVisible(cursor, true);
    positionCursorOver(cursor, shell, replyBtn);
    await sleep(260, signal);
    pulseCursorClick(cursor);
    setPressedClass(replyBtn);
    await sleep(120, signal);

    // Popup opens.
    openPopup(popup);
    await sleep(WAIT_AFTER_POPUP_OPEN_MS, signal);

    // Select intent (Compliment) from Agree.
    positionCursorOver(cursor, shell, intentCompliment);
    await sleep(220, signal);
    pulseCursorClick(cursor);
    setPressedClass(intentCompliment);
    setRadioGroupSelection(intentGroup, intentCompliment);
    await sleep(WAIT_AFTER_INTENT_SELECT_MS, signal);

    // Select tone (Friendly).
    positionCursorOver(cursor, shell, toneFriendly);
    await sleep(220, signal);
    pulseCursorClick(cursor);
    setPressedClass(toneFriendly);
    setRadioGroupSelection(toneGroup, toneFriendly);
    await sleep(WAIT_AFTER_TONE_SELECT_MS, signal);

    // Cursor moves to Generate and clicks.
    setStep(stepLabel, STEPS[2]);
    positionCursorOver(cursor, shell, generateBtn);
    await sleep(240, signal);
    pulseCursorClick(cursor);
    setPressedClass(generateBtn);

    // Show loading spinner, then reveal the full suggestion.
    suggestionsCount.textContent = "1";
    suggestionText.textContent = "";
    suggestionCard.classList.add("is-loading");
    suggestionCard.classList.remove("is-ready");
    setLoading(suggestionLoading, true);
    await sleep(GENERATION_LOADING_MS, signal);
    setLoading(suggestionLoading, false);
    suggestionCard.classList.remove("is-loading");
    suggestionText.textContent = SUGGESTION;
    suggestionCard.classList.add("is-ready");
    await sleep(WAIT_AFTER_AI_REPLY_MS, signal);

    // Step 5: show response and move cursor to Insert.
    // Keep the headline on "AI-generated reply" until we insert.
    setStep(stepLabel, STEPS[2]);
    positionCursorOver(cursor, shell, suggestionCard);
    await sleep(WAIT_AFTER_MOVE_TO_INSERT_MS, signal);

    // Step 6: click suggestion (inserts), close plugin, show posted reply.
    setStep(stepLabel, STEPS[3]);
    pulseCursorClick(cursor);
    setPressedClass(suggestionCard);
    await sleep(160, signal);

    closePopup(popup);
    setCursorVisible(cursor, false);
    insertedReply.querySelector(".reply-text").textContent = SUGGESTION;
    insertedReply.classList.add("is-shown");
    insertedReply.setAttribute("aria-hidden", "false");
    await sleep(WAIT_AFTER_POST_MS, signal);
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
      stepLabel: document.querySelector(SELECTORS.stepLabel),
      cursor: shell.querySelector(SELECTORS.cursor),
      generateBtn: shell.querySelector(SELECTORS.generateBtn),
      intentGroup: shell.querySelector(SELECTORS.intentGroup),
      intentAgree: shell.querySelector(SELECTORS.intentAgree),
      intentCompliment: shell.querySelector(SELECTORS.intentCompliment),
      toneGroup: shell.querySelector(SELECTORS.toneGroup),
      toneFriendly: shell.querySelector(SELECTORS.toneFriendly),
      toneProfessional: shell.querySelector(SELECTORS.toneProfessional),
      suggestionLoading: shell.querySelector(SELECTORS.suggestionLoading),
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

  let hasStarted = false;

  async function start() {
    const els = getElements();
    if (!els) return;

    if (hasStarted) return;
    hasStarted = true;

    if (prefersReducedMotion) {
      setStaticFinalState(document.documentElement);
      setStep(els.stepLabel, STEPS[3]);
      els.targetComment.classList.add("is-responding");
      setRadioGroupSelection(els.intentGroup, els.intentCompliment);
      setRadioGroupSelection(els.toneGroup, els.toneFriendly);
      // Ensure the target comment is visible (roughly top third).
      const viewport = els.shell.querySelector(".feed-viewport");
      const viewportH = viewport?.clientHeight ?? 420;
      const maxOffset = Math.max(0, els.track.scrollHeight - viewportH);
      const commentTop = getTopWithinTrack(els.targetComment, els.track);
      const desiredOffset = clamp(commentTop - viewportH * 0.25, 0, maxOffset);
      setTrackOffset(els.track, desiredOffset, 0);

      // Show the “after” state without motion.
      els.suggestionsCount.textContent = "1";
      setLoading(els.suggestionLoading, false);
      els.suggestionCard.classList.remove("is-loading");
      els.suggestionText.textContent = SUGGESTION;
      els.suggestionCard.classList.add("is-ready");
      closePopup(els.popup);
      els.insertedReply.querySelector(".reply-text").textContent = SUGGESTION;
      els.insertedReply.classList.add("is-shown");
      els.insertedReply.setAttribute("aria-hidden", "false");
      return;
    }

    // Ensure there is only one loop instance at a time (visibility changes can otherwise
    // re-enter `loop()` while an old `runOnce()` is still mid-flight).
    const state = {
      shouldRun: true,
      loopPromise: null,
      cycleController: null,
    };

    function abortCycleAndReset() {
      state.cycleController?.abort();
      resetDemoState(els);
      // Ensure we don't remain dimmed if a cycle is aborted mid-reset.
      window.setTimeout(() => els.shell.classList.remove("is-resetting"), 0);
    }

    function pause() {
      state.shouldRun = false;
      abortCycleAndReset();
    }

    function resume() {
      state.shouldRun = true;
      ensureLoop();
    }

    function onVisibilityChange() {
      if (document.hidden) pause();
      else resume();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", () => pause());

    async function runCycle() {
      state.cycleController = new AbortController();
      try {
        await runOnce(els, state.cycleController.signal);
      } catch (err) {
        if (!isAbortError(err)) throw err;
      } finally {
        state.cycleController = null;
      }
    }

    async function loop() {
      while (state.shouldRun) {
        await runCycle();
        if (!state.shouldRun) break;
        await sleep(0);
      }
      state.loopPromise = null;
    }

    function ensureLoop() {
      if (state.loopPromise) return;
      state.loopPromise = loop();
    }

    // Start immediately, unless we're already hidden (in which case we'll start on resume).
    if (!document.hidden) ensureLoop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

