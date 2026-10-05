(() => {
  const badges = [
    { id: 'First Variable', title: 'FIRST VARIABLE', detail: 'Created your first variable.', lesson: 1, icon: '✦' },
    { id: 'If Master', title: 'IF MASTER', detail: 'Completed a lesson about conditions.', lesson: 4, icon: '↳' },
    { id: 'Looping', title: 'LOOPING', detail: 'Used your first loop.', lesson: 11, icon: '⟳' },
    { id: 'Data Hoarder', title: 'DATA HOARDER', detail: 'Worked with arrays or dictionaries.', lesson: 13, icon: '▤' },
    { id: 'Godot Initiate', title: 'GODOT INITIATE', detail: 'Met your first Godot node.', lesson: 19, icon: '◈' },
    { id: 'Signal Boost', title: 'SIGNAL BOOST', detail: 'Sent your first signal.', lesson: 26, icon: '⌁' },
    { id: 'Vector Vibes', title: 'VECTOR VIBES', detail: 'Learned about vectors.', lesson: 29, icon: '↗' },
    { id: 'Dog Golf Dev', title: 'DOG GOLF DEV', detail: 'Started the final project.', project: true, icon: '🐕' },
    { id: 'Code Wizard', title: 'CODE WIZARD', detail: 'Completed the entire course.', all: true, icon: '✹' }
  ];
  const xpForLevel = (level) => 250 + Math.max(0, level - 1) * 35;
  const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function levelInfo(xp) {
    let level = 1, remaining = Math.max(0, xp);
    while (remaining >= xpForLevel(level)) { remaining -= xpForLevel(level); level += 1; }
    return { level, into: remaining, next: xpForLevel(level), pct: Math.min(100, Math.round(remaining / xpForLevel(level) * 100)) };
  }
  function activity(state) {
    const now = new Date();
    const today = localDateKey(now);
    if (state.lastActivity !== today) {
      const previousDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterday = localDateKey(previousDay);
      state.streak = state.lastActivity === yesterday ? state.streak + 1 : 1;
      state.lastActivity = today;
    }
  }
  function grant(state, key, amount) {
    if (state.earned.includes(key)) return { xp: 0, leveled: false, level: levelInfo(state.xp).level };
    const before = levelInfo(state.xp).level;
    state.earned.push(key); state.xp += amount; activity(state);
    return { xp: amount, leveled: levelInfo(state.xp).level > before, level: levelInfo(state.xp).level };
  }
  function unlock(state) {
    const fresh = [];
    for (const badge of badges) {
      const eligible = badge.all ? state.completed.length === 46 : badge.project ? Object.values(state.project).some(Boolean) : state.completed.includes(badge.lesson);
      if (eligible && !state.achievements.includes(badge.id)) { state.achievements.push(badge.id); fresh.push(badge); }
    }
    return fresh;
  }
  window.QuestGame = { badges, xpForLevel, levelInfo, activity, grant, unlock };
})();
