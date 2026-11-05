/**
 * FOCUSLENS – Smart Browser Focus
 * Content Script: Website Interceptor & YouTube Distraction Shield
 */

(() => {
  // Prevent duplicate injection
  if (window.__FOCUSLENS_INJECTED__) return;
  window.__FOCUSLENS_INJECTED__ = true;

  const currentUrl = window.location.href;
  const currentHostname = window.location.hostname.toLowerCase();

  // ==========================================
  // PART 1: WEBSITE BLOCKER INTERVENTION
  // ==========================================

  let blockerOverlayElement = null;
  let blockerTimerInterval = null;

  const MOTIVATIONAL_QUOTES = [
    { quote: "Focus is saying no to 100 other good ideas.", author: "Steve Jobs" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { quote: "Concentrate all your thoughts upon the work in hand.", author: "Alexander Graham Bell" },
    { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { quote: "Deep work is the superpower of the 21st century.", author: "Cal Newport" }
  ];

  async function checkBlockStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'CHECK_BLOCKED_STATUS',
        url: window.location.href
      });

      if (response && response.isBlocked) {
        chrome.runtime.sendMessage({ action: 'RECORD_BLOCKED_ATTEMPT' }).catch(() => {});
        renderBlockerOverlay(response.domain, response.remainingMs);
      } else {
        removeBlockerOverlay();
      }
    } catch (e) {
      // Extension context invalidated or service worker starting up
    }
  }

  function renderBlockerOverlay(domain, initialRemainingMs) {
    if (blockerOverlayElement) return;

    // Pause all media on page
    document.querySelectorAll('video, audio').forEach(media => {
      try { media.pause(); } catch (e) {}
    });

    const quoteObj = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    let remainingMs = initialRemainingMs || 0;

    const overlay = document.createElement('div');
    overlay.id = 'focuslens-interception-screen';
    overlay.innerHTML = `
      <div class="focuslens-backdrop"></div>
      <div class="focuslens-modal">
        <div class="focuslens-brand">
          <div class="focuslens-icon-ring">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
          </div>
          <span class="focuslens-title">FOCUSLENS</span>
        </div>

        <div class="focuslens-status-badge">
          <span class="focuslens-dot"></span> Focus Session In Progress
        </div>

        <h1 class="focuslens-heading">Stay in the zone.</h1>
        <p class="focuslens-message">
          Access to <strong class="focuslens-domain-highlight">${domain || 'this site'}</strong> is paused to protect your attention and momentum.
        </p>

        <div class="focuslens-timer-card">
          <div class="focuslens-timer-label">SESSION TIME REMAINING</div>
          <div class="focuslens-countdown" id="focuslens-live-countdown">--:--</div>
        </div>

        <div class="focuslens-quote-box">
          <p class="focuslens-quote-text">“${quoteObj.quote}”</p>
          <span class="focuslens-quote-author">— ${quoteObj.author}</span>
        </div>

        <div class="focuslens-actions">
          <button id="focuslens-btn-close-tab" class="focuslens-btn focuslens-btn-primary">
            Close This Tab
          </button>
          <button id="focuslens-btn-dashboard" class="focuslens-btn focuslens-btn-secondary">
            FocusLens Dashboard
          </button>
        </div>
      </div>
    `;

    // Inject styles
    const style = document.createElement('style');
    style.id = 'focuslens-blocker-styles';
    style.textContent = `
      #focuslens-interception-screen {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        color: #f8fafc !important;
        background: #090d16 !important;
        box-sizing: border-box !important;
        line-height: 1.5 !important;
        padding: 20px !important;
      }
      #focuslens-interception-screen * {
        box-sizing: border-box !important;
      }
      .focuslens-backdrop {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.15) 0%, rgba(10, 15, 29, 0.95) 70%);
        pointer-events: none;
      }
      .focuslens-modal {
        position: relative;
        z-index: 1;
        max-width: 480px;
        width: 100%;
        background: #111827;
        border: 1px solid rgba(59, 130, 246, 0.25);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.12);
        border-radius: 20px;
        padding: 36px 32px;
        text-align: center;
        animation: focuslens-fade-in 0.3s ease-out;
      }
      @keyframes focuslens-fade-in {
        from { opacity: 0; transform: scale(0.96) translateY(8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .focuslens-brand {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 20px;
      }
      .focuslens-icon-ring {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
      .focuslens-title {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: #93c5fd;
      }
      .focuslens-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: rgba(37, 99, 235, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.35);
        color: #60a5fa;
        font-size: 12px;
        font-weight: 600;
        border-radius: 9999px;
        margin-bottom: 16px;
      }
      .focuslens-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #3b82f6;
        box-shadow: 0 0 8px #3b82f6;
        animation: focuslens-pulse 2s infinite;
      }
      @keyframes focuslens-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .focuslens-heading {
        font-size: 26px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 10px 0;
        letter-spacing: -0.02em;
      }
      .focuslens-message {
        font-size: 14px;
        color: #94a3b8;
        margin: 0 0 24px 0;
        line-height: 1.6;
      }
      .focuslens-domain-highlight {
        color: #60a5fa;
        background: rgba(59, 130, 246, 0.12);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .focuslens-timer-card {
        background: #0b0f19;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .focuslens-timer-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #64748b;
        margin-bottom: 4px;
      }
      .focuslens-countdown {
        font-size: 36px;
        font-weight: 800;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #38bdf8;
        letter-spacing: 0.05em;
      }
      .focuslens-quote-box {
        border-left: 2px solid #2563eb;
        background: rgba(15, 23, 42, 0.6);
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        text-align: left;
        margin-bottom: 28px;
      }
      .focuslens-quote-text {
        font-size: 13px;
        font-style: italic;
        color: #cbd5e1;
        margin: 0 0 4px 0;
      }
      .focuslens-quote-author {
        font-size: 11px;
        color: #64748b;
        display: block;
      }
      .focuslens-actions {
        display: flex;
        gap: 12px;
      }
      .focuslens-btn {
        flex: 1;
        padding: 12px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }
      .focuslens-btn-primary {
        background: #2563eb;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      }
      .focuslens-btn-primary:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
      }
      .focuslens-btn-secondary {
        background: #1e293b;
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .focuslens-btn-secondary:hover {
        background: #334155;
        color: #ffffff;
      }
    `;

    document.documentElement.appendChild(style);
    document.documentElement.appendChild(overlay);
    blockerOverlayElement = overlay;

    // Countdown logic
    const updateCountdownDisplay = () => {
      const countdownEl = document.getElementById('focuslens-live-countdown');
      if (!countdownEl) return;
      if (remainingMs <= 0) {
        countdownEl.textContent = '00:00';
        return;
      }
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    updateCountdownDisplay();
    clearInterval(blockerTimerInterval);
    blockerTimerInterval = setInterval(() => {
      remainingMs = Math.max(0, remainingMs - 1000);
      updateCountdownDisplay();
      if (remainingMs <= 0) {
        clearInterval(blockerTimerInterval);
        checkBlockStatus();
      }
    }, 1000);

    // Button Listeners
    document.getElementById('focuslens-btn-close-tab')?.addEventListener('click', () => {
      window.close();
      // Fallback if window.close() is blocked by browser security
      window.location.href = 'about:blank';
    });

    document.getElementById('focuslens-btn-dashboard')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'GET_STATUS_SNAPSHOT' }, () => {
        // Options page URL
        window.location.href = chrome.runtime.getURL('options.html');
      });
    });
  }

  function removeBlockerOverlay() {
    if (blockerTimerInterval) {
      clearInterval(blockerTimerInterval);
      blockerTimerInterval = null;
    }
    if (blockerOverlayElement) {
      blockerOverlayElement.remove();
      blockerOverlayElement = null;
    }
    const style = document.getElementById('focuslens-blocker-styles');
    if (style) style.remove();
  }

  // ==========================================
  // PART 2: YOUTUBE FOCUS SHIELD
  // ==========================================

  function initYouTubeFocusShield() {
    if (!currentHostname.includes('youtube.com')) return;

    chrome.storage.local.get('settings', (data) => {
      const settings = (data && data.settings) || {};
      const ytSettings = settings.youtubeFocus || {
        enabled: true,
        hideShorts: true,
        hideRecommendations: true,
        hideSidebar: true,
        hideComments: true
      };

      applyYouTubeRules(ytSettings);
    });

    // Handle YouTube SPA URL changes
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handleYouTubePageNavigation();
      }
    });

    urlObserver.observe(document, { subtree: true, childList: true });
    handleYouTubePageNavigation();
  }

  function applyYouTubeRules(yt) {
    let style = document.getElementById('focuslens-youtube-shield-styles');
    if (!yt || !yt.enabled) {
      if (style) style.remove();
      removeYouTubeHomeCleanSlate();
      return;
    }

    if (!style) {
      style = document.createElement('style');
      style.id = 'focuslens-youtube-shield-styles';
      document.documentElement.appendChild(style);
    }

    let css = '';

    // 1. Hide Shorts completely
    if (yt.hideShorts) {
      css += `
        /* Sidebar Shorts entry */
        ytd-guide-entry-renderer:has(a[title*="Shorts"]),
        ytd-guide-entry-renderer:has(a[href^="/shorts"]),
        ytd-mini-guide-entry-renderer[aria-label*="Shorts"],
        ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),
        a[title="Shorts"],
        a[href^="/shorts"],
        /* Home and search shorts reel shelves */
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        /* Channel Shorts tab */
        yt-tab-shape[tab-title="Shorts"],
        tp-yt-paper-tab:has([text="Shorts"]) {
          display: none !important;
        }
      `;
    }

    // 2. Hide Home Feed Recommendations
    if (yt.hideRecommendations) {
      css += `
        /* Hide infinite video grid on home */
        ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
          display: none !important;
        }
      `;
    }

    // 3. Hide Watch Page Sidebar (Up Next / Related Videos)
    if (yt.hideSidebar) {
      css += `
        #secondary.ytd-watch-flexy,
        ytd-watch-next-secondary-results-renderer,
        #related {
          display: none !important;
        }
        /* Expand primary video player area smoothly */
        ytd-watch-flexy[flexy] #primary.ytd-watch-flexy {
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 auto !important;
        }
      `;
    }

    // 4. Hide Comments Section
    if (yt.hideComments) {
      css += `
        ytd-comments#comments,
        #comments.ytd-watch-flexy {
          display: none !important;
        }
      `;
    }

    // 5. Hide Distracting End-Screen cards & video overlays
    css += `
      .ytp-ce-element,
      .ytp-ce-covering-image,
      .ytp-ce-element-show,
      .ytp-cards-teaser {
        display: none !important;
      }
    `;

    style.textContent = css;

    if (yt.hideRecommendations && window.location.pathname === '/') {
      renderYouTubeHomeCleanSlate();
    } else {
      removeYouTubeHomeCleanSlate();
    }
  }

  function handleYouTubePageNavigation() {
    const isShorts = window.location.pathname.startsWith('/shorts/');
    if (isShorts) {
      chrome.storage.local.get('settings', (data) => {
        const yt = (data && data.settings && data.settings.youtubeFocus) || {};
        if (yt.enabled && yt.hideShorts) {
          // Divert shorts view to clean focus view or subscriptions
          window.location.replace('https://www.youtube.com/feed/subscriptions');
        }
      });
    }

    chrome.storage.local.get('settings', (data) => {
      const yt = (data && data.settings && data.settings.youtubeFocus) || {};
      if (yt.enabled && yt.hideRecommendations && window.location.pathname === '/') {
        renderYouTubeHomeCleanSlate();
      } else {
        removeYouTubeHomeCleanSlate();
      }
    });
  }

  function renderYouTubeHomeCleanSlate() {
    if (document.getElementById('focuslens-yt-clean-slate')) return;

    const browse = document.querySelector('ytd-browse[page-subtype="home"]');
    if (!browse) {
      setTimeout(renderYouTubeHomeCleanSlate, 300);
      return;
    }

    const cleanSlate = document.createElement('div');
    cleanSlate.id = 'focuslens-yt-clean-slate';
    cleanSlate.innerHTML = `
      <div class="focuslens-yt-slate-card">
        <div class="focuslens-yt-lens-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </div>
        <h2>FocusLens Calm Feed</h2>
        <p>Recommendations are paused so you can browse with intentional purpose.</p>
        <div class="focuslens-yt-search-prompt">
          Use the top search bar to look up specific tutorials, lectures, or music.
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'focuslens-yt-slate-styles';
    style.textContent = `
      #focuslens-yt-clean-slate {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 55vh;
        width: 100%;
        padding: 40px 20px;
        box-sizing: border-box;
      }
      .focuslens-yt-slate-card {
        background: #0f172a;
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: 20px;
        padding: 36px 30px;
        max-width: 480px;
        text-align: center;
        color: #f8fafc;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .focuslens-yt-lens-icon {
        margin-bottom: 16px;
      }
      .focuslens-yt-slate-card h2 {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: #ffffff;
      }
      .focuslens-yt-slate-card p {
        font-size: 14px;
        color: #94a3b8;
        margin: 0 0 20px 0;
        line-height: 1.5;
      }
      .focuslens-yt-search-prompt {
        background: rgba(37, 99, 235, 0.1);
        border: 1px dashed rgba(59, 130, 246, 0.4);
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 13px;
        color: #93c5fd;
      }
    `;

    document.documentElement.appendChild(style);
    browse.appendChild(cleanSlate);
  }

  function removeYouTubeHomeCleanSlate() {
    const el = document.getElementById('focuslens-yt-clean-slate');
    if (el) el.remove();
    const style = document.getElementById('focuslens-yt-slate-styles');
    if (style) style.remove();
  }

  // ==========================================
  // PART 3: EVENT LISTENERS & SYNCHRONIZATION
  // ==========================================

  // Check on initial load
  checkBlockStatus();
  initYouTubeFocusShield();

  // Listen for storage changes from popup or background
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.timer || changes.settings) {
        checkBlockStatus();
      }
      if (changes.settings && currentHostname.includes('youtube.com')) {
        const newSettings = changes.settings.newValue || {};
        applyYouTubeRules(newSettings.youtubeFocus);
      }
    }
  });

  // Listen for runtime broadcasts
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SESSION_COMPLETED') {
      checkBlockStatus();
    }
  });
})();
