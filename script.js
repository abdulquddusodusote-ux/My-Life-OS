/**
 * Meniscus OS — Standalone Single-File Application Core (scripts.js)
 * High-Performance Personal Life Operating System
 * Local-First | Full In-App CRUD | Visual Schedule Ribbon | Interactive Calendar | Side Drawer
 */

const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

// ==========================================
// 1. STRICT LOCAL DATE & TIME UTILITIES
// ==========================================
function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMondayOfWeek(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return localDateKey(date);
}

function formatDisplayDate(dateKey = localDateKey()) {
  const date = parseLocalDateKey(dateKey);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(dateKey) {
  const date = parseLocalDateKey(dateKey);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function timeStringToMinutes(timeStr = '00:00') {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTimeString(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function formatMinutesLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDaysDifference(targetDateStr, baseDateStr = localDateKey()) {
  const target = parseLocalDateKey(targetDateStr);
  const base = parseLocalDateKey(baseDateStr);
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getCountdownLabel(targetDateStr, baseDateStr = localDateKey()) {
  const diff = getDaysDifference(targetDateStr, baseDateStr);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function computeNextRecurringOccurrence(rule, baseDateStr = localDateKey()) {
  const base = parseLocalDateKey(baseDateStr);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  if (rule.rule_type === 'weekly' && typeof rule.weekday === 'number') {
    const targetWeekday = rule.weekday;
    const currentWeekday = base.getDay();
    const daysToAdd = (targetWeekday - currentWeekday + 7) % 7;
    const nextDate = new Date(y, m, d + daysToAdd);
    return localDateKey(nextDate);
  }

  if (rule.rule_type === 'monthly' && typeof rule.day_of_month === 'number') {
    const targetDom = rule.day_of_month;
    let candDate = new Date(y, m, targetDom);
    if (candDate.getDate() !== targetDom) {
      candDate = new Date(y, m + 1, 0);
    }
    if (candDate.getTime() >= base.getTime()) {
      return localDateKey(candDate);
    } else {
      let nextCandDate = new Date(y, m + 1, targetDom);
      if (nextCandDate.getDate() !== targetDom) {
        nextCandDate = new Date(y, m + 2, 0);
      }
      return localDateKey(nextCandDate);
    }
  }

  return baseDateStr;
}

function calculateStreak(activeRhythmItemIds, rhythmLogsByDate, todayKey = localDateKey()) {
  if (activeRhythmItemIds.length === 0) {
    return { currentStreak: 0, isCompleteToday: false };
  }

  const todayLogs = rhythmLogsByDate[todayKey] || {};
  const isToday100 = activeRhythmItemIds.every((id) => todayLogs[id] === true);

  let streak = 0;
  if (isToday100) streak = 1;

  const base = parseLocalDateKey(todayKey);
  let checkOffset = 1;

  while (true) {
    const prevDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() - checkOffset);
    const prevDateKey = localDateKey(prevDate);
    const dayLogs = rhythmLogsByDate[prevDateKey];
    if (!dayLogs) break;

    const isPrev100 = activeRhythmItemIds.every((id) => dayLogs[id] === true);
    if (isPrev100) {
      streak += 1;
      checkOffset += 1;
    } else {
      break;
    }
  }

  return { currentStreak: streak, isCompleteToday: isToday100 };
}

function formatRelativeTime(isoStringOrTimestamp) {
  const time = typeof isoStringOrTimestamp === 'number' ? isoStringOrTimestamp : new Date(isoStringOrTimestamp).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ==========================================
// 2. SEED TEMPLATE DATA
// ==========================================
const SEED_RHYTHM_ITEMS = [
  { id: 'rhythm-1', name: 'High-intensity study block (1)', duration_label: '1h 15m', energy_type: 'deep', sort_order: 0, active: true },
  { id: 'rhythm-2', name: 'High-intensity study block (2)', duration_label: '1h 15m', energy_type: 'deep', sort_order: 1, active: true },
  { id: 'rhythm-3', name: 'Low-intensity review block', duration_label: '1h', energy_type: 'light', sort_order: 2, active: true },
  { id: 'rhythm-4', name: 'Writing notes & synthesis', duration_label: '1h', energy_type: 'deep', sort_order: 3, active: true },
  { id: 'rhythm-5', name: 'Anki flashcard review', duration_label: '30m', energy_type: 'light', sort_order: 4, active: true },
  { id: 'rhythm-6', name: 'Evening review & plan tomorrow', duration_label: '20m', energy_type: 'light', sort_order: 5, active: true },
];

const SEED_POOL_ITEMS = [
  { id: 'pool-1', name: 'Research & Deep Topics', target_per_week: 4, session_label: '30m / session', sort_order: 0, active: true },
  { id: 'pool-2', name: 'AI Literacy & Tech Projects', target_per_week: 3, session_label: '30m / session', sort_order: 1, active: true },
  { id: 'pool-3', name: 'General Knowledge & Reading', target_per_week: 3, session_label: '30m / session', sort_order: 2, active: true },
  { id: 'pool-4', name: 'Typing practice (Keybr / Speed)', target_per_week: 3, session_label: '20m / session', sort_order: 3, active: true },
  { id: 'pool-5', name: 'Medical Question Bank / Past Papers', target_per_week: 2, session_label: '1h 30m / session', sort_order: 4, active: true },
];

const SEED_SALAT_ANCHORS = [
  { id: 'salat-fajr', title: 'Fajr Prayer', category: 'salat', start_time: '05:15', end_time: '05:45', is_daily: true, active: true },
  { id: 'salat-dhuhr', title: 'Dhuhr Prayer', category: 'salat', start_time: '13:00', end_time: '13:30', is_daily: true, active: true },
  { id: 'salat-asr', title: 'Asr Prayer', category: 'salat', start_time: '16:15', end_time: '16:45', is_daily: true, active: true },
  { id: 'salat-maghrib', title: 'Maghrib Prayer', category: 'salat', start_time: '18:45', end_time: '19:15', is_daily: true, active: true },
  { id: 'salat-isha', title: 'Isha Prayer', category: 'salat', start_time: '20:00', end_time: '20:30', is_daily: true, active: true },
];

const SEED_ACADEMIC_ANCHORS = [
  { id: 'acad-mon-1', title: 'Anatomy Lecture & Clinical Correlation', category: 'academic', start_time: '08:00', end_time: '10:00', day_of_week: 1, is_daily: false, active: true },
  { id: 'acad-mon-2', title: 'Histology & Pathology Practical', category: 'academic', start_time: '10:15', end_time: '12:15', day_of_week: 1, is_daily: false, active: true },
  { id: 'acad-mon-3', title: 'PBL Clinical Case Discussion', category: 'academic', start_time: '14:00', end_time: '16:00', day_of_week: 1, is_daily: false, active: true },
  { id: 'acad-tue-1', title: 'Internal Medicine Ward Rounds', category: 'academic', start_time: '08:30', end_time: '11:30', day_of_week: 2, is_daily: false, active: true },
  { id: 'acad-tue-2', title: 'Pharmacology & Therapeutics Seminar', category: 'academic', start_time: '14:00', end_time: '15:30', day_of_week: 2, is_daily: false, active: true },
  { id: 'acad-wed-1', title: 'Clinical Skills Simulation', category: 'academic', start_time: '09:00', end_time: '11:30', day_of_week: 3, is_daily: false, active: true },
  { id: 'acad-thu-1', title: 'Surgery Ward Posting', category: 'academic', start_time: '08:30', end_time: '12:00', day_of_week: 4, is_daily: false, active: true },
  { id: 'acad-fri-1', title: 'Community Medicine & Medical Ethics', category: 'academic', start_time: '09:00', end_time: '11:30', day_of_week: 5, is_daily: false, active: true },
  { id: 'acad-fri-2', title: 'Jumu\'ah Prayer & Khutbah', category: 'salat', start_time: '12:45', end_time: '14:00', day_of_week: 5, is_daily: false, active: true },
];

const SEED_EVENTS = [
  { id: 'event-1', title: 'Pathology Practical Exam', event_date: localDateKey(new Date(Date.now() + 5 * 86400000)), notes: 'Histology spotter slides', created_at: new Date().toISOString() },
  { id: 'event-2', title: 'Clinical Posting Orientation', event_date: localDateKey(new Date(Date.now() + 12 * 86400000)), notes: 'Auditorium Hall B', created_at: new Date().toISOString() },
];

const SEED_RECURRING_EVENTS = [
  { id: 'recur-1', title: 'Weekly House & Study Review', notes: 'Review high-yield clinical pearls', rule_type: 'weekly', weekday: 1 },
  { id: 'recur-2', title: 'Monthly Departmental Grand Rounds', notes: 'Auditorium A', rule_type: 'monthly', day_of_month: 15 },
];

const SEED_INBOX_ITEMS = [
  { id: 'inbox-1', text: 'Review cardiac murmurs audio files and differentials', tag: 'High-Yield', created_at: new Date(Date.now() - 7200000).toISOString(), processed: false },
  { id: 'inbox-2', text: 'Clarify renal tubular acidosis types (Type 1 vs Type 4)', tag: 'Question', created_at: new Date(Date.now() - 18000000).toISOString(), processed: false },
];

// ==========================================
// 3. STORAGE & REPOSITORY (OFFLINE-FIRST)
// ==========================================
const STORAGE_KEYS = {
  RHYTHM_ITEMS: 'meniscus_rhythm_items_v2',
  RHYTHM_LOGS: 'meniscus_rhythm_logs_v2',
  POOL_ITEMS: 'meniscus_pool_items_v2',
  POOL_LOGS: 'meniscus_pool_logs_v2',
  ANCHORS: 'meniscus_anchors_v2',
  DAY_STATES: 'meniscus_day_states_v2',
  EVENTS: 'meniscus_events_v2',
  RECURRING_EVENTS: 'meniscus_recurring_events_v2',
  INBOX_ITEMS: 'meniscus_inbox_items_v2',
  THEME: 'meniscus_theme_v2',
  DAY_START_TIME: 'meniscus_day_start_time',
  DAY_END_TIME: 'meniscus_day_end_time',
  TIMER_PRESETS: 'meniscus_timer_presets',
};

class DataStore {
  static getLocal(key, defaultVal) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  static setLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  }

  static initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.RHYTHM_ITEMS)) this.setLocal(STORAGE_KEYS.RHYTHM_ITEMS, SEED_RHYTHM_ITEMS);
    if (!localStorage.getItem(STORAGE_KEYS.POOL_ITEMS)) this.setLocal(STORAGE_KEYS.POOL_ITEMS, SEED_POOL_ITEMS);
    if (!localStorage.getItem(STORAGE_KEYS.ANCHORS)) this.setLocal(STORAGE_KEYS.ANCHORS, [...SEED_SALAT_ANCHORS, ...SEED_ACADEMIC_ANCHORS]);
    if (!localStorage.getItem(STORAGE_KEYS.DAY_STATES)) this.setLocal(STORAGE_KEYS.DAY_STATES, {});
    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) this.setLocal(STORAGE_KEYS.EVENTS, SEED_EVENTS);
    if (!localStorage.getItem(STORAGE_KEYS.RECURRING_EVENTS)) this.setLocal(STORAGE_KEYS.RECURRING_EVENTS, SEED_RECURRING_EVENTS);
    if (!localStorage.getItem(STORAGE_KEYS.INBOX_ITEMS)) this.setLocal(STORAGE_KEYS.INBOX_ITEMS, SEED_INBOX_ITEMS);
    if (!localStorage.getItem(STORAGE_KEYS.RHYTHM_LOGS)) this.setLocal(STORAGE_KEYS.RHYTHM_LOGS, {});
    if (!localStorage.getItem(STORAGE_KEYS.POOL_LOGS)) this.setLocal(STORAGE_KEYS.POOL_LOGS, {});
  }

  static exportFullBackup() {
    const data = {};
    for (const [k, storageKey] of Object.entries(STORAGE_KEYS)) {
      data[storageKey] = this.getLocal(storageKey, null);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meniscus-os-backup-${localDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      for (const [key, val] of Object.entries(data)) {
        if (val !== null && val !== undefined) {
          localStorage.setItem(key, JSON.stringify(val));
        }
      }
      window.location.reload();
      return true;
    } catch (e) {
      console.error(e);
      alert('Invalid backup JSON file.');
      return false;
    }
  }

  static resetToDefault() {
    if (confirm('Are you sure you want to reset all data to default templates? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }
}

// ==========================================
// 4. REACT CONTEXT & APP CONTROLLER
// ==========================================
const AppContext = createContext();

function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('HOME');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const currentWeekStart = useMemo(() => getMondayOfWeek(), [todayKey]);

  // Real-time minute tick for Live Ribbon Cursor
  const [currentMinutesOfDay, setCurrentMinutesOfDay] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setCurrentMinutesOfDay(n.getHours() * 60 + n.getMinutes());
      const curKey = localDateKey(n);
      if (curKey !== todayKey) setTodayKey(curKey);
    }, 30000);
    return () => clearInterval(interval);
  }, [todayKey]);

  // Theme State
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'light');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches);
      setResolvedTheme(isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
    applyTheme();
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [theme]);

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEYS.THEME, t);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Timeline Config
  const [dayStartTime, setDayStartTime] = useState(() => DataStore.getLocal(STORAGE_KEYS.DAY_START_TIME, '05:00'));
  const [dayEndTime, setDayEndTime] = useState(() => DataStore.getLocal(STORAGE_KEYS.DAY_END_TIME, '23:00'));
  const [timerPresets, setTimerPresets] = useState(() => DataStore.getLocal(STORAGE_KEYS.TIMER_PRESETS, [15, 25, 35, 45, 60, 90]));

  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.DAY_START_TIME, dayStartTime); }, [dayStartTime]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.DAY_END_TIME, dayEndTime); }, [dayEndTime]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.TIMER_PRESETS, timerPresets); }, [timerPresets]);

  // Data Store States
  const [anchors, setAnchors] = useState(() => DataStore.getLocal(STORAGE_KEYS.ANCHORS, [...SEED_SALAT_ANCHORS, ...SEED_ACADEMIC_ANCHORS]));
  const [dayStates, setDayStates] = useState(() => DataStore.getLocal(STORAGE_KEYS.DAY_STATES, {}));
  const [rhythmItems, setRhythmItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.RHYTHM_ITEMS, SEED_RHYTHM_ITEMS));
  const [rhythmLogs, setRhythmLogs] = useState(() => DataStore.getLocal(STORAGE_KEYS.RHYTHM_LOGS, {}));
  const [poolItems, setPoolItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.POOL_ITEMS, SEED_POOL_ITEMS));
  const [poolLogs, setPoolLogs] = useState(() => DataStore.getLocal(STORAGE_KEYS.POOL_LOGS, {}));
  const [events, setEvents] = useState(() => DataStore.getLocal(STORAGE_KEYS.EVENTS, SEED_EVENTS));
  const [recurringEvents, setRecurringEvents] = useState(() => DataStore.getLocal(STORAGE_KEYS.RECURRING_EVENTS, SEED_RECURRING_EVENTS));
  const [inboxItems, setInboxItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.INBOX_ITEMS, SEED_INBOX_ITEMS));

  // Sync to local storage
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.ANCHORS, anchors); }, [anchors]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.DAY_STATES, dayStates); }, [dayStates]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RHYTHM_ITEMS, rhythmItems); }, [rhythmItems]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RHYTHM_LOGS, rhythmLogs); }, [rhythmLogs]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.POOL_ITEMS, poolItems); }, [poolItems]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.POOL_LOGS, poolLogs); }, [poolLogs]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.EVENTS, events); }, [events]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RECURRING_EVENTS, recurringEvents); }, [recurringEvents]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.INBOX_ITEMS, inboxItems); }, [inboxItems]);

  // Day States (Break Mode / Survival Mode)
  const todayDayState = dayStates[todayKey] || { date_key: todayKey, is_break_day: false, is_survival_mode: false, completed_salats: {} };
  const isBreakDay = !!todayDayState.is_break_day;
  const isSurvivalMode = !!todayDayState.is_survival_mode;
  const completedSalats = todayDayState.completed_salats || {};

  const toggleBreakDay = () => {
    setDayStates(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || { date_key: todayKey, completed_salats: {} }),
        is_break_day: !isBreakDay,
      }
    }));
  };

  const toggleSurvivalMode = () => {
    setDayStates(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || { date_key: todayKey, completed_salats: {} }),
        is_survival_mode: !isSurvivalMode,
      }
    }));
  };

  const toggleSalatCompleted = (salatId) => {
    const current = !!completedSalats[salatId];
    setDayStates(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || { date_key: todayKey }),
        completed_salats: {
          ...(prev[todayKey]?.completed_salats || {}),
          [salatId]: !current,
        }
      }
    }));
  };

  // Dynamic Anchors for Today
  const todayWeekday = parseLocalDateKey(todayKey).getDay();
  const todayAnchors = useMemo(() => {
    return anchors
      .filter(a => {
        if (!a.active) return false;
        if (a.is_daily || a.category === 'salat') return true;
        if (isBreakDay && a.category === 'academic') return false;
        if (a.specific_date === todayKey) return true;
        if (a.day_of_week !== undefined && a.day_of_week === todayWeekday) return true;
        return false;
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [anchors, isBreakDay, todayKey, todayWeekday]);

  // Calculated Free Study Gaps
  const { todayGaps, totalFreeHours } = useMemo(() => {
    const DAY_START = timeStringToMinutes(dayStartTime);
    const DAY_END = timeStringToMinutes(dayEndTime);
    const gaps = [];
    let prevEnd = DAY_START;

    for (const anchor of todayAnchors) {
      const aStart = timeStringToMinutes(anchor.start_time);
      const aEnd = timeStringToMinutes(anchor.end_time);

      if (aStart > prevEnd) {
        const gapMin = aStart - prevEnd;
        if (gapMin >= 15) {
          gaps.push({
            start: minutesToTimeString(prevEnd),
            end: minutesToTimeString(aStart),
            durationMinutes: gapMin,
            durationLabel: formatMinutesLabel(gapMin),
            context: `Before ${anchor.title}`,
            startMinutes: prevEnd,
            endMinutes: aStart,
          });
        }
      }
      prevEnd = Math.max(prevEnd, aEnd);
    }

    if (DAY_END > prevEnd) {
      const gapMin = DAY_END - prevEnd;
      if (gapMin >= 15) {
        gaps.push({
          start: minutesToTimeString(prevEnd),
          end: minutesToTimeString(DAY_END),
          durationMinutes: gapMin,
          durationLabel: formatMinutesLabel(gapMin),
          context: 'Night review & wind-down',
          startMinutes: prevEnd,
          endMinutes: DAY_END,
        });
      }
    }

    const totalFreeMin = gaps.reduce((acc, g) => acc + g.durationMinutes, 0);
    return { todayGaps: gaps, totalFreeHours: Number((totalFreeMin / 60).toFixed(1)) };
  }, [todayAnchors, dayStartTime, dayEndTime]);

  // Rhythm State
  const activeRhythmItems = useMemo(() => {
    return rhythmItems.filter(i => i.active).sort((a, b) => a.sort_order - b.sort_order);
  }, [rhythmItems]);

  const todayRhythmLogs = rhythmLogs[todayKey] || {};
  const streak = useMemo(() => calculateStreak(activeRhythmItems.map(i => i.id), rhythmLogs, todayKey), [activeRhythmItems, rhythmLogs, todayKey]);

  const toggleRhythmLog = (itemId) => {
    const current = !!todayRhythmLogs[itemId];
    setRhythmLogs(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || {}),
        [itemId]: !current,
      }
    }));
  };

  // Pool State
  const activePoolItems = useMemo(() => {
    return poolItems.filter(i => i.active).sort((a, b) => a.sort_order - b.sort_order);
  }, [poolItems]);

  const currentWeekPoolLogs = poolLogs[currentWeekStart] || {};
  const poolWeekSummary = useMemo(() => {
    let totalCount = 0;
    let totalTarget = 0;
    for (const item of activePoolItems) {
      totalCount += currentWeekPoolLogs[item.id] || 0;
      totalTarget += item.target_per_week;
    }
    return {
      totalCount,
      totalTarget,
      percentage: totalTarget > 0 ? Math.round((totalCount / totalTarget) * 100) : 0,
    };
  }, [activePoolItems, currentWeekPoolLogs]);

  const stepPoolCount = (itemId, delta) => {
    const current = currentWeekPoolLogs[itemId] || 0;
    const nextVal = Math.max(0, current + delta);
    setPoolLogs(prev => ({
      ...prev,
      [currentWeekStart]: {
        ...(prev[currentWeekStart] || {}),
        [itemId]: nextVal,
      }
    }));
  };

  // Inbox & Quick Capture
  const unprocessedInboxCount = useMemo(() => inboxItems.filter(i => !i.processed).length, [inboxItems]);
  const addInboxItem = (text, tag = 'Quick Note') => {
    if (!text.trim()) return;
    const newItem = {
      id: `inbox-${Date.now()}`,
      text: text.trim(),
      tag,
      created_at: new Date().toISOString(),
      processed: false,
    };
    setInboxItems(prev => [newItem, ...prev]);
  };

  const toggleProcessInboxItem = (id) => {
    setInboxItems(prev => prev.map(i => i.id === id ? { ...i, processed: !i.processed } : i));
  };

  const deleteInboxItem = (id) => {
    setInboxItems(prev => prev.filter(i => i.id !== id));
  };

  // Focus Timer Modal State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerLink, setTimerLink] = useState({ type: null, itemId: null, title: 'Focus Block', durationMinutes: 25 });
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  // Universal Modals State
  const [anchorModalState, setAnchorModalState] = useState({ isOpen: false, item: null, category: 'academic' });
  const [rhythmModalState, setRhythmModalState] = useState({ isOpen: false, item: null });
  const [poolModalState, setPoolModalState] = useState({ isOpen: false, item: null });
  const [eventModalState, setEventModalState] = useState({ isOpen: false, item: null, targetDate: todayKey });
  const [gapAssignModalState, setGapAssignModalState] = useState({ isOpen: false, gap: null });

  const openTimer = (type = null, itemId = null, title = 'Focus Session', durationMinutes = 25) => {
    setTimerLink({ type, itemId, title, durationMinutes });
    setIsTimerOpen(true);
  };

  const handleTimerNaturalComplete = (type, itemId) => {
    if (type === 'rhythm' && itemId) toggleRhythmLog(itemId);
    else if (type === 'pool' && itemId) stepPoolCount(itemId, 1);
  };

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      isDrawerOpen, setIsDrawerOpen,
      todayKey, currentWeekStart, currentMinutesOfDay,
      theme, resolvedTheme, setTheme, toggleTheme,
      dayStartTime, setDayStartTime, dayEndTime, setDayEndTime, timerPresets, setTimerPresets,
      anchors, setAnchors, todayAnchors,
      isBreakDay, toggleBreakDay, isSurvivalMode, toggleSurvivalMode,
      completedSalats, toggleSalatCompleted,
      todayGaps, totalFreeHours,
      rhythmItems, setRhythmItems, activeRhythmItems, todayRhythmLogs, streak, toggleRhythmLog,
      poolItems, setPoolItems, activePoolItems, currentWeekPoolLogs, poolWeekSummary, stepPoolCount,
      inboxItems, setInboxItems, unprocessedInboxCount, addInboxItem, toggleProcessInboxItem, deleteInboxItem,
      events, setEvents, recurringEvents, setRecurringEvents,
      isTimerOpen, setIsTimerOpen, timerLink, openTimer, handleTimerNaturalComplete,
      isCaptureOpen, setIsCaptureOpen,
      anchorModalState, setAnchorModalState,
      rhythmModalState, setRhythmModalState,
      poolModalState, setPoolModalState,
      eventModalState, setEventModalState,
      gapAssignModalState, setGapAssignModalState,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const useApp = () => useContext(AppContext);

