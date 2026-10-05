(() => {
  const KEY = 'gdscript_quest_save';
  const fresh = () => ({
    version: 1, onboarded: false, profile: { experience: '', goal: '' },
    completed: [], xp: 0, streak: 0, lastActivity: '',
    earned: [], achievements: [], project: {}, settings: { theme: 'dark', reducedMotion: false, fontSize: 100, sound: false },
    drafts: {}, lessonProgress: {}, currentLesson: 1, recent: []
  });
  const finiteInt = (value, fallback = 0, max = 100000000) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback;
  const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  function sanitize(saved) {
    const clean = fresh();
    clean.onboarded = Boolean(saved.onboarded);
    clean.profile.experience = ['None', 'A little', 'Some', 'A lot'].includes(saved.profile?.experience) ? saved.profile.experience : '';
    clean.profile.goal = ['Games', 'Tools', 'Mods', 'Just learning'].includes(saved.profile?.goal) ? saved.profile.goal : '';
    clean.completed = Array.isArray(saved.completed) ? [...new Set(saved.completed.filter((id) => Number.isInteger(id) && id >= 1 && id <= 46))].sort((a, b) => a - b) : [];
    clean.xp = finiteInt(saved.xp);
    clean.streak = finiteInt(saved.streak, 0, 100000);
    clean.lastActivity = typeof saved.lastActivity === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.lastActivity) ? saved.lastActivity : '';
    clean.earned = Array.isArray(saved.earned) ? [...new Set(saved.earned.filter((key) => typeof key === 'string' && key.length < 120))] : [];
    clean.achievements = Array.isArray(saved.achievements) ? [...new Set(saved.achievements.filter((key) => typeof key === 'string' && key.length < 80))] : [];
    clean.project = {};
    const project = record(saved.project);
    for (let index = 0; index < 29; index += 1) if (typeof project[`task-${index}`] === 'boolean') clean.project[`task-${index}`] = project[`task-${index}`];
    const settings = record(saved.settings);
    clean.settings.theme = settings.theme === 'light' ? 'light' : 'dark';
    clean.settings.reducedMotion = Boolean(settings.reducedMotion);
    clean.settings.sound = Boolean(settings.sound);
    clean.settings.fontSize = [90, 100, 110, 120].includes(settings.fontSize) ? settings.fontSize : 100;
    const drafts = record(saved.drafts);
    for (const [key, value] of Object.entries(drafts)) if (/^(?:[1-9]|[1-3]\d|4[0-6]):(?:fix|build|challenge|explain)$/.test(key) && typeof value === 'string') clean.drafts[key] = value.slice(0, 100000);
    const progress = record(saved.lessonProgress);
    for (let id = 1; id <= 46; id += 1) {
      const item = record(progress[id]);
      if (!Object.keys(item).length) continue;
      const map = (value, type, max = 1000) => Object.fromEntries(Object.entries(record(value)).filter(([key, field]) => ['fix', 'build', 'challenge'].includes(key) && typeof field === type).map(([key, field]) => [key, type === 'number' ? finiteInt(field, 0, max) : field]));
      clean.lessonProgress[id] = {
        quiz: Boolean(item.quiz), fix: Boolean(item.fix), build: Boolean(item.build), explain: Boolean(item.explain), challenge: Boolean(item.challenge),
        hints: map(item.hints, 'number', 3), attempts: map(item.attempts, 'number'), revealed: map(item.revealed, 'boolean'),
        rearrangeOrder: Array.isArray(item.rearrangeOrder) && item.rearrangeOrder.length === 2 && [...item.rearrangeOrder].sort().join(',') === '0,1' ? item.rearrangeOrder : [0, 1]
      };
    }
    clean.currentLesson = Math.max(1, Math.min(46, finiteInt(saved.currentLesson, 1, 46)));
    clean.recent = Array.isArray(saved.recent) ? saved.recent.slice(0, 5).filter((item) => item && Number.isInteger(item.id) && item.id >= 1 && item.id <= 46).map((item) => ({ id: item.id, title: String(item.title || '').slice(0, 100), date: String(item.date || '').slice(0, 40) })) : [];
    return clean;
  }
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || typeof saved !== 'object') return fresh();
      return sanitize(saved);
    } catch (_) {
      return fresh();
    }
  }
  let state = read();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* Site remains usable if storage is unavailable. */ }
  }
  function get() { return state; }
  function replace(next) { state = next; save(); }
  function reset() { state = fresh(); save(); }
  function progress(id) {
    if (!state.lessonProgress[id]) state.lessonProgress[id] = { quiz: false, fix: false, build: false, explain: false, challenge: false, rearrangeOrder: [0, 1], hints: {}, attempts: {}, revealed: {} };
    const p = state.lessonProgress[id];
    p.hints ||= {}; p.attempts ||= {}; p.revealed ||= {};
    return p;
  }
  window.QuestStorage = { get, save, replace, reset, progress, key: KEY };
})();
