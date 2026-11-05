/**
 * FOCUSLENS – Smart Browser Focus
 * Options & Dashboard Controller (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation elements
  const navItems = document.querySelectorAll('.nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  const toastMsg = document.getElementById('toast-msg');

  // Analytics elements
  const dashFocusTime = document.getElementById('dash-focus-time');
  const dashSessionsCount = document.getElementById('dash-sessions-count');
  const dashBlockedCount = document.getElementById('dash-blocked-count');
  const usageList = document.getElementById('usage-list');
  const historyTbody = document.getElementById('history-tbody');

  // Blocker elements
  const modeFocusOnly = document.getElementById('mode-focus-only');
  const modeAlways = document.getElementById('mode-always');
  const modeOff = document.getElementById('mode-off');
  const formAddDomain = document.getElementById('form-add-domain');
  const inputNewDomain = document.getElementById('input-new-domain');
  const domainsGrid = document.getElementById('domains-grid');
  const pillQuickAddButtons = document.querySelectorAll('.pill-quick-add');

  // YouTube elements
  const ytMasterToggle = document.getElementById('yt-master-toggle');
  const ytHideShorts = document.getElementById('yt-hide-shorts');
  const ytHideRecommendations = document.getElementById('yt-hide-recommendations');
  const ytHideSidebar = document.getElementById('yt-hide-sidebar');
  const ytHideComments = document.getElementById('yt-hide-comments');

  // Settings elements
  const prefNotifications = document.getElementById('pref-notifications');
  const btnExportData = document.getElementById('btn-export-data');
  const btnResetData = document.getElementById('btn-reset-data');

  let currentSettings = null;
  let currentStatsByDate = {};

  // Helpers
  function showToast(text = 'Settings updated successfully') {
    toastMsg.textContent = text;
    toastMsg.classList.add('show');
    setTimeout(() => {
      toastMsg.classList.remove('show');
    }, 2400);
  }

  function getTodayDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatMinutes(mins) {
    if (!mins || mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatSeconds(totalSecs) {
    if (!totalSecs || totalSecs <= 0) return '0s';
    if (totalSecs < 60) return `${totalSecs}s`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins < 60) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  function cleanDomainInput(raw) {
    if (!raw) return null;
    let domain = raw.trim().toLowerCase();
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      try {
        domain = new URL(domain).hostname;
      } catch (e) {
        // Fallback
      }
    }
    if (domain.startsWith('www.')) {
      domain = domain.slice(4);
    }
    // Remove trailing slashes or paths
    domain = domain.split('/')[0].split('?')[0].split(':')[0];
    return domain.includes('.') ? domain : null;
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      pageSections.forEach(s => s.classList.remove('active'));

      item.classList.add('active');
      const targetSection = document.getElementById(`section-${targetTab}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });

  // ==========================================
  // LOAD & RENDER DATA
  // ==========================================
  async function loadData() {
    const data = await chrome.storage.local.get(['settings', 'statsByDate']);
    currentSettings = data.settings || {};
    currentStatsByDate = data.statsByDate || {};

    renderAnalytics();
    renderBlocker();
    renderYouTube();
    renderPreferences();
  }

  // 1. Render Analytics
  function renderAnalytics() {
    const todayStr = getTodayDateString();
    const todayStats = currentStatsByDate[todayStr] || {
      focusMinutes: 0,
      sessionsCompleted: 0,
      blockedCount: 0,
      siteUsage: {}
    };

    dashFocusTime.textContent = formatMinutes(todayStats.focusMinutes);
    dashSessionsCount.textContent = String(todayStats.sessionsCompleted || 0);
    dashBlockedCount.textContent = String(todayStats.blockedCount || 0);

    // Render Website Usage
    const siteUsage = todayStats.siteUsage || {};
    const sortedDomains = Object.keys(siteUsage)
      .map(d => ({ domain: d, seconds: siteUsage[d] }))
      .filter(item => item.seconds > 5)
      .sort((a, b) => b.seconds - a.seconds);

    if (sortedDomains.length === 0) {
      usageList.innerHTML = `
        <div class="empty-placeholder">
          Browsing activity will be automatically recorded here as you visit websites today.
        </div>
      `;
    } else {
      const maxSeconds = sortedDomains[0].seconds || 1;
      usageList.innerHTML = sortedDomains.map(item => {
        const pct = Math.min(100, Math.round((item.seconds / maxSeconds) * 100));
        return `
          <div class="usage-row">
            <div class="usage-meta">
              <span class="usage-domain">${item.domain}</span>
              <span class="usage-time">${formatSeconds(item.seconds)}</span>
            </div>
            <div class="usage-bar-track">
              <div class="usage-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render 7-Day History Table
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getTodayDateString(d);
      const dayStats = currentStatsByDate[dateStr] || { focusMinutes: 0, sessionsCompleted: 0, blockedCount: 0 };
      const formattedDisplayDate = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const isToday = i === 0;

      rows.push(`
        <tr>
          <td>
            <strong>${formattedDisplayDate}</strong>
            ${isToday ? '<span class="badge-today">Today</span>' : ''}
          </td>
          <td>${formatMinutes(dayStats.focusMinutes)}</td>
          <td>${dayStats.sessionsCompleted || 0}</td>
          <td>${dayStats.blockedCount || 0}</td>
        </tr>
      `);
    }
    historyTbody.innerHTML = rows.join('');
  }

  // 2. Render Blocker
  function renderBlocker() {
    const mode = currentSettings.blockMode || 'focus_only';
    [modeFocusOnly, modeAlways, modeOff].forEach(card => card.classList.remove('selected'));
    if (mode === 'focus_only') modeFocusOnly.classList.add('selected');
    else if (mode === 'always') modeAlways.classList.add('selected');
    else if (mode === 'off') modeOff.classList.add('selected');

    // Render domains list
    const domains = currentSettings.blockedDomains || [];
    if (domains.length === 0) {
      domainsGrid.innerHTML = `<div class="empty-placeholder" style="grid-column: 1 / -1;">No domains currently blocked. Add one above or select a preset pack.</div>`;
    } else {
      domainsGrid.innerHTML = domains.map(d => `
        <div class="domain-tag">
          <span>${d}</span>
          <button class="domain-remove-btn" data-domain="${d}" title="Remove domain">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `).join('');

      // Attach remove events
      domainsGrid.querySelectorAll('.domain-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const toRemove = btn.dataset.domain;
          currentSettings.blockedDomains = (currentSettings.blockedDomains || []).filter(d => d !== toRemove);
          await chrome.storage.local.set({ settings: currentSettings });
          renderBlocker();
          showToast(`Removed ${toRemove}`);
        });
      });
    }
  }

  // Mode Selection Listeners
  modeFocusOnly.addEventListener('click', async () => {
    currentSettings.blockMode = 'focus_only';
    await chrome.storage.local.set({ settings: currentSettings });
    renderBlocker();
    showToast('Blocker active during focus sessions only');
  });

  modeAlways.addEventListener('click', async () => {
    currentSettings.blockMode = 'always';
    await chrome.storage.local.set({ settings: currentSettings });
    renderBlocker();
    showToast('Blocker set to always active');
  });

  modeOff.addEventListener('click', async () => {
    currentSettings.blockMode = 'off';
    await chrome.storage.local.set({ settings: currentSettings });
    renderBlocker();
    showToast('Blocker temporarily disabled');
  });

  // Add Domain Form
  formAddDomain.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clean = cleanDomainInput(inputNewDomain.value);
    if (!clean) {
      alert('Please enter a valid website domain name (e.g., twitter.com).');
      return;
    }

    const currentList = currentSettings.blockedDomains || [];
    if (currentList.includes(clean)) {
      alert(`${clean} is already in your restricted domains list.`);
      return;
    }

    currentList.push(clean);
    currentSettings.blockedDomains = currentList;
    await chrome.storage.local.set({ settings: currentSettings });
    inputNewDomain.value = '';
    renderBlocker();
    showToast(`Added ${clean} to blocked list`);
  });

  // Quick Add Packs
  const PRESET_PACKS = {
    social: ['twitter.com', 'x.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'facebook.com'],
    entertainment: ['netflix.com', 'twitch.tv', 'disneyplus.com', 'hulu.com', 'primevideo.com'],
    news: ['cnn.com', 'bbc.com', 'buzzfeed.com', 'dailymail.co.uk']
  };

  pillQuickAddButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const packKey = btn.dataset.pack;
      const packDomains = PRESET_PACKS[packKey] || [];
      const currentList = new Set(currentSettings.blockedDomains || []);
      let addedCount = 0;

      packDomains.forEach(d => {
        if (!currentList.has(d)) {
          currentList.add(d);
          addedCount++;
        }
      });

      currentSettings.blockedDomains = Array.from(currentList);
      await chrome.storage.local.set({ settings: currentSettings });
      renderBlocker();
      showToast(`Added ${addedCount} domains from pack`);
    });
  });

  // 3. Render YouTube Controls
  function renderYouTube() {
    const yt = currentSettings.youtubeFocus || {};
    ytMasterToggle.checked = yt.enabled !== false;
    ytHideShorts.checked = yt.hideShorts !== false;
    ytHideRecommendations.checked = yt.hideRecommendations !== false;
    ytHideSidebar.checked = yt.hideSidebar !== false;
    ytHideComments.checked = yt.hideComments !== false;
  }

  // YouTube Toggle Event Listeners
  const saveYouTubeSettings = async () => {
    currentSettings.youtubeFocus = {
      enabled: ytMasterToggle.checked,
      hideShorts: ytHideShorts.checked,
      hideRecommendations: ytHideRecommendations.checked,
      hideSidebar: ytHideSidebar.checked,
      hideComments: ytHideComments.checked
    };
    await chrome.storage.local.set({ settings: currentSettings });
    showToast('YouTube Focus settings saved');
  };

  [ytMasterToggle, ytHideShorts, ytHideRecommendations, ytHideSidebar, ytHideComments].forEach(cb => {
    cb.addEventListener('change', saveYouTubeSettings);
  });

  // 4. Render Preferences & Data
  function renderPreferences() {
    prefNotifications.checked = currentSettings.notificationsEnabled !== false;
  }

  prefNotifications.addEventListener('change', async () => {
    currentSettings.notificationsEnabled = prefNotifications.checked;
    await chrome.storage.local.set({ settings: currentSettings });
    showToast('Notification preference saved');
  });

  // Export Data JSON
  btnExportData.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['settings', 'statsByDate']);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focuslens-backup-${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
  });

  // Reset Data
  btnResetData.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to clear all history and daily browsing analytics? This action cannot be undone.');
    if (!confirmed) return;

    const todayStr = getTodayDateString();
    const cleanStats = {
      [todayStr]: {
        focusMinutes: 0,
        sessionsCompleted: 0,
        blockedCount: 0,
        siteUsage: {}
      }
    };

    await chrome.storage.local.set({ statsByDate: cleanStats });
    currentStatsByDate = cleanStats;
    renderAnalytics();
    showToast('All browsing history and statistics reset');
  });

  // Synchronize with external changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.settings) {
        currentSettings = changes.settings.newValue || {};
        renderBlocker();
        renderYouTube();
        renderPreferences();
      }
      if (changes.statsByDate) {
        currentStatsByDate = changes.statsByDate.newValue || {};
        renderAnalytics();
      }
    }
  });

  // Initial Load
  await loadData();
});