// ==========================================
// 5. SIGNATURE 24-HOUR SCHEDULE RIBBON
// ==========================================
function TimelineRibbon() {
  const { todayAnchors, todayGaps, currentMinutesOfDay, dayStartTime, dayEndTime, setAnchorModalState, setGapAssignModalState } = useApp();

  const startMin = timeStringToMinutes(dayStartTime);
  const endMin = timeStringToMinutes(dayEndTime);
  const totalMin = Math.max(60, endMin - startMin);

  // Position calculation
  const getPercent = (minutes) => {
    const clamped = Math.min(endMin, Math.max(startMin, minutes));
    return ((clamped - startMin) / totalMin) * 100;
  };

  const cursorPercent = getPercent(currentMinutesOfDay);
  const isCursorVisible = currentMinutesOfDay >= startMin && currentMinutesOfDay <= endMin;

  return (
    <div className="cushion-card p-4 bg-surface border border-line">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-ink">24h Schedule Ribbon</span>
          <span className="text-[10px] font-mono text-ink-faint">
            {dayStartTime} → {dayEndTime}
          </span>
        </div>
        <span className="text-[10px] font-mono bg-surface-sunken px-2 py-0.5 rounded-full text-ink-soft">
          Now: {minutesToTimeString(currentMinutesOfDay)}
        </span>
      </div>

      <div className="relative w-full h-11 bg-surface-sunken rounded-xl overflow-hidden border border-line flex items-center">
        {/* Render Anchor Blocks */}
        {todayAnchors.map((anchor) => {
          const aStart = timeStringToMinutes(anchor.start_time);
          const aEnd = timeStringToMinutes(anchor.end_time);
          const left = getPercent(aStart);
          const width = Math.max(1.5, getPercent(aEnd) - left);
          const isSalat = anchor.category === 'salat';

          return (
            <div
              key={anchor.id}
              onClick={() => setAnchorModalState({ isOpen: true, item: anchor, category: anchor.category })}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${anchor.title} (${anchor.start_time} - ${anchor.end_time})`}
              className={`absolute top-1 bottom-1 rounded-lg px-1 flex items-center justify-center cursor-pointer transition-transform hover:scale-y-105 z-10 text-white font-mono text-[9px] font-semibold truncate shadow-xs ${
                isSalat ? 'bg-synovial' : 'bg-cushion'
              }`}
            >
              <span className="truncate">{anchor.title}</span>
            </div>
          );
        })}

        {/* Render Open Gap Slots */}
        {todayGaps.map((gap, idx) => {
          const left = getPercent(gap.startMinutes);
          const width = Math.max(1.5, getPercent(gap.endMinutes) - left);
          return (
            <div
              key={idx}
              onClick={() => setGapAssignModalState({ isOpen: true, gap })}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`Free Gap: ${gap.durationLabel} (${gap.start} - ${gap.end})`}
              className="absolute top-1.5 bottom-1.5 rounded-md border border-dashed border-cushion/40 bg-cushion-soft/40 hover:bg-cushion-soft cursor-pointer flex items-center justify-center text-[8px] font-mono text-cushion font-bold"
            >
              <span className="truncate px-0.5">{gap.durationLabel}</span>
            </div>
          );
        })}

        {/* Live Cursor Line */}
        {isCursorVisible && (
          <div
            style={{ left: `${cursorPercent}%` }}
            className="timeline-cursor"
            title="Current Time"
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. CONCENTRIC ARCS LOAD RING
// ==========================================
function LoadRing({ items, completedLogs }) {
  const active = useMemo(() => items.filter(i => i.active), [items]);
  const total = active.length;
  const completed = useMemo(() => active.filter(i => completedLogs[i.id]).length, [active, completedLogs]);
  const is100 = total > 0 && completed === total;

  const rings = useMemo(() => {
    if (total === 0) return [];
    const configs = [
      { radius: 74, strokeWidth: 7 },
      { radius: 58, strokeWidth: 7.5 },
      { radius: 42, strokeWidth: 8 },
    ];
    const numRings = Math.min(3, Math.max(1, total));
    const itemsPerRing = Math.ceil(total / numRings);

    return configs.slice(0, numRings).map((cfg, idx) => {
      const ringItems = active.slice(idx * itemsPerRing, (idx + 1) * itemsPerRing);
      const ringDone = ringItems.filter(i => completedLogs[i.id]).length;
      const frac = ringItems.length > 0 ? ringDone / ringItems.length : 0;
      const circ = 2 * Math.PI * cfg.radius;
      const arcLen = circ * 0.88;
      const offset = arcLen * (1 - frac);
      return { ...cfg, frac, circ, arcLen, offset };
    });
  }, [active, completedLogs, total]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center transition-transform duration-500 ease-out ${is100 ? 'scale-[1.03]' : 'scale-100'}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full transform rotate-[20deg]">
          {rings.map((ring, idx) => (
            <g key={idx}>
              <circle
                cx="100" cy="100" r={ring.radius}
                fill="none" stroke="var(--line)"
                strokeWidth={ring.strokeWidth} strokeLinecap="round"
                strokeDasharray={`${ring.arcLen} ${ring.circ}`}
                strokeDashoffset="0" className="opacity-40"
              />
              <circle
                cx="100" cy="100" r={ring.radius}
                fill="none" stroke={is100 ? 'var(--synovial)' : 'var(--cushion)'}
                strokeWidth={ring.strokeWidth + (ring.frac > 0 ? 1 : 0)}
                strokeLinecap="round"
                strokeDasharray={`${ring.arcLen} ${ring.circ}`}
                strokeDashoffset={ring.offset}
                className="load-ring-arc"
              />
            </g>
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${is100 ? 'bg-synovial-soft text-synovial scale-110 shadow-sm' : 'bg-surface-sunken text-ink-soft'}`}>
            {is100 ? (
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7 transform -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9 7.5 7.5 0 0 0 9 9z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center">
        <span className="font-mono text-sm font-bold tracking-wider text-ink">
          {completed} / {total} Completed
        </span>
        <span className="text-xs text-ink-faint mt-0.5">
          {is100 ? 'Daily load fully absorbed' : `${Math.round((completed / (total || 1)) * 100)}% of daily rhythm completed`}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 7. VIEWS & DASHBOARD SCREENS
// ==========================================

// --- VIEW A: HOME DASHBOARD (THREE-PHASE AWARE) ---
function HomeView() {
  const {
    todayKey, streak, rhythmItems, activeRhythmItems, todayRhythmLogs, toggleRhythmLog,
    activePoolItems, currentWeekPoolLogs, stepPoolCount, poolWeekSummary,
    unprocessedInboxCount, addInboxItem, events, setActiveTab, openTimer,
    todayAnchors, isBreakDay, isSurvivalMode, completedSalats, toggleSalatCompleted, totalFreeHours,
    todayGaps, setAnchorModalState, setRhythmModalState, setPoolModalState, setEventModalState,
    setGapAssignModalState, inboxItems, toggleProcessInboxItem, deleteInboxItem
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const salats = todayAnchors.filter(a => a.category === 'salat' || a.is_daily);
  const nearestEvents = events.slice(0, 3);

  // Time-Phase Calculation (05:00-11:00 Morning, 11:00-19:00 Execution, 19:00+ Evening)
  const currentHour = new Date().getHours();
  const phase = currentHour < 11 ? 'morning' : currentHour < 19 ? 'execution' : 'evening';

  const handleCapture = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    addInboxItem(inputVal.trim());
    setInputVal('');
  };

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      {/* Header & Day Phase Bar */}
      <header className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
              {formatDisplayDate(todayKey)}
            </h1>
            {isBreakDay && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent-amber-soft text-accent-amber font-semibold">
                ☕ Break Mode
              </span>
            )}
            {isSurvivalMode && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-load-high-soft text-load-high font-semibold">
                🛡️ Survival Mode
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint mt-0.5">
            {phase === 'morning' ? '🌅 Morning Kickoff — Review anchors & gaps' : phase === 'execution' ? '⚡ Active Execution — Lock into study windows' : '🌙 Evening Wind-Down — Review and consolidate'}
          </p>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${streak.currentStreak > 0 ? 'bg-cushion-soft text-cushion border-cushion/20' : 'bg-surface-sunken text-ink-faint border-line'}`}>
          <span className="text-sm">🔥</span>
          <span className="font-mono text-xs font-bold">{streak.currentStreak}d</span>
          <span className="text-[11px] opacity-80 hidden sm:inline">streak</span>
        </div>
      </header>

      {/* 24-Hour Visual Schedule Ribbon */}
      <TimelineRibbon />

      {/* 5 Daily Prayers (Non-Negotiable) Strip */}
      <section className="cushion-card p-4 bg-surface border border-line">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <span>🌙 5 Daily Prayers (Non-Negotiable)</span>
          </div>
          <button
            onClick={() => setActiveTab('ANCHORS')}
            className="text-[11px] text-cushion hover:underline font-semibold"
          >
            Manage Anchors →
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {salats.map(salat => {
            const isDone = !!completedSalats[salat.id];
            const name = salat.title.replace(' Prayer', '');
            return (
              <div key={salat.id} className="flex flex-col items-center">
                <button
                  onClick={() => toggleSalatCompleted(salat.id)}
                  className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isDone
                      ? 'bg-synovial text-white font-bold shadow-xs'
                      : 'bg-surface-sunken text-ink-soft hover:bg-cushion-soft hover:text-cushion'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 ${isDone ? 'bg-white text-synovial' : 'border border-line bg-surface'}`}>
                    {isDone && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span className="text-[11px] truncate font-medium">{name}</span>
                  <span className={`text-[9px] font-mono ${isDone ? 'text-white/80' : 'text-ink-faint'}`}>{salat.start_time}</span>
                </button>
                <button
                  onClick={() => setAnchorModalState({ isOpen: true, item: salat, category: 'salat' })}
                  className="text-[9px] font-mono text-ink-faint hover:text-cushion mt-1"
                >
                  edit
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Signature Load Ring */}
      <section className="cushion-card p-6 bg-surface border border-line flex flex-col items-center justify-center">
        <LoadRing items={rhythmItems} completedLogs={todayRhythmLogs} />
      </section>

      {/* Next Available Free Gap Recommendation */}
      {todayGaps.length > 0 && (
        <section className="cushion-card p-4 bg-gradient-to-r from-cushion-soft/60 to-surface border border-cushion/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cushion text-white flex items-center justify-center font-bold text-base shadow-xs">
                ✨
              </div>
              <div>
                <span className="text-xs font-bold text-ink block">Next Free Study Window</span>
                <span className="text-[11px] font-mono text-cushion font-semibold">
                  {todayGaps[0].start} – {todayGaps[0].end} ({todayGaps[0].durationLabel})
                </span>
              </div>
            </div>
            <button
              onClick={() => setGapAssignModalState({ isOpen: true, gap: todayGaps[0] })}
              className="px-3.5 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold shadow-xs hover:bg-cushion/90 transition-all"
            >
              Assign Task
            </button>
          </div>
        </section>
      )}

      {/* Daily Rhythm Checklist */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg text-ink">Daily Rhythm</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-ink-soft">
              {activeRhythmItems.filter(i => todayRhythmLogs[i.id]).length} / {activeRhythmItems.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRhythmModalState({ isOpen: true, item: null })} className="text-xs text-cushion font-semibold hover:underline">
              + Add Habit
            </button>
            <button onClick={() => setActiveTab('RHYTHM')} className="text-xs text-ink-soft hover:text-cushion font-medium">
              Manage →
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {activeRhythmItems.map(item => {
            const isDone = !!todayRhythmLogs[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${
                  isDone
                    ? 'bg-synovial-soft/40 border-synovial/30'
                    : 'bg-surface-sunken hover:bg-surface-sunken/80 border-transparent'
                }`}
              >
                <button onClick={() => toggleRhythmLog(item.id)} className="flex items-center gap-3.5 flex-1 text-left">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    isDone ? 'bg-synovial text-white shadow-xs' : 'border-2 border-line bg-surface'
                  }`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isDone ? 'line-through opacity-70 text-ink' : 'text-ink'}`}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.duration_label && <span className="text-[11px] font-mono text-ink-faint">{item.duration_label}</span>}
                      {item.energy_type === 'deep' && (
                        <span className="text-[10px] font-mono px-1.5 rounded bg-cushion-soft text-cushion font-semibold">Deep</span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRhythmModalState({ isOpen: true, item })}
                    className="p-1.5 text-xs text-ink-faint hover:text-ink"
                    title="Edit item"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => openTimer('rhythm', item.id, item.name, 45)}
                    className="p-1.5 text-cushion hover:bg-cushion-soft rounded-lg text-sm font-bold"
                    title="Start focus timer"
                  >
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Pool Summary */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg text-ink">Weekly Pool</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-ink-soft">
              {poolWeekSummary.totalCount} / {poolWeekSummary.totalTarget}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPoolModalState({ isOpen: true, item: null })} className="text-xs text-cushion font-semibold hover:underline">
              + Add Goal
            </button>
            <button onClick={() => setActiveTab('POOL')} className="text-xs text-ink-soft hover:text-cushion font-medium">
              Details →
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {activePoolItems.map(item => {
            const count = currentWeekPoolLogs[item.id] || 0;
            const target = item.target_per_week;
            const isOver = count > target;
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-sunken border border-line/60">
                <div className="flex flex-col flex-1 mr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink truncate">{item.name}</span>
                    <button onClick={() => setPoolModalState({ isOpen: true, item })} className="text-[11px] text-ink-faint hover:text-ink">
                      edit
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.max(target, count) }).map((_, dIdx) => {
                        const isFilled = dIdx < count;
                        const isBeyond = dIdx >= target;
                        let dot = 'bg-line';
                        if (isFilled) dot = isBeyond ? 'bg-load-high' : 'bg-cushion';
                        return <span key={dIdx} className={`w-2 h-2 rounded-full ${dot}`} />;
                      })}
                    </div>
                    <span className="font-mono text-[11px] text-ink-faint">{count}/{target}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => stepPoolCount(item.id, -1)} disabled={count <= 0} className="w-7 h-7 rounded-lg bg-surface text-ink border border-line flex items-center justify-center disabled:opacity-30">
                    −
                  </button>
                  <button onClick={() => stepPoolCount(item.id, 1)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${isOver ? 'bg-load-high' : 'bg-cushion'}`}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Capture & Triage Inbox */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display font-semibold text-base text-ink">⚡ Quick Capture & Triage</h2>
          {unprocessedInboxCount > 0 && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-cushion-soft text-cushion font-semibold">
              {unprocessedInboxCount} unprocessed
            </span>
          )}
        </div>
        <form onSubmit={handleCapture} className="flex gap-2 mb-3">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Jot down a thought, study pearl, or reminder..."
            className="flex-1 bg-surface-sunken text-ink text-sm rounded-xl px-3.5 py-2.5 border border-line focus:outline-none focus:border-cushion"
          />
          <button type="submit" disabled={!inputVal.trim()} className="px-4 py-2.5 rounded-xl bg-cushion text-white text-xs font-semibold disabled:opacity-40 shadow-xs">
            Add
          </button>
        </form>

        {/* Top 3 Unprocessed Inbox Notes with Triage Actions */}
        <div className="space-y-2">
          {inboxItems.filter(i => !i.processed).slice(0, 3).map(item => (
            <div key={item.id} className="p-3 rounded-xl bg-surface-sunken border border-line flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-ink font-medium leading-relaxed">{item.text}</span>
                <button onClick={() => deleteInboxItem(item.id)} className="text-ink-faint hover:text-load-high text-xs ml-2">✕</button>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-line/60">
                <span className="text-[10px] text-ink-faint mr-auto font-mono">{formatRelativeTime(item.created_at)}</span>
                <button
                  onClick={() => {
                    setAnchorModalState({ isOpen: true, item: null, initialTitle: item.text });
                    toggleProcessInboxItem(item.id);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-soft hover:text-cushion"
                >
                  → Anchor
                </button>
                <button
                  onClick={() => {
                    setPoolModalState({ isOpen: true, item: null, initialTitle: item.text });
                    toggleProcessInboxItem(item.id);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-soft hover:text-cushion"
                >
                  → Pool
                </button>
                <button
                  onClick={() => {
                    setEventModalState({ isOpen: true, item: null, initialTitle: item.text, targetDate: todayKey });
                    toggleProcessInboxItem(item.id);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-soft hover:text-cushion"
                >
                  → Event
                </button>
                <button
                  onClick={() => toggleProcessInboxItem(item.id)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-synovial-soft text-synovial font-bold"
                >
                  ✓ Done
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nearest Countdowns */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-base text-ink">📅 Upcoming Deadlines</h2>
          <button onClick={() => setActiveTab('CALENDAR')} className="text-xs text-ink-soft hover:text-cushion font-medium">
            Calendar Grid →
          </button>
        </div>
        <div className="space-y-2">
          {nearestEvents.map(evt => {
            const cd = getCountdownLabel(evt.event_date, todayKey);
            return (
              <div key={evt.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-sunken border border-line/60">
                <div className="flex flex-col flex-1 mr-2">
                  <span className="text-sm font-semibold text-ink truncate">{evt.title}</span>
                  <span className="text-[11px] font-mono text-ink-faint">{formatShortDate(evt.event_date)}</span>
                </div>
                <span className={`font-mono text-xs px-2.5 py-1 rounded-full font-bold ${
                  cd === 'today' ? 'bg-synovial-soft text-synovial' : cd === 'tomorrow' ? 'bg-cushion-soft text-cushion' : 'bg-surface text-ink-soft border border-line'
                }`}>
                  {cd}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// --- VIEW B: ANCHORS & GAPS MANAGER ---
function AnchorsView() {
  const {
    todayKey, anchors, setAnchors, todayAnchors, isBreakDay, toggleBreakDay,
    completedSalats, toggleSalatCompleted, todayGaps, totalFreeHours, openTimer,
    setAnchorModalState
  } = useApp();

  const [selectedDay, setSelectedDay] = useState(1); // 1 = Monday

  const WEEKDAYS = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 0, name: 'Sunday', short: 'Sun' },
  ];

  const salats = anchors.filter(a => a.category === 'salat' && a.is_daily);
  const templateList = anchors.filter(a => !a.is_daily && a.day_of_week === selectedDay);

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Daily Anchors & Gaps</h1>
          <p className="text-xs text-ink-faint mt-0.5">{formatDisplayDate(todayKey)}</p>
        </div>
        <button
          onClick={toggleBreakDay}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all ${
            isBreakDay ? 'bg-cushion text-white' : 'bg-surface-sunken border border-line text-ink'
          }`}
        >
          {isBreakDay ? '☕ Break Day Active' : 'Set as Break Day'}
        </button>
      </header>

      {/* 5 Daily Prayers (Non-Negotiable) */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink">🌙 Daily Salat Anchors</h2>
            <span className="text-xs text-ink-faint">Fixed across 7 days. Tap to edit prayer times.</span>
          </div>
          <button
            onClick={() => setAnchorModalState({ isOpen: true, item: null, category: 'salat' })}
            className="px-3 py-1 bg-synovial-soft text-synovial text-xs font-bold rounded-xl hover:bg-synovial hover:text-white transition-all"
          >
            + Add Prayer
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {salats.map(salat => {
            const isDone = !!completedSalats[salat.id];
            return (
              <div
                key={salat.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isDone ? 'bg-synovial-soft/50 border-synovial/40' : 'bg-surface-sunken border-line/60'
                }`}
              >
                <button onClick={() => toggleSalatCompleted(salat.id)} className="flex items-center gap-3 text-left flex-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-synovial text-white' : 'border-2 border-line bg-surface'}`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${isDone ? 'line-through opacity-75' : 'text-ink'}`}>{salat.title}</span>
                    <span className="text-xs font-mono text-ink-faint">{salat.start_time} – {salat.end_time}</span>
                  </div>
                </button>
                <button
                  onClick={() => setAnchorModalState({ isOpen: true, item: salat, category: 'salat' })}
                  className="text-xs font-mono px-2 py-1 rounded bg-surface border border-line text-ink-soft hover:text-cushion"
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Calculated Study Gaps */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink">✨ Open Study Gaps (Today)</h2>
            <span className="text-xs text-ink-faint">Derived automatically between anchors.</span>
          </div>
          <span className="font-mono text-xs font-bold text-cushion bg-cushion-soft px-2.5 py-1 rounded-full">
            {totalFreeHours}h free total
          </span>
        </div>

        <div className="space-y-2.5">
          {todayGaps.map((gap, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken border border-line/60">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">{gap.start} – {gap.end}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-cushion-soft text-cushion font-semibold">
                    {gap.durationLabel}
                  </span>
                </div>
                <span className="text-[11px] text-ink-faint mt-0.5">{gap.context}</span>
              </div>
              <button
                onClick={() => openTimer(null, null, `Study Gap (${gap.durationLabel})`, gap.durationMinutes)}
                className="px-3 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold shadow-xs"
              >
                ▶ Start Block
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly Class / Postings Timetable */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink">📚 Weekly Academic Timetable</h2>
            <span className="text-xs text-ink-faint">Select a day to edit classes and clinical postings.</span>
          </div>
          <button
            onClick={() => setAnchorModalState({ isOpen: true, item: null, category: 'academic', day_of_week: selectedDay })}
            className="px-3 py-1 bg-cushion text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            + Add Class
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
          {WEEKDAYS.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedDay === d.id ? 'bg-cushion text-white font-bold shadow-xs' : 'bg-surface-sunken text-ink-soft hover:bg-line/60'
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {templateList.length === 0 ? (
            <p className="text-xs text-ink-faint italic py-4 text-center">No academic blocks scheduled for this day.</p>
          ) : (
            templateList.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-sunken border border-line/60">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{item.title}</span>
                  <span className="font-mono text-xs text-ink-faint">{item.start_time} – {item.end_time}</span>
                </div>
                <button
                  onClick={() => setAnchorModalState({ isOpen: true, item, category: 'academic' })}
                  className="text-xs font-mono px-2 py-1 rounded bg-surface border border-line text-ink-soft hover:text-cushion"
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// --- VIEW C: DAILY RHYTHM MANAGER ---
function RhythmView() {
  const { todayKey, streak, activeRhythmItems, todayRhythmLogs, toggleRhythmLog, setRhythmModalState, openTimer } = useApp();

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Daily Rhythm</h1>
          <p className="text-xs text-ink-faint mt-0.5">{formatDisplayDate(todayKey)}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cushion-soft text-cushion font-mono text-xs font-bold">
          🔥 {streak.currentStreak}d streak
        </div>
      </header>

      <section className="cushion-card p-5 bg-surface border border-line">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-ink">Rhythm Blocks</h2>
          <button
            onClick={() => setRhythmModalState({ isOpen: true, item: null })}
            className="px-3 py-1 bg-cushion text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            + Add Rhythm Block
          </button>
        </div>

        <div className="space-y-2.5">
          {activeRhythmItems.map(item => {
            const isDone = !!todayRhythmLogs[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                  isDone ? 'bg-synovial-soft/40 border-synovial/30' : 'bg-surface-sunken border-transparent'
                }`}
              >
                <button onClick={() => toggleRhythmLog(item.id)} className="flex items-center gap-3.5 flex-1 text-left">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isDone ? 'bg-synovial text-white' : 'border-2 border-line bg-surface'
                  }`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isDone ? 'line-through opacity-70' : 'text-ink'}`}>{item.name}</span>
                    <span className="text-[11px] font-mono text-ink-faint">{item.duration_label}</span>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setRhythmModalState({ isOpen: true, item })} className="p-1.5 text-xs text-ink-faint hover:text-ink">
                    ✎
                  </button>
                  <button onClick={() => openTimer('rhythm', item.id, item.name, 45)} className="p-1.5 text-cushion font-bold">
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// --- VIEW D: WEEKLY POOL MANAGER ---
function PoolView() {
  const { activePoolItems, currentWeekPoolLogs, stepPoolCount, poolWeekSummary, setPoolModalState, openTimer } = useApp();

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Weekly Pool</h1>
          <p className="text-xs text-ink-faint mt-0.5">Flexible weekly target quotas (Resets every Monday)</p>
        </div>
        <button
          onClick={() => setPoolModalState({ isOpen: true, item: null })}
          className="px-3.5 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold shadow-xs"
        >
          + Add Weekly Target
        </button>
      </header>

      <div className="space-y-3">
        {activePoolItems.map(item => {
          const count = currentWeekPoolLogs[item.id] || 0;
          const target = item.target_per_week;
          const isOver = count > target;
          return (
            <div key={item.id} className="cushion-card p-5 bg-surface border border-line">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base text-ink">{item.name}</h3>
                  <span className="text-xs font-mono text-ink-faint">{item.session_label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPoolModalState({ isOpen: true, item })} className="text-xs text-ink-faint hover:text-ink p-1">
                    Edit
                  </button>
                  <button onClick={() => openTimer('pool', item.id, item.name, 30)} className="p-1 text-cushion font-bold">
                    ▶
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-line/60">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 mr-2">
                  {Array.from({ length: Math.max(target, count) }).map((_, dotIdx) => {
                    const isFilled = dotIdx < count;
                    const isBeyond = dotIdx >= target;
                    let dot = 'bg-surface-sunken border border-line';
                    if (isFilled) dot = isBeyond ? 'bg-load-high' : 'bg-cushion';
                    return <div key={dotIdx} className={`w-3.5 h-3.5 rounded-full ${dot}`} />;
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-ink">{count}/{target}</span>
                  <button onClick={() => stepPoolCount(item.id, -1)} disabled={count <= 0} className="w-8 h-8 rounded-xl bg-surface-sunken border border-line text-ink flex items-center justify-center disabled:opacity-30">
                    −
                  </button>
                  <button onClick={() => stepPoolCount(item.id, 1)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${isOver ? 'bg-load-high' : 'bg-cushion'}`}>
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- VIEW E: INTERACTIVE CALENDAR & COUNTDOWNS ---
function CalendarView() {
  const { todayKey, events, recurringEvents, setEventModalState } = useApp();
  const [subTab, setSubTab] = useState('CALENDAR');
  const [monthOffset, setMonthOffset] = useState(0);

  const baseDate = parseLocalDateKey(todayKey);
  const viewDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const currentY = viewDate.getFullYear();
  const currentM = viewDate.getMonth();

  const monthGridDays = useMemo(() => {
    const firstDay = new Date(currentY, currentM, 1).getDay();
    const totalDays = new Date(currentY, currentM + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = localDateKey(new Date(currentY, currentM, d));
      const dayEvents = events.filter(e => e.event_date === key);
      days.push({ dayNumber: d, dateKey: key, events: dayEvents, isToday: key === todayKey });
    }
    return days;
  }, [currentY, currentM, todayKey, events]);

  const handleDayClick = (dateKey) => {
    setEventModalState({ isOpen: true, item: null, targetDate: dateKey });
  };

  return (
    <div className="flex flex-col gap-5 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <h1 className="font-display font-bold text-2xl text-ink">Calendar & Deadlines</h1>
        <div className="flex bg-surface-sunken p-1 rounded-full border border-line">
          <button onClick={() => setSubTab('CALENDAR')} className={`px-3 py-1 rounded-full text-xs font-semibold ${subTab === 'CALENDAR' ? 'bg-surface text-cushion shadow-xs' : 'text-ink-soft'}`}>
            Month
          </button>
          <button onClick={() => setSubTab('EVENTS')} className={`px-3 py-1 rounded-full text-xs font-semibold ${subTab === 'EVENTS' ? 'bg-surface text-cushion shadow-xs' : 'text-ink-soft'}`}>
            Countdowns
          </button>
        </div>
      </header>

      {subTab === 'CALENDAR' ? (
        <section className="cushion-card p-5 bg-surface border border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-ink">
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => setMonthOffset(0)} className="px-2.5 py-1 rounded-lg bg-surface-sunken text-xs font-mono text-ink">Today</button>
              <button onClick={() => setMonthOffset(m => m - 1)} className="p-1.5 rounded-lg bg-surface-sunken text-ink">‹</button>
              <button onClick={() => setMonthOffset(m => m + 1)} className="p-1.5 rounded-lg bg-surface-sunken text-ink">›</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-ink-faint mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <div key={i}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthGridDays.map((d, idx) => {
              if (!d) return <div key={idx} className="aspect-square" />;
              const hasEvents = d.events.length > 0;
              return (
                <button
                  key={d.dateKey}
                  onClick={() => handleDayClick(d.dateKey)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative font-mono text-xs transition-all hover:scale-105 ${
                    d.isToday
                      ? 'bg-cushion-soft text-cushion font-bold border-2 border-cushion'
                      : 'bg-surface-sunken text-ink hover:bg-cushion-soft/40'
                  }`}
                >
                  <span>{d.dayNumber}</span>
                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-load-high absolute bottom-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* One-Time Deadlines */}
          <section className="cushion-card p-5 bg-surface border border-line">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base text-ink">🎯 One-Time Deadlines</h2>
              <button onClick={() => setEventModalState({ isOpen: true, item: null, targetDate: todayKey, is_recurring: false })} className="text-xs font-semibold text-cushion">
                + Add Target Date
              </button>
            </div>
            <div className="space-y-2">
              {events.map(evt => {
                const cd = getCountdownLabel(evt.event_date, todayKey);
                return (
                  <div key={evt.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken border border-line/60">
                    <div>
                      <span className="text-sm font-semibold text-ink">{evt.title}</span>
                      <span className="block font-mono text-[11px] text-ink-faint">{formatDisplayDate(evt.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-full font-bold bg-cushion-soft text-cushion">
                        {cd}
                      </span>
                      <button onClick={() => setEventModalState({ isOpen: true, item: evt, targetDate: evt.event_date })} className="text-xs text-ink-faint hover:text-ink">
                        edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recurring Milestones */}
          <section className="cushion-card p-5 bg-surface border border-line">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base text-ink">🔁 Recurring Milestones</h2>
              <button onClick={() => setEventModalState({ isOpen: true, item: null, targetDate: todayKey, is_recurring: true })} className="text-xs font-semibold text-cushion">
                + Add Cadence
              </button>
            </div>
            <div className="space-y-2">
              {recurringEvents.map(evt => {
                const nextDate = computeNextRecurringOccurrence(evt, todayKey);
                const cd = getCountdownLabel(nextDate, todayKey);
                return (
                  <div key={evt.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken border border-line/60">
                    <div>
                      <span className="text-sm font-semibold text-ink">{evt.title}</span>
                      <span className="block font-mono text-[11px] text-ink-faint">Repeats {evt.rule_type} • Next: {formatShortDate(nextDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-full font-bold bg-synovial-soft text-synovial">
                        {cd}
                      </span>
                      <button onClick={() => setEventModalState({ isOpen: true, item: evt, is_recurring: true })} className="text-xs text-ink-faint hover:text-ink">
                        edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// --- VIEW F: SETTINGS & BACKUP DASHBOARD ---
function SettingsView() {
  const {
    theme, setTheme, dayStartTime, setDayStartTime, dayEndTime, setDayEndTime,
    isSurvivalMode, toggleSurvivalMode, isBreakDay, toggleBreakDay
  } = useApp();

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        DataStore.importBackup(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="px-1">
        <h1 className="font-display font-bold text-2xl text-ink">Settings & Storage</h1>
        <p className="text-xs text-ink-faint mt-0.5">Control timeline bounds, themes, and offline data backups</p>
      </header>

      {/* Appearance */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <h2 className="font-display font-semibold text-base mb-3 text-ink">Appearance Theme</h2>
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-3 rounded-2xl border flex flex-col items-center capitalize text-xs transition-all ${
                theme === t ? 'bg-cushion-soft text-cushion border-cushion font-bold' : 'bg-surface-sunken border-line text-ink-soft'
              }`}
            >
              <span className="text-base mb-1">{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}</span>
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Day Timeline Range */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <h2 className="font-display font-semibold text-base mb-3 text-ink">Day Ribbon Boundaries</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-ink-faint block mb-1">Start of Waking Day</label>
            <input
              type="time"
              value={dayStartTime}
              onChange={e => setDayStartTime(e.target.value)}
              className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line font-mono text-ink"
            />
          </div>
          <div>
            <label className="text-[11px] text-ink-faint block mb-1">End of Waking Day</label>
            <input
              type="time"
              value={dayEndTime}
              onChange={e => setDayEndTime(e.target.value)}
              className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line font-mono text-ink"
            />
          </div>
        </div>
      </section>

      {/* Operating Modes */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <h2 className="font-display font-semibold text-base mb-3 text-ink">Operating Overrides</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-line">
            <div>
              <span className="text-sm font-semibold text-ink block">Break Day Mode</span>
              <span className="text-[11px] text-ink-faint">Waives academic lectures, keeps prayers & wide study gaps.</span>
            </div>
            <button onClick={toggleBreakDay} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isBreakDay ? 'bg-cushion text-white' : 'bg-surface border border-line text-ink'}`}>
              {isBreakDay ? 'Active' : 'Enable'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-line">
            <div>
              <span className="text-sm font-semibold text-ink block">Survival Mode</span>
              <span className="text-[11px] text-ink-faint">Reduces dashboard to 5 prayers & minimal baseline tasks.</span>
            </div>
            <button onClick={toggleSurvivalMode} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isSurvivalMode ? 'bg-load-high text-white' : 'bg-surface border border-line text-ink'}`}>
              {isSurvivalMode ? 'Active' : 'Enable'}
            </button>
          </div>
        </div>
      </section>

      {/* Local-First Data Ownership */}
      <section className="cushion-card p-5 bg-surface border border-line">
        <h2 className="font-display font-semibold text-base mb-3 text-ink">Backup & Restore</h2>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => DataStore.exportFullBackup()}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-sunken border border-line text-ink text-xs font-semibold hover:bg-cushion hover:text-white transition-colors"
          >
            📥 Download Complete JSON Backup
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-sunken border border-line text-ink text-xs font-semibold hover:bg-cushion hover:text-white transition-colors"
          >
            📤 Restore from JSON Backup
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => DataStore.resetToDefault()}
            className="w-full py-2 text-load-high text-xs font-medium hover:underline mt-2"
          >
            Reset All Data to Templates
          </button>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 8. UNIVERSAL CRUD MODALS
// ==========================================

function AnchorModal() {
  const { anchorModalState, setAnchorModalState, anchors, setAnchors } = useApp();
  const { isOpen, item, category, initialTitle, day_of_week } = anchorModalState;

  const [formData, setFormData] = useState({
    title: '',
    category: 'academic',
    start_time: '08:00',
    end_time: '10:00',
    is_daily: false,
    day_of_week: 1,
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData(item);
      } else {
        setFormData({
          title: initialTitle || '',
          category: category || 'academic',
          start_time: category === 'salat' ? '12:00' : '08:00',
          end_time: category === 'salat' ? '12:30' : '10:00',
          is_daily: category === 'salat',
          day_of_week: day_of_week !== undefined ? day_of_week : 1,
        });
      }
    }
  }, [isOpen, item, category, initialTitle, day_of_week]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (item) {
      setAnchors(prev => prev.map(a => a.id === item.id ? { ...formData, id: a.id } : a));
    } else {
      setAnchors(prev => [...prev, { ...formData, id: `anchor-${Date.now()}`, active: true }]);
    }
    setAnchorModalState({ isOpen: false, item: null });
  };

  const handleDelete = () => {
    if (item) setAnchors(prev => prev.filter(a => a.id !== item.id));
    setAnchorModalState({ isOpen: false, item: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-line shadow-2xl">
        <h3 className="font-display font-semibold text-base mb-3 text-ink">
          {item ? 'Edit Anchor' : 'New Anchor Block'}
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="Anchor Title (e.g. Fajr, Pathology Lab)"
            className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line text-ink"
            required
          />
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <label className="text-[10px] text-ink-faint">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-ink-faint">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-line">
            {item && (
              <button type="button" onClick={handleDelete} className="text-xs text-load-high font-semibold">
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setAnchorModalState({ isOpen: false, item: null })} className="px-3 py-1.5 text-xs text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">
                Save Anchor
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function RhythmModal() {
  const { rhythmModalState, setRhythmModalState, rhythmItems, setRhythmItems } = useApp();
  const { isOpen, item } = rhythmModalState;

  const [formData, setFormData] = useState({
    name: '',
    duration_label: '1h',
    energy_type: 'deep',
  });

  useEffect(() => {
    if (isOpen) {
      if (item) setFormData(item);
      else setFormData({ name: '', duration_label: '45m', energy_type: 'deep' });
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (item) {
      setRhythmItems(prev => prev.map(r => r.id === item.id ? { ...formData, id: r.id } : r));
    } else {
      setRhythmItems(prev => [...prev, { ...formData, id: `rhythm-${Date.now()}`, sort_order: prev.length, active: true }]);
    }
    setRhythmModalState({ isOpen: false, item: null });
  };

  const handleDelete = () => {
    if (item) setRhythmItems(prev => prev.filter(r => r.id !== item.id));
    setRhythmModalState({ isOpen: false, item: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-line shadow-2xl">
        <h3 className="font-display font-semibold text-base mb-3 text-ink">
          {item ? 'Edit Rhythm Item' : 'New Rhythm Habit'}
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Habit Title (e.g. Anki Flashcards)"
            className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line text-ink"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-ink-faint">Duration Label</label>
              <input
                type="text"
                value={formData.duration_label}
                onChange={e => setFormData({ ...formData, duration_label: e.target.value })}
                placeholder="45m"
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line font-mono text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-ink-faint">Focus Type</label>
              <select
                value={formData.energy_type}
                onChange={e => setFormData({ ...formData, energy_type: e.target.value })}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              >
                <option value="deep">Deep Work</option>
                <option value="light">Light Review</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-line">
            {item && (
              <button type="button" onClick={handleDelete} className="text-xs text-load-high font-semibold">
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setRhythmModalState({ isOpen: false, item: null })} className="px-3 py-1.5 text-xs text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PoolModal() {
  const { poolModalState, setPoolModalState, poolItems, setPoolItems } = useApp();
  const { isOpen, item, initialTitle } = poolModalState;

  const [formData, setFormData] = useState({
    name: '',
    target_per_week: 3,
    session_label: '30m / session',
  });

  useEffect(() => {
    if (isOpen) {
      if (item) setFormData(item);
      else setFormData({ name: initialTitle || '', target_per_week: 3, session_label: '30m / session' });
    }
  }, [isOpen, item, initialTitle]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (item) {
      setPoolItems(prev => prev.map(p => p.id === item.id ? { ...formData, id: p.id } : p));
    } else {
      setPoolItems(prev => [...prev, { ...formData, id: `pool-${Date.now()}`, sort_order: prev.length, active: true }]);
    }
    setPoolModalState({ isOpen: false, item: null });
  };

  const handleDelete = () => {
    if (item) setPoolItems(prev => prev.filter(p => p.id !== item.id));
    setPoolModalState({ isOpen: false, item: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-line shadow-2xl">
        <h3 className="font-display font-semibold text-base mb-3 text-ink">
          {item ? 'Edit Weekly Item' : 'New Weekly Target'}
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Target Name (e.g. AI Research)"
            className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line text-ink"
            required
          />
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <label className="text-[10px] text-ink-faint">Sessions / Week</label>
              <input
                type="number"
                min="1"
                max="14"
                value={formData.target_per_week}
                onChange={e => setFormData({ ...formData, target_per_week: Number(e.target.value) })}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-ink-faint">Duration Label</label>
              <input
                type="text"
                value={formData.session_label}
                onChange={e => setFormData({ ...formData, session_label: e.target.value })}
                placeholder="30m / session"
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-line">
            {item && (
              <button type="button" onClick={handleDelete} className="text-xs text-load-high font-semibold">
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setPoolModalState({ isOpen: false, item: null })} className="px-3 py-1.5 text-xs text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventModal() {
  const { eventModalState, setEventModalState, events, setEvents, recurringEvents, setRecurringEvents, todayKey } = useApp();
  const { isOpen, item, targetDate, initialTitle, is_recurring: initRecur } = eventModalState;

  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    event_date: todayKey,
    is_recurring: false,
    rule_type: 'weekly',
    weekday: 1,
    day_of_month: 15,
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setFormData({
          title: item.title,
          notes: item.notes || '',
          event_date: item.event_date || targetDate || todayKey,
          is_recurring: !!item.rule_type,
          rule_type: item.rule_type || 'weekly',
          weekday: item.weekday !== undefined ? item.weekday : 1,
          day_of_month: item.day_of_month || 15,
        });
      } else {
        setFormData({
          title: initialTitle || '',
          notes: '',
          event_date: targetDate || todayKey,
          is_recurring: !!initRecur,
          rule_type: 'weekly',
          weekday: parseLocalDateKey(targetDate || todayKey).getDay(),
          day_of_month: 15,
        });
      }
    }
  }, [isOpen, item, targetDate, initialTitle, initRecur, todayKey]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (formData.is_recurring) {
      if (item && item.rule_type) {
        setRecurringEvents(prev => prev.map(r => r.id === item.id ? { ...r, ...formData } : r));
      } else {
        setRecurringEvents(prev => [...prev, {
          id: `recur-${Date.now()}`,
          title: formData.title.trim(),
          notes: formData.notes,
          rule_type: formData.rule_type,
          weekday: Number(formData.weekday),
          day_of_month: Number(formData.day_of_month),
        }]);
      }
    } else {
      if (item && !item.rule_type) {
        setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, ...formData } : ev));
      } else {
        setEvents(prev => [...prev, {
          id: `event-${Date.now()}`,
          title: formData.title.trim(),
          notes: formData.notes,
          event_date: formData.event_date,
          created_at: new Date().toISOString(),
        }]);
      }
    }
    setEventModalState({ isOpen: false, item: null });
  };

  const handleDelete = () => {
    if (item) {
      if (item.rule_type) setRecurringEvents(prev => prev.filter(r => r.id !== item.id));
      else setEvents(prev => prev.filter(e => e.id !== item.id));
    }
    setEventModalState({ isOpen: false, item: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-line shadow-2xl">
        <h3 className="font-display font-semibold text-base mb-3 text-ink">
          {item ? 'Edit Event' : 'Schedule Event / Deadline'}
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="Event Title (e.g. Pathology Spotter Exam)"
            className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line text-ink"
            required
          />
          {!formData.is_recurring ? (
            <input
              type="date"
              value={formData.event_date}
              onChange={e => setFormData({ ...formData, event_date: e.target.value })}
              className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line font-mono text-ink"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <select
                value={formData.rule_type}
                onChange={e => setFormData({ ...formData, rule_type: e.target.value })}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {formData.rule_type === 'weekly' ? (
                <select
                  value={formData.weekday}
                  onChange={e => setFormData({ ...formData, weekday: Number(e.target.value) })}
                  className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line text-ink"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              ) : (
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={e => setFormData({ ...formData, day_of_month: Number(e.target.value) })}
                  className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line font-mono text-ink"
                />
              )}
            </div>
          )}
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional location or notes..."
            className="w-full bg-surface-sunken p-2.5 rounded-xl text-sm border border-line resize-none text-ink"
            rows={2}
          />
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_recur_chk"
              checked={formData.is_recurring}
              onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_recur_chk" className="text-xs text-ink-soft">Recurring cadence</label>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-line">
            {item && (
              <button type="button" onClick={handleDelete} className="text-xs text-load-high font-semibold">
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setEventModalState({ isOpen: false, item: null })} className="px-3 py-1.5 text-xs text-ink-soft">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function GapAssignModal() {
  const { gapAssignModalState, setGapAssignModalState, activeRhythmItems, activePoolItems, openTimer } = useApp();
  const { isOpen, gap } = gapAssignModalState;

  if (!isOpen || !gap) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 border border-line shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-base text-ink">
            Assign Free Gap ({gap.durationLabel})
          </h3>
          <button onClick={() => setGapAssignModalState({ isOpen: false, gap: null })} className="text-ink-faint">✕</button>
        </div>
        <p className="text-xs text-ink-faint mb-3">{gap.start} – {gap.end} • {gap.context}</p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <button
            onClick={() => {
              openTimer(null, null, `Free Study (${gap.durationLabel})`, gap.durationMinutes);
              setGapAssignModalState({ isOpen: false, gap: null });
            }}
            className="w-full p-2.5 rounded-xl bg-cushion-soft text-cushion font-semibold text-xs text-left"
          >
            ⏱️ Start Unlinked Timer ({gap.durationMinutes}m)
          </button>

          <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider block pt-2">Rhythm Items</span>
          {activeRhythmItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                openTimer('rhythm', item.id, item.name, gap.durationMinutes);
                setGapAssignModalState({ isOpen: false, gap: null });
              }}
              className="w-full p-2.5 rounded-xl bg-surface-sunken text-ink text-xs text-left flex items-center justify-between hover:bg-line/60"
            >
              <span>{item.name}</span>
              <span className="text-[10px] font-mono text-ink-faint">{item.duration_label}</span>
            </button>
          ))}

          <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider block pt-2">Weekly Pool Items</span>
          {activePoolItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                openTimer('pool', item.id, item.name, gap.durationMinutes);
                setGapAssignModalState({ isOpen: false, gap: null });
              }}
              className="w-full p-2.5 rounded-xl bg-surface-sunken text-ink text-xs text-left flex items-center justify-between hover:bg-line/60"
            >
              <span>{item.name}</span>
              <span className="text-[10px] font-mono text-ink-faint">{item.session_label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. FOCUS TIMER & FLOATING QUICK CAPTURE
// ==========================================
function FocusTimerModal() {
  const { isTimerOpen, setIsTimerOpen, timerLink, timerPresets, handleTimerNaturalComplete } = useApp();
  const [preset, setPreset] = useState(timerLink.durationMinutes || 25);
  const [seconds, setSeconds] = useState((timerLink.durationMinutes || 25) * 60);
  const [isActive, setIsActive] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const totalSecRef = useRef((timerLink.durationMinutes || 25) * 60);

  useEffect(() => {
    if (isTimerOpen) {
      const p = timerLink.durationMinutes || 25;
      setPreset(p);
      setSeconds(p * 60);
      totalSecRef.current = p * 60;
      setIsActive(false);
      setIsDone(false);
    }
  }, [isTimerOpen, timerLink]);

  useEffect(() => {
    let int = null;
    if (isActive && seconds > 0) {
      int = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(int);
            setIsActive(false);
            setIsDone(true);
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.connect(ctx.destination);
              osc.frequency.setValueAtTime(587.33, ctx.currentTime);
              osc.start(); osc.stop(ctx.currentTime + 0.6);
              if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            } catch {}
            handleTimerNaturalComplete(timerLink.type, timerLink.itemId);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(int);
  }, [isActive, seconds, timerLink, handleTimerNaturalComplete]);

  if (!isTimerOpen) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-6 border border-line shadow-2xl flex flex-col items-center relative">
        <button onClick={() => setIsTimerOpen(false)} className="absolute top-4 right-4 text-ink-faint">✕</button>
        <h3 className="font-display font-semibold text-lg text-ink truncate max-w-[80%]">{timerLink.title}</h3>

        <div className="w-40 h-40 rounded-full border-4 border-cushion flex flex-col items-center justify-center my-4">
          <span className="font-mono text-3xl font-bold text-ink">{timeStr}</span>
          <span className="text-[11px] font-mono text-ink-faint mt-1">{isActive ? 'In session' : isDone ? 'Completed!' : 'Ready'}</span>
        </div>

        {!isActive && !isDone && (
          <div className="flex gap-1.5 my-2 flex-wrap justify-center">
            {timerPresets.map(m => (
              <button
                key={m}
                onClick={() => {
                  setPreset(m);
                  setSeconds(m * 60);
                  totalSecRef.current = m * 60;
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                  preset === m ? 'bg-cushion text-white font-bold' : 'bg-surface-sunken text-ink-soft'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setIsActive(!isActive)}
            className="px-6 py-2.5 rounded-full bg-cushion text-white text-sm font-semibold shadow-xs"
          >
            {isActive ? 'Pause' : 'Start Focus'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FloatingCapture() {
  const { isCaptureOpen, setIsCaptureOpen, addInboxItem } = useApp();
  const [txt, setTxt] = useState('');

  return (
    <>
      <button
        onClick={() => setIsCaptureOpen(true)}
        className="fixed right-5 bottom-6 z-30 w-12 h-12 rounded-full bg-cushion text-white shadow-floating flex items-center justify-center text-2xl font-light hover:scale-105 transition-all"
        title="Quick capture (+)"
      >
        +
      </button>

      {isCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface rounded-2xl p-5 border border-line shadow-2xl relative">
            <button onClick={() => setIsCaptureOpen(false)} className="absolute top-4 right-4 text-ink-faint">✕</button>
            <h3 className="font-display font-semibold text-base mb-3 text-ink">⚡ Quick Capture</h3>
            <textarea
              rows={3} autoFocus value={txt} onChange={e => setTxt(e.target.value)}
              placeholder="Jot thought, study pearl, or question..." className="w-full bg-surface-sunken p-3 rounded-xl text-sm border border-line resize-none text-ink"
            />
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (txt.trim()) {
                    addInboxItem(txt.trim());
                    setTxt('');
                    setIsCaptureOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-full bg-cushion text-white text-xs font-semibold"
              >
                Capture Note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 10. NAVIGATION DRAWER & SHELL
// ==========================================
function SideDrawer() {
  const { isDrawerOpen, setIsDrawerOpen, activeTab, setActiveTab, unprocessedInboxCount, streak } = useApp();

  const tabs = [
    { id: 'HOME', label: 'Dashboard', icon: '🏠', desc: 'Overview, ribbon, and daily rhythm' },
    { id: 'ANCHORS', label: 'Anchors & Gaps', icon: '🧭', desc: 'Prayer times, classes, and study gaps' },
    { id: 'RHYTHM', label: 'Daily Rhythm', icon: '⚡', desc: 'Core daily routines and habits' },
    { id: 'POOL', label: 'Weekly Pool', icon: '🎯', desc: 'Flexible weekly study quotas' },
    { id: 'CALENDAR', label: 'Calendar & Countdowns', icon: '📅', desc: 'Interactive grid and target dates' },
    { id: 'SETTINGS', label: 'Settings & Backup', icon: '⚙️', desc: 'Preferences and JSON data tools' },
  ];

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Slide Drawer Panel */}
      <div className="relative w-72 max-w-[85vw] bg-surface h-full shadow-2xl border-r border-line p-5 flex flex-col justify-between z-10 animate-fade-in">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cushion-soft text-cushion flex items-center justify-center font-bold text-sm">
                ☾
              </div>
              <span className="font-display font-bold text-base text-ink">Meniscus OS</span>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className="text-ink-faint hover:text-ink p-1">
              ✕
            </button>
          </div>

          {/* Nav List */}
          <div className="space-y-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                    isActive ? 'bg-cushion-soft text-cushion font-bold' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tab.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-sm">{tab.label}</span>
                      <span className="text-[10px] text-ink-faint leading-tight">{tab.desc}</span>
                    </div>
                  </div>
                  {tab.id === 'HOME' && unprocessedInboxCount > 0 && (
                    <span className="bg-cushion text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                      {unprocessedInboxCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Streak Summary Footer */}
        <div className="pt-4 border-t border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <span className="text-xs font-bold text-ink block">{streak.currentStreak} Day Streak</span>
              <span className="text-[10px] text-ink-faint">Consistency score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { setIsDrawerOpen, openTimer, toggleTheme, resolvedTheme } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 p-2 rounded-xl text-ink hover:bg-surface-sunken transition-colors"
          aria-label="Open Menu Drawer"
        >
          <span className="text-xl">☰</span>
          <span className="font-display font-bold text-base">Meniscus OS</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openTimer()}
            className="p-2 rounded-xl text-ink-soft hover:bg-surface-sunken"
            title="Focus Timer"
          >
            ⏱️
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-ink-soft hover:bg-surface-sunken"
            title="Toggle Light/Dark Theme"
          >
            {resolvedTheme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <Header />
      <SideDrawer />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-4">
        {activeTab === 'HOME' && <HomeView />}
        {activeTab === 'ANCHORS' && <AnchorsView />}
        {activeTab === 'RHYTHM' && <RhythmView />}
        {activeTab === 'POOL' && <PoolView />}
        {activeTab === 'CALENDAR' && <CalendarView />}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>
      <FloatingCapture />
      <FocusTimerModal />
      <AnchorModal />
      <RhythmModal />
      <PoolModal />
      <EventModal />
      <GapAssignModal />
    </div>
  );
}

// Initialize offline storage engine and mount root React component
DataStore.initialize();
ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App />
  </AppProvider>
);
