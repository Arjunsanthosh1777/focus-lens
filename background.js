/**
 * FOCUSLENS – Smart Browser Focus
 * Background Service Worker (Manifest V3)
 */

const DEFAULT_SETTINGS = {
  blockedDomains: [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'reddit.com',
    'tiktok.com',
    'netflix.com',
    'twitch.tv',
    'pinterest.com',
    'disneyplus.com',
    'hulu.com'
  ],
  blockMode: 'focus_only', // 'focus_only' (block only during active focus timer) or 'always'
  youtubeFocus: {
    enabled: true,
    hideShorts: true,
    hideRecommendations: true,
    hideSidebar: true,
    hideComments: true
  },
  notificationsEnabled: true,
  soundEnabled: true,
  defaultDurationMinutes: 25
};

const DEFAULT_TIMER = {
  isRunning: false,
  isPaused: false,
  durationMinutes: 25,
  startTime: null,
  endTime: null,
  remainingMs: 25 * 60 * 1000,
  sessionType: 'focus' // 'focus' | 'break'
};

// Tracking state for active domain
let activeDomainTracker = {
  domain: null,
  startTime: null,
  isWindowFocused: true
};

// Helper: Get local date string 'YYYY-MM-DD'
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Extract root clean domain (e.g., "www.reddit.com" -> "reddit.com")
function extractDomain(url) {
  try {
    if (!url || !url.startsWith('http')) return null;
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

// Ensure default storage structures exist
async function initializeStorage() {
  const data = await chrome.storage.local.get(['settings', 'timer', 'statsByDate']);
  const updates = {};

  if (!data.settings) {
    updates.settings = DEFAULT_SETTINGS;
  } else {
    // Merge any missing keys from updates
    updates.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    if (!updates.settings.youtubeFocus) {
      updates.settings.youtubeFocus = DEFAULT_SETTINGS.youtubeFocus;
    }
  }

  if (!data.timer) {
    updates.timer = DEFAULT_TIMER;
  } else {
    // If browser restarted while timer was supposedly running, handle expiration
    if (data.timer.isRunning && !data.timer.isPaused && data.timer.endTime) {
      if (Date.now() >= data.timer.endTime) {
        updates.timer = {
          ...DEFAULT_TIMER,
          durationMinutes: data.timer.durationMinutes || 25,
          remainingMs: (data.timer.durationMinutes || 25) * 60 * 1000
        };
      }
    }
  }

  const today = getTodayDateString();
  const stats = data.statsByDate || {};
  if (!stats[today]) {
    stats[today] = {
      focusMinutes: 0,
      sessionsCompleted: 0,
      blockedCount: 0,
      siteUsage: {}
    };
    updates.statsByDate = stats;
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  updateBadge();
}

// Flush active browsing time to daily statistics
async function flushActiveDomainTime() {
  if (!activeDomainTracker.domain || !activeDomainTracker.startTime || !activeDomainTracker.isWindowFocused) {
    return;
  }

  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - activeDomainTracker.startTime) / 1000));
  
  // Reset start time so time is not double-counted
  activeDomainTracker.startTime = now;

  if (elapsedSeconds <= 0) return;

  const today = getTodayDateString();
  const { statsByDate = {} } = await chrome.storage.local.get('statsByDate');

  if (!statsByDate[today]) {
    statsByDate[today] = {
      focusMinutes: 0,
      sessionsCompleted: 0,
      blockedCount: 0,
      siteUsage: {}
    };
  }

  const domain = activeDomainTracker.domain;
  const currentUsage = statsByDate[today].siteUsage[domain] || 0;
  statsByDate[today].siteUsage[domain] = currentUsage + elapsedSeconds;

  await chrome.storage.local.set({ statsByDate });
}

// Switch active tracking domain
async function switchActiveDomain(newUrl) {
  await flushActiveDomainTime();
  const domain = extractDomain(newUrl);
  activeDomainTracker.domain = domain;
  activeDomainTracker.startTime = domain ? Date.now() : null;
}

