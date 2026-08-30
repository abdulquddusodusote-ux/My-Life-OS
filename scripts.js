/**
 * Meniscus OS — Standalone Single-File Application Core (scripts.js)
 * Medical Student Daily Operating System
 * Anchors (Salat + Classes) | Gaps | Daily Rhythm | Weekly Pool | Calendar & Countdowns | Focus Timer
 */

const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

// ==========================================
// 1. STRICT LOCAL DATE UTILITIES (03-ENGINEERING-SPEC §4)
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
  if (isToday100) {
    streak = 1;
  }

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

  return {
    currentStreak: streak,
    isCompleteToday: isToday100,
  };
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
// 2. SEED DATA DEFINITIONS
// ==========================================
const SEED_RHYTHM_ITEMS = [
  { id: 'rhythm-1', name: 'High-intensity study block (1)', duration_label: '1h 15m', sort_order: 0, active: true },
  { id: 'rhythm-2', name: 'High-intensity study block (2)', duration_label: '1h 15m', sort_order: 1, active: true },
  { id: 'rhythm-3', name: 'Low-intensity review block', duration_label: '1h', sort_order: 2, active: true },
  { id: 'rhythm-4', name: 'Writing notes', duration_label: '1h', sort_order: 3, active: true },
  { id: 'rhythm-5', name: 'Anki review', duration_label: '20–45m', sort_order: 4, active: true },
  { id: 'rhythm-6', name: 'Evening review & plan tomorrow', duration_label: '20–30m', sort_order: 5, active: true },
];

const SEED_POOL_ITEMS = [
  { id: 'pool-1', name: 'Research curriculum', target_per_week: 4, session_label: '30 min / session', sort_order: 0, active: true },
  { id: 'pool-2', name: 'AI literacy curriculum', target_per_week: 3, session_label: '30 min / session', sort_order: 1, active: true },
  { id: 'pool-3', name: 'General knowledge curriculum', target_per_week: 3, session_label: '30 min / session', sort_order: 2, active: true },
  { id: 'pool-4', name: 'Typing practice', target_per_week: 3, session_label: '30 min / session', sort_order: 3, active: true },
  { id: 'pool-5', name: 'Med marks / issues', target_per_week: 1, session_label: '1h 30m / session', sort_order: 4, active: true },
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
  { id: 'acad-wed-1', title: 'Clinical Skills Center Simulation', category: 'academic', start_time: '09:00', end_time: '11:30', day_of_week: 3, is_daily: false, active: true },
  { id: 'acad-wed-2', title: 'Pathology Gross Specimen Review', category: 'academic', start_time: '14:00', end_time: '15:30', day_of_week: 3, is_daily: false, active: true },
  { id: 'acad-thu-1', title: 'Surgery Ward & Clinical Posting', category: 'academic', start_time: '08:30', end_time: '12:00', day_of_week: 4, is_daily: false, active: true },
  { id: 'acad-thu-2', title: 'Microbiology Lab Seminar', category: 'academic', start_time: '14:30', end_time: '16:00', day_of_week: 4, is_daily: false, active: true },
  { id: 'acad-fri-1', title: 'Community Medicine & Medical Ethics', category: 'academic', start_time: '09:00', end_time: '11:30', day_of_week: 5, is_daily: false, active: true },
  { id: 'acad-fri-2', title: 'Jumu\'ah Prayer & Khutbah', category: 'salat', start_time: '12:45', end_time: '14:00', day_of_week: 5, is_daily: false, active: true },
];

const SEED_EVENTS = [
  { id: 'event-1', title: 'Pathology Practical Exam', event_date: localDateKey(new Date(Date.now() + 5 * 86400000)), notes: 'Histology slides & gross spotter', created_at: new Date().toISOString() },
  { id: 'event-2', title: 'Internal Medicine Ward Orientation', event_date: localDateKey(new Date(Date.now() + 12 * 86400000)), notes: 'Clinical Skills Center 8:00 AM', created_at: new Date().toISOString() },
];

const SEED_RECURRING_EVENTS = [
  { id: 'recur-1', title: 'Weekly House / Study Meeting', notes: 'Review high-yield case vignettes', rule_type: 'weekly', weekday: 1 },
  { id: 'recur-2', title: 'Monthly Departmental Grand Rounds', notes: 'Auditorium A', rule_type: 'monthly', day_of_month: 15 },
];

const SEED_INBOX_ITEMS = [
  { id: 'inbox-1', text: 'Check cardiology murmurs audio files on Osmosis', tag: 'High-Yield', created_at: new Date(Date.now() - 7200000).toISOString(), processed: false },
  { id: 'inbox-2', text: 'Ask Dr. Roberts about renal tubular acidosis types (Type 1 vs 4)', tag: 'Question', created_at: new Date(Date.now() - 18000000).toISOString(), processed: false },
];

