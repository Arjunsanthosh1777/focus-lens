# FOCUSLENS – Smart Browser Focus

**FOCUSLENS** is a production-grade, minimalist Chrome productivity extension built to eliminate digital distractions, cultivate deep work habits, and track browser focus.

Built strictly with vanilla modern web technologies (**HTML5, CSS3, JavaScript ES2022**) and **Chrome Extension Manifest V3**, FOCUSLENS requires zero external libraries, zero frameworks (no React/Node runtime dependencies), and zero third-party tracking APIs. All settings, session logs, and browsing metrics are kept private and stored locally on your machine via `chrome.storage.local`.

---

## 📁 Project Directory Structure

```
FOCUSLENS/
├── manifest.json       # Manifest V3 configuration & permission declarations
├── popup.html          # Quick productivity popup UI
├── popup.css           # Premium dark theme styling with electric blue accents
├── popup.js            # Timer countdown, preset selector, and popup controller
├── background.js       # Background Service Worker (timer alarms, tab activity tracking)
├── content.js          # Distraction blocker intervention & YouTube focus shield
├── options.html        # Comprehensive dashboard, analytics report & settings
├── options.js          # Analytics calculation, domain manager, & YouTube toggles
├── icons/              # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentation, installation, and testing guide
```

---

## ⚡ Core Features

### 1. High-Precision Focus Timer
- **Session Presets**: Instant selection between **25-minute**, **45-minute**, and **60-minute** deep work sessions.
- **Service Worker Lifecycle Resilience**: Timer state is anchored to timestamps (`endTime`) and managed in the background using `chrome.alarms`. If the popup closes, the browser is minimized, or Chrome sleeps the service worker, the timer continues accurately.
- **Dynamic Extension Badge**: Shows remaining minutes directly over the extension icon (e.g., `24m`, `12m`), shifting to amber `PAUSE` on pause and vibrant emerald `DONE` upon completion.
- **Micro-Interactions**: Features an SVG circular progress ring and countdown display in the popup.

### 2. Intelligent Website Blocker
- **Intervention Screen**: When you attempt to visit a restricted site during a focus session, FOCUSLENS immediately replaces the distraction with a sleek, full-viewport focus intervention screen displaying:
  - Live session countdown timer.
  - Rotating motivational quotes on focus and discipline.
  - Instant action buttons (*Close This Tab* or *Open Dashboard*).
  - Background audio and video are automatically paused.
- **Blocker Behavior Modes**:
  - *During Focus Sessions Only (Recommended)*: Automatically blocks distracting sites when a timer is running and lifts restrictions when you take a break.
  - *Always Block*: Continuous barrier for maximum digital minimalism.
  - *Disabled*: Temporarily bypasses blocking without losing your configured domain list.
- **Quick-Add Domain Packs**: One-click addition of curated distraction lists (Social Media, Entertainment streaming, News).

### 3. YouTube Focus Mode
- Eliminates compulsive video rabbit holes so YouTube can be used exclusively as an intentional educational/research tool:
  - **Hides YouTube Shorts**: Removes the left sidebar Shorts link, mini-guide Shorts button, homepage reels shelves, channel shorts tabs, and automatically redirects direct `/shorts/*` visits to your subscription feed.
  - **Calm Homepage Slate**: Replaces infinite algorithmic video grids on the YouTube homepage with a clean, centered FocusLens search prompt.
  - **Hides Watch Page Sidebar**: Cleans out the "Up next" / recommended videos sidebar beside playing videos, giving you a wider, cinema-style focus player.
  - **Hides Comments**: Eliminates distracting comment sections below videos.
  - **Hides End-Screen Cards**: Strips clickbait thumbnail overlays at the end of videos.
- Single-Page App (SPA) Support: Employs a `MutationObserver` so navigation across YouTube retains all focus rules without flashing hidden content.

### 4. Website Usage Tracking (Daily Totals)
- Background service worker listens to active tab transitions (`chrome.tabs.onActivated`, `chrome.windows.onFocusChanged`, `chrome.tabs.onUpdated`) and accumulates active foreground browsing time per domain.
- Automatically groups and stores usage per calendar day (`YYYY-MM-DD`).

### 5. Daily Focus Report & Analytics Dashboard
- **Top Summary Cards**:
  - Total Focus Time completed today (e.g., `1h 45m`).
  - Total completed focus sessions.
  - Total distraction attempts intercepted.
- **Active Browsing Breakdown**: Visual horizontal gradient progress bars displaying top visited sites ranked by time spent.
- **7-Day Focus History**: Comprehensive table documenting focus output, completed sessions, and blocked attempts across the last 7 days.

### 6. Customizable Preferences & Privacy
- Customizable notification preferences (`chrome.notifications`).
- One-click **JSON Data Export** for personal backups.
- One-click **Clear / Reset History** option.

---

## 🛠️ Chrome APIs & Technical Implementation

