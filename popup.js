/**
 * FOCUSLENS – Smart Browser Focus
 * Popup Controller (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const timerDisplay = document.getElementById('timer-display');
  const timerSubtext = document.getElementById('timer-subtext');
  const sessionTypeLabel = document.getElementById('session-type-label');
  const progressCircle = document.getElementById('progress-circle');
  const presetSelector = document.getElementById('preset-selector');
  const presetPills = document.querySelectorAll('.preset-pill');

  const btnStart = document.getElementById('btn-start');
  const activeControls = document.getElementById('active-controls');
  const btnPause = document.getElementById('btn-pause');
  const pauseText = document.getElementById('pause-text');
  const btnReset = document.getElementById('btn-reset');

  const blockerToggle = document.getElementById('blocker-toggle');
  const shieldCountText = document.getElementById('shield-count-text');

  const statFocusTime = document.getElementById('stat-focus-time');
  const statSessions = document.getElementById('stat-sessions');
  const statBlocked = document.getElementById('stat-blocked');
  const currentDateLabel = document.getElementById('current-date-label');

  const btnOpenOptions = document.getElementById('btn-open-options');
  const btnFullReport = document.getElementById('btn-full-report');

  // Constants
  const CIRCUMFERENCE = 2 * Math.PI * 88; // ~552.92
  progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  // Local State
  let selectedDuration = 25;
  let currentTimer = null;
  let countdownInterval = null;

  // Format Helper: milliseconds -> "MM:SS"
  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Format Helper: minutes -> "Xm" or "Xh Ym"
  function formatMinutes(mins) {
    if (!mins || mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Update SVG Progress Ring
  function setProgress(percent) {
    const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
    progressCircle.style.strokeDashoffset = offset;
  }

  // Render Timer State
  function renderTimerState(timer) {
    currentTimer = timer;
    clearInterval(countdownInterval);

    if (!timer || (!timer.isRunning && !timer.isPaused)) {
      // Idle State
      statusBadge.className = 'status-badge idle';
      statusText.textContent = 'Ready';
      timerSubtext.textContent = 'Tap Start to Begin';
      sessionTypeLabel.textContent = 'FOCUS SESSION';
      
      const duration = (timer && timer.durationMinutes) || selectedDuration;
      timerDisplay.textContent = `${String(duration).padStart(2, '0')}:00`;
      setProgress(1.0);
      progressCircle.style.stroke = '#3b82f6';

      btnStart.classList.remove('hidden');
      activeControls.classList.add('hidden');
      presetSelector.style.pointerEvents = 'auto';
      presetSelector.style.opacity = '1';

      // Update preset active state
      presetPills.forEach(pill => {
        pill.classList.toggle('active', Number(pill.dataset.minutes) === duration);
      });
      return;
    }

    // Active or Paused State
    presetSelector.style.pointerEvents = 'none';
    presetSelector.style.opacity = '0.5';
    btnStart.classList.add('hidden');
    activeControls.classList.remove('hidden');

    const totalDurationMs = timer.durationMinutes * 60 * 1000;

    if (timer.isPaused) {
      statusBadge.className = 'status-badge paused';
      statusText.textContent = 'Paused';
      timerSubtext.textContent = 'Session on hold';
      pauseText.textContent = 'Resume';
      progressCircle.style.stroke = '#f59e0b';

      const rem = timer.remainingMs || 0;
      timerDisplay.textContent = formatTime(rem);
      setProgress(totalDurationMs > 0 ? rem / totalDurationMs : 0);
    } else {
      statusBadge.className = 'status-badge focusing';
      statusText.textContent = 'Focusing';
      timerSubtext.textContent = 'Deep Focus Active';
      pauseText.textContent = 'Pause';
      progressCircle.style.stroke = '#3b82f6';

      // High precision ticking
      const tick = () => {
        const now = Date.now();
        const rem = Math.max(0, timer.endTime - now);
        timerDisplay.textContent = formatTime(rem);
        setProgress(totalDurationMs > 0 ? rem / totalDurationMs : 0);

        if (rem <= 0) {
          clearInterval(countdownInterval);
          refreshSnapshot();
        }
      };

      tick();
      countdownInterval = setInterval(tick, 1000);
    }
  }

  // Render Stats & Shield
  function renderDashboardData(snapshot) {
    const { settings, todayStats } = snapshot;

    // Shield status
    if (settings) {
      const isEnabled = settings.blockMode !== 'off';
      blockerToggle.checked = isEnabled;
      const count = (settings.blockedDomains && settings.blockedDomains.length) || 0;
      shieldCountText.textContent = `${count} domains restricted`;
    }

    // Stats
    if (todayStats) {
      statFocusTime.textContent = formatMinutes(todayStats.focusMinutes);
      statSessions.textContent = String(todayStats.sessionsCompleted || 0);
      statBlocked.textContent = String(todayStats.blockedCount || 0);
    }

    const today = new Date();
    currentDateLabel.textContent = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Fetch full state snapshot from background
  async function refreshSnapshot() {
    try {
      const snapshot = await chrome.runtime.sendMessage({ action: 'GET_STATUS_SNAPSHOT' });
      if (snapshot) {
        if (snapshot.timer) {
          selectedDuration = snapshot.timer.durationMinutes || 25;
          renderTimerState(snapshot.timer);
        }
        renderDashboardData(snapshot);
      }
    } catch (e) {
      console.error('Failed to load snapshot:', e);
    }
  }

  // Preset Selector Clicks
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (currentTimer && currentTimer.isRunning) return;
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedDuration = Number(pill.dataset.minutes);
      timerDisplay.textContent = `${String(selectedDuration).padStart(2, '0')}:00`;
    });
  });

  // Action Buttons
  btnStart.addEventListener('click', async () => {
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'START_TIMER',
        durationMinutes: selectedDuration,
        sessionType: 'focus'
      });
      if (res && res.timer) {
        renderTimerState(res.timer);
      }
    } catch (e) {
      console.error('Error starting timer:', e);
    }
  });

  btnPause.addEventListener('click', async () => {
    if (!currentTimer) return;
    try {
      if (currentTimer.isPaused) {
        const res = await chrome.runtime.sendMessage({ action: 'RESUME_TIMER' });
        if (res && res.timer) renderTimerState(res.timer);
      } else {
        const res = await chrome.runtime.sendMessage({ action: 'PAUSE_TIMER' });
        if (res && res.timer) renderTimerState(res.timer);
      }
    } catch (e) {
      console.error('Error toggling pause/resume:', e);
    }
  });

  btnReset.addEventListener('click', async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'RESET_TIMER' });
      if (res && res.timer) {
        renderTimerState(res.timer);
      }
    } catch (e) {
      console.error('Error resetting timer:', e);
    }
  });

  // Blocker Switch Toggle
  blockerToggle.addEventListener('change', async () => {
    const { settings = {} } = await chrome.storage.local.get('settings');
    settings.blockMode = blockerToggle.checked ? 'focus_only' : 'off';
    await chrome.storage.local.set({ settings });
  });

  // Open Options Page
  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  };

  btnOpenOptions.addEventListener('click', openOptions);
  btnFullReport.addEventListener('click', openOptions);

  // Storage listener to synchronize live with background/options changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.timer) {
        renderTimerState(changes.timer.newValue);
      }
      if (changes.statsByDate || changes.settings) {
        refreshSnapshot();
      }
    }
  });

  // Initial Load
  await refreshSnapshot();
});