// Update Extension Icon Badge
async function updateBadge() {
  const { timer } = await chrome.storage.local.get('timer');
  if (!timer || !timer.isRunning) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (timer.isPaused) {
    chrome.action.setBadgeText({ text: 'PAUSE' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber
    return;
  }

  const remainingMs = Math.max(0, timer.endTime - Date.now());
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  if (remainingMinutes > 0) {
    chrome.action.setBadgeText({ text: `${remainingMinutes}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' }); // Electric Blue
  } else {
    chrome.action.setBadgeText({ text: 'DONE' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
  }
}

// Handle completed focus session
async function handleSessionCompletion() {
  const { timer, settings = DEFAULT_SETTINGS, statsByDate = {} } = await chrome.storage.local.get([
    'timer',
    'settings',
    'statsByDate'
  ]);

  if (!timer) return;

  const today = getTodayDateString();
  if (!statsByDate[today]) {
    statsByDate[today] = {
      focusMinutes: 0,
      sessionsCompleted: 0,
      blockedCount: 0,
      siteUsage: {}
    };
  }

  if (timer.sessionType === 'focus') {
    statsByDate[today].focusMinutes += timer.durationMinutes;
    statsByDate[today].sessionsCompleted += 1;
  }

  // Reset timer
  const resetTimer = {
    ...DEFAULT_TIMER,
    durationMinutes: timer.durationMinutes,
    remainingMs: timer.durationMinutes * 60 * 1000
  };

  await chrome.storage.local.set({
    timer: resetTimer,
    statsByDate
  });

  // Badge alert
  chrome.action.setBadgeText({ text: 'DONE' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

  // Chrome notification
  if (settings.notificationsEnabled) {
    chrome.notifications.create('focuslens-completed', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'FocusLens – Session Complete! 🎯',
      message: `Brilliant! You completed a ${timer.durationMinutes}-minute focus session. Take a mindful break.`,
      priority: 2
    });
  }

  // Clear alarms
  await chrome.alarms.clear('focuslens-timer');
  await chrome.alarms.clear('focuslens-badge-tick');

  // Notify active tabs (for instance, unblock or notify blocker pages)
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'SESSION_COMPLETED' }).catch(() => {});
    });
  } catch (e) {
    // Ignored
  }
}

// Lifecycle: Extension installed / updated
chrome.runtime.onInstalled.addListener(() => {
  initializeStorage();
  // Set up periodic tracking flush alarm (runs every 1 minute)
  chrome.alarms.create('focuslens-tracker-alarm', { periodInMinutes: 1 });
});

// Periodic & Specific Alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'focuslens-timer') {
    await handleSessionCompletion();
  } else if (alarm.name === 'focuslens-badge-tick') {
    await updateBadge();
  } else if (alarm.name === 'focuslens-tracker-alarm') {
    await flushActiveDomainTime();
  }
});

// Tab & Window Activity Listeners for Website Usage Tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await switchActiveDomain(tab ? tab.url : null);
  } catch (e) {
    await switchActiveDomain(null);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // If the updated tab is the currently active tab, switch domain
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      await switchActiveDomain(changeInfo.url);
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched away from browser
    await flushActiveDomainTime();
    activeDomainTracker.isWindowFocused = false;
  } else {
    activeDomainTracker.isWindowFocused = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      await switchActiveDomain(tab ? tab.url : null);
    } catch (e) {
      await switchActiveDomain(null);
    }
  }
});

// Runtime Messaging Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (request.action) {
      case 'START_TIMER': {
        const durationMinutes = Number(request.durationMinutes) || 25;
        const durationMs = durationMinutes * 60 * 1000;
        const now = Date.now();
        const endTime = now + durationMs;

        const newTimer = {
          isRunning: true,
          isPaused: false,
          durationMinutes,
          startTime: now,
          endTime,
          remainingMs: durationMs,
          sessionType: request.sessionType || 'focus'
        };

        await chrome.storage.local.set({ timer: newTimer });

        // Set alarms
        await chrome.alarms.clear('focuslens-timer');
        await chrome.alarms.create('focuslens-timer', { when: endTime });
        await chrome.alarms.create('focuslens-badge-tick', { periodInMinutes: 1 });

        await updateBadge();
        return { success: true, timer: newTimer };
      }

      case 'PAUSE_TIMER': {
        const { timer } = await chrome.storage.local.get('timer');
        if (!timer || !timer.isRunning || timer.isPaused) {
          return { success: false };
        }

        const remainingMs = Math.max(0, timer.endTime - Date.now());
        const pausedTimer = {
          ...timer,
          isPaused: true,
          remainingMs,
          endTime: null
        };

        await chrome.storage.local.set({ timer: pausedTimer });
        await chrome.alarms.clear('focuslens-timer');
        await updateBadge();
        return { success: true, timer: pausedTimer };
      }

      case 'RESUME_TIMER': {
        const { timer } = await chrome.storage.local.get('timer');
        if (!timer || !timer.isRunning || !timer.isPaused) {
          return { success: false };
        }

        const now = Date.now();
        const endTime = now + timer.remainingMs;
        const resumedTimer = {
          ...timer,
          isPaused: false,
          startTime: now,
          endTime
        };

        await chrome.storage.local.set({ timer: resumedTimer });
        await chrome.alarms.create('focuslens-timer', { when: endTime });
        await updateBadge();
        return { success: true, timer: resumedTimer };
      }

      case 'RESET_TIMER': {
        const { timer } = await chrome.storage.local.get('timer');
        const durationMinutes = (timer && timer.durationMinutes) || 25;
        const resetTimer = {
          ...DEFAULT_TIMER,
          durationMinutes,
          remainingMs: durationMinutes * 60 * 1000
        };

        await chrome.storage.local.set({ timer: resetTimer });
        await chrome.alarms.clear('focuslens-timer');
        await chrome.alarms.clear('focuslens-badge-tick');
        await updateBadge();
        return { success: true, timer: resetTimer };
      }

      case 'CHECK_BLOCKED_STATUS': {
        const url = request.url || (sender.tab && sender.tab.url);
        const domain = extractDomain(url);
        if (!domain) {
          return { isBlocked: false };
        }

        const { settings = DEFAULT_SETTINGS, timer = DEFAULT_TIMER } = await chrome.storage.local.get([
          'settings',
          'timer'
        ]);

        const blockedList = settings.blockedDomains || [];
        const isDomainInList = blockedList.some(blocked => {
          const cleanBlocked = blocked.toLowerCase().trim();
          return domain === cleanBlocked || domain.endsWith('.' + cleanBlocked);
        });

        if (!isDomainInList) {
          return { isBlocked: false };
        }

        // Determine if blocking is active
        const isTimerFocusActive = timer.isRunning && !timer.isPaused && timer.sessionType === 'focus';
        const isBlocked = settings.blockMode === 'always' || isTimerFocusActive;

        let remainingMs = 0;
        if (timer.isRunning && timer.endTime) {
          remainingMs = Math.max(0, timer.endTime - Date.now());
        }

        return {
          isBlocked,
          domain,
          remainingMs,
          durationMinutes: timer.durationMinutes,
          isFocusActive: isTimerFocusActive
        };
      }

      case 'RECORD_BLOCKED_ATTEMPT': {
        const today = getTodayDateString();
        const { statsByDate = {} } = await chrome.storage.local.get('statsByDate');
        if (!statsByDate[today]) {
          statsByDate[today] = {
            focusMinutes: 0,
            sessionsCompleted: 0,
            blockedCount: 0,
            siteUsage: {}
          };
        }
        statsByDate[today].blockedCount = (statsByDate[today].blockedCount || 0) + 1;
        await chrome.storage.local.set({ statsByDate });
        return { success: true, blockedCount: statsByDate[today].blockedCount };
      }

      case 'GET_STATUS_SNAPSHOT': {
        const data = await chrome.storage.local.get(['timer', 'settings', 'statsByDate']);
        const today = getTodayDateString();
        return {
          timer: data.timer || DEFAULT_TIMER,
          settings: data.settings || DEFAULT_SETTINGS,
          todayStats: (data.statsByDate && data.statsByDate[today]) || {
            focusMinutes: 0,
            sessionsCompleted: 0,
            blockedCount: 0,
            siteUsage: {}
          },
          allStats: data.statsByDate || {}
        };
      }

      default:
        return { error: 'Unknown action' };
    }
  };

  handleMessage().then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });

  return true; // Keep message channel open for async response
});