| Chrome API | Implementation in FOCUSLENS |
|---|---|
| `chrome.storage.local` | Centralized data store for `timer`, `settings`, and `statsByDate`. Allows asynchronous synchronization between background worker, popup, content scripts, and options page. |
| `chrome.alarms` | Solves Manifest V3 service worker dormancy. Background timers are scheduled with `when: endTime`, ensuring completion notifications trigger even when background workers are idle. Also runs a periodic 1-minute alarm to flush website tracking time. |
| `chrome.tabs` | Used to inspect active URLs, update tab locations, and send broadcast messages (`SESSION_COMPLETED`) to content scripts across tabs. |
| `chrome.windows` | Detects when the user switches away from Chrome or minimizes the window (`onFocusChanged`) to accurately pause website usage time tracking. |
| `chrome.action` | Updates the extension badge text (`25m`, `PAUSE`, `DONE`) and dynamic badge background color (`#2563eb`, `#f59e0b`, `#10b981`). |
| `chrome.notifications` | Fires native desktop notifications when a focus interval concludes. |
| `chrome.runtime` | Handles inter-component message passing (`START_TIMER`, `PAUSE_TIMER`, `CHECK_BLOCKED_STATUS`, `RECORD_BLOCKED_ATTEMPT`, `GET_STATUS_SNAPSHOT`) and opens the options page. |

---

## 📥 Installation Instructions

To load FOCUSLENS into Google Chrome or any Chromium-compatible browser (Brave, Edge, Arc, Opera):

1. **Open Chrome Extensions Manager**:
   - In your Chrome address bar, navigate to `chrome://extensions/`.
2. **Enable Developer Mode**:
   - In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.
3. **Load Unpacked Extension**:
   - Click the **Load unpacked** button located in the top-left toolbar.
   - In the folder picker dialog, select the project directory:
     ```
     C:\Users\KGCAS\.gemini\antigravity\scratch\focuslens
     ```
4. **Pin the Extension**:
   - Click the Extensions puzzle piece icon in Chrome's top toolbar.
   - Click the pin icon next to **FOCUSLENS – Smart Browser Focus**.

---

## 🧪 Testing & Verification Guide

Follow these sequential steps to verify each core capability:

### Test 1: Focus Timer & Service Worker Persistence
1. Click the FOCUSLENS icon to open the popup.
2. Select the **25 min** preset (or 45m / 60m) and click **Start Focus**.
3. Observe:
   - The countdown starts ticking down.
   - The extension badge updates to `25m`.
   - The status badge changes to `Focusing` with a pulsing blue indicator.
4. **Close the popup** and wait 60 seconds.
5. Reopen the popup:
   - Verify that the timer continued running in the background without resetting.
   - Verify the badge text decrements accurately.
6. Click **Pause**: verify status updates to `Paused` and badge displays `PAUSE`.
7. Click **Resume**: verify countdown resumes smoothly.
8. Click **Reset**: verify timer returns to default ready state.

### Test 2: Website Blocker & Focus Intervention
1. Open the popup, select **25 min**, and click **Start Focus**.
2. In a new tab, navigate to a blocked domain (e.g., `reddit.com` or `twitter.com`).
3. Verify:
   - FOCUSLENS intercepts access and renders the dark Focus Intervention screen.
   - The domain name (`reddit.com`) is highlighted.
   - The live session timer ticks down on the screen.
   - Clicking **Close This Tab** cleanly closes or exits the tab.
   - Clicking **FocusLens Dashboard** opens the full options page.
4. Go to the extension popup or dashboard and pause/reset the timer. Refresh the tab and verify the block is automatically lifted during breaks.

### Test 3: YouTube Focus Mode
1. Ensure YouTube Focus Mode is enabled in settings (enabled by default).
2. Visit `https://www.youtube.com/`:
   - Notice the homepage video feed is replaced with the clean, intentional **FocusLens Calm Feed** search slate.
   - Notice the **Shorts** icon is removed from the left sidebar guide.
3. Open any video:
   - Notice the "Up Next" / recommended sidebar is hidden, leaving the video player full and centered.
   - Notice comments below the video are hidden.
4. Try directly visiting `https://www.youtube.com/shorts/`:
   - Notice FOCUSLENS redirects you away from the endless Shorts scroll.

### Test 4: Website Usage Tracking & Daily Analytics
1. Browse 2-3 standard websites (e.g., `wikipedia.org`, `github.com`) for a couple of minutes.
2. Right-click the FOCUSLENS icon and select **Options** (or click the Dashboard icon in the popup).
3. On the **Focus Analytics** tab:
   - Check **Today's Focus Time** and **Completed Sessions**.
   - Check the **Active Browsing Time Today** list: verify your visited sites appear with elapsed time bars.
   - Check the **Recent Focus History** 7-day table.

### Test 5: Custom Settings & Export
1. In the Dashboard, click the **Website Blocker** tab.
2. Type a custom domain (e.g., `news.ycombinator.com`) into the input and click **Add Domain**. Verify it appears in the grid.
3. Click the delete icon on any domain tag to verify instant removal.
4. Click the **Preferences** tab:
   - Click **Export Data as JSON** to verify backup file generation.
   - Click **Clear All History & Stats** to test data reset.

---

## 🔒 Security & Performance Guarantees

- **No Remote Code Execution**: Full compliance with Chrome Web Store Manifest V3 security rules.
- **Zero Third-Party CDNs**: All styling, vector SVG assets, and scripts run 100% locally from the extension bundle.
- **Minimal Resource Footprint**: Passive event listeners and alarms eliminate CPU spikes or background memory leaks.
