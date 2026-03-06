/**
 * @name Fullscreen On Launch
 * @description One-time fullscreen on launch (cookie), popup toggle + hotkey rebind (single key, default F12).
 * @version 1.0.2
 */

if (!window.__webmodFsOnce) {
  window.__webmodFsOnce = true;

  const COOKIE_ON = "webmod_fullscreen_on"; // "1" or "0"
  const COOKIE_KEY = "webmod_fullscreen_key"; // KeyboardEvent.code
  const DEFAULT_KEY = "F12";

  const $ = (sel) => document.querySelector(sel);

  const getCookie = (name) =>
    document.cookie
      .split("; ")
      .find((x) => x.startsWith(name + "="))
      ?.split("=")
      .slice(1)
      .join("=") || "";
  const setCookie = (name, val, days = 365) => {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(val)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  };

  // default ON if cookie missing
  const onLaunchEnabled = () => {
    const v = getCookie(COOKIE_ON);
    return v === "" ? true : v === "1";
  };
  const setOnLaunchEnabled = (v) => setCookie(COOKIE_ON, v ? "1" : "0");

  const getHotkey = () =>
    decodeURIComponent(getCookie(COOKIE_KEY) || "") || DEFAULT_KEY;
  const setHotkey = (code) => setCookie(COOKIE_KEY, code || DEFAULT_KEY);

  const isEditableTarget = (t) => {
    const tag = (t?.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || t?.isContentEditable;
  };

  const isFs = () => !!document.fullscreenElement;

  const enterFs = async () => {
    try {
      const el = document.documentElement;
      if (!el.requestFullscreen) return false;
      await el.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch {
      return false;
    }
  };

  const exitFs = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
    } catch {}
  };

  // --- UI ---
  const UI_ID = "__webmod_fs_ui";

  function ensureUI() {
    if (!document.body) return false;
    if (document.getElementById(UI_ID)) return true;

    const root = document.createElement("div");
    root.id = UI_ID;
    root.innerHTML = `
      <div class="wmfs-overlay wmfs-hidden" id="wmfs_overlay">
        <div class="wmfs-card" role="dialog" aria-modal="true">
          <div class="wmfs-top">
            <div>
              <div class="wmfs-title">Fullscreen</div>
              <div class="wmfs-sub">Hotkey: <span id="wmfs_hotkey_text"></span></div>
            </div>
          </div>

          <div class="wmfs-switchRow">
            <div class="wmfs-switchText">
              <div class="wmfs-switchTitle">Start fullscreen on launch</div>
              <div class="wmfs-switchSub">Tries once on launch</div>
            </div>

            <button class="wmfs-toggleBtn" id="wmfs_onlaunch_btn" type="button">
              <span class="wmfs-dot"></span>
              <span class="wmfs-toggleLabel" id="wmfs_onlaunch_label"></span>
            </button>
          </div>

          <div class="wmfs-actions">
            <button class="wmfs-btn" id="wmfs_toggle" type="button">Toggle fullscreen</button>
            <button class="wmfs-btn" id="wmfs_rebind" type="button">Rebind hotkey</button>
            <button class="wmfs-btn wmfs-ghost" id="wmfs_close" type="button">Close</button>
          </div>

          <div class="wmfs-hint" id="wmfs_hint">Tip: Rebind → press a key. Esc cancels.</div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const overlay = $("#wmfs_overlay");
    const hotkeyText = $("#wmfs_hotkey_text");
    const hint = $("#wmfs_hint");

    const btnOnLaunch = $("#wmfs_onlaunch_btn");
    const onLaunchLabel = $("#wmfs_onlaunch_label");

    const btnToggle = $("#wmfs_toggle");
    const btnRebind = $("#wmfs_rebind");
    const btnClose = $("#wmfs_close");

    let rebinding = false;

    const paintOnLaunch = (enabled) => {
      btnOnLaunch.classList.toggle("wmfs-on", enabled);
      btnOnLaunch.classList.toggle("wmfs-off", !enabled);
      onLaunchLabel.textContent = enabled ? "ON" : "OFF";
    };

    const update = () => {
      hotkeyText.textContent = getHotkey();
      paintOnLaunch(onLaunchEnabled());
    };

    const show = () => {
      update();
      overlay.classList.remove("wmfs-hidden");
    };

    const hide = () => {
      overlay.classList.add("wmfs-hidden");
      rebinding = false;
      btnRebind.textContent = "Rebind hotkey";
      hint.textContent = "Tip: Rebind → press a key. Esc cancels.";
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hide();
    });

    btnClose.onclick = hide;

    btnToggle.onclick = async () => {
      if (isFs()) await exitFs();
      else await enterFs();
      update();
    };

    btnOnLaunch.onclick = () => {
      const next = !onLaunchEnabled();
      setOnLaunchEnabled(next);
      update();
    };

    btnRebind.onclick = () => {
      rebinding = true;
      btnRebind.textContent = "Press a key…";
      hint.textContent = "Press any key to bind. Esc cancels.";
      update();
    };

    root.__wmfs_show = show;
    root.__wmfs_hide = hide;
    root.__wmfs_update = update;
    root.__wmfs_isRebinding = () => rebinding;
    root.__wmfs_finishRebind = (code) => {
      setHotkey(code);
      rebinding = false;
      btnRebind.textContent = "Rebind hotkey";
      hint.textContent = "Saved.";
      update();
      setTimeout(
        () => (hint.textContent = "Tip: Rebind → press a key. Esc cancels."),
        700,
      );
    };
    root.__wmfs_cancelRebind = () => {
      rebinding = false;
      btnRebind.textContent = "Rebind hotkey";
      hint.textContent = "Cancelled.";
      update();
      setTimeout(
        () => (hint.textContent = "Tip: Rebind → press a key. Esc cancels."),
        700,
      );
    };

    update();
    return true;
  }

  function uiRoot() {
    return document.getElementById(UI_ID);
  }

  function showPopup() {
    const r = uiRoot();
    r?.__wmfs_show?.();
  }

  // --- One-time fullscreen on launch ---
  let launchAttempted = false;

  async function tryLaunchFullscreenOnce() {
    if (launchAttempted) return;
    launchAttempted = true;

    if (!onLaunchEnabled() || isFs()) return;

    const ok = await enterFs();
    if (ok) return;

    // one-time retry if blocked
    const once = async () => {
      window.removeEventListener("pointerdown", once, true);
      if (!isFs() && onLaunchEnabled()) await enterFs();
    };
    window.addEventListener("pointerdown", once, true);
  }

  // --- Global key handling ---
  document.addEventListener(
    "keydown",
    (e) => {
      const r = uiRoot();
      const rebinding = !!(r && r.__wmfs_isRebinding && r.__wmfs_isRebinding());

      if (rebinding) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Escape") r.__wmfs_cancelRebind();
        else r.__wmfs_finishRebind(e.code);
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (e.code === getHotkey()) {
        e.preventDefault();
        showPopup();
      }

      const overlay = $("#wmfs_overlay");
      if (
        overlay &&
        !overlay.classList.contains("wmfs-hidden") &&
        e.code === "Escape"
      ) {
        e.preventDefault();
        r?.__wmfs_hide?.();
      }
    },
    true,
  );

  // --- Boot ---
  const boot = () => {
    if (!ensureUI()) return false;
    tryLaunchFullscreenOnce();
    return true;
  };

  if (!boot()) {
    const t = setInterval(() => {
      if (boot()) clearInterval(t);
    }, 50);
  }
}
