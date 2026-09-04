/**
 * MENISCUS OS (Simplified, v2.1) — Application Logic
 * 100% Self-Contained | Zero External Libraries | Zero CDN Failure Points
 * Real-Time Dynamic Free-Time Arithmetic | Time Audit Pop-Up
 * Strict Window Capacity Enforcement | Tomorrow's Plan | Notifications Hub
 */

// ==========================================
// 1. NATIVE TIMEZONE & DATE UTILITIES
// ==========================================
const TimeHelper = {
  getTimezone() {
    return AppStore.get(STORAGE_KEYS.TIMEZONE, 'Africa/Lagos');
  },

  getNowParts(timeZone = this.getTimezone()) {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const get = (type) => parts.find(p => p.type === type)?.value || '0';
      
      const year = parseInt(get('year'), 10);
      const month = parseInt(get('month'), 10);
      const day = parseInt(get('day'), 10);
      const hour = parseInt(get('hour'), 10);
      const minute = parseInt(get('minute'), 10);
      const second = parseInt(get('second'), 10);

      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const currentMinute = hour * 60 + minute;

      // 0=Sun, 1=Mon, ..., 6=Sat
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const dayOfWeek = d.getUTCDay();

      return { year, month, day, hour, minute, second, currentMinute, dateKey, timeStr, dayOfWeek, now };
    } catch (e) {
      console.warn('Timezone format fallback:', e);
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8);
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        currentMinute,
        dateKey,
        timeStr,
        dayOfWeek: now.getDay(),
        now
      };
    }
  },

  getTomorrowDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() + 1);
    const ty = date.getUTCFullYear();
    const tm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const td = String(date.getUTCDate()).padStart(2, '0');
    return `${ty}-${tm}-${td}`;
  },

  addDaysToDateKey(dateKey, days) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() + days);
    const ty = date.getUTCFullYear();
    const tm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const td = String(date.getUTCDate()).padStart(2, '0');
    return `${ty}-${tm}-${td}`;
  },

  formatFullDate(dateKey, timeZone = this.getTimezone()) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  },

  formatDayName(dateKey, timeZone = this.getTimezone()) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(date);
  },

  formatMonthYear(year, monthIndex, timeZone = this.getTimezone()) {
    const date = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', year: 'numeric' }).format(date);
  },

  getMondayOfWeek(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const day = date.getUTCDay(); // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day;
    date.setUTCDate(date.getUTCDate() + diff);
    const my = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const md = String(date.getUTCDate()).padStart(2, '0');
    return `${my}-${mm}-${md}`;
  },

  getWeekdayOfDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.getUTCDay(); // 0=Sun, 1=Mon...
  },

  getDayOfMonthOfDateKey(dateKey) {
    const parts = dateKey.split('-').map(Number);
    return parts[2];
  }
};

// ==========================================
// 2. STORAGE & PERSISTENCE
// ==========================================
const STORAGE_PREFIX = 'meniscus_v2_';
const STORAGE_KEYS = {
  TIMEZONE: STORAGE_PREFIX + 'timezone',
  THEME: STORAGE_PREFIX + 'theme',
  ANCHORS: STORAGE_PREFIX + 'anchors',
  RHYTHM: STORAGE_PREFIX + 'rhythm',
  RHYTHM_LOGS: STORAGE_PREFIX + 'rhythm_logs',
  POOL: STORAGE_PREFIX + 'pool',
  POOL_LOGS: STORAGE_PREFIX + 'pool_logs',
  SLOTTED_TASKS: STORAGE_PREFIX + 'slotted_tasks',
  CALENDAR_EVENTS: STORAGE_PREFIX + 'calendar_events',
  BREAK_DAYS: STORAGE_PREFIX + 'break_days',
  INBOX: STORAGE_PREFIX + 'inbox',
  SCRATCHPAD: STORAGE_PREFIX + 'scratchpad',
  GOALS: STORAGE_PREFIX + 'goals',
  WISHLIST: STORAGE_PREFIX + 'wishlist',
};

const SEED_PRAYERS = [
  { id: 'fajr', title: 'Fajr Prayer', category: 'Prayer', startTime: '05:15', endTime: '05:45', notes: 'Dawn' },
  { id: 'dhuhr', title: 'Dhuhr Prayer', category: 'Prayer', startTime: '13:00', endTime: '13:30', notes: 'Midday' },
  { id: 'asr', title: 'Asr Prayer', category: 'Prayer', startTime: '16:15', endTime: '16:45', notes: 'Afternoon' },
  { id: 'maghrib', title: 'Maghrib Prayer', category: 'Prayer', startTime: '18:45', endTime: '19:15', notes: 'Sunset' },
  { id: 'isha', title: 'Isha Prayer', category: 'Prayer', startTime: '20:00', endTime: '20:30', notes: 'Night' },
];

const SEED_RHYTHM = [
  { id: 'r1', title: 'High-intensity study block #1', description: 'Deep conceptual focus, problem sets, or heavy reading.', targetDuration: '1h 30m' },
  { id: 'r2', title: 'High-intensity study block #2', description: 'Second deep work block of the day.', targetDuration: '1h 30m' },
  { id: 'r3', title: 'Low-intensity study block', description: 'Review, light reading, podcast, or lecture recap.', targetDuration: '1h' },
  { id: 'r4', title: 'Note-writing session', description: 'Synthesize summaries, create high-yield charts, or organize notes.', targetDuration: '45m' },
  { id: 'r5', title: 'Anki review', description: 'Daily flashcard repetitions and card creations.', targetDuration: '30m' },
  { id: 'r6', title: 'Evening review & planning', description: 'Reflect on today, close open loops, and set tomorrow’s schedule.', targetDuration: '20m' },
];

const SEED_POOL = [
  { id: 'p1', title: 'Clinical Question Bank Practice', description: 'Target 3 practice question sets per week.', doneCriteria: 'Complete 30 timed questions + review rationales.', targetSessions: 3, targetLength: '1h' },
  { id: 'p2', title: 'Anatomy / Pathology Spotter Drills', description: 'Review lab slides, gross images, and specimen identification.', doneCriteria: 'Review 50 image cards thoroughly.', targetSessions: 2, targetLength: '45m' },
];

class AppStore {
  static get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error('Storage read error for key:', key, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error for key:', key, e);
    }
  }

  static initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.ANCHORS)) {
      const initialAnchors = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      for (let day = 0; day <= 6; day++) {
        initialAnchors[day] = SEED_PRAYERS.map(p => ({
          ...p,
          id: `seed-${p.id}-${day}`,
          weekdays: [day]
        }));
      }
      this.set(STORAGE_KEYS.ANCHORS, initialAnchors);
    }

    if (!localStorage.getItem(STORAGE_KEYS.RHYTHM)) {
      this.set(STORAGE_KEYS.RHYTHM, SEED_RHYTHM);
    }

    if (!localStorage.getItem(STORAGE_KEYS.POOL)) {
      this.set(STORAGE_KEYS.POOL, SEED_POOL);
    }

    if (!localStorage.getItem(STORAGE_KEYS.TIMEZONE)) {
      this.set(STORAGE_KEYS.TIMEZONE, 'Africa/Lagos');
    }

    if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.set(STORAGE_KEYS.THEME, prefersDark ? 'dark' : 'light');
    }

    if (!localStorage.getItem(STORAGE_KEYS.BREAK_DAYS)) {
      this.set(STORAGE_KEYS.BREAK_DAYS, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS)) {
      this.set(STORAGE_KEYS.CALENDAR_EVENTS, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.INBOX)) {
      this.set(STORAGE_KEYS.INBOX, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SCRATCHPAD)) {
      this.set(STORAGE_KEYS.SCRATCHPAD, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.GOALS)) {
      this.set(STORAGE_KEYS.GOALS, []);
    }

    if (!localStorage.getItem(STORAGE_KEYS.WISHLIST)) {
      this.set(STORAGE_KEYS.WISHLIST, []);
    }
  }

  static exportBackup() {
    const data = {};
    for (const k in STORAGE_KEYS) {
      const storageKey = STORAGE_KEYS[k];
      data[storageKey] = this.get(storageKey, null);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meniscus_os_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      for (const k in data) {
        if (Object.values(STORAGE_KEYS).includes(k)) {
          this.set(k, data[k]);
        }
      }
      return true;
    } catch (e) {
      console.error('Failed to import JSON backup', e);
      return false;
    }
  }

  static resetToDefaults() {
    for (const k in STORAGE_KEYS) {
      localStorage.removeItem(STORAGE_KEYS[k]);
    }
    this.initDefaults();
  }
}