// ==========================================
// 3. STORAGE & REPOSITORY
// ==========================================
const STORAGE_KEYS = {
  RHYTHM_ITEMS: 'meniscus_rhythm_items',
  RHYTHM_LOGS: 'meniscus_rhythm_logs',
  POOL_ITEMS: 'meniscus_pool_items',
  POOL_LOGS: 'meniscus_pool_logs',
  ANCHORS: 'meniscus_anchors',
  DAY_STATES: 'meniscus_day_states',
  EVENTS: 'meniscus_events',
  RECURRING_EVENTS: 'meniscus_recurring_events',
  INBOX_ITEMS: 'meniscus_inbox_items',
  THEME: 'meniscus_theme',
  SB_URL: 'meniscus_supabase_url',
  SB_KEY: 'meniscus_supabase_key',
  SB_EMAIL: 'meniscus_allowed_email',
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
}

// ==========================================
// 4. REACT CONTEXT (APP STATE)
// ==========================================
const AppContext = createContext();

function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('HOME');
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const currentWeekStart = useMemo(() => getMondayOfWeek(), [todayKey]);

  // Theme State
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'system');
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

  // Data States
  const [anchors, setAnchors] = useState(() => DataStore.getLocal(STORAGE_KEYS.ANCHORS, [...SEED_SALAT_ANCHORS, ...SEED_ACADEMIC_ANCHORS]));
  const [dayStates, setDayStates] = useState(() => DataStore.getLocal(STORAGE_KEYS.DAY_STATES, {}));
  const [rhythmItems, setRhythmItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.RHYTHM_ITEMS, SEED_RHYTHM_ITEMS));
  const [rhythmLogs, setRhythmLogs] = useState(() => DataStore.getLocal(STORAGE_KEYS.RHYTHM_LOGS, {}));
  const [poolItems, setPoolItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.POOL_ITEMS, SEED_POOL_ITEMS));
  const [poolLogs, setPoolLogs] = useState(() => DataStore.getLocal(STORAGE_KEYS.POOL_LOGS, {}));
  const [events, setEvents] = useState(() => DataStore.getLocal(STORAGE_KEYS.EVENTS, SEED_EVENTS));
  const [recurringEvents, setRecurringEvents] = useState(() => DataStore.getLocal(STORAGE_KEYS.RECURRING_EVENTS, SEED_RECURRING_EVENTS));
  const [inboxItems, setInboxItems] = useState(() => DataStore.getLocal(STORAGE_KEYS.INBOX_ITEMS, SEED_INBOX_ITEMS));

  // Focus Timer Modal State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerLink, setTimerLink] = useState({ type: null, itemId: null });
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  // Sync back to local storage
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.ANCHORS, anchors); }, [anchors]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.DAY_STATES, dayStates); }, [dayStates]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RHYTHM_ITEMS, rhythmItems); }, [rhythmItems]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RHYTHM_LOGS, rhythmLogs); }, [rhythmLogs]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.POOL_ITEMS, poolItems); }, [poolItems]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.POOL_LOGS, poolLogs); }, [poolLogs]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.EVENTS, events); }, [events]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.RECURRING_EVENTS, recurringEvents); }, [recurringEvents]);
  useEffect(() => { DataStore.setLocal(STORAGE_KEYS.INBOX_ITEMS, inboxItems); }, [inboxItems]);

  // Anchors & Break Day Logic
  const todayDayState = dayStates[todayKey] || { date_key: todayKey, is_break_day: false, completed_salats: {} };
  const isBreakDay = todayDayState.is_break_day;
  const completedSalats = todayDayState.completed_salats || {};

  const toggleBreakDay = () => {
    const nextVal = !isBreakDay;
    setDayStates(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || { date_key: todayKey, completed_salats: {} }),
        is_break_day: nextVal,
      }
    }));
  };

  const toggleSalatCompleted = (salatId) => {
    const current = !!completedSalats[salatId];
    setDayStates(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || { date_key: todayKey, is_break_day: false }),
        completed_salats: {
          ...(prev[todayKey]?.completed_salats || {}),
          [salatId]: !current,
        }
      }
    }));
  };

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

  // Daily Study Gaps
  const { todayGaps, totalFreeHours } = useMemo(() => {
    const parseMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const fmtMin = (m) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      if (h === 0) return `${min}m`;
      if (min === 0) return `${h}h`;
      return `${h}h ${min}m`;
    };

    const DAY_START = parseMin('05:00');
    const DAY_END = parseMin('23:00');
    const gaps = [];
    let prevEnd = DAY_START;

    for (const anchor of todayAnchors) {
      const aStart = parseMin(anchor.start_time);
      const aEnd = parseMin(anchor.end_time);
      if (aStart > prevEnd) {
        const gapMin = aStart - prevEnd;
        if (gapMin >= 15) {
          const sH = String(Math.floor(prevEnd / 60)).padStart(2, '0');
          const sM = String(prevEnd % 60).padStart(2, '0');
          const eH = String(Math.floor(aStart / 60)).padStart(2, '0');
          const eM = String(aStart % 60).padStart(2, '0');
          gaps.push({
            start: `${sH}:${sM}`,
            end: `${eH}:${eM}`,
            durationMinutes: gapMin,
            durationLabel: fmtMin(gapMin),
            context: `Before ${anchor.title}`,
          });
        }
      }
      prevEnd = Math.max(prevEnd, aEnd);
    }

    if (DAY_END > prevEnd) {
      const gapMin = DAY_END - prevEnd;
      if (gapMin >= 15) {
        const sH = String(Math.floor(prevEnd / 60)).padStart(2, '0');
        const sM = String(prevEnd % 60).padStart(2, '0');
        const eH = String(Math.floor(DAY_END / 60)).padStart(2, '0');
        const eM = String(DAY_END % 60).padStart(2, '0');
        gaps.push({
          start: `${sH}:${sM}`,
          end: `${eH}:${eM}`,
          durationMinutes: gapMin,
          durationLabel: fmtMin(gapMin),
          context: 'Night review & wind-down',
        });
      }
    }

    const totalFreeMin = gaps.reduce((acc, g) => acc + g.durationMinutes, 0);
    return { todayGaps: gaps, totalFreeHours: Number((totalFreeMin / 60).toFixed(1)) };
  }, [todayAnchors]);

  // Rhythm State
  const activeRhythmItems = useMemo(() => rhythmItems.filter(i => i.active).sort((a, b) => a.sort_order - b.sort_order), [rhythmItems]);
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
  const activePoolItems = useMemo(() => poolItems.filter(i => i.active).sort((a, b) => a.sort_order - b.sort_order), [poolItems]);
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

  // Inbox State
  const unprocessedInboxCount = useMemo(() => inboxItems.filter(i => !i.processed).length, [inboxItems]);
  const addInboxItem = (text, tag) => {
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

  // Focus Timer Handler
  const openTimer = (type = null, itemId = null) => {
    setTimerLink({ type, itemId });
    setIsTimerOpen(true);
  };

  const handleTimerNaturalComplete = (type, itemId, durationSeconds) => {
    if (type === 'rhythm' && itemId) toggleRhythmLog(itemId);
    else if (type === 'pool' && itemId) stepPoolCount(itemId, 1);
  };

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      todayKey, currentWeekStart,
      theme, resolvedTheme, setTheme, toggleTheme,
      anchors, setAnchors, todayAnchors,
      isBreakDay, toggleBreakDay,
      completedSalats, toggleSalatCompleted,
      todayGaps, totalFreeHours,
      rhythmItems, setRhythmItems, activeRhythmItems, todayRhythmLogs, streak, toggleRhythmLog,
      poolItems, setPoolItems, activePoolItems, currentWeekPoolLogs, poolWeekSummary, stepPoolCount,
      inboxItems, setInboxItems, unprocessedInboxCount, addInboxItem, toggleProcessInboxItem, deleteInboxItem,
      events, setEvents, recurringEvents, setRecurringEvents,
      isTimerOpen, setIsTimerOpen, timerLink, openTimer, handleTimerNaturalComplete,
      isCaptureOpen, setIsCaptureOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const useApp = () => useContext(AppContext);

// ==========================================
// 5. SIGNATURE LOAD RING (CONCENTRIC ARCS)
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

        {/* Center Glyphs */}
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
        <span className="font-mono text-sm font-semibold tracking-wider text-ink-soft">
          {completed} / {total} complete
        </span>
        <span className="text-xs text-ink-faint mt-0.5">
          {is100 ? 'Daily load fully absorbed' : `${Math.round((completed / (total || 1)) * 100)}% of daily rhythm`}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 6. VIEWS & DASHBOARD SCREENS
// ==========================================

// --- View A: Home View ---
function HomeView() {
  const {
    todayKey, streak, rhythmItems, activeRhythmItems, todayRhythmLogs, toggleRhythmLog,
    activePoolItems, currentWeekPoolLogs, stepPoolCount, poolWeekSummary,
    unprocessedInboxCount, addInboxItem, events, setActiveTab, openTimer,
    todayAnchors, isBreakDay, completedSalats, toggleSalatCompleted, totalFreeHours
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const salats = todayAnchors.filter(a => a.category === 'salat' || a.is_daily);
  const nearestEvents = events.slice(0, 3);

  const handleCapture = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    addInboxItem(inputVal.trim());
    setInputVal('');
  };

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      {/* Header */}
      <header className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
              {formatDisplayDate(todayKey)}
            </h1>
            {isBreakDay && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cushion-soft text-cushion font-semibold">
                ☕ Break
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint mt-0.5">
            {totalFreeHours}h free gaps available today
          </p>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${streak.currentStreak > 0 ? 'bg-cushion-soft text-cushion border-cushion/20' : 'bg-surface-sunken text-ink-faint border-line'}`}>
          <span className="text-sm">🔥</span>
          <span className="font-mono text-xs font-bold">{streak.currentStreak}d</span>
          <span className="text-[11px] opacity-80 hidden sm:inline">streak</span>
        </div>
      </header>

      {/* 5 Daily Prayers Strip */}
      <section className="cushion-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <span>🌙 5 Daily Prayers (Non-Negotiable)</span>
          </div>
          <button onClick={() => setActiveTab('ANCHORS')} className="text-[11px] text-cushion hover:underline font-medium">
            Anchors →
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {salats.map(salat => {
            const isDone = !!completedSalats[salat.id];
            const name = salat.title.replace(' Prayer', '');
            return (
              <button
                key={salat.id}
                onClick={() => toggleSalatCompleted(salat.id)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${isDone ? 'bg-synovial-soft text-synovial font-bold shadow-xs' : 'bg-surface-sunken/70 text-ink-soft hover:bg-surface-sunken'}`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 ${isDone ? 'bg-synovial text-white' : 'border border-line bg-surface'}`}>
                  {isDone && <span className="text-[10px]">✓</span>}
                </div>
                <span className="text-[11px] truncate">{name}</span>
                <span className="text-[9px] font-mono text-ink-faint">{salat.start_time}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Signature Load Ring */}
      <section className="cushion-card p-6 flex flex-col items-center justify-center">
        <LoadRing items={rhythmItems} completedLogs={todayRhythmLogs} />
      </section>

      {/* Daily Rhythm Checklist */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg text-ink">Daily Rhythm</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-ink-soft">
              {activeRhythmItems.filter(i => todayRhythmLogs[i.id]).length} / {activeRhythmItems.length}
            </span>
          </div>
          <button onClick={() => setActiveTab('RHYTHM')} className="text-xs text-ink-soft hover:text-cushion font-medium">
            Manage →
          </button>
        </div>

        <div className="space-y-2.5">
          {activeRhythmItems.map(item => {
            const isDone = !!todayRhythmLogs[item.id];
            return (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${isDone ? 'bg-cushion-soft/40 border border-cushion/20' : 'bg-surface-sunken/60 hover:bg-surface-sunken border border-transparent'}`}>
                <button onClick={() => toggleRhythmLog(item.id)} className="flex items-center gap-3.5 flex-1 text-left">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-cushion text-white shadow-xs' : 'border-2 border-line bg-surface'}`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isDone ? 'line-through opacity-70' : ''}`}>{item.name}</span>
                    {item.duration_label && <span className="text-[11px] font-mono text-ink-faint">{item.duration_label}</span>}
                  </div>
                </button>
                <button onClick={() => openTimer('rhythm', item.id)} className="p-1.5 text-ink-faint hover:text-cushion rounded-lg" title="Start timer">
                  ▶
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Pool Summary */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg text-ink">Weekly Pool</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-ink-soft">
              {poolWeekSummary.totalCount} / {poolWeekSummary.totalTarget}
            </span>
          </div>
          <button onClick={() => setActiveTab('POOL')} className="text-xs text-ink-soft hover:text-cushion font-medium">
            Details →
          </button>
        </div>

        <div className="space-y-3">
          {activePoolItems.map(item => {
            const count = currentWeekPoolLogs[item.id] || 0;
            const target = item.target_per_week;
            const isOver = count > target;
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-sunken/60 border border-line/40">
                <div className="flex flex-col flex-1 mr-2">
                  <span className="text-sm font-medium text-ink truncate">{item.name}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.max(target, count) }).map((_, dIdx) => {
                        const isFilled = dIdx < count;
                        const isBeyond = dIdx >= target;
                        let dot = 'bg-line/70';
                        if (isFilled) dot = isBeyond ? 'bg-load-high' : 'bg-cushion';
                        return <span key={dIdx} className={`w-2 h-2 rounded-full ${dot}`} />;
                      })}
                    </div>
                    <span className="font-mono text-[11px] text-ink-faint">{count}/{target}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => stepPoolCount(item.id, -1)} disabled={count <= 0} className="w-7 h-7 rounded-lg bg-surface text-ink-soft disabled:opacity-30 border border-line flex items-center justify-center">
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

      {/* Quick Capture */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display font-semibold text-base text-ink">⚡ Quick Capture</h2>
          {unprocessedInboxCount > 0 && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-cushion-soft text-cushion font-semibold">
              {unprocessedInboxCount} unprocessed
            </span>
          )}
        </div>
        <form onSubmit={handleCapture} className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Jot a clinical pearl, thought, or reminder..."
            className="flex-1 bg-surface-sunken text-ink text-sm rounded-xl px-3.5 py-2.5 border border-line focus:outline-none focus:border-cushion"
          />
          <button type="submit" disabled={!inputVal.trim()} className="px-4 py-2.5 rounded-xl bg-cushion text-white text-xs font-semibold disabled:opacity-40">
            Add
          </button>
        </form>
      </section>

      {/* Nearest Upcoming Countdowns */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-base text-ink">📅 Upcoming Events</h2>
          <button onClick={() => setActiveTab('CALENDAR')} className="text-xs text-ink-soft hover:text-cushion font-medium">
            See all →
          </button>
        </div>
        <div className="space-y-2">
          {nearestEvents.map(evt => {
            const cd = getCountdownLabel(evt.event_date, todayKey);
            return (
              <div key={evt.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-sunken/60 border border-line/40">
                <div className="flex flex-col flex-1 mr-2">
                  <span className="text-sm font-medium text-ink truncate">{evt.title}</span>
                  <span className="text-[11px] font-mono text-ink-faint">{formatShortDate(evt.event_date)}</span>
                </div>
                <span className={`font-mono text-xs px-2.5 py-1 rounded-full font-semibold ${cd === 'today' ? 'bg-synovial-soft text-synovial' : cd === 'tomorrow' ? 'bg-cushion-soft text-cushion' : 'bg-surface text-ink-soft border border-line'}`}>
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

// --- View B: Anchors & Gaps View ---
function AnchorsView() {
  const { todayKey, anchors, setAnchors, todayAnchors, isBreakDay, toggleBreakDay, completedSalats, toggleSalatCompleted, todayGaps, totalFreeHours, openTimer } = useApp();
  const [selectedDay, setSelectedDay] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [cat, setCat] = useState('academic');

  const WEEKDAYS = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 0, name: 'Sunday', short: 'Sun' },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newAnchor = {
      id: `anchor-${Date.now()}`,
      title: title.trim(),
      category: cat,
      start_time: start,
      end_time: end,
      day_of_week: selectedDay,
      is_daily: false,
      active: true,
    };
    setAnchors(prev => [...prev, newAnchor]);
    setIsModalOpen(false);
    setTitle('');
  };

  const salats = todayAnchors.filter(a => a.category === 'salat' || a.is_daily);
  const classes = todayAnchors.filter(a => a.category === 'academic' && !a.is_daily);
  const templateList = anchors.filter(a => !a.is_daily && a.day_of_week === selectedDay);

  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      {/* Break Mode Banner */}
      <div className={`cushion-card p-4 flex items-center justify-between border ${isBreakDay ? 'bg-cushion-soft/60 border-cushion/40 text-ink' : 'bg-surface border-line/60'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">☕</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink flex items-center gap-2">
              Break Day Mode {isBreakDay && <span className="text-[10px] bg-cushion text-white px-2 py-0.5 rounded-full font-mono">Active</span>}
            </span>
            <span className="text-xs text-ink-soft">
              {isBreakDay ? 'Classes waived. 5 Salat prayers & wide study gaps active.' : 'Classes and practicals active on the clock.'}
            </span>
          </div>
        </div>
        <button onClick={toggleBreakDay} className={`px-4 py-2 rounded-full text-xs font-semibold shadow-xs ${isBreakDay ? 'bg-cushion text-white' : 'bg-surface-sunken text-ink'}`}>
          {isBreakDay ? 'End Break' : 'Set as Break'}
        </button>
      </div>

      {/* 5 Daily Prayers */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg text-ink">🌙 Salat Prayers (Non-Negotiable)</h2>
          <span className="text-[11px] font-mono bg-synovial-soft text-synovial px-2.5 py-0.5 rounded-full font-medium">7 Days Invariant</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {salats.map(salat => {
            const isDone = !!completedSalats[salat.id];
            return (
              <button
                key={salat.id}
                onClick={() => toggleSalatCompleted(salat.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${isDone ? 'bg-synovial-soft/50 border-synovial/40' : 'bg-surface-sunken/60 border-line/40'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-synovial text-white' : 'border-2 border-line bg-surface'}`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${isDone ? 'line-through opacity-75' : ''}`}>{salat.title}</span>
                    <span className="text-[11px] font-mono text-ink-faint">{salat.start_time} – {salat.end_time}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's Classes */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg text-ink">📚 Today's Academic Commitments</h2>
          {isBreakDay && <span className="text-[11px] font-mono bg-cushion-soft text-cushion px-2.5 py-0.5 rounded-full">Waived</span>}
        </div>
        {isBreakDay ? (
          <p className="text-xs text-ink-soft italic py-3 text-center">Classes waived today for Break Mode.</p>
        ) : classes.length === 0 ? (
          <p className="text-xs text-ink-faint italic py-3 text-center">No classes scheduled today.</p>
        ) : (
          <div className="space-y-2.5">
            {classes.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken/60 border border-line/40">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{item.title}</span>
                  <span className="text-xs font-mono text-ink-faint">{item.start_time} – {item.end_time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available Study Gaps */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg text-ink">✨ Available Study Gaps</h2>
          <span className="font-mono text-xs text-cushion font-semibold">{totalFreeHours}h free today</span>
        </div>
        <div className="space-y-2.5">
          {todayGaps.map((gap, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken/60 border border-line/40">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">{gap.start} – {gap.end}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-cushion-soft text-cushion font-semibold">{gap.durationLabel}</span>
                </div>
                <span className="text-[11px] text-ink-faint mt-0.5">{gap.context}</span>
              </div>
              <button onClick={() => openTimer()} className="px-3 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold shadow-xs">
                ▶ Start Block
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly Schedule Editor */}
      <section className="cushion-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg text-ink">📅 Weekly Template Schedule</h2>
          <button onClick={() => setIsModalOpen(true)} className="px-3 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">
            + Add Class
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
          {WEEKDAYS.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 ${selectedDay === d.id ? 'bg-cushion text-white font-semibold shadow-xs' : 'bg-surface-sunken text-ink-soft'}`}
            >
              {d.short}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {templateList.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken/60 border border-line/40">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-ink">{item.title}</span>
                <span className="font-mono text-xs text-ink-faint">{item.start_time} – {item.end_time}</span>
              </div>
              <button onClick={() => setAnchors(prev => prev.filter(a => a.id !== item.id))} className="text-xs text-load-high p-1">
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface rounded-soft p-5 border border-line shadow-xl">
            <h3 className="font-display font-semibold text-base mb-3">Add Academic Class / Practical</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                type="text" placeholder="Title (e.g. Anatomy Lecture)" required
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line"
              />
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line font-mono" />
                <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-surface-sunken p-2 rounded-xl text-sm border border-line font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-xs text-ink-soft">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-cushion text-white text-xs font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View C: Rhythm View ---
function RhythmView() {
  const { todayKey, streak, rhythmItems, activeRhythmItems, todayRhythmLogs, toggleRhythmLog, inboxItems, toggleProcessInboxItem, deleteInboxItem, addInboxItem, openTimer } = useApp();
  const [inboxText, setInboxText] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!inboxText.trim()) return;
    addInboxItem(inboxText.trim());
    setInboxText('');
  };

  const activeInbox = inboxItems.filter(i => !i.processed);

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

      <section className="cushion-card p-5">
        <h2 className="font-display font-semibold text-lg mb-3">Today's Rhythm Blocks</h2>
        <div className="space-y-2.5">
          {activeRhythmItems.map((item, idx) => {
            const isDone = !!todayRhythmLogs[item.id];
            return (
              <div key={item.id} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${isDone ? 'bg-cushion-soft/40 border border-cushion/30' : 'bg-surface-sunken/60'}`}>
                <button onClick={() => toggleRhythmLog(item.id)} className="flex items-center gap-3 flex-1 text-left">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-cushion text-white' : 'border-2 border-line bg-surface'}`}>
                    {isDone && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isDone ? 'line-through opacity-70' : ''}`}>{item.name}</span>
                    <span className="text-[11px] font-mono text-ink-faint">{item.duration_label}</span>
                  </div>
                </button>
                <button onClick={() => openTimer('rhythm', item.id)} className="p-2 text-ink-faint hover:text-cushion">
                  ▶
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Capture Inbox */}
      <section className="cushion-card p-5">
        <h2 className="font-display font-semibold text-lg mb-3">📥 Capture Inbox</h2>
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text" value={inboxText} onChange={e => setInboxText(e.target.value)}
            placeholder="Jot thought or question..." className="flex-1 bg-surface-sunken p-2.5 rounded-xl text-sm border border-line"
          />
          <button type="submit" className="px-4 rounded-xl bg-cushion text-white text-xs font-semibold">+</button>
        </form>
        <div className="space-y-2">
          {activeInbox.map(item => (
            <div key={item.id} className="flex items-start justify-between p-3 rounded-xl bg-surface-sunken/60 border border-line/40">
              <button onClick={() => toggleProcessInboxItem(item.id)} className="w-5 h-5 rounded-md border border-line bg-surface flex items-center justify-center text-xs mr-2 mt-0.5">
                ✓
              </button>
              <div className="flex-1 mr-2">
                <span className="text-sm leading-snug">{item.text}</span>
                <span className="block text-[10px] font-mono text-ink-faint mt-1">{formatRelativeTime(item.created_at)}</span>
              </div>
              <button onClick={() => deleteInboxItem(item.id)} className="text-ink-faint hover:text-load-high p-1 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- View D: Pool View ---
function PoolView() {
  const { activePoolItems, currentWeekPoolLogs, currentWeekStart, stepPoolCount, poolWeekSummary, openTimer } = useApp();
  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Weekly Pool</h1>
          <p className="text-xs text-ink-faint mt-0.5">Resets every Monday</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cushion-soft text-cushion font-mono text-xs font-bold">
          🎯 {poolWeekSummary.totalCount} / {poolWeekSummary.totalTarget}
        </div>
      </header>

      <div className="space-y-3">
        {activePoolItems.map(item => {
          const count = currentWeekPoolLogs[item.id] || 0;
          const target = item.target_per_week;
          const isOver = count > target;
          return (
            <div key={item.id} className="cushion-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base text-ink">{item.name}</h3>
                  <span className="text-xs font-mono text-ink-faint">{item.session_label}</span>
                </div>
                <button onClick={() => openTimer('pool', item.id)} className="p-2 text-ink-faint hover:text-cushion">
                  ▶
                </button>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-line/40">
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
                  <span className="font-mono text-sm font-semibold">{count}/{target}</span>
                  <button onClick={() => stepPoolCount(item.id, -1)} disabled={count <= 0} className="w-8 h-8 rounded-xl bg-surface-sunken border border-line flex items-center justify-center disabled:opacity-30">−</button>
                  <button onClick={() => stepPoolCount(item.id, 1)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${isOver ? 'bg-load-high' : 'bg-cushion'}`}>+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- View E: Calendar View ---
function CalendarView() {
  const { todayKey, events, setEvents, recurringEvents, setRecurringEvents } = useApp();
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
      days.push({ dayNumber: d, dateKey: key, hasEvents: events.some(e => e.event_date === key), isToday: key === todayKey });
    }
    return days;
  }, [currentY, currentM, todayKey, events]);

  return (
    <div className="flex flex-col gap-5 pb-28 pt-2">
      <header className="flex items-center justify-between px-1">
        <h1 className="font-display font-bold text-2xl text-ink">Calendar & Events</h1>
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
        <section className="cushion-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1">
              <button onClick={() => setMonthOffset(0)} className="px-2.5 py-1 rounded-lg bg-surface-sunken text-xs font-mono">Today</button>
              <button onClick={() => setMonthOffset(m => m - 1)} className="p-1.5 rounded-lg bg-surface-sunken">‹</button>
              <button onClick={() => setMonthOffset(m => m + 1)} className="p-1.5 rounded-lg bg-surface-sunken">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-ink-faint mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {monthGridDays.map((d, idx) => {
              if (!d) return <div key={idx} className="aspect-square" />;
              return (
                <div key={d.dateKey} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative font-mono text-xs ${d.isToday ? 'bg-cushion-soft text-cushion font-bold border border-cushion/40' : 'bg-surface-sunken/50 text-ink'}`}>
                  {d.dayNumber}
                  {d.hasEvents && <span className="w-1.5 h-1.5 rounded-full bg-synovial absolute bottom-1" />}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="cushion-card p-5">
          <h2 className="font-display font-semibold text-lg mb-3">Live Event Countdowns</h2>
          <div className="space-y-2.5">
            {events.map(evt => {
              const cd = getCountdownLabel(evt.event_date, todayKey);
              return (
                <div key={evt.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-sunken/60 border border-line/40">
                  <div>
                    <span className="text-sm font-semibold text-ink">{evt.title}</span>
                    <span className="block font-mono text-xs text-ink-faint">{formatDisplayDate(evt.event_date)}</span>
                  </div>
                  <span className={`font-mono text-xs px-2.5 py-1 rounded-full font-semibold ${cd === 'today' ? 'bg-synovial-soft text-synovial' : cd === 'tomorrow' ? 'bg-cushion-soft text-cushion' : 'bg-surface text-ink-soft border border-line'}`}>
                    {cd}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// --- View F: Settings View ---
function SettingsView() {
  const { theme, setTheme } = useApp();
  return (
    <div className="flex flex-col gap-6 pb-28 pt-2">
      <header className="px-1">
        <h1 className="font-display font-bold text-2xl text-ink">Settings</h1>
        <p className="text-xs text-ink-faint mt-0.5">Preferences & Theme</p>
      </header>

      <section className="cushion-card p-5">
        <h2 className="font-display font-semibold text-base mb-3">Appearance Theme</h2>
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-3 rounded-2xl border flex flex-col items-center capitalize text-xs ${theme === t ? 'bg-cushion-soft text-cushion border-cushion font-bold' : 'bg-surface-sunken border-line/60'}`}
            >
              <span className="text-base mb-1">{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}</span>
              {t}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 7. FOCUS TIMER & FLOATING MODALS
// ==========================================
function FocusTimerModal() {
  const { isTimerOpen, setIsTimerOpen, timerLink, activeRhythmItems, activePoolItems, handleTimerNaturalComplete, todayRhythmLogs } = useApp();
  const [preset, setPreset] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const totalSecRef = useRef(25 * 60);

  useEffect(() => {
    if (isTimerOpen) {
      setSeconds(preset * 60);
      totalSecRef.current = preset * 60;
      setIsActive(false);
      setIsDone(false);
    }
  }, [isTimerOpen, preset]);

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
            handleTimerNaturalComplete(timerLink.type, timerLink.itemId, totalSecRef.current);
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
      <div className="w-full max-w-sm bg-surface rounded-soft p-6 border border-line shadow-xl flex flex-col items-center relative">
        <button onClick={() => setIsTimerOpen(false)} className="absolute top-4 right-4 text-ink-faint">✕</button>
        <h3 className="font-display font-semibold text-lg mb-4">⏱️ Focus Session</h3>

        <div className="w-40 h-40 rounded-full border-4 border-cushion flex flex-col items-center justify-center my-4">
          <span className="font-mono text-3xl font-bold">{timeStr}</span>
          <span className="text-[11px] font-mono text-ink-faint mt-1">{isActive ? 'In session' : isDone ? 'Completed!' : 'Ready'}</span>
        </div>

        {!isActive && !isDone && (
          <div className="flex gap-2 my-2">
            {[15, 25, 30, 45, 60].map(m => (
              <button key={m} onClick={() => setPreset(m)} className={`px-2.5 py-1 rounded-full text-xs font-mono ${preset === m ? 'bg-cushion text-white font-bold' : 'bg-surface-sunken text-ink-soft'}`}>
                {m}m
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={() => setIsActive(!isActive)} className="px-6 py-2.5 rounded-full bg-cushion text-white text-sm font-semibold">
            {isActive ? 'Pause' : 'Start'}
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
        className="fixed right-4 bottom-20 z-30 w-12 h-12 rounded-full bg-cushion text-white shadow-lg flex items-center justify-center text-2xl font-light hover:scale-105 transition-all"
        title="Quick capture (+)"
      >
        +
      </button>

      {isCaptureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface rounded-soft p-5 border border-line shadow-xl relative">
            <button onClick={() => setIsCaptureOpen(false)} className="absolute top-4 right-4 text-ink-faint">✕</button>
            <h3 className="font-display font-semibold text-base mb-3">⚡ Quick Capture</h3>
            <textarea
              rows={3} autoFocus value={txt} onChange={e => setTxt(e.target.value)}
              placeholder="Jot thought, pearl, or question..." className="w-full bg-surface-sunken p-3 rounded-xl text-sm border border-line resize-none"
            />
            <div className="flex justify-end pt-2">
              <button onClick={() => { if (txt.trim()) { addInboxItem(txt.trim()); setTxt(''); setIsCaptureOpen(false); } }} className="px-4 py-2 rounded-full bg-cushion text-white text-xs font-semibold">
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 8. NAVIGATION & MAIN APP SHELL
// ==========================================
function Header() {
  const { openTimer, toggleTheme, resolvedTheme } = useApp();
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-line/60">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cushion-soft text-cushion flex items-center justify-center font-bold">
            ☾
          </div>
          <div>
            <span className="font-display font-bold text-base text-ink">Meniscus OS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTimer()} className="p-2 rounded-full text-ink-soft hover:bg-surface" title="Timer">⏱️</button>
          <button onClick={toggleTheme} className="p-2 rounded-full text-ink-soft hover:bg-surface" title="Toggle Theme">{resolvedTheme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { activeTab, setActiveTab, unprocessedInboxCount } = useApp();
  const tabs = [
    { id: 'HOME', label: 'Home', icon: '🏠', badge: unprocessedInboxCount > 0 ? unprocessedInboxCount : null },
    { id: 'ANCHORS', label: 'Anchors', icon: '🧭' },
    { id: 'RHYTHM', label: 'Rhythm', icon: '⚡' },
    { id: 'POOL', label: 'Pool', icon: '🎯' },
    { id: 'CALENDAR', label: 'Calendar', icon: '📅' },
    { id: 'SETTINGS', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-line pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-between">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${activeTab === t.id ? 'text-cushion font-semibold' : 'text-ink-faint'}`}
          >
            <div className={`p-1 rounded-full ${activeTab === t.id ? 'bg-cushion-soft' : ''}`}>
              <span className="text-base">{t.icon}</span>
              {t.badge && <span className="absolute -top-1 -right-1 bg-cushion text-white text-[9px] font-mono px-1 rounded-full">{t.badge}</span>}
            </div>
            <span className="text-[10px] mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function App() {
  const { activeTab } = useApp();
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4">
        {activeTab === 'HOME' && <HomeView />}
        {activeTab === 'ANCHORS' && <AnchorsView />}
        {activeTab === 'RHYTHM' && <RhythmView />}
        {activeTab === 'POOL' && <PoolView />}
        {activeTab === 'CALENDAR' && <CalendarView />}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>
      <FloatingCapture />
      <BottomNav />
      <FocusTimerModal />
    </div>
  );
}

// Initialize storage and mount React
DataStore.initialize();
ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App />
  </AppProvider>
);
