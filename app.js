/* ═══════════════════════════════════════════
   ОСНОВЫ ПРАВА — INVITATION APP
   State Machine: closed → opening → open → closing → closed
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── DOM ELEMENTS ───
  const mediaContainer    = document.getElementById("media-container");
  const heroStatic        = document.getElementById("hero-static");
  const videoOpening      = document.getElementById("video-opening");
  const videoClosing      = document.getElementById("video-closing");
  const bgOverlay         = document.getElementById("bg-overlay");
  const sealHotspot       = document.getElementById("seal-hotspot");
  const invitationWrapper = document.getElementById("invitation-wrapper");
  const paperSheet        = document.getElementById("paper-sheet");
  const btnMeet           = document.getElementById("btn-meet");
  const btnCopy           = document.getElementById("btn-copy");
  const bgMusic           = document.getElementById("bg-music");
  const sakuraLeft        = document.getElementById("sakura-left");
  const sakuraRight       = document.getElementById("sakura-right");

  // ─── STATE ───
  let state = "closed"; // closed | opening | open | closing

  // ─── AUDIO ───
  function playMusic() {
    if (!bgMusic) return;
    bgMusic.volume = 0.3;
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {
        // User interaction required to play audio
      });
    }
  }

  // ─── POPULATE FROM CONFIG ───
  function populateConfig() {
    document.getElementById("inv-player1").textContent = CONFIG.player1Name;
    document.getElementById("inv-player2").textContent = CONFIG.player2Name;
    document.getElementById("inv-date").textContent    = CONFIG.date;
    document.getElementById("inv-time").textContent    = CONFIG.time;
    if (CONFIG.description) {
      const descEl = document.getElementById("inv-desc");
      if (descEl) descEl.textContent = CONFIG.description;
    }
    btnMeet.href = CONFIG.meetUrl;
  }

  // ─── NATURAL IMAGE DIMENSIONS ───
  const IMG_NAT_W = 1920;
  const IMG_NAT_H = 1080;

  // ─── E&A SEAL — center in natural coords (fraction) ───
  const SEAL_NAT_X = 0.50;
  const SEAL_NAT_Y = 0.545;

  // ─── OBJECT-FIT:COVER MATH ───
  function getCoverTransform() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgAspect = IMG_NAT_W / IMG_NAT_H;
    const vpAspect  = vw / vh;

    let renderedW, renderedH, offsetX, offsetY;

    if (vpAspect > imgAspect) {
      renderedW = vw;
      renderedH = vw / imgAspect;
      offsetX = 0;
      offsetY = (vh - renderedH) / 2;
    } else {
      renderedH = vh;
      renderedW = vh * imgAspect;
      offsetX = (vw - renderedW) / 2;
      offsetY = 0;
    }

    return { renderedW, renderedH, offsetX, offsetY, vw, vh };
  }

  function natToViewport(natX, natY, t) {
    return {
      x: t.offsetX + t.renderedW * natX,
      y: t.offsetY + t.renderedH * natY
    };
  }

  // ─── SEAL HOTSPOT POSITIONING ───
  function positionSealHotspot() {
    const t   = getCoverTransform();
    const pos = natToViewport(SEAL_NAT_X, SEAL_NAT_Y, t);

    sealHotspot.style.left = pos.x + "px";
    sealHotspot.style.top  = pos.y + "px";

    const sealSize = Math.max(60, Math.min(130, t.renderedW * 0.065));
    sealHotspot.style.width  = sealSize + "px";
    sealHotspot.style.height = sealSize + "px";
  }

  // ─── STAGGER REVEAL ───
  function revealInvitationContent() {
    const items = paperSheet.querySelectorAll("[data-stagger]");
    const sorted = Array.from(items).sort(
      (a, b) => parseInt(a.dataset.stagger) - parseInt(b.dataset.stagger)
    );
    sorted.forEach((el, i) => {
      el.classList.remove("closing-out");
      setTimeout(() => el.classList.add("revealed"), i * 45);
    });
  }

  // ─── STAGGER HIDE ───
  function hideInvitationContent() {
    return new Promise((resolve) => {
      const items = paperSheet.querySelectorAll("[data-stagger]");
      const sorted = Array.from(items).sort(
        (a, b) => parseInt(b.dataset.stagger) - parseInt(a.dataset.stagger)
      );
      let maxDelay = 0;
      sorted.forEach((el, i) => {
        const delay = i * 25;
        maxDelay = delay;
        setTimeout(() => {
          el.classList.remove("revealed");
          el.classList.add("closing-out");
        }, delay);
      });
      setTimeout(resolve, maxDelay + 320);
    });
  }

  function resetInvitationContent() {
    paperSheet.querySelectorAll("[data-stagger]").forEach((el) => {
      el.classList.remove("revealed", "closing-out");
    });
  }

  // ═══════════════════════════════════════════
  // STATE TRANSITIONS
  // ═══════════════════════════════════════════

  // CLOSED → OPENING
  function transitionToOpening() {
    if (state !== "closed") return;
    state = "opening";

    playMusic();

    mediaContainer.className = "state-opening";
    videoOpening.currentTime = 0;

    const p = videoOpening.play();
    if (p) p.catch(() => transitionToOpen());
  }

  // OPENING → OPEN
  function transitionToOpen() {
    state = "open";
    mediaContainer.className = "state-open";
    // video-opening stays paused on its last frame (CSS keeps it visible)

    // Show wrapper (enables click-outside detection)
    invitationWrapper.classList.add("visible");

    // Paper sheet rises from envelope
    setTimeout(() => {
      paperSheet.classList.add("visible");
    }, 50);

    // Sakura branches enter
    showSakura();

    // After sheet fully appears, stagger-reveal the text
    setTimeout(() => {
      revealInvitationContent();
    }, 350);
  }

  // ─── SAKURA HELPERS ───
  function showSakura() {
    if (sakuraLeft) {
      sakuraLeft.classList.remove("closing", "idle");
      sakuraLeft.classList.add("visible");
    }
    if (sakuraRight) {
      setTimeout(() => {
        sakuraRight.classList.remove("closing", "idle");
        sakuraRight.classList.add("visible");
      }, 130);
    }
    // Start idle floating after entrance animation completes
    setTimeout(() => {
      if (state === "open") {
        if (sakuraLeft) sakuraLeft.classList.add("idle");
        if (sakuraRight) sakuraRight.classList.add("idle");
      }
    }, 1500);
  }

  function hideSakura() {
    return new Promise((resolve) => {
      // Step 1: Stop idle animation — element snaps to .visible transform
      if (sakuraLeft) sakuraLeft.classList.remove("idle");
      if (sakuraRight) sakuraRight.classList.remove("idle");

      // Step 2: Force reflow so browser registers the .visible state
      // before we start the closing transition
      void (sakuraLeft && sakuraLeft.offsetHeight);

      // Step 3: Transition from .visible → .closing (smooth)
      requestAnimationFrame(() => {
        if (sakuraLeft) {
          sakuraLeft.classList.remove("visible");
          sakuraLeft.classList.add("closing");
        }
        if (sakuraRight) {
          sakuraRight.classList.remove("visible");
          sakuraRight.classList.add("closing");
        }
        setTimeout(resolve, 620);
      });
    });
  }

  function resetSakura() {
    if (sakuraLeft) sakuraLeft.classList.remove("visible", "closing", "idle");
    if (sakuraRight) sakuraRight.classList.remove("visible", "closing", "idle");
  }

  // OPEN → CLOSING
  async function transitionToClosing() {
    if (state !== "open") return;
    state = "closing";

    // 0. Sakura retreats first
    const sakuraOut = hideSakura();

    // 1. Fade out text content on the sheet (in parallel with sakura)
    await hideInvitationContent();

    // Wait for sakura exit to complete
    await sakuraOut;

    // 2. Slide the paper sheet back down into envelope
    paperSheet.classList.remove("visible");
    await new Promise((r) => setTimeout(r, 450));

    // 3. Hide the overlay wrapper
    invitationWrapper.classList.remove("visible");

    // 4. Prepare reversed video at frame 0 BEFORE showing it
    videoClosing.currentTime = 0;
    await new Promise((r) => setTimeout(r, 60));

    // 5. Switch to closing state (CSS swaps videos seamlessly)
    mediaContainer.className = "state-closing";

    // 6. Play reversed animation
    const p = videoClosing.play();
    if (p) p.catch(() => transitionToClosed());
  }

  // CLOSING → CLOSED
  function transitionToClosed() {
    state = "closed";
    mediaContainer.className = "";

    // Reset videos
    videoOpening.pause();
    videoOpening.currentTime = 0;
    videoClosing.pause();
    videoClosing.currentTime = 0;

    // Reset invitation
    resetInvitationContent();
    resetSakura();
    paperSheet.classList.remove("visible");
    invitationWrapper.classList.remove("visible");
  }

  // ─── VIDEO EVENTS ───
  videoOpening.addEventListener("ended", () => {
    if (state === "opening") transitionToOpen();
  });

  videoClosing.addEventListener("ended", () => {
    if (state === "closing") transitionToClosed();
  });

  // ─── CLICK / KEYBOARD ───

  sealHotspot.addEventListener("click", (e) => {
    e.stopPropagation();
    transitionToOpening();
  });

  sealHotspot.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      transitionToOpening();
    }
  });

  // Click OUTSIDE paper sheet → close
  document.addEventListener("click", (e) => {
    if (state !== "open") return;
    if (paperSheet.contains(e.target)) return;
    transitionToClosing();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state === "open") {
      transitionToClosing();
    }
  });

  // ─── MEET BUTTON ───
  btnMeet.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // ─── COPY BUTTON ───
  btnCopy.addEventListener("click", (e) => {
    e.stopPropagation();

    navigator.clipboard.writeText(CONFIG.meetUrl).then(() => {
      showCopied();
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = CONFIG.meetUrl;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showCopied();
    });
  });



  function showCopied() {
    btnCopy.textContent = "ССЫЛКА СКОПИРОВАНА";
    btnCopy.classList.add("copied");
    setTimeout(() => {
      btnCopy.textContent = "КОПИРОВАТЬ ССЫЛКУ";
      btnCopy.classList.remove("copied");
    }, 2500);
  }

  // ─── PREVENT DRAG ───
  heroStatic.addEventListener("dragstart", (e) => e.preventDefault());

  // ─── RESIZE ───
  let resizeTO;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
      positionSealHotspot();
    }, 100);
  });

  // ─── INIT ───
  function init() {
    populateConfig();
    positionSealHotspot();
    if (bgMusic) bgMusic.volume = 0.3;
    videoOpening.load();
    videoClosing.load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