// ==========================================
// 3. APPLICATION CONTROLLER
// ==========================================
const App = {
  timezone: 'Africa/Lagos',
  currentDateKey: '',
  nowMinute: 0,
  selectedCalDateKey: '',
  calYear: 2026,
  calMonthIndex: 8,
  activeTab: 'home',
  activeCaptureTab: 'inbox',
  selectedWeekdayTab: 1,

  // Temporary Slot Context
  currentSlotContext: {
    gapId: '',
    targetDate: '',
    totalCapacityMinutes: 0,
    alreadyAssignedMinutes: 0,
    remainingCapacityMinutes: 0
  },

  init() {
    try {
      AppStore.initDefaults();
      this.timezone = AppStore.get(STORAGE_KEYS.TIMEZONE, 'Africa/Lagos');
      this.applyTheme(AppStore.get(STORAGE_KEYS.THEME, 'light'));
      
      const nowParts = TimeHelper.getNowParts(this.timezone);
      this.currentDateKey = nowParts.dateKey;
      this.nowMinute = nowParts.currentMinute;
      this.selectedCalDateKey = this.currentDateKey;
      this.calYear = nowParts.year;
      this.calMonthIndex = nowParts.month - 1;
      this.selectedWeekdayTab = nowParts.dayOfWeek;

      this.bindEvents();
      this.startLiveClock();
      this.renderActiveView();
      console.log('MENISCUS OS v2.1 Initialized Successfully');
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  timeStringToMinutes(str = '00:00') {
    const [h, m] = str.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  },

  minutesToTimeString(mins = 0) {
    const clamped = Math.max(0, Math.min(1440, mins));
    const h = String(Math.floor(clamped / 60)).padStart(2, '0');
    const m = String(clamped % 60).padStart(2, '0');
    return `${h}:${m}`;
  },

  formatDuration(mins = 0) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  },

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const icon = document.getElementById('theme-icon');
      if (icon) icon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      const icon = document.getElementById('theme-icon');
      if (icon) icon.textContent = '🌙';
    }
    AppStore.set(STORAGE_KEYS.THEME, theme);
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    this.applyTheme(cur === 'dark' ? 'light' : 'dark');
    this.showToast(`Switched to ${cur === 'dark' ? 'Light' : 'Dark'} mode`);
  },

  showToast(message) {
    const pill = document.getElementById('toast-pill');
    if (!pill) return;
    pill.textContent = message;
    pill.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => pill.classList.remove('show'), 2200);
  },

  // ==========================================
  // 4. LIVE CLOCK & REAL-TIME REFRESH
  // ==========================================
  startLiveClock() {
    const clockEl = document.getElementById('live-clock-text');
    let lastRenderMinute = -1;

    const update = () => {
      const nowParts = TimeHelper.getNowParts(this.timezone);
      this.nowMinute = nowParts.currentMinute;

      if (clockEl) {
        clockEl.textContent = nowParts.timeStr;
      }

      // Re-evaluate dynamic remaining free time once every minute
      if (nowParts.currentMinute !== lastRenderMinute) {
        lastRenderMinute = nowParts.currentMinute;
        if (this.activeTab === 'home') {
          this.renderHomeView();
        }
      }

      // Midnight Rollover (WAT)
      if (nowParts.dateKey !== this.currentDateKey) {
        this.currentDateKey = nowParts.dateKey;
        this.renderHomeView();
        this.renderTomorrowView();
        this.renderCalendarView();
        this.renderNotificationsView();
      }
    };

    update();
    setInterval(update, 1000);
  },

  // ==========================================
  // 5. 24-HOUR FREE TIME ARITHMETIC ENGINE
  // ==========================================
  calculateDailyTimeline(dateKey = this.currentDateKey, isTomorrow = false) {
    const isToday = dateKey === this.currentDateKey;
    const dayOfWeek = TimeHelper.getWeekdayOfDateKey(dateKey);
    const breakDays = AppStore.get(STORAGE_KEYS.BREAK_DAYS, []);
    const isBreakDay = breakDays.includes(dateKey);

    // 1. Fetch Weekly Anchors for this weekday
    const allAnchorsMap = AppStore.get(STORAGE_KEYS.ANCHORS, {});
    let dayAnchors = (allAnchorsMap[dayOfWeek] || []).slice();

    // If Break Day: Hide / Clear all "Academic" anchors for this date
    if (isBreakDay) {
      dayAnchors = dayAnchors.filter(a => a.category !== 'Academic');
    }

    // 2. Fetch Timed Calendar Events for this date & inject as anchors
    const calEvents = this.getEventsForDate(dateKey).filter(e => e.isTimed && e.startTime && e.endTime);
    calEvents.forEach(e => {
      dayAnchors.push({
        id: `cal-anchor-${e.id}`,
        title: e.title,
        category: 'Event',
        startTime: e.startTime,
        endTime: e.endTime,
        notes: e.notes || 'Scheduled Calendar Event',
        isCalEvent: true,
      });
    });

    // Sort Anchors Chronologically
    dayAnchors.sort((a, b) => this.timeStringToMinutes(a.startTime) - this.timeStringToMinutes(b.startTime));

    // Merge overlapping anchor intervals to compute true gaps
    const mergedAnchorIntervals = [];
    dayAnchors.forEach(a => {
      const s = this.timeStringToMinutes(a.startTime);
      const e = this.timeStringToMinutes(a.endTime);
      if (e <= s) return;

      if (!mergedAnchorIntervals.length) {
        mergedAnchorIntervals.push({ start: s, end: e, anchors: [a] });
      } else {
        const last = mergedAnchorIntervals[mergedAnchorIntervals.length - 1];
        if (s <= last.end) {
          last.end = Math.max(last.end, e);
          last.anchors.push(a);
        } else {
          mergedAnchorIntervals.push({ start: s, end: e, anchors: [a] });
        }
      }
    });

    // Compute Free Windows across full 24 hours (0 to 1440 mins)
    const DAY_START = 0;
    const DAY_END = 1440;
    const gaps = [];
    let curPointer = DAY_START;

    mergedAnchorIntervals.forEach((interval) => {
      if (interval.start > curPointer) {
        const gapMin = interval.start - curPointer;
        if (gapMin >= 5) {
          gaps.push({
            id: `gap-${dateKey}-${curPointer}-${interval.start}`,
            startMin: curPointer,
            endMin: interval.start,
            startTime: this.minutesToTimeString(curPointer),
            endTime: this.minutesToTimeString(interval.start),
            durationMinutes: gapMin,
            durationLabel: this.formatDuration(gapMin),
          });
        }
      }
      curPointer = Math.max(curPointer, interval.end);
    });

    if (DAY_END > curPointer) {
      const gapMin = DAY_END - curPointer;
      if (gapMin >= 5) {
        gaps.push({
          id: `gap-${dateKey}-${curPointer}-${DAY_END}`,
          startMin: curPointer,
          endMin: DAY_END,
          startTime: this.minutesToTimeString(curPointer),
          endTime: this.minutesToTimeString(DAY_END),
          durationMinutes: gapMin,
          durationLabel: this.formatDuration(gapMin),
        });
      }
    }

    // Attach Slotted Tasks & Calculate Window Capacities
    const allSlotted = AppStore.get(STORAGE_KEYS.SLOTTED_TASKS, {})[dateKey] || [];
    let totalAssignedTaskMinutes = 0;

    gaps.forEach(g => {
      const gapTasks = allSlotted.filter(t => t.gapId === g.id);
      g.tasks = gapTasks;
      g.assignedMinutes = gapTasks.reduce((sum, t) => sum + (Number(t.durationMinutes) || 0), 0);
      g.remainingMinutes = Math.max(0, g.durationMinutes - g.assignedMinutes);
      totalAssignedTaskMinutes += g.assignedMinutes;

      // Real-Time Dynamic Status for Today
      if (isToday) {
        if (g.endMin <= this.nowMinute) {
          g.isElapsed = true;
          g.dynamicRemainingMinutes = 0;
        } else if (g.startMin >= this.nowMinute) {
          g.isElapsed = false;
          g.dynamicRemainingMinutes = g.durationMinutes;
        } else {
          // Window is currently active right now
          g.isElapsed = false;
          g.isActiveNow = true;
          g.dynamicRemainingMinutes = Math.max(0, g.endMin - this.nowMinute);
        }
      } else {
        g.isElapsed = false;
        g.dynamicRemainingMinutes = g.durationMinutes;
      }
    });

    // Mark anchors elapsed if past
    if (isToday) {
      dayAnchors.forEach(a => {
        const endM = this.timeStringToMinutes(a.endTime);
        a.isElapsed = endM <= this.nowMinute;
        const startM = this.timeStringToMinutes(a.startTime);
        a.isActiveNow = (startM <= this.nowMinute && endM > this.nowMinute);
      });
    }

    const totalGrossFreeMinutes = gaps.reduce((acc, g) => acc + g.durationMinutes, 0);
    const totalRemainingFreeMinutes = isToday
      ? gaps.reduce((acc, g) => acc + g.dynamicRemainingMinutes, 0)
      : totalGrossFreeMinutes;

    const pureFreeMinutesRemaining = Math.max(0, totalRemainingFreeMinutes - totalAssignedTaskMinutes);

    // Build Combined Chronological Timeline Stream
    const stream = [];
    let gapIdx = 0;
    let anchorIdx = 0;

    while (gapIdx < gaps.length || anchorIdx < dayAnchors.length) {
      const nextGap = gaps[gapIdx];
      const nextAnchor = dayAnchors[anchorIdx];

      if (nextGap && nextAnchor) {
        if (nextGap.startMin <= this.timeStringToMinutes(nextAnchor.startTime)) {
          stream.push({ type: 'gap', data: nextGap });
          gapIdx++;
        } else {
          stream.push({ type: 'anchor', data: nextAnchor });
          anchorIdx++;
        }
      } else if (nextGap) {
        stream.push({ type: 'gap', data: nextGap });
        gapIdx++;
      } else if (nextAnchor) {
        stream.push({ type: 'anchor', data: nextAnchor });
        anchorIdx++;
      }
    }

    const anchorMinutesTotal = 1440 - totalGrossFreeMinutes;

    return {
      dateKey,
      isToday,
      isBreakDay,
      dayAnchors,
      gaps,
      stream,
      anchorMinutesTotal,
      totalGrossFreeMinutes,
      totalRemainingFreeMinutes,
      totalAssignedTaskMinutes,
      pureFreeMinutesRemaining,
      grossFreeHoursLabel: this.formatDuration(totalGrossFreeMinutes),
      remainingFreeHoursLabel: this.formatDuration(totalRemainingFreeMinutes),
      assignedTaskHoursLabel: this.formatDuration(totalAssignedTaskMinutes),
      pureFreeHoursLabel: this.formatDuration(pureFreeMinutesRemaining),
    };
  },

  // ==========================================
  // 6. VIEW RENDERING
  // ==========================================
  renderActiveView() {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`view-${this.activeTab}`);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.view === this.activeTab);
    });

    this.updateBadges();

    if (this.activeTab === 'home') this.renderHomeView();
    else if (this.activeTab === 'tomorrow') this.renderTomorrowView();
    else if (this.activeTab === 'rhythm') this.renderRhythmView();
    else if (this.activeTab === 'pool') this.renderPoolView();
    else if (this.activeTab === 'anchors') this.renderAnchorsView();
    else if (this.activeTab === 'calendar') this.renderCalendarView();
    else if (this.activeTab === 'notifications') this.renderNotificationsView();
    else if (this.activeTab === 'capture') this.renderCaptureView();
    else if (this.activeTab === 'settings') this.renderSettingsView();
  },

  updateBadges() {
    const rhythm = AppStore.get(STORAGE_KEYS.RHYTHM, []);
    const rhythmLogs = AppStore.get(STORAGE_KEYS.RHYTHM_LOGS, {})[this.currentDateKey] || {};
    const rhythmDone = rhythm.filter(r => rhythmLogs[r.id]).length;
    const rBadge = document.getElementById('rhythm-badge');
    if (rBadge) rBadge.textContent = `${rhythmDone}/${rhythm.length}`;

    const pool = AppStore.get(STORAGE_KEYS.POOL, []);
    const pBadge = document.getElementById('pool-badge');
    if (pBadge) pBadge.textContent = pool.length;

    // Capture Badge (Unprocessed items in inbox + pending to-dos)
    const inbox = AppStore.get(STORAGE_KEYS.INBOX, []);
    const scratchpad = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []);
    const pendingTotal = inbox.filter(i => !i.done).length + scratchpad.filter(t => !t.done).length;
    const cBadge = document.getElementById('capture-badge');
    if (cBadge) cBadge.textContent = pendingTotal;

    // Notifications Badge
    const notifs = this.getNotificationItems();
    const nBadge = document.getElementById('notifications-badge');
    const headerDot = document.getElementById('header-notif-dot');
    if (nBadge) {
      if (notifs.totalCount > 0) {
        nBadge.style.display = 'inline-block';
        nBadge.textContent = notifs.totalCount;
        if (headerDot) headerDot.style.display = 'block';
      } else {
        nBadge.style.display = 'none';
        if (headerDot) headerDot.style.display = 'none';
      }
    }
  },

  // --- VIEW 1: HOME VIEW (TODAY) ---
  renderHomeView() {
    const dayNameEl = document.getElementById('today-dayname');
    const fullDateEl = document.getElementById('today-full-date');
    if (dayNameEl) dayNameEl.textContent = TimeHelper.formatDayName(this.currentDateKey, this.timezone).toUpperCase();
    if (fullDateEl) fullDateEl.textContent = TimeHelper.formatFullDate(this.currentDateKey, this.timezone);

    const timelineData = this.calculateDailyTimeline(this.currentDateKey, false);

    // Break Day Button
    const breakBtn = document.getElementById('toggle-today-break-btn');
    const breakIcon = document.getElementById('today-break-icon');
    const breakLabel = document.getElementById('today-break-label');
    if (breakBtn) {
      if (timelineData.isBreakDay) {
        breakBtn.className = 'pill-btn danger';
        if (breakIcon) breakIcon.textContent = '☕';
        if (breakLabel) breakLabel.textContent = 'Break Day Active';
      } else {
        breakBtn.className = 'pill-btn secondary';
        if (breakIcon) breakIcon.textContent = '☕';
        if (breakLabel) breakLabel.textContent = 'Break Day';
      }
    }

    // Free Time Display (Dynamic Real-Time Remaining vs 24h Total)
    const freeHoursEl = document.getElementById('summary-free-hours');
    const freeLabelEl = document.getElementById('summary-free-label');
    const subtextEl = document.getElementById('summary-subtext');

    if (freeHoursEl) freeHoursEl.textContent = timelineData.remainingFreeHoursLabel;
    if (freeLabelEl) freeLabelEl.textContent = 'free ahead today';
    if (subtextEl) {
      subtextEl.textContent = `${timelineData.grossFreeHoursLabel} total daytime free windows · ${timelineData.assignedTaskHoursLabel} assigned to tasks.`;
    }

    // Circular Progress Ring
    const rhythmList = AppStore.get(STORAGE_KEYS.RHYTHM, []);
    const rhythmLogs = AppStore.get(STORAGE_KEYS.RHYTHM_LOGS, {})[this.currentDateKey] || {};
    const doneCount = rhythmList.filter(r => rhythmLogs[r.id]).length;
    const totalCount = rhythmList.length || 6;
    const progressEl = document.getElementById('summary-ring-progress');
    const ratioEl = document.getElementById('summary-rhythm-ratio');
    if (ratioEl) ratioEl.textContent = `${doneCount}/${totalCount}`;
    if (progressEl) {
      const circumference = 2 * Math.PI * 18;
      const offset = circumference - (doneCount / totalCount) * circumference;
      progressEl.style.strokeDashoffset = offset;
    }

    // Timeline Stream
    const streamContainer = document.getElementById('day-stream-container');
    const countBadge = document.getElementById('timeline-count-badge');
    if (countBadge) countBadge.textContent = `${timelineData.gaps.length} free windows`;

    this.renderStreamContainer(streamContainer, timelineData, this.currentDateKey);

    // Mini Rhythm Checklist
    const homeRhythmContainer = document.getElementById('home-rhythm-list');
    const homeRhythmCount = document.getElementById('home-rhythm-count');
    if (homeRhythmCount) homeRhythmCount.textContent = `${doneCount}/${totalCount}`;
    if (homeRhythmContainer) {
      homeRhythmContainer.innerHTML = rhythmList.map(r => {
        const isDone = !!rhythmLogs[r.id];
        return `
          <div class="mini-check-item ${isDone ? 'done' : ''}">
            <label class="flex-gap" style="cursor:pointer;">
              <input type="checkbox" class="task-checkbox toggle-rhythm-check" data-rhythm-id="${r.id}" ${isDone ? 'checked' : ''}>
              <span>${this.escapeHtml(r.title)}</span>
            </label>
            <span class="item-badge">${r.targetDuration || ''}</span>
          </div>
        `;
      }).join('');
    }
  },

  // --- VIEW 2: TOMORROW'S PLAN ---
  renderTomorrowView() {
    const tomorrowKey = TimeHelper.getTomorrowDateKey(this.currentDateKey);
    const dayNameEl = document.getElementById('tomorrow-dayname');
    const fullDateEl = document.getElementById('tomorrow-full-date');
    if (dayNameEl) dayNameEl.textContent = TimeHelper.formatDayName(tomorrowKey, this.timezone).toUpperCase();
    if (fullDateEl) fullDateEl.textContent = TimeHelper.formatFullDate(tomorrowKey, this.timezone);

    const timelineData = this.calculateDailyTimeline(tomorrowKey, true);

    const breakBtn = document.getElementById('toggle-tomorrow-break-btn');
    const breakIcon = document.getElementById('tomorrow-break-icon');
    const breakLabel = document.getElementById('tomorrow-break-label');
    if (breakBtn) {
      if (timelineData.isBreakDay) {
        breakBtn.className = 'pill-btn danger';
        if (breakIcon) breakIcon.textContent = '☕';
        if (breakLabel) breakLabel.textContent = 'Break Day Active';
      } else {
        breakBtn.className = 'pill-btn secondary';
        if (breakIcon) breakIcon.textContent = '☕';
        if (breakLabel) breakLabel.textContent = 'Break Day';
      }
    }

    const freeHoursEl = document.getElementById('tomorrow-summary-free-hours');
    const subtextEl = document.getElementById('tomorrow-summary-subtext');
    if (freeHoursEl) freeHoursEl.textContent = timelineData.grossFreeHoursLabel;
    if (subtextEl) {
      subtextEl.textContent = `${timelineData.dayAnchors.length} fixed anchors scheduled. ${timelineData.assignedTaskHoursLabel} pre-slotted.`;
    }

    const streamContainer = document.getElementById('tomorrow-stream-container');
    const countBadge = document.getElementById('tomorrow-timeline-count-badge');
    if (countBadge) countBadge.textContent = `${timelineData.gaps.length} free windows`;

    this.renderStreamContainer(streamContainer, timelineData, tomorrowKey);
  },

  renderStreamContainer(streamContainer, timelineData, targetDate) {
    if (!streamContainer) return;
    streamContainer.innerHTML = '';

    if (!timelineData.stream.length) {
      streamContainer.innerHTML = '<div class="cushion-card"><p class="summary-note">No fixed commitments. Full 24 hours are open.</p></div>';
      return;
    }

    timelineData.stream.forEach(item => {
      if (item.type === 'anchor') {
        const a = item.data;
        const catClass = a.category ? a.category.toLowerCase() : 'other';
        const el = document.createElement('div');
        el.className = `stream-anchor ${catClass} ${a.isElapsed ? 'elapsed' : ''}`;
        el.innerHTML = `
          <div class="anchor-main">
            <span class="anchor-cat-badge">${a.category || 'Anchor'}</span>
            <div>
              <div class="anchor-title">
                ${this.escapeHtml(a.title)}
                ${a.isElapsed ? '<span class="elapsed-badge">Elapsed</span>' : ''}
              </div>
              ${a.notes ? `<div class="task-notes">${this.escapeHtml(a.notes)}</div>` : ''}
            </div>
          </div>
          <div class="anchor-time">${a.startTime} – ${a.endTime}</div>
        `;
        streamContainer.appendChild(el);
      } else if (item.type === 'gap') {
        const g = item.data;
        const capPct = g.durationMinutes ? Math.min(100, Math.round((g.assignedMinutes / g.durationMinutes) * 100)) : 0;

        const el = document.createElement('div');
        el.className = `stream-gap ${g.isElapsed ? 'elapsed' : ''}`;
        el.innerHTML = `
          <div class="gap-header">
            <div class="gap-duration-pill">
              <span>⏱️ ${g.durationLabel} Free Window</span>
              ${g.isElapsed ? '<span class="elapsed-badge">Passed</span>' : ''}
            </div>
            <span class="gap-bounds font-mono">${g.startTime} – ${g.endTime}</span>
          </div>

          <div class="slotted-tasks-list" id="gap-tasks-${g.id}">
            ${g.tasks.map(t => `
              <div class="slotted-task ${t.done ? 'done' : ''}">
                <input type="checkbox" class="task-checkbox" data-task-id="${t.id}" data-target-date="${targetDate}" ${t.done ? 'checked' : ''}>
                <div class="task-body">
                  <span class="task-tag">${t.source === 'commute' ? '🚗 Commute' : t.source === 'nap' ? '😴 Nap' : t.source === 'personal' ? '🧘 Personal' : t.source === 'meal' ? '🍽️ Meal' : t.source === 'downtime' ? '☕ Break' : t.source === 'rhythm' ? '⚡ Rhythm' : t.source === 'pool' ? '🎯 Pool' : '✏️ Custom'}</span>
                  <span class="task-title">${this.escapeHtml(t.title)}</span>
                  ${t.durationMinutes ? `<span class="item-badge font-mono">${this.formatDuration(t.durationMinutes)}</span>` : ''}
                  ${t.notes ? `<div class="task-notes">${this.escapeHtml(t.notes)}</div>` : ''}
                </div>
                <button class="task-remove-btn" data-task-id="${t.id}" data-target-date="${targetDate}" title="Remove task">✕</button>
              </div>
            `).join('')}
          </div>

          <div class="stream-gap-cap-row">
            <span>Allocated: <strong>${this.formatDuration(g.assignedMinutes)}</strong> of ${g.durationLabel} (${this.formatDuration(g.remainingMinutes)} open)</span>
            <div class="stream-gap-cap-bar">
              <div class="stream-gap-cap-bar-fill" style="width: ${capPct}%;"></div>
            </div>
          </div>

          <div class="gap-action-row margin-top-xs">
            <button class="pill-btn secondary small open-slot-modal-btn" 
              data-gap-id="${g.id}" 
              data-target-date="${targetDate}"
              data-gap-label="${g.startTime} – ${g.endTime} (${g.durationLabel})"
              data-duration-mins="${g.durationMinutes}"
              data-assigned-mins="${g.assignedMinutes}"
              data-remaining-mins="${g.remainingMinutes}">
              + Assign Task (${this.formatDuration(g.remainingMinutes)} available)
            </button>
          </div>
        `;
        streamContainer.appendChild(el);
      }
    });
  },

  // --- TIME AUDIT MODAL POP-UP ---
  openTimeAuditModal() {
    const data = this.calculateDailyTimeline(this.currentDateKey, false);
    document.getElementById('audit-bar-date-label').textContent = TimeHelper.formatFullDate(this.currentDateKey, this.timezone);

    // 24-hour Stacked Bar Segments
    const totalMinutes = 1440;
    const elapsedMins = this.nowMinute;
    const anchorMins = data.anchorMinutesTotal;
    const taskMins = data.totalAssignedTaskMinutes;
    const pureFreeMins = Math.max(0, 1440 - (elapsedMins + anchorMins + taskMins));

    const pElapsed = ((elapsedMins / totalMinutes) * 100).toFixed(1);
    const pAnchor = ((anchorMins / totalMinutes) * 100).toFixed(1);
    const pTask = ((taskMins / totalMinutes) * 100).toFixed(1);
    const pFree = Math.max(0, (100 - pElapsed - pAnchor - pTask)).toFixed(1);

    const barContainer = document.getElementById('audit-stacked-bar');
    if (barContainer) {
      barContainer.innerHTML = `
        <div class="stacked-seg seg-elapsed" style="width: ${pElapsed}%;" title="Elapsed: ${this.formatDuration(elapsedMins)}"></div>
        <div class="stacked-seg seg-anchor" style="width: ${pAnchor}%;" title="Anchors: ${this.formatDuration(anchorMins)}"></div>
        <div class="stacked-seg seg-task" style="width: ${pTask}%;" title="Tasks: ${this.formatDuration(taskMins)}"></div>
        <div class="stacked-seg seg-free" style="width: ${pFree}%;" title="Pure Free: ${this.formatDuration(pureFreeMins)}"></div>
      `;
    }

    // Metrics Table
    document.getElementById('audit-val-elapsed').textContent = this.formatDuration(elapsedMins);
    document.getElementById('audit-val-anchors').textContent = this.formatDuration(anchorMins);
    document.getElementById('audit-val-gross-free').textContent = data.grossFreeHoursLabel;
    document.getElementById('audit-val-tasks').textContent = data.assignedTaskHoursLabel;
    document.getElementById('audit-val-pure-free').textContent = data.pureFreeHoursLabel;

    const utilizationPct = data.totalGrossFreeMinutes > 0
      ? Math.round((data.totalAssignedTaskMinutes / data.totalGrossFreeMinutes) * 100)
      : 0;

    const utilText = document.getElementById('audit-utilization-text');
    if (utilText) {
      utilText.textContent = `${utilizationPct}% of today's gross free windows have been committed to tasks. You have ${data.pureFreeHoursLabel} completely open downtime remaining.`;
    }

    document.getElementById('time-audit-modal').classList.add('open');
  },

  // --- VIEW 7: NOTIFICATIONS & REMINDERS ---
  getNotificationItems() {
    const today = this.currentDateKey;
    const in3Days = TimeHelper.addDaysToDateKey(today, 3);
    const allEvents = AppStore.get(STORAGE_KEYS.CALENDAR_EVENTS, []);

    const dueToday = [];
    const upcoming = [];

    allEvents.forEach(e => {
      if (!e.isRecurring) {
        if (e.date === today) {
          dueToday.push(e);
        } else if (e.date > today && e.date <= in3Days) {
          upcoming.push(e);
        }
      } else {
        // Check recurring events for today
        const weekday = TimeHelper.getWeekdayOfDateKey(today);
        const dayOfMonth = TimeHelper.getDayOfMonthOfDateKey(today);
        if (e.recurrenceRule === 'weekly' && Number(e.weekday) === weekday) {
          dueToday.push({ ...e, isRecurInstance: true });
        } else if (e.recurrenceRule === 'monthly' && Number(e.dayOfMonth) === dayOfMonth) {
          dueToday.push({ ...e, isRecurInstance: true });
        }
      }
    });

    const isMonday = TimeHelper.getWeekdayOfDateKey(today) === 1;
    const systemNotices = [];
    if (isMonday) {
      systemNotices.push({
        id: 'monday-rollover',
        title: 'Weekly Pool Reset',
        message: 'A new week has begun! Weekly Pool counters have rolled over to 0.',
        time: 'Monday 00:00'
      });
    }

    const totalCount = dueToday.length + systemNotices.length;
    return { dueToday, upcoming, systemNotices, totalCount };
  },

  renderNotificationsView() {
    const { dueToday, upcoming, systemNotices } = this.getNotificationItems();

    const todayContainer = document.getElementById('notif-today-container');
    const upContainer = document.getElementById('notif-upcoming-container');
    const sysContainer = document.getElementById('notif-system-container');

    if (todayContainer) {
      if (!dueToday.length) {
        todayContainer.innerHTML = '<div class="cushion-card"><p class="summary-note">No scheduled commitments due today.</p></div>';
      } else {
        todayContainer.innerHTML = dueToday.map(e => `
          <div class="notif-card due-today">
            <div>
              <div class="notif-title">📅 ${this.escapeHtml(e.title)}</div>
              <div class="notif-time-badge font-mono">${e.isTimed ? `⏰ ${e.startTime} – ${e.endTime}` : '📌 All-Day Note'}</div>
              ${e.notes ? `<div class="task-notes">${this.escapeHtml(e.notes)}</div>` : ''}
            </div>
            <span class="item-badge danger">Due Today</span>
          </div>
        `).join('');
      }
    }

    if (upContainer) {
      if (!upcoming.length) {
        upContainer.innerHTML = '<div class="cushion-card"><p class="summary-note">Horizon is clear for the next 3 days.</p></div>';
      } else {
        upContainer.innerHTML = upcoming.map(e => `
          <div class="notif-card upcoming">
            <div>
              <div class="notif-title">🗓️ ${this.escapeHtml(e.title)}</div>
              <div class="notif-time-badge font-mono">${e.date} ${e.isTimed ? `· ${e.startTime}` : ''}</div>
              ${e.notes ? `<div class="task-notes">${this.escapeHtml(e.notes)}</div>` : ''}
            </div>
            <span class="item-badge font-mono">${TimeHelper.formatDayName(e.date, this.timezone).slice(0, 3)}</span>
          </div>
        `).join('');
      }
    }

    if (sysContainer) {
      if (!systemNotices.length) {
        sysContainer.innerHTML = '<div class="cushion-card"><p class="summary-note">All system services and weekly schedules operating normally.</p></div>';
      } else {
        sysContainer.innerHTML = systemNotices.map(s => `
          <div class="notif-card system">
            <div>
              <div class="notif-title">🔔 ${this.escapeHtml(s.title)}</div>
              <p class="item-desc">${this.escapeHtml(s.message)}</p>
            </div>
            <span class="item-badge font-mono">${s.time}</span>
          </div>
        `).join('');
      }
    }
  },

  // --- VIEW 8: CAPTURE & GOALS HUB (4-PART ARCHITECTURE) ---
  renderCaptureView() {
    document.querySelectorAll('.seg-tab[data-capture-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.captureTab === this.activeCaptureTab);
    });
    document.querySelectorAll('.capture-tab-pane').forEach(p => p.classList.remove('active'));
    const activePane = document.getElementById(`capture-tab-${this.activeCaptureTab}`);
    if (activePane) activePane.classList.add('active');

    if (this.activeCaptureTab === 'inbox') this.renderInboxSubTab();
    else if (this.activeCaptureTab === 'scratchpad') this.renderScratchpadSubTab();
    else if (this.activeCaptureTab === 'goals') this.renderGoalsSubTab();
    else if (this.activeCaptureTab === 'wishlist') this.renderWishlistSubTab();
  },

  renderInboxSubTab() {
    const list = AppStore.get(STORAGE_KEYS.INBOX, []);
    const container = document.getElementById('inbox-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">Inbox is clear. Use the box above to jot fast notes.</p></div>';
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="item-card ${item.done ? 'completed' : ''}">
        <div class="item-content flex-gap">
          <input type="checkbox" class="task-checkbox toggle-inbox-check" data-inbox-id="${item.id}" ${item.done ? 'checked' : ''}>
          <div>
            <div class="item-title" style="${item.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${this.escapeHtml(item.text)}</div>
            <div class="task-notes">${item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
          </div>
        </div>
        <button class="task-remove-btn delete-inbox-btn" data-inbox-id="${item.id}">✕</button>
      </div>
    `).join('');
  },

  renderScratchpadSubTab() {
    const list = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []);
    const container = document.getElementById('scratchpad-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No to-do items. Add an everyday task above.</p></div>';
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="scratchpad-item ${item.done ? 'completed' : ''}">
        <label class="flex-gap" style="cursor:pointer;">
          <input type="checkbox" class="task-checkbox toggle-scratchpad-check" data-scratch-id="${item.id}" ${item.done ? 'checked' : ''}>
          <span>${this.escapeHtml(item.text)}</span>
        </label>
        <button class="task-remove-btn delete-scratchpad-btn" data-scratch-id="${item.id}">✕</button>
      </div>
    `).join('');
  },

  renderGoalsSubTab() {
    const list = AppStore.get(STORAGE_KEYS.GOALS, []);
    const container = document.getElementById('goals-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No goals recorded yet. Click "+ Add Goal" above to write your intentions.</p></div>';
      return;
    }

    container.innerHTML = list.map(g => `
      <div class="goal-card ${g.completed ? 'completed' : ''}">
        <div class="item-content">
          <div class="flex-between margin-bottom-xs">
            <span class="item-title">${this.escapeHtml(g.title)}</span>
            <span class="horizon-badge ${g.horizon}">${g.horizon === 'short' ? '🌱 Short-Term' : g.horizon === 'mid' ? '🌿 Medium-Term' : '🌳 Long-Term'}</span>
          </div>
          ${g.targetDate ? `<div class="task-notes font-mono">🎯 Target: ${this.escapeHtml(g.targetDate)}</div>` : ''}
          ${g.notes ? `<p class="item-desc">${this.escapeHtml(g.notes)}</p>` : ''}
        </div>
        <button class="task-remove-btn delete-goal-btn" data-goal-id="${g.id}">✕</button>
      </div>
    `).join('');
  },

  renderWishlistSubTab() {
    const list = AppStore.get(STORAGE_KEYS.WISHLIST, []);
    const container = document.getElementById('wishlist-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">Wishlist is empty. Click "+ Add Item" to store books or aspirations.</p></div>';
      return;
    }

    container.innerHTML = list.map(w => `
      <div class="wishlist-card">
        <div>
          <div class="item-title">${this.escapeHtml(w.title)}</div>
          <span class="item-badge font-mono">${w.category || 'Item'}</span>
          ${w.notes ? `<div class="task-notes">${this.escapeHtml(w.notes)}</div>` : ''}
        </div>
        <button class="task-remove-btn delete-wishlist-btn" data-wishlist-id="${w.id}">✕</button>
      </div>
    `).join('');
  },

  // --- VIEW 3: DAILY RHYTHM ---
  renderRhythmView() {
    const list = AppStore.get(STORAGE_KEYS.RHYTHM, []);
    const rhythmLogs = AppStore.get(STORAGE_KEYS.RHYTHM_LOGS, {})[this.currentDateKey] || {};
    const container = document.getElementById('rhythm-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No rhythm items. Click "+ Add Item" to add a baseline task.</p></div>';
      return;
    }

    container.innerHTML = list.map(r => {
      const isDone = !!rhythmLogs[r.id];
      return `
        <div class="item-card ${isDone ? 'completed' : ''}">
          <div class="item-content">
            <div class="item-header-row">
              <label class="flex-gap" style="cursor:pointer;">
                <input type="checkbox" class="task-checkbox toggle-rhythm-check" data-rhythm-id="${r.id}" ${isDone ? 'checked' : ''}>
                <span class="item-title">${this.escapeHtml(r.title)}</span>
              </label>
              ${r.targetDuration ? `<span class="item-badge">${this.escapeHtml(r.targetDuration)}</span>` : ''}
            </div>
            ${r.description ? `<p class="item-desc">${this.escapeHtml(r.description)}</p>` : ''}
          </div>
          <button class="pill-btn secondary small edit-rhythm-btn" data-rhythm-id="${r.id}">Edit</button>
        </div>
      `;
    }).join('');
  },

  // --- VIEW 4: WEEKLY POOL ---
  renderPoolView() {
    const list = AppStore.get(STORAGE_KEYS.POOL, []);
    const mondayKey = TimeHelper.getMondayOfWeek(this.currentDateKey);
    const weekLogs = AppStore.get(STORAGE_KEYS.POOL_LOGS, {})[mondayKey] || {};
    const container = document.getElementById('pool-items-container');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No weekly pool items. Click "+ Add Goal" to track weekly session targets.</p></div>';
      return;
    }

    container.innerHTML = list.map(p => {
      const count = weekLogs[p.id] || 0;
      const target = p.targetSessions || 1;
      return `
        <div class="item-card">
          <div class="item-content">
            <div class="item-header-row">
              <span class="item-title">${this.escapeHtml(p.title)}</span>
              ${p.targetLength ? `<span class="item-badge">${this.escapeHtml(p.targetLength)} / session</span>` : ''}
            </div>
            ${p.description ? `<p class="item-desc">${this.escapeHtml(p.description)}</p>` : ''}
            ${p.doneCriteria ? `<p class="item-criteria"><strong>Done looks like:</strong> ${this.escapeHtml(p.doneCriteria)}</p>` : ''}
          </div>
          <div class="flex-gap">
            <div class="counter-group">
              <button class="counter-btn step-pool-btn" data-pool-id="${p.id}" data-delta="-1">−</button>
              <span class="counter-value">${count} / ${target}</span>
              <button class="counter-btn step-pool-btn" data-pool-id="${p.id}" data-delta="1">+</button>
            </div>
            <button class="icon-btn small edit-pool-btn" data-pool-id="${p.id}" title="Edit goal">✏️</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // --- VIEW 5: ANCHORS (WEEKLY TEMPLATES) ---
  renderAnchorsView() {
    document.querySelectorAll('.weekday-tab').forEach(t => {
      t.classList.toggle('active', Number(t.dataset.day) === this.selectedWeekdayTab);
    });

    const allAnchors = AppStore.get(STORAGE_KEYS.ANCHORS, {});
    const dayAnchors = (allAnchors[this.selectedWeekdayTab] || []).slice();
    dayAnchors.sort((a, b) => this.timeStringToMinutes(a.startTime) - this.timeStringToMinutes(b.startTime));

    const container = document.getElementById('anchors-list-container');
    if (!container) return;

    if (!dayAnchors.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No fixed commitments for this weekday. Click "+ Add Anchor" above.</p></div>';
      return;
    }

    container.innerHTML = dayAnchors.map(a => {
      const catClass = a.category ? a.category.toLowerCase() : 'other';
      return `
        <div class="item-card">
          <div class="item-content">
            <div class="item-header-row">
              <span class="anchor-cat-badge ${catClass}">${a.category || 'Anchor'}</span>
              <span class="item-title">${this.escapeHtml(a.title)}</span>
              <span class="item-badge font-mono">${a.startTime} – ${a.endTime}</span>
            </div>
            ${a.notes ? `<p class="item-desc">${this.escapeHtml(a.notes)}</p>` : ''}
          </div>
          <button class="pill-btn secondary small edit-anchor-btn" data-anchor-id="${a.id}">Edit</button>
        </div>
      `;
    }).join('');
  },

  // --- VIEW 6: CALENDAR VIEW ---
  renderCalendarView() {
    const titleEl = document.getElementById('cal-month-year');
    if (titleEl) titleEl.textContent = TimeHelper.formatMonthYear(this.calYear, this.calMonthIndex, this.timezone);

    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const daysInMonth = new Date(this.calYear, this.calMonthIndex + 1, 0).getDate();
    const firstDay = new Date(this.calYear, this.calMonthIndex, 1).getDay();
    const firstDayIso = firstDay === 0 ? 7 : firstDay;
    const prevMonthDays = new Date(this.calYear, this.calMonthIndex, 0).getDate();

    const cells = [];
    for (let i = firstDayIso - 2; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = this.calMonthIndex === 0 ? 11 : this.calMonthIndex - 1;
      const prevYear = this.calMonthIndex === 0 ? this.calYear - 1 : this.calYear;
      const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, isCurrentMonth: false, dateKey });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${this.calYear}-${String(this.calMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: true, dateKey });
    }
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = this.calMonthIndex === 11 ? 0 : this.calMonthIndex + 1;
      const nextYear = this.calMonthIndex === 11 ? this.calYear + 1 : this.calYear;
      const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: false, dateKey });
    }

    const breakDays = AppStore.get(STORAGE_KEYS.BREAK_DAYS, []);

    cells.forEach(c => {
      const isToday = c.dateKey === this.currentDateKey;
      const isSelected = c.dateKey === this.selectedCalDateKey;
      const isBreak = breakDays.includes(c.dateKey);
      const dayEvents = this.getEventsForDate(c.dateKey);

      const cell = document.createElement('div');
      cell.className = `cal-cell ${c.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isBreak ? 'break-day' : ''}`;
      cell.dataset.dateKey = c.dateKey;

      cell.innerHTML = `
        <span>${c.day}</span>
        ${dayEvents.length ? `
          <div class="cal-dot-container">
            ${dayEvents.slice(0, 3).map(() => '<span class="cal-event-dot"></span>').join('')}
          </div>` : ''}
      `;

      cell.addEventListener('click', () => {
        this.selectedCalDateKey = c.dateKey;
        this.renderCalendarView();
      });

      grid.appendChild(cell);
    });

    this.renderCalendarDayDetails();
    this.renderRecurringEventsList();
  },

  getEventsForDate(dateKey) {
    const weekday = TimeHelper.getWeekdayOfDateKey(dateKey);
    const dayOfMonth = TimeHelper.getDayOfMonthOfDateKey(dateKey);
    const all = AppStore.get(STORAGE_KEYS.CALENDAR_EVENTS, []);

    return all.filter(e => {
      if (!e.isRecurring) {
        return e.date === dateKey;
      }
      if (e.recurrenceRule === 'weekly') {
        return Number(e.weekday) === weekday;
      }
      if (e.recurrenceRule === 'monthly') {
        return Number(e.dayOfMonth) === dayOfMonth;
      }
      return false;
    });
  },

  renderCalendarDayDetails() {
    const dayNameEl = document.getElementById('cal-detail-dayname');
    const dateStrEl = document.getElementById('cal-detail-date-str');
    if (dayNameEl) dayNameEl.textContent = TimeHelper.formatDayName(this.selectedCalDateKey, this.timezone).toUpperCase();
    if (dateStrEl) dateStrEl.textContent = TimeHelper.formatFullDate(this.selectedCalDateKey, this.timezone);

    const breakDays = AppStore.get(STORAGE_KEYS.BREAK_DAYS, []);
    const isBreak = breakDays.includes(this.selectedCalDateKey);
    const breakToggleBtn = document.getElementById('cal-date-break-toggle');
    if (breakToggleBtn) {
      breakToggleBtn.className = `pill-btn ${isBreak ? 'danger' : 'secondary'} small`;
      breakToggleBtn.innerHTML = isBreak ? '☕ Break Day Active' : '☕ Mark Break Day';
    }

    const eventsList = document.getElementById('cal-day-events-list');
    const dayEvents = this.getEventsForDate(this.selectedCalDateKey);

    if (eventsList) {
      if (!dayEvents.length) {
        eventsList.innerHTML = '<p class="summary-note">No specific events scheduled for this date.</p>';
      } else {
        eventsList.innerHTML = dayEvents.map(e => `
          <div class="cal-event-row">
            <div>
              <div class="anchor-title">${this.escapeHtml(e.title)} ${e.isRecurring ? '<span class="task-tag">Recurring</span>' : ''}</div>
              ${e.isTimed ? `<span class="task-notes font-mono">⏰ ${e.startTime} – ${e.endTime}</span>` : '<span class="task-notes">📌 All-Day Note</span>'}
              ${e.notes ? `<div class="task-notes">${this.escapeHtml(e.notes)}</div>` : ''}
            </div>
            <button class="task-remove-btn delete-event-btn" data-event-id="${e.id}">✕</button>
          </div>
        `).join('');
      }
    }
  },

  renderRecurringEventsList() {
    const all = AppStore.get(STORAGE_KEYS.CALENDAR_EVENTS, []).filter(e => e.isRecurring);
    const container = document.getElementById('recurring-events-list');
    if (!container) return;

    if (!all.length) {
      container.innerHTML = '<div class="cushion-card"><p class="summary-note">No recurring rules configured. Click "+ Add Rule" above.</p></div>';
      return;
    }

    const weekdaysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    container.innerHTML = all.map(e => `
      <div class="item-card">
        <div class="item-content">
          <div class="item-header-row">
            <span class="item-title">${this.escapeHtml(e.title)}</span>
            <span class="item-badge">${e.recurrenceRule === 'weekly' ? `Weekly on ${weekdaysMap[e.weekday] || 'Day'}` : `Monthly on Day ${e.dayOfMonth}`}</span>
          </div>
          ${e.isTimed ? `<div class="task-notes font-mono">⏰ ${e.startTime} – ${e.endTime}</div>` : ''}
          ${e.notes ? `<p class="item-desc">${this.escapeHtml(e.notes)}</p>` : ''}
        </div>
        <button class="pill-btn danger small delete-event-btn" data-event-id="${e.id}">Delete</button>
      </div>
    `).join('');
  },

  // --- VIEW 9: SETTINGS ---
  renderSettingsView() {
    const tzSelect = document.getElementById('setting-timezone-select');
    if (tzSelect) tzSelect.value = this.timezone;
  },

  // ==========================================
  // 7. EVENT HANDLERS & NAVIGATION
  // ==========================================
  bindEvents() {
    const drawer = document.getElementById('nav-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const openDrawer = () => {
      if (drawer) drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
    };
    const closeDrawer = () => {
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    };

    document.getElementById('drawer-toggle-btn')?.addEventListener('click', openDrawer);
    document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.view;
        closeDrawer();
        this.renderActiveView();
      });
    });

    document.getElementById('brand-logo-btn')?.addEventListener('click', () => {
      this.activeTab = 'home';
      closeDrawer();
      this.renderActiveView();
    });

    document.getElementById('go-to-rhythm-btn')?.addEventListener('click', () => {
      this.activeTab = 'rhythm';
      this.renderActiveView();
    });

    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

    // Time Audit Modal Button
    document.getElementById('open-time-audit-btn')?.addEventListener('click', () => this.openTimeAuditModal());

    // Break Day Toggles
    document.getElementById('toggle-today-break-btn')?.addEventListener('click', () => {
      this.toggleBreakDayForDate(this.currentDateKey);
    });

    document.getElementById('toggle-tomorrow-break-btn')?.addEventListener('click', () => {
      const tomorrowKey = TimeHelper.getTomorrowDateKey(this.currentDateKey);
      this.toggleBreakDayForDate(tomorrowKey);
    });

    document.getElementById('cal-date-break-toggle')?.addEventListener('click', () => {
      this.toggleBreakDayForDate(this.selectedCalDateKey);
    });

    // Calendar Navigation
    document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
      if (this.calMonthIndex === 0) {
        this.calMonthIndex = 11;
        this.calYear--;
      } else {
        this.calMonthIndex--;
      }
      this.renderCalendarView();
    });

    document.getElementById('cal-next-btn')?.addEventListener('click', () => {
      if (this.calMonthIndex === 11) {
        this.calMonthIndex = 0;
        this.calYear++;
      } else {
        this.calMonthIndex++;
      }
      this.renderCalendarView();
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      const nowParts = TimeHelper.getNowParts(this.timezone);
      this.calYear = nowParts.year;
      this.calMonthIndex = nowParts.month - 1;
      this.selectedCalDateKey = this.currentDateKey;
      this.renderCalendarView();
    });

    // Calendar Sub Tabs
    document.querySelectorAll('.seg-tab[data-cal-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.seg-tab[data-cal-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.cal-tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(`cal-tab-${tab.dataset.calTab}`).classList.add('active');
      });
    });

    // Weekday Template Tabs
    document.querySelectorAll('.weekday-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedWeekdayTab = Number(tab.dataset.day);
        this.renderAnchorsView();
      });
    });

    // Capture & Goals Sub-Tabs
    document.querySelectorAll('.seg-tab[data-capture-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeCaptureTab = tab.dataset.captureTab;
        this.renderCaptureView();
      });
    });

    // Floating Action Button (Quick Capture)
    document.getElementById('fab-quick-capture')?.addEventListener('click', () => {
      this.activeTab = 'capture';
      this.activeCaptureTab = 'inbox';
      this.renderActiveView();
      setTimeout(() => document.getElementById('inbox-input-textarea')?.focus(), 100);
    });

    // Inbox Save Button
    document.getElementById('inbox-save-btn')?.addEventListener('click', () => {
      const input = document.getElementById('inbox-input-textarea');
      if (!input || !input.value.trim()) return;
      const list = AppStore.get(STORAGE_KEYS.INBOX, []);
      list.unshift({
        id: `inbox-${Date.now()}`,
        text: input.value.trim(),
        createdAt: new Date().toISOString(),
        done: false,
      });
      AppStore.set(STORAGE_KEYS.INBOX, list);
      input.value = '';
      this.showToast('Captured to inbox');
      this.renderInboxSubTab();
      this.updateBadges();
    });

    document.getElementById('clear-processed-inbox-btn')?.addEventListener('click', () => {
      const list = AppStore.get(STORAGE_KEYS.INBOX, []).filter(i => !i.done);
      AppStore.set(STORAGE_KEYS.INBOX, list);
      this.showToast('Cleared completed items');
      this.renderInboxSubTab();
      this.updateBadges();
    });

    // Scratchpad Add Button
    document.getElementById('scratchpad-add-btn')?.addEventListener('click', () => {
      const input = document.getElementById('scratchpad-input');
      if (!input || !input.value.trim()) return;
      const list = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []);
      list.unshift({
        id: `scratch-${Date.now()}`,
        text: input.value.trim(),
        createdAt: new Date().toISOString(),
        done: false,
      });
      AppStore.set(STORAGE_KEYS.SCRATCHPAD, list);
      input.value = '';
      this.showToast('Added to to-do');
      this.renderScratchpadSubTab();
      this.updateBadges();
    });

    document.getElementById('clear-done-scratchpad-btn')?.addEventListener('click', () => {
      const list = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []).filter(i => !i.done);
      AppStore.set(STORAGE_KEYS.SCRATCHPAD, list);
      this.showToast('Cleared checked items');
      this.renderScratchpadSubTab();
      this.updateBadges();
    });

    // Open Add Goal & Wishlist Modals
    document.getElementById('open-add-goal-btn')?.addEventListener('click', () => {
      document.getElementById('goal-edit-id').value = '';
      document.getElementById('goal-title-input').value = '';
      document.getElementById('goal-target-date-input').value = '';
      document.getElementById('goal-notes-input').value = '';
      document.getElementById('goal-delete-btn').style.display = 'none';
      document.getElementById('goal-modal').classList.add('open');
    });

    document.getElementById('open-add-wishlist-btn')?.addEventListener('click', () => {
      document.getElementById('wishlist-title-input').value = '';
      document.getElementById('wishlist-notes-input').value = '';
      document.getElementById('wishlist-modal').classList.add('open');
    });

    // Delegated Clicks
    document.addEventListener('click', (e) => {
      // Toggle Rhythm Checkbox
      const rhythmCheck = e.target.closest('.toggle-rhythm-check');
      if (rhythmCheck) {
        const id = rhythmCheck.dataset.rhythmId;
        const logs = AppStore.get(STORAGE_KEYS.RHYTHM_LOGS, {});
        if (!logs[this.currentDateKey]) logs[this.currentDateKey] = {};
        logs[this.currentDateKey][id] = !logs[this.currentDateKey][id];
        AppStore.set(STORAGE_KEYS.RHYTHM_LOGS, logs);
        this.renderHomeView();
        if (this.activeTab === 'rhythm') this.renderRhythmView();
        this.updateBadges();
        return;
      }

      // Step Pool Count
      const stepPoolBtn = e.target.closest('.step-pool-btn');
      if (stepPoolBtn) {
        const id = stepPoolBtn.dataset.poolId;
        const delta = Number(stepPoolBtn.dataset.delta);
        const mondayKey = TimeHelper.getMondayOfWeek(this.currentDateKey);
        const logs = AppStore.get(STORAGE_KEYS.POOL_LOGS, {});
        if (!logs[mondayKey]) logs[mondayKey] = {};
        const cur = logs[mondayKey][id] || 0;
        logs[mondayKey][id] = Math.max(0, cur + delta);
        AppStore.set(STORAGE_KEYS.POOL_LOGS, logs);
        this.renderPoolView();
        return;
      }

      // Open Slot Modal Button
      const slotBtn = e.target.closest('.open-slot-modal-btn');
      if (slotBtn) {
        const gapId = slotBtn.dataset.gapId;
        const targetDate = slotBtn.dataset.targetDate || this.currentDateKey;
        const gapLabel = slotBtn.dataset.gapLabel;
        const durationMins = Number(slotBtn.dataset.durationMins);
        const assignedMins = Number(slotBtn.dataset.assignedMins);
        const remainingMins = Number(slotBtn.dataset.remainingMins);
        this.openSlotModal(gapId, targetDate, gapLabel, durationMins, assignedMins, remainingMins);
        return;
      }

      // Toggle Slotted Task Checkbox
      const taskCheck = e.target.closest('.task-checkbox[data-task-id]');
      if (taskCheck) {
        const taskId = taskCheck.dataset.taskId;
        const targetDate = taskCheck.dataset.targetDate || this.currentDateKey;
        const all = AppStore.get(STORAGE_KEYS.SLOTTED_TASKS, {});
        const dateTasks = all[targetDate] || [];
        const t = dateTasks.find(x => x.id === taskId);
        if (t) {
          t.done = !t.done;
          AppStore.set(STORAGE_KEYS.SLOTTED_TASKS, all);
          if (targetDate === this.currentDateKey) this.renderHomeView();
          else this.renderTomorrowView();
        }
        return;
      }

      // Remove Slotted Task
      const removeTaskBtn = e.target.closest('.task-remove-btn[data-task-id]');
      if (removeTaskBtn) {
        const taskId = removeTaskBtn.dataset.taskId;
        const targetDate = removeTaskBtn.dataset.targetDate || this.currentDateKey;
        const all = AppStore.get(STORAGE_KEYS.SLOTTED_TASKS, {});
        all[targetDate] = (all[targetDate] || []).filter(x => x.id !== taskId);
        AppStore.set(STORAGE_KEYS.SLOTTED_TASKS, all);
        if (targetDate === this.currentDateKey) this.renderHomeView();
        else this.renderTomorrowView();
        this.showToast('Task removed from slot');
        return;
      }

      // Toggle Scratchpad Item
      const scratchCheck = e.target.closest('.toggle-scratchpad-check');
      if (scratchCheck) {
        const id = scratchCheck.dataset.scratchId;
        const list = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []);
        const item = list.find(x => x.id === id);
        if (item) {
          item.done = !item.done;
          AppStore.set(STORAGE_KEYS.SCRATCHPAD, list);
          this.renderScratchpadSubTab();
          this.updateBadges();
        }
        return;
      }

      // Delete Scratchpad Item
      const delScratchBtn = e.target.closest('.delete-scratchpad-btn');
      if (delScratchBtn) {
        const id = delScratchBtn.dataset.scratchId;
        const list = AppStore.get(STORAGE_KEYS.SCRATCHPAD, []).filter(x => x.id !== id);
        AppStore.set(STORAGE_KEYS.SCRATCHPAD, list);
        this.renderScratchpadSubTab();
        this.updateBadges();
        return;
      }

      // Delete Goal Item
      const delGoalBtn = e.target.closest('.delete-goal-btn');
      if (delGoalBtn) {
        const id = delGoalBtn.dataset.goalId;
        const list = AppStore.get(STORAGE_KEYS.GOALS, []).filter(x => x.id !== id);
        AppStore.set(STORAGE_KEYS.GOALS, list);
        this.renderGoalsSubTab();
        this.showToast('Goal removed');
        return;
      }

      // Delete Wishlist Item
      const delWishlistBtn = e.target.closest('.delete-wishlist-btn');
      if (delWishlistBtn) {
        const id = delWishlistBtn.dataset.wishlistId;
        const list = AppStore.get(STORAGE_KEYS.WISHLIST, []).filter(x => x.id !== id);
        AppStore.set(STORAGE_KEYS.WISHLIST, list);
        this.renderWishlistSubTab();
        this.showToast('Wishlist item removed');
        return;
      }

      // Toggle Inbox Item
      const inboxCheck = e.target.closest('.toggle-inbox-check');
      if (inboxCheck) {
        const id = inboxCheck.dataset.inboxId;
        const list = AppStore.get(STORAGE_KEYS.INBOX, []);
        const item = list.find(x => x.id === id);
        if (item) {
          item.done = !item.done;
          AppStore.set(STORAGE_KEYS.INBOX, list);
          this.renderInboxSubTab();
          this.updateBadges();
        }
        return;
      }

      // Delete Inbox Item
      const delInboxBtn = e.target.closest('.delete-inbox-btn');
      if (delInboxBtn) {
        const id = delInboxBtn.dataset.inboxId;
        const list = AppStore.get(STORAGE_KEYS.INBOX, []).filter(x => x.id !== id);
        AppStore.set(STORAGE_KEYS.INBOX, list);
        this.renderInboxSubTab();
        this.updateBadges();
        return;
      }

      // Delete Calendar Event
      const delEventBtn = e.target.closest('.delete-event-btn');
      if (delEventBtn) {
        const id = delEventBtn.dataset.eventId;
        const all = AppStore.get(STORAGE_KEYS.CALENDAR_EVENTS, []).filter(x => x.id !== id);
        AppStore.set(STORAGE_KEYS.CALENDAR_EVENTS, all);
        this.renderCalendarView();
        this.renderHomeView();
        this.renderTomorrowView();
        this.renderNotificationsView();
        this.showToast('Event removed');
        return;
      }

      // Edit Anchor Button
      const editAnchorBtn = e.target.closest('.edit-anchor-btn');
      if (editAnchorBtn) {
        const id = editAnchorBtn.dataset.anchorId;
        this.openAnchorModal(id);
        return;
      }

      // Edit Rhythm Button
      const editRhythmBtn = e.target.closest('.edit-rhythm-btn');
      if (editRhythmBtn) {
        const id = editRhythmBtn.dataset.rhythmId;
        this.openRhythmModal(id);
        return;
      }

      // Edit Pool Button
      const editPoolBtn = e.target.closest('.edit-pool-btn');
      if (editPoolBtn) {
        const id = editPoolBtn.dataset.poolId;
        this.openPoolModal(id);
        return;
      }
    });

    document.getElementById('add-anchor-btn')?.addEventListener('click', () => this.openAnchorModal());
    document.getElementById('add-rhythm-item-btn')?.addEventListener('click', () => this.openRhythmModal());
    document.getElementById('add-pool-item-btn')?.addEventListener('click', () => this.openPoolModal());
    document.getElementById('cal-add-event-btn')?.addEventListener('click', () => this.openEventModal(false, this.selectedCalDateKey));
    document.getElementById('add-recurring-event-btn')?.addEventListener('click', () => this.openEventModal(true));

    document.querySelectorAll('.modal-close-btn, [data-modal]').forEach(b => {
      b.addEventListener('click', () => {
        const modalId = b.dataset.modal || b.closest('.modal-backdrop')?.id;
        if (modalId) document.getElementById(modalId)?.classList.remove('open');
      });
    });

    this.bindModalForms();
  },

  toggleBreakDayForDate(dateKey) {
    const breakDays = AppStore.get(STORAGE_KEYS.BREAK_DAYS, []);
    let updated;
    if (breakDays.includes(dateKey)) {
      updated = breakDays.filter(d => d !== dateKey);
      this.showToast(`Break Day cleared for ${dateKey}`);
    } else {
      updated = [...breakDays, dateKey];
      this.showToast(`Marked ${dateKey} as Break Day (Academic anchors cleared)`);
    }
    AppStore.set(STORAGE_KEYS.BREAK_DAYS, updated);
    this.renderHomeView();
    this.renderTomorrowView();
    if (this.activeTab === 'calendar') this.renderCalendarView();
  },

  // ==========================================
  // 8. MODAL FORMS & STRICT CAPACITY VALIDATION
  // ==========================================
  bindModalForms() {
    // 1. Slot Task Modal
    const slotForm = document.getElementById('slot-modal-form');
    const sourceSelect = document.getElementById('slot-source-select');
    const rhythmGroup = document.getElementById('slot-rhythm-group');
    const poolGroup = document.getElementById('slot-pool-group');
    const rhythmSelect = document.getElementById('slot-rhythm-select');
    const poolSelect = document.getElementById('slot-pool-select');
    const taskTitleInput = document.getElementById('slot-task-title');
    const taskNotesInput = document.getElementById('slot-task-notes');
    const durationInput = document.getElementById('slot-task-duration-mins');
    const capacityWarning = document.getElementById('slot-capacity-warning');
    const submitBtn = document.getElementById('slot-submit-btn');

    const validateCapacity = () => {
      const plannedMins = Number(durationInput.value) || 0;
      const remaining = this.currentSlotContext.remainingCapacityMinutes;

      if (plannedMins > remaining) {
        capacityWarning.style.display = 'block';
        capacityWarning.textContent = `⚠️ Planned duration (${this.formatDuration(plannedMins)}) exceeds available window capacity (${this.formatDuration(remaining)})! Please shorten duration.`;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';
      } else {
        capacityWarning.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    };

    durationInput?.addEventListener('input', validateCapacity);

    // Duration Chip Clicks
    document.querySelectorAll('.duration-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.duration-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        durationInput.value = chip.dataset.mins;
        validateCapacity();
      });
    });

    sourceSelect?.addEventListener('change', () => {
      const v = sourceSelect.value;
      if (rhythmGroup) rhythmGroup.style.display = v === 'rhythm' ? 'block' : 'none';
      if (poolGroup) poolGroup.style.display = v === 'pool' ? 'block' : 'none';

      if (v === 'commute') {
        taskTitleInput.value = 'Commute / Transport';
        taskNotesInput.value = 'Transit, travel to/from clinic or campus';
        durationInput.value = Math.min(30, this.currentSlotContext.remainingCapacityMinutes);
      } else if (v === 'nap') {
        taskTitleInput.value = 'Nap / Rest';
        taskNotesInput.value = 'Recharge, midday power nap';
        durationInput.value = Math.min(45, this.currentSlotContext.remainingCapacityMinutes);
      } else if (v === 'personal') {
        taskTitleInput.value = 'Personal Care / Routine';
        taskNotesInput.value = 'Grooming, stretching, meal prep, or chores';
        durationInput.value = Math.min(30, this.currentSlotContext.remainingCapacityMinutes);
      } else if (v === 'meal') {
        taskTitleInput.value = 'Meal / Nutrition';
        taskNotesInput.value = 'Breakfast, lunch, or dinner';
        durationInput.value = Math.min(30, this.currentSlotContext.remainingCapacityMinutes);
      } else if (v === 'downtime') {
        taskTitleInput.value = 'Open Downtime / Rest';
        taskNotesInput.value = 'Calm buffer, leisure';
        durationInput.value = Math.min(30, this.currentSlotContext.remainingCapacityMinutes);
      } else if (v === 'rhythm' && rhythmSelect.value) {
        const rList = AppStore.get(STORAGE_KEYS.RHYTHM, []);
        const r = rList.find(x => x.id === rhythmSelect.value);
        if (r) {
          taskTitleInput.value = r.title;
          taskNotesInput.value = r.description || '';
        }
      } else if (v === 'pool' && poolSelect.value) {
        const pList = AppStore.get(STORAGE_KEYS.POOL, []);
        const p = pList.find(x => x.id === poolSelect.value);
        if (p) {
          taskTitleInput.value = p.title;
          taskNotesInput.value = p.doneCriteria || p.description || '';
        }
      }
      validateCapacity();
    });

    rhythmSelect?.addEventListener('change', () => {
      const rList = AppStore.get(STORAGE_KEYS.RHYTHM, []);
      const r = rList.find(x => x.id === rhythmSelect.value);
      if (r) {
        taskTitleInput.value = r.title;
        taskNotesInput.value = r.description || '';
      }
    });

    poolSelect?.addEventListener('change', () => {
      const pList = AppStore.get(STORAGE_KEYS.POOL, []);
      const p = pList.find(x => x.id === poolSelect.value);
      if (p) {
        taskTitleInput.value = p.title;
        taskNotesInput.value = p.doneCriteria || p.description || '';
      }
    });

    slotForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const gapId = document.getElementById('slot-gap-id').value;
      const targetDate = document.getElementById('slot-target-date').value || this.currentDateKey;
      const title = taskTitleInput.value.trim();
      const durationMins = Number(durationInput.value) || 0;

      if (!title || durationMins <= 0) return;

      // Strict validation safeguard
      if (durationMins > this.currentSlotContext.remainingCapacityMinutes) {
        alert('Planned duration exceeds remaining window space. Please choose a smaller duration.');
        return;
      }

      const all = AppStore.get(STORAGE_KEYS.SLOTTED_TASKS, {});
      if (!all[targetDate]) all[targetDate] = [];

      all[targetDate].push({
        id: `task-${Date.now()}`,
        gapId,
        title,
        notes: taskNotesInput.value.trim(),
        source: sourceSelect.value,
        sourceId: sourceSelect.value === 'rhythm' ? rhythmSelect.value : sourceSelect.value === 'pool' ? poolSelect.value : null,
        durationMinutes: durationMins,
        done: false,
      });

      AppStore.set(STORAGE_KEYS.SLOTTED_TASKS, all);
      document.getElementById('slot-modal').classList.remove('open');

      if (targetDate === this.currentDateKey) this.renderHomeView();
      else this.renderTomorrowView();

      this.showToast(`Slotted ${this.formatDuration(durationMins)} into window`);
    });

    // 2. Anchor Modal
    const anchorForm = document.getElementById('anchor-modal-form');
    anchorForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('anchor-edit-id').value;
      const title = document.getElementById('anchor-title-input').value.trim();
      const category = document.getElementById('anchor-category-select').value;
      const startTime = document.getElementById('anchor-start-time').value;
      const endTime = document.getElementById('anchor-end-time').value;
      const notes = document.getElementById('anchor-notes-input').value.trim();

      const selectedDays = [];
      document.querySelectorAll('#anchor-weekdays-checkboxes input:checked').forEach(cb => {
        selectedDays.push(Number(cb.value));
      });

      if (!title || !startTime || !endTime || !selectedDays.length) {
        alert('Please fill title, start time, end time, and select at least one weekday.');
        return;
      }

      const allAnchors = AppStore.get(STORAGE_KEYS.ANCHORS, {});

      if (editId) {
        for (let d = 0; d <= 6; d++) {
          if (allAnchors[d]) allAnchors[d] = allAnchors[d].filter(a => a.id !== editId);
        }
      }

      const anchorObjId = editId || `anchor-${Date.now()}`;
      selectedDays.forEach(d => {
        if (!allAnchors[d]) allAnchors[d] = [];
        allAnchors[d].push({
          id: anchorObjId,
          title,
          category,
          startTime,
          endTime,
          notes,
          weekdays: selectedDays,
        });
      });

      AppStore.set(STORAGE_KEYS.ANCHORS, allAnchors);
      document.getElementById('anchor-modal').classList.remove('open');
      this.renderAnchorsView();
      this.renderHomeView();
      this.renderTomorrowView();
      this.showToast('Anchor saved successfully');
    });

    document.getElementById('anchor-delete-btn')?.addEventListener('click', () => {
      const editId = document.getElementById('anchor-edit-id').value;
      if (!editId) return;
      if (confirm('Delete this anchor commitment?')) {
        const allAnchors = AppStore.get(STORAGE_KEYS.ANCHORS, {});
        for (let d = 0; d <= 6; d++) {
          if (allAnchors[d]) allAnchors[d] = allAnchors[d].filter(a => a.id !== editId);
        }
        AppStore.set(STORAGE_KEYS.ANCHORS, allAnchors);
        document.getElementById('anchor-modal').classList.remove('open');
        this.renderAnchorsView();
        this.renderHomeView();
        this.renderTomorrowView();
        this.showToast('Anchor deleted');
      }
    });

    // 3. Rhythm Modal
    const rhythmForm = document.getElementById('rhythm-modal-form');
    rhythmForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('rhythm-edit-id').value;
      const title = document.getElementById('rhythm-title-input').value.trim();
      const targetDuration = document.getElementById('rhythm-duration-input').value.trim();
      const description = document.getElementById('rhythm-desc-input').value.trim();

      if (!title) return;

      let list = AppStore.get(STORAGE_KEYS.RHYTHM, []);
      if (editId) {
        list = list.map(r => r.id === editId ? { ...r, title, targetDuration, description } : r);
      } else {
        list.push({ id: `rhythm-${Date.now()}`, title, targetDuration, description });
      }

      AppStore.set(STORAGE_KEYS.RHYTHM, list);
      document.getElementById('rhythm-modal').classList.remove('open');
      this.renderRhythmView();
      this.renderHomeView();
      this.updateBadges();
      this.showToast('Rhythm item saved');
    });

    document.getElementById('rhythm-delete-btn')?.addEventListener('click', () => {
      const editId = document.getElementById('rhythm-edit-id').value;
      if (!editId) return;
      if (confirm('Delete this baseline rhythm item?')) {
        let list = AppStore.get(STORAGE_KEYS.RHYTHM, []).filter(r => r.id !== editId);
        AppStore.set(STORAGE_KEYS.RHYTHM, list);
        document.getElementById('rhythm-modal').classList.remove('open');
        this.renderRhythmView();
        this.renderHomeView();
        this.updateBadges();
        this.showToast('Rhythm item deleted');
      }
    });

    // 4. Pool Modal
    const poolForm = document.getElementById('pool-modal-form');
    poolForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('pool-edit-id').value;
      const title = document.getElementById('pool-title-input').value.trim();
      const targetSessions = Number(document.getElementById('pool-target-sessions').value) || 1;
      const targetLength = document.getElementById('pool-target-length').value.trim();
      const description = document.getElementById('pool-desc-input').value.trim();
      const doneCriteria = document.getElementById('pool-criteria-input').value.trim();

      if (!title) return;

      let list = AppStore.get(STORAGE_KEYS.POOL, []);
      if (editId) {
        list = list.map(p => p.id === editId ? { ...p, title, targetSessions, targetLength, description, doneCriteria } : p);
      } else {
        list.push({ id: `pool-${Date.now()}`, title, targetSessions, targetLength, description, doneCriteria });
      }

      AppStore.set(STORAGE_KEYS.POOL, list);
      document.getElementById('pool-modal').classList.remove('open');
      this.renderPoolView();
      this.updateBadges();
      this.showToast('Weekly goal saved');
    });

    document.getElementById('pool-delete-btn')?.addEventListener('click', () => {
      const editId = document.getElementById('pool-edit-id').value;
      if (!editId) return;
      if (confirm('Delete this weekly goal?')) {
        let list = AppStore.get(STORAGE_KEYS.POOL, []).filter(p => p.id !== editId);
        AppStore.set(STORAGE_KEYS.POOL, list);
        document.getElementById('pool-modal').classList.remove('open');
        this.renderPoolView();
        this.updateBadges();
        this.showToast('Weekly goal deleted');
      }
    });

    // 5. Calendar Event Modal (Timed vs Untimed)
    const eventForm = document.getElementById('event-modal-form');
    const recurTypeSelect = document.getElementById('event-recur-type');
    const recurWeekdaySelect = document.getElementById('event-recur-weekday');
    const recurMonthdayInput = document.getElementById('event-recur-monthday');

    document.getElementById('event-type-once')?.addEventListener('click', () => {
      document.getElementById('event-type-once').classList.add('active');
      document.getElementById('event-type-recurring').classList.remove('active');
      document.getElementById('event-date-row').style.display = 'block';
      document.getElementById('event-recurrence-row').style.display = 'none';
    });

    document.getElementById('event-type-recurring')?.addEventListener('click', () => {
      document.getElementById('event-type-recurring').classList.add('active');
      document.getElementById('event-type-once').classList.remove('active');
      document.getElementById('event-date-row').style.display = 'none';
      document.getElementById('event-recurrence-row').style.display = 'block';
    });

    document.getElementById('event-timing-timed')?.addEventListener('click', () => {
      document.getElementById('event-timing-timed').classList.add('active');
      document.getElementById('event-timing-untimed').classList.remove('active');
      document.getElementById('event-timed-inputs-row').style.display = 'grid';
    });

    document.getElementById('event-timing-untimed')?.addEventListener('click', () => {
      document.getElementById('event-timing-untimed').classList.add('active');
      document.getElementById('event-timing-timed').classList.remove('active');
      document.getElementById('event-timed-inputs-row').style.display = 'none';
    });

    recurTypeSelect?.addEventListener('change', () => {
      const isWeekly = recurTypeSelect.value === 'weekly';
      recurWeekdaySelect.style.display = isWeekly ? 'block' : 'none';
      recurMonthdayInput.style.display = isWeekly ? 'none' : 'block';
    });

    eventForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('event-title-input').value.trim();
      const isRecurring = document.getElementById('event-type-recurring').classList.contains('active');
      const isTimed = document.getElementById('event-timing-timed').classList.contains('active');
      const date = document.getElementById('event-date-input').value;
      const recurrenceRule = recurTypeSelect.value;
      const weekday = Number(recurWeekdaySelect.value);
      const dayOfMonth = Number(recurMonthdayInput.value);
      const startTime = document.getElementById('event-start-time').value;
      const endTime = document.getElementById('event-end-time').value;
      const notes = document.getElementById('event-notes-input').value.trim();

      if (!title) return;
      if (!isRecurring && !date) {
        alert('Please select a date for one-time event.');
        return;
      }

      let all = AppStore.get(STORAGE_KEYS.CALENDAR_EVENTS, []);
      all.push({
        id: `event-${Date.now()}`,
        title,
        isRecurring,
        isTimed,
        date: isRecurring ? null : date,
        recurrenceRule: isRecurring ? recurrenceRule : null,
        weekday: isRecurring && recurrenceRule === 'weekly' ? weekday : null,
        dayOfMonth: isRecurring && recurrenceRule === 'monthly' ? dayOfMonth : null,
        startTime: isTimed ? startTime : null,
        endTime: isTimed ? endTime : null,
        notes,
      });

      AppStore.set(STORAGE_KEYS.CALENDAR_EVENTS, all);
      document.getElementById('event-modal').classList.remove('open');
      this.renderCalendarView();
      this.renderHomeView();
      this.renderTomorrowView();
      this.renderNotificationsView();
      this.updateBadges();
      this.showToast(isTimed ? 'Timed event added & injected to timeline' : 'Event saved to calendar');
    });

    // 6. Goal Modal Form
    const goalForm = document.getElementById('goal-modal-form');
    goalForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('goal-title-input').value.trim();
      const horizon = document.getElementById('goal-horizon-select').value;
      const targetDate = document.getElementById('goal-target-date-input').value.trim();
      const notes = document.getElementById('goal-notes-input').value.trim();

      if (!title) return;
      const list = AppStore.get(STORAGE_KEYS.GOALS, []);
      list.push({
        id: `goal-${Date.now()}`,
        title,
        horizon,
        targetDate,
        notes,
        completed: false
      });

      AppStore.set(STORAGE_KEYS.GOALS, list);
      document.getElementById('goal-modal').classList.remove('open');
      this.renderGoalsSubTab();
      this.showToast('Goal saved');
    });

    // 7. Wishlist Modal Form
    const wishlistForm = document.getElementById('wishlist-modal-form');
    wishlistForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('wishlist-title-input').value.trim();
      const category = document.getElementById('wishlist-category-select').value;
      const notes = document.getElementById('wishlist-notes-input').value.trim();

      if (!title) return;
      const list = AppStore.get(STORAGE_KEYS.WISHLIST, []);
      list.push({
        id: `wish-${Date.now()}`,
        title,
        category,
        notes
      });

      AppStore.set(STORAGE_KEYS.WISHLIST, list);
      document.getElementById('wishlist-modal').classList.remove('open');
      this.renderWishlistSubTab();
      this.showToast('Item saved to wishlist');
    });

    // 8. Settings Actions
    document.getElementById('setting-timezone-select')?.addEventListener('change', (e) => {
      this.timezone = e.target.value;
      AppStore.set(STORAGE_KEYS.TIMEZONE, this.timezone);
      this.showToast(`Timezone updated to ${this.timezone}`);
      this.renderActiveView();
    });

    document.getElementById('export-json-btn')?.addEventListener('click', () => {
      AppStore.exportBackup();
      this.showToast('Exported backup file');
    });

    document.getElementById('import-json-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = AppStore.importBackup(ev.target.result);
        if (ok) {
          this.timezone = AppStore.get(STORAGE_KEYS.TIMEZONE, 'Africa/Lagos');
          this.showToast('Data imported successfully!');
          this.renderActiveView();
        } else {
          alert('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('reset-defaults-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data to initial defaults?')) {
        AppStore.resetToDefaults();
        this.timezone = 'Africa/Lagos';
        this.applyTheme('light');
        this.renderActiveView();
        this.showToast('Reset to default templates');
      }
    });
  },

  openSlotModal(gapId, targetDate, gapLabel, totalDurationMins, alreadyAssignedMins, remainingMins) {
    this.currentSlotContext = {
      gapId,
      targetDate,
      totalCapacityMinutes: totalDurationMins,
      alreadyAssignedMinutes: alreadyAssignedMins,
      remainingCapacityMinutes: remainingMins
    };

    document.getElementById('slot-gap-id').value = gapId;
    document.getElementById('slot-target-date').value = targetDate;
    document.getElementById('slot-modal-window-title').textContent = `Slot into ${gapLabel}`;
    document.getElementById('slot-task-title').value = '';
    document.getElementById('slot-task-notes').value = '';

    // Capacity banner
    document.getElementById('slot-cap-window-total').textContent = this.formatDuration(totalDurationMins);
    document.getElementById('slot-cap-assigned').textContent = this.formatDuration(alreadyAssignedMins);
    document.getElementById('slot-cap-remaining').textContent = this.formatDuration(remainingMins);

    const pct = totalDurationMins > 0 ? Math.min(100, Math.round((alreadyAssignedMins / totalDurationMins) * 100)) : 0;
    const bar = document.getElementById('slot-cap-bar-fill');
    if (bar) bar.style.width = `${pct}%`;

    // Duration default
    const durationInput = document.getElementById('slot-task-duration-mins');
    const defaultMins = Math.min(45, remainingMins > 0 ? remainingMins : 30);
    durationInput.value = defaultMins;

    // Reset chips
    document.querySelectorAll('.duration-chip').forEach(c => {
      c.classList.toggle('active', Number(c.dataset.mins) === defaultMins);
    });

    // Reset source
    const sourceSelect = document.getElementById('slot-source-select');
    sourceSelect.value = 'custom';
    document.getElementById('slot-rhythm-group').style.display = 'none';
    document.getElementById('slot-pool-group').style.display = 'none';

    // Populate rhythm & pool options
    const rhythmSelect = document.getElementById('slot-rhythm-select');
    const rList = AppStore.get(STORAGE_KEYS.RHYTHM, []);
    rhythmSelect.innerHTML = rList.map(r => `<option value="${r.id}">${this.escapeHtml(r.title)} (${r.targetDuration || ''})</option>`).join('');

    const poolSelect = document.getElementById('slot-pool-select');
    const pList = AppStore.get(STORAGE_KEYS.POOL, []);
    poolSelect.innerHTML = pList.map(p => `<option value="${p.id}">${this.escapeHtml(p.title)} (${p.targetLength || ''})</option>`).join('');

    // Hide warning
    document.getElementById('slot-capacity-warning').style.display = 'none';
    const submitBtn = document.getElementById('slot-submit-btn');
    submitBtn.disabled = remainingMins <= 0;
    submitBtn.style.opacity = remainingMins <= 0 ? '0.45' : '1';

    document.getElementById('slot-modal').classList.add('open');
  },

  openAnchorModal(anchorId = null) {
    const isEdit = !!anchorId;
    document.getElementById('anchor-edit-id').value = anchorId || '';
    document.getElementById('anchor-modal-title').textContent = isEdit ? 'Edit Anchor' : 'New Anchor Commitment';
    document.getElementById('anchor-delete-btn').style.display = isEdit ? 'inline-block' : 'none';

    const titleInput = document.getElementById('anchor-title-input');
    const catSelect = document.getElementById('anchor-category-select');
    const startInput = document.getElementById('anchor-start-time');
    const endInput = document.getElementById('anchor-end-time');
    const notesInput = document.getElementById('anchor-notes-input');

    document.querySelectorAll('#anchor-weekdays-checkboxes input').forEach(cb => {
      cb.checked = false;
    });

    if (isEdit) {
      const allAnchors = AppStore.get(STORAGE_KEYS.ANCHORS, {});
      let found = null;
      for (let d = 0; d <= 6; d++) {
        const item = (allAnchors[d] || []).find(a => a.id === anchorId);
        if (item) {
          found = item;
          break;
        }
      }

      if (found) {
        titleInput.value = found.title;
        catSelect.value = found.category || 'Academic';
        startInput.value = found.startTime;
        endInput.value = found.endTime;
        notesInput.value = found.notes || '';

        for (let d = 0; d <= 6; d++) {
          if ((allAnchors[d] || []).some(a => a.id === anchorId)) {
            const cb = document.querySelector(`#anchor-weekdays-checkboxes input[value="${d}"]`);
            if (cb) cb.checked = true;
          }
        }
      }
    } else {
      titleInput.value = '';
      catSelect.value = 'Academic';
      startInput.value = '09:00';
      endInput.value = '12:00';
      notesInput.value = '';

      const cb = document.querySelector(`#anchor-weekdays-checkboxes input[value="${this.selectedWeekdayTab}"]`);
      if (cb) cb.checked = true;
    }

    document.getElementById('anchor-modal').classList.add('open');
  },

  openRhythmModal(rhythmId = null) {
    const isEdit = !!rhythmId;
    document.getElementById('rhythm-edit-id').value = rhythmId || '';
    document.getElementById('rhythm-modal-title').textContent = isEdit ? 'Edit Rhythm Item' : 'New Rhythm Item';
    document.getElementById('rhythm-delete-btn').style.display = isEdit ? 'inline-block' : 'none';

    const titleInput = document.getElementById('rhythm-title-input');
    const durInput = document.getElementById('rhythm-duration-input');
    const descInput = document.getElementById('rhythm-desc-input');

    if (isEdit) {
      const list = AppStore.get(STORAGE_KEYS.RHYTHM, []);
      const r = list.find(x => x.id === rhythmId);
      if (r) {
        titleInput.value = r.title;
        durInput.value = r.targetDuration || '';
        descInput.value = r.description || '';
      }
    } else {
      titleInput.value = '';
      durInput.value = '45m';
      descInput.value = '';
    }

    document.getElementById('rhythm-modal').classList.add('open');
  },

  openPoolModal(poolId = null) {
    const isEdit = !!poolId;
    document.getElementById('pool-edit-id').value = poolId || '';
    document.getElementById('pool-modal-title').textContent = isEdit ? 'Edit Weekly Goal' : 'New Weekly Goal';
    document.getElementById('pool-delete-btn').style.display = isEdit ? 'inline-block' : 'none';

    const titleInput = document.getElementById('pool-title-input');
    const sessionsInput = document.getElementById('pool-target-sessions');
    const lengthInput = document.getElementById('pool-target-length');
    const descInput = document.getElementById('pool-desc-input');
    const critInput = document.getElementById('pool-criteria-input');

    if (isEdit) {
      const list = AppStore.get(STORAGE_KEYS.POOL, []);
      const p = list.find(x => x.id === poolId);
      if (p) {
        titleInput.value = p.title;
        sessionsInput.value = p.targetSessions || 3;
        lengthInput.value = p.targetLength || '1h';
        descInput.value = p.description || '';
        critInput.value = p.doneCriteria || '';
      }
    } else {
      titleInput.value = '';
      sessionsInput.value = 3;
      lengthInput.value = '1h';
      descInput.value = '';
      critInput.value = '';
    }

    document.getElementById('pool-modal').classList.add('open');
  },

  openEventModal(isRecurring = false, dateKey = this.selectedCalDateKey) {
    document.getElementById('event-edit-id').value = '';
    document.getElementById('event-modal-title').textContent = isRecurring ? 'New Recurring Rule' : 'New Calendar Event';
    document.getElementById('event-delete-btn').style.display = 'none';

    document.getElementById('event-title-input').value = '';
    document.getElementById('event-start-time').value = '09:00';
    document.getElementById('event-end-time').value = '10:00';
    document.getElementById('event-notes-input').value = '';

    document.getElementById('event-timing-timed').classList.add('active');
    document.getElementById('event-timing-untimed').classList.remove('active');
    document.getElementById('event-timed-inputs-row').style.display = 'grid';

    if (isRecurring) {
      document.getElementById('event-type-recurring').classList.add('active');
      document.getElementById('event-type-once').classList.remove('active');
      document.getElementById('event-date-row').style.display = 'none';
      document.getElementById('event-recurrence-row').style.display = 'block';
    } else {
      document.getElementById('event-type-once').classList.add('active');
      document.getElementById('event-type-recurring').classList.remove('active');
      document.getElementById('event-date-row').style.display = 'block';
      document.getElementById('event-recurrence-row').style.display = 'none';
      document.getElementById('event-date-input').value = dateKey || this.currentDateKey;
    }

    document.getElementById('event-modal').classList.add('open');
  },

  escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
