(() => {
  const main = document.getElementById('main');
  const app = document.getElementById('app');
  const toastRegion = document.getElementById('toast-region');
  const course = window.QuestCourse;
  const storage = window.QuestStorage;
  const game = window.QuestGame;
  const validator = window.QuestValidator;
  let view = 'dashboard';
  let lessonId = 1;
  let step = 'learn';
  let selectedChoice = null;
  let quizAnswer = '';
  let rearrangeOrder = [0, 1];
  let feedback = {};
  let resetDialog = false;
  let mobileMenuOpen = false;
  let celebration = false;

  const steps = [
    ['learn', 'Learn'], ['predict', 'Predict'], ['fix', 'Fix code'],
    ['build', 'Write code'], ['explain', 'Explain'], ['challenge', 'Bonus']
  ];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const current = () => course.lessons.find((item) => item.id === lessonId) || course.lessons[0];
  const state = () => storage.get();
  const completedCount = () => state().completed.length;
  const nextLessonId = () => Math.min(46, completedCount() + 1);
  const allDone = () => completedCount() >= 46;
  const canOpen = (id) => id <= Math.min(46, completedCount() + 1);
  const getProgress = (id) => storage.progress(id);
  const gatesDone = (p) => p.quiz && p.fix && p.build && p.explain;
  const percent = (number, total) => total ? Math.round(number / total * 100) : 0;

  function toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    toastRegion.append(node);
    window.setTimeout(() => node.remove(), 3300);
  }

  function chirp() {
    if (!state().settings.sound) return;
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 680;
      gain.gain.setValueAtTime(.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + .12);
      oscillator.onended = () => audio.close();
    } catch (_) { /* Sound is optional; the course works without audio. */ }
  }

  function award(key, amount) {
    const s = state();
    game.activity(s);
    const result = game.grant(s, key, amount);
    storage.save();
    if (result.xp) {
      toast(`+${result.xp} XP — nice work!`, 'xp-toast');
      chirp();
    }
    if (result.leveled) toast(`Level up! You reached coder level ${result.level}.`, 'xp-toast');
    const newBadges = game.unlock(s);
    storage.save();
    newBadges.forEach((badge) => toast(`Achievement unlocked: ${badge.title}`, 'xp-toast'));
    return result;
  }

  function completeLesson(id) {
    const s = state();
    if (!s.completed.includes(id)) {
      s.completed.push(id);
      s.completed.sort((a, b) => a - b);
      s.recent.unshift({ id, title: course.lessons[id - 1].title, date: new Date().toLocaleDateString() });
      s.recent = s.recent.slice(0, 5);
      s.currentLesson = Math.min(46, id + 1);
      award(`lesson:${id}:complete`, 50);
      game.activity(s);
      storage.save();
      const newBadges = game.unlock(s);
      storage.save();
      newBadges.forEach((badge) => toast(`Achievement unlocked: ${badge.title}`, 'xp-toast'));
      celebration = true;
      if (!s.settings.reducedMotion) showConfetti();
    }
    step = 'challenge';
  }

  function showConfetti() {
    const layer = document.createElement('div');
    layer.className = 'celebration'; layer.setAttribute('aria-hidden', 'true');
    const colors = ['#c5f466', '#aa94ff', '#77c8ff', '#ff927e', '#f6c768'];
    for (let i = 0; i < 42; i += 1) {
      const bit = document.createElement('i');
      bit.className = 'confetti'; bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * .45}s`;
      layer.append(bit);
    }
    document.body.append(layer);
    window.setTimeout(() => layer.remove(), 2100);
  }

  function topline(label = 'YOUR LEARNING SPACE') {
    const s = state(); const lvl = game.levelInfo(s.xp);
    return `<div class="topline"><span class="eyebrow">${esc(label)}</span><div class="top-actions"><span class="streak-pill"><span class="fire">♨</span> ${s.streak} day streak</span><span class="xp-pill">✦ ${s.xp.toLocaleString()} XP</span><button class="avatar-mini" data-view="profile" aria-label="Open profile">${lvl.level}</button></div></div>`;
  }

  function renderDashboard() {
    const s = state(); const lvl = game.levelInfo(s.xp); const next = course.lessons[nextLessonId() - 1];
    const donePct = percent(completedCount(), 46);
    const projectTaskTotal = course.projectPhases.reduce((sum, phase) => sum + phase.tasks.length, 0);
    const nextCard = allDone()
      ? `<div class="next-row"><div><strong>Untitled Funny Dog Golf Game</strong><small>Your full course is complete. The big project is ready.</small></div><button class="btn btn-primary btn-small" data-view="project">Start project <span>→</span></button></div>`
      : `<div class="next-row"><div><strong>Continue: Lesson ${next.id} — ${esc(next.title)}</strong><small>${esc(next.section)} · about ${next.minutes} minutes · +${next.xp} XP</small></div><button class="btn btn-primary btn-small" data-action="continue">Continue <span>→</span></button></div>`;
    const recommended = allDone() ? [] : course.lessons.slice(Math.max(0, nextLessonId() - 1), Math.min(46, nextLessonId() + 2));
    const recList = recommended.map((lesson) => `<div class="lesson-mini ${s.completed.includes(lesson.id) ? 'done' : ''}" data-lesson="${lesson.id}" role="button" tabindex="0"><div class="lesson-mini-icon">${s.completed.includes(lesson.id) ? '✓' : esc(lesson.sectionIcon)}</div><div class="lesson-mini-copy"><strong>Lesson ${lesson.id} · ${esc(lesson.title)}</strong><small>${esc(lesson.section)} · ${lesson.minutes} min</small></div><span class="lesson-mini-arrow">→</span></div>`).join('');
    return `<div class="content-width">${topline()}<section class="hero-grid"><article class="hero-card"><div class="hero-kicker"><i></i> YOUR QUEST CONTINUES</div><h1>Welcome back,<br>coder.</h1><p>Learn GDScript. Build games. Become dangerous with code. One small win at a time.</p><div class="button-row"><button class="btn btn-primary" data-action="continue">${allDone() ? 'START THE BIG PROJECT' : 'CONTINUE LEARNING'} <span>→</span></button><button class="btn btn-secondary" data-view="tree">View course map</button></div><div class="hero-decoration" aria-hidden="true">🐕</div></article><article class="daily-card"><div><div class="daily-heading">PLAYER CHECK-IN</div><h2>Your adventure,<br>your pace.</h2><p>Every lesson adds another tool to your game-making kit.</p></div><div><div class="daily-stats"><div><b>${lvl.level}</b><span>coder level</span></div><div><b>${s.streak} <small style="font-size:13px">♨</small></b><span>day streak</span></div><div><b>${s.xp.toLocaleString()}</b><span>total XP</span></div></div><div class="progress-track"><div class="progress-fill" style="width:${lvl.pct}%"></div></div><div class="progress-foot"><span>Level ${lvl.level} progress</span><span>${lvl.into} / ${lvl.next} XP</span></div></div></article></section><section class="stat-grid" style="margin-top:16px"><article class="stat-card"><span class="stat-icon" style="color:var(--lime)">◈</span><div class="stat-label">Course progress</div><div class="stat-number">${donePct}%</div><div class="stat-note">${completedCount()} of 46 lessons</div></article><article class="stat-card"><span class="stat-icon" style="color:var(--violet)">✹</span><div class="stat-label">Achievements</div><div class="stat-number">${s.achievements.length}</div><div class="stat-note">${game.badges.length} to discover</div></article><article class="stat-card"><span class="stat-icon" style="color:var(--coral)">🐕</span><div class="stat-label">Final project</div><div class="stat-number">${allDone() ? `${percent(Object.values(s.project).filter(Boolean).length,projectTaskTotal)}%` : 'Locked'}</div><div class="stat-note">Funny Dog Golf Game</div></article><article class="stat-card"><span class="stat-icon" style="color:var(--blue)">⌘</span><div class="stat-label">Current level</div><div class="stat-number">${allDone() ? 'Finale' : `0${next.sectionIndex + 1}`}</div><div class="stat-note">${allDone() ? 'The Big Project' : esc(next.section)}</div></article></section><section class="progress-panel"><div class="progress-panel-top"><h3>Course progress</h3><span>${completedCount()} / 46 lessons</span></div><div class="progress-track"><div class="progress-fill" style="width:${donePct}%"></div></div><div class="progress-foot"><span>GDScript fundamentals → complete game systems</span><span>${donePct}%</span></div>${nextCard}</section><div class="section-head"><div><h2>Up next</h2><p>Pick up right where you left off.</p></div><button class="text-link" data-view="tree">Full skill tree ↗</button></div><div class="lesson-list">${recList || '<div class="empty-state">Every lesson is complete. Go build that game!</div>'}</div><div class="section-head"><div><h2>The big idea</h2><p>Every concept points toward a real game system.</p></div></div><div class="progress-panel" style="display:flex;align-items:center;gap:15px"><span style="font-size:27px">⛳</span><div><strong style="font-size:12px">Untitled Funny Dog Golf Game</strong><div class="small-copy">Aim, shoot, bounce, celebrate. You’ll build it one skill at a time.</div></div><button class="text-link" style="margin-left:auto" data-view="project">Project details ↗</button></div></div>`;
  }

  function renderTree() {
    const cards = course.sections.map((section) => {
      const lessons = course.lessons.filter((item) => item.section === section.name);
      const done = lessons.filter((item) => state().completed.includes(item.id)).length;
      const dots = lessons.map((item) => {
        const completed = state().completed.includes(item.id); const unlocked = canOpen(item.id);
        const cls = completed ? 'done' : !unlocked ? 'locked' : item.id === nextLessonId() ? 'current' : '';
        return `<button class="lesson-dot ${cls}" data-lesson="${item.id}" ${unlocked ? '' : 'disabled'} aria-label="Lesson ${item.id}: ${esc(item.title)}${completed ? ', complete' : unlocked ? ', available' : ', locked'}" title="${esc(item.title)}">${completed ? '✓' : item.id}</button>`;
      }).join('');
      return `<article class="module-card"><div class="module-card-head"><div class="module-icon">${esc(section.icon)}</div><span class="module-progress">${done} / ${lessons.length}</span></div><h3>${esc(section.name)}</h3><p>${section.name === 'GDScript Fundamentals' ? 'Start with values and logic, then give your code reusable tools.' : section.name === 'Repetition & Data' ? 'Repeat useful work and organize the information your game needs.' : section.name === 'GDScript + Godot' ? 'Connect scripts to the nodes and scenes that make up a Godot game.' : section.name === 'Game Programming' ? 'Turn vectors, movement and physics into things players can feel.' : 'Bring systems together and get a game ready to share.'}</p><div class="progress-track"><div class="progress-fill" style="width:${percent(done,lessons.length)}%"></div></div><div class="module-lessons">${dots}</div></article>`;
    }).join('');
    return `<div class="content-width">${topline('THE SKILL TREE')}<header class="page-title"><div class="eyebrow">46 LESSONS · 5 WORLDS</div><h1>Pick your next skill.</h1><p>Follow the trail from your first variable to a complete Godot game. Finish a lesson to unlock the next node.</p></header><div class="module-grid">${cards}</div><div class="progress-panel" style="margin-top:16px"><div class="progress-panel-top"><h3>Course completion</h3><span>${completedCount()} / 46</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent(completedCount(),46)}%"></div></div><div class="progress-foot"><span>Complete lessons to reveal new nodes</span><span>${percent(completedCount(),46)}%</span></div></div></div>`;
  }

  function renderAside(lesson) {
    return `<aside class="lesson-aside"><section class="aside-card"><h3>Skills in this lesson</h3><p>Small building blocks, big game energy.</p><div class="skill-chips">${lesson.skills.map((skill) => `<span class="skill-chip">${esc(skill)}</span>`).join('')}</div></section><section class="aside-card"><h3>Quest details</h3><p>Difficulty: <strong>${esc(lesson.difficulty)}</strong><br>Time: <strong>about ${lesson.minutes} min</strong><br>Reward: <strong style="color:var(--yellow)">+${lesson.xp} XP</strong></p></section><section class="aside-card"><h3>Course checker</h3><p>Checks for learning patterns in your text. It does not run GDScript or the Godot engine.</p></section><section class="aside-card"><h3>Need a hand?</h3><p>Try a hint before opening a solution. Hints don't reduce your reward.</p></section></aside>`;
  }

  function renderStepper(p) {
    return `<div class="stepper" aria-label="Lesson steps">${steps.map(([key, title], index) => `<button class="step-btn ${key === step ? 'active' : ''} ${key !== 'learn' && ((key === 'predict' && p.quiz) || (key === 'fix' && p.fix) || (key === 'build' && p.build) || (key === 'explain' && p.explain)) ? 'done' : ''}" data-step="${key}" aria-current="${key === step ? 'step' : 'false'}"><span class="step-no">${index + 1}</span>${title}</button>`).join('')}</div>`;
  }

  function editor(lesson, kind, config, title) {
    const s = state(); const key = `${lesson.id}:${kind}`;
    const content = Object.prototype.hasOwnProperty.call(s.drafts, key) ? s.drafts[key] : (config.starter || '');
    const p = getProgress(lesson.id); const attemptCount = p.attempts[kind] || 0;
    const f = feedback[key];
    const lines = Math.max(1, String(content).split('\n').length);
    const shownHint = p.hints[kind] || 0;
    return `<div class="editor-shell"><div class="editor-toolbar"><span class="editor-file">${esc(title)}.gd</span><div class="editor-tools"><button class="editor-tool" data-action="code-example" data-kind="${kind}" title="Insert the lesson example">Example</button><button class="editor-tool" data-action="code-copy" data-kind="${kind}">Copy</button><button class="editor-tool" data-action="code-clear" data-kind="${kind}">Clear</button><button class="editor-tool" data-action="code-reset" data-kind="${kind}">Reset</button></div></div><div class="editor-body"><div class="line-numbers" data-lines="${kind}" aria-hidden="true">${Array.from({length:lines},(_,i)=>i+1).join('\n')}</div><label class="visually-hidden" for="editor-${kind}">${esc(title)} GDScript code</label><textarea id="editor-${kind}" class="code-input" data-editor="${kind}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${esc(title)} GDScript code">${esc(content)}</textarea></div><div class="editor-footer"><span>GDScript · saved on this device</span><span>Tab inserts 4 spaces</span></div></div><div class="hint-row"><button class="btn btn-quiet btn-small" data-action="hint" data-kind="${kind}">Need a hint? ${shownHint ? `(${shownHint}/3)` : ''}</button>${shownHint ? `<span class="hint-text">${esc(config.hints?.[shownHint - 1] || 'Reread the prompt and try a small change.')}</span>` : ''}${attemptCount >= 3 && !p.revealed[kind] ? `<button class="btn btn-quiet btn-small" data-action="solution" data-kind="${kind}">Show solution</button>` : ''}</div>${f ? `<div class="feedback ${f.ok ? 'success' : 'error'}" role="status"><span>${f.ok ? '✓' : '↗'}</span><span>${esc(f.message)}</span></div>` : ''}<button class="btn btn-primary" data-action="code-check" data-kind="${kind}">✓ Check code</button>`;
  }

  function lessonStep(lesson, p) {
    if (step === 'learn') return `<div class="lesson-card"><div class="eyebrow">STEP 1 · THE IDEA</div><h2>${esc(lesson.title)} are a game-making superpower.</h2><p class="lead">${esc(lesson.concept)}</p><div class="eyebrow" style="margin-top:20px">TINY EXAMPLE</div><pre class="example-block">${esc(lesson.example)}</pre><div class="game-connection"><b>Dog golf connection</b>${esc(lesson.game)}</div><div class="lesson-actions"><span class="small-copy">Reading this earns +5 XP once.</span><button class="btn btn-primary" data-action="next-step">Try a prediction <span>→</span></button></div></div>`;
    if (step === 'predict') {
      const quiz = lesson.quiz;
      const chosen = selectedChoice;
      const quizMessage = feedback.quiz;
      const choices = quiz.type === 'rearrange'
        ? `<div class="reorder-list" aria-label="Reorder code lines">${rearrangeOrder.map((lineIndex, position) => `<div class="reorder-row"><code>${esc(quiz.lines[lineIndex])}</code><span class="reorder-controls"><button class="editor-tool" data-action="reorder-move" data-position="${position}" data-delta="-1" ${position === 0 ? 'disabled' : ''} aria-label="Move line up">↑</button><button class="editor-tool" data-action="reorder-move" data-position="${position}" data-delta="1" ${position === rearrangeOrder.length - 1 ? 'disabled' : ''} aria-label="Move line down">↓</button></span></div>`).join('')}</div>`
        : quiz.type === 'type-answer'
          ? `<label class="visually-hidden" for="quiz-answer">Your answer</label><input id="quiz-answer" class="answer-input" type="text" data-quiz-answer value="${esc(quizAnswer)}" autocomplete="off" autocapitalize="off" placeholder="Type your answer…">`
          : `<div class="choice-list" role="radiogroup" aria-label="Choose your answer">${quiz.choices.map((choice, index) => `<button class="choice ${chosen === index ? 'selected' : ''} ${quizMessage && quizMessage.correctIndex === index ? 'correct' : ''}" data-choice="${index}" aria-pressed="${chosen === index}">${String.fromCharCode(65 + index)}. ${esc(choice)}</button>`).join('')}</div>`;
      const labels = { prediction: 'PREDICT THE OUTPUT', 'type-answer': 'FILL THE BLANK', 'bug-hunt': 'SPOT THE BUG', 'true-false': 'FACT OR FETCH?', rearrange: 'PUTT THE CODE IN ORDER', 'multiple-choice': 'CADDIE CHECK' };
      const headings = { prediction: 'Call the shot: what happens?', 'type-answer': 'Take a swing. Fill the blank.', 'bug-hunt': 'Find the syntax gremlin.', 'true-false': 'Fact or fetch?', rearrange: 'Rebuild the shot.', 'multiple-choice': 'Pick the caddie-approved answer.' };
      const ready = quiz.type === 'rearrange' || (quiz.type === 'type-answer' ? quizAnswer.trim().length > 0 : chosen !== null);
      return `<div class="lesson-card"><div class="eyebrow">STEP 2 · ${labels[quiz.type] || labels['multiple-choice']}</div><h2>${headings[quiz.type] || headings['multiple-choice']}</h2><p class="lead">${esc(quiz.question)}</p>${quiz.code ? `<pre class="question-code">${esc(quiz.code)}</pre>` : ''}${choices}${quizMessage ? `<div class="feedback ${quizMessage.ok ? 'success' : 'error'}" role="status"><span>${quizMessage.ok ? '✓' : '↗'}</span><span>${esc(quizMessage.message)}</span></div>` : ''}<div class="lesson-actions"><span class="small-copy">${quiz.type === 'rearrange' ? 'Use the arrows. The dog is an impatient foreman.' : quiz.type === 'bug-hunt' ? 'Choose the fix that stops the syntax gremlin.' : 'A guess is practice. You can try again.'}</span><button class="btn btn-primary" data-action="quiz-check" ${ready ? '' : 'disabled'}>Check answer</button></div></div>`;
    }
    if (step === 'fix') return `<div class="lesson-card"><div class="eyebrow">STEP 3 · BUG HUNT</div><h2>Help the dog untangle this code.</h2><p class="lead">${esc(lesson.fix.prompt)} The snippet has at least one issue.</p>${editor(lesson, 'fix', lesson.fix, `lesson-${lesson.id}-repair`)}<div class="lesson-actions"><span class="small-copy">A fix is about the idea, not exact spacing.</span><button class="btn btn-secondary" data-action="next-step">Write your own <span>→</span></button></div></div>`;
    if (step === 'build') return `<div class="lesson-card"><div class="eyebrow">STEP 4 · ${lesson.build.type === 'fill-blank' ? 'FILL IN THE BLANK' : 'YOUR TURN'}</div><h2>${lesson.build.type === 'fill-blank' ? 'Complete the missing line.' : 'Now you write it.'}</h2><p class="lead">${esc(lesson.build.prompt)} Build your answer from the idea, not by copying a finished script.</p>${editor(lesson, 'build', lesson.build, `lesson-${lesson.id}-quest`)}<div class="lesson-actions"><span class="small-copy">Course checker looks for the requested structure.</span><button class="btn btn-secondary" data-action="next-step">Explain the idea <span>→</span></button></div></div>`;
    if (step === 'explain') return renderExplain(lesson);
    return `<div class="lesson-card"><div class="eyebrow">OPTIONAL · ${lesson.challenge.type === 'boss-challenge' ? 'BOSS FIGHT' : 'SIDE QUEST'}</div><h2>${esc(lesson.challenge.title)}</h2><p class="lead">${esc(lesson.challenge.prompt)}</p>${p.challenge ? '<div class="feedback success" role="status">✓ Quest cleared. The dog has learned a new trick.</div>' : ''}${editor(lesson, 'challenge', lesson.challenge, `lesson-${lesson.id}-bonus`)}<div class="lesson-actions"><span class="small-copy">Bonus reward: +40 XP · optional</span><button class="btn btn-secondary" data-view="tree">Back to skill tree</button></div></div>`;
  }

  function renderExplain(lesson) {
    const key = `${lesson.id}:explain`;
    const saved = state().drafts[key] || '';
    const f = feedback[key];
    return `<div class="lesson-card"><div class="eyebrow">STEP 5 · TEACH IT BACK</div><h2>Explain it like the dog is listening.</h2><p class="lead">${esc(lesson.explain.question)}</p><label class="visually-hidden" for="explain-answer">Your explanation</label><textarea id="explain-answer" class="text-input" data-explain="true" placeholder="Use your own words. A short explanation is enough.">${esc(saved)}</textarea>${f ? `<div class="feedback ${f.ok ? 'success' : 'error'}" role="status"><span>${f.ok ? '✓' : '↗'}</span><span>${esc(f.message)}</span></div>` : ''}<div class="lesson-actions"><span class="small-copy">Keyword matching is flexible. No exact wording needed.</span><button class="btn btn-primary" data-action="explain-check">Check explanation</button></div></div>`;
  }

  function renderLesson() {
    const lesson = current(); const p = getProgress(lesson.id); const done = gatesDone(p);
    const reward = done ? `<section class="reward-banner"><div class="reward-icon">${lesson.id === 46 ? '🏆' : '🐾'}</div><h2>${lesson.id === 46 ? 'YOU LEARNED GDSCRIPT' : 'Lesson complete!'}</h2><p>${lesson.id === 46 ? 'You learned variables, logic, loops, functions, Godot, physics — and how to make a whole game happen.' : `You earned ${lesson.xp} lesson XP and added a new skill to your tool kit.`}</p><div class="reward-pills"><span>+${lesson.xp} lesson XP</span><span>Streak: ${state().streak} day${state().streak === 1 ? '' : 's'}</span><span>${completedCount()} / 46 complete</span></div><div class="button-row" style="justify-content:center">${lesson.id === 46 ? '<button class="btn btn-primary" data-view="project">START FINAL PROJECT →</button>' : `<button class="btn btn-primary" data-action="next-lesson">Next lesson →</button>`}<button class="btn btn-secondary" data-step="challenge">Optional bonus</button></div></section>` : '';
    return `<div class="content-width">${topline(esc(lesson.section).toUpperCase())}<div class="lesson-top"><button class="lesson-back" data-view="tree">← Skill tree</button><div class="lesson-meta"><span class="tag">${esc(lesson.difficulty)}</span><span class="tag">${lesson.minutes} min</span><span class="tag xp">✦ ${lesson.xp} XP</span></div></div><header class="lesson-heading"><div class="eyebrow">LESSON ${String(lesson.id).padStart(2,'0')} · ${esc(lesson.section.toUpperCase())}</div><h1>${esc(lesson.title)}</h1><p>Small steps make strong scripts. Take your time; your progress saves automatically.</p></header>${renderStepper(p)}${done ? `${reward}${lesson.id === 46 ? `<div class="final-unlock"><div style="font-size:35px">⛳ 🐕</div><h2>Untitled Funny Dog Golf Game</h2><p class="small-copy">The full project checklist is now unlocked.</p><button class="btn btn-primary" data-view="project">START FINAL PROJECT</button></div>` : ''}` : ''}<div class="lesson-work"><section>${step === 'explain' ? renderExplain(lesson) : lessonStep(lesson,p)}</section>${renderAside(lesson)}</div></div>`;
  }

  function renderChallenges() {
    const bosses = [10,18,28,38,46].map((id, index) => {
      const lesson = course.lessons[id - 1]; const unlocked = canOpen(id); const completed = Boolean(state().lessonProgress[id]?.challenge);
      return `<article class="module-card"><div class="module-card-head"><div class="module-icon">${index === 4 ? '👑' : '⚡'}</div><span class="tag ${completed ? 'xp' : ''}">${completed ? 'CLEARED' : unlocked ? 'READY' : 'LOCKED'}</span></div><h3>${esc(lesson.challenge.title)}</h3><p>${esc(lesson.challenge.story)} Bring your ${esc(lesson.title.toLowerCase())} skill to the showdown. (+40 XP)</p><button class="btn ${unlocked ? 'btn-primary' : 'btn-secondary'} btn-small" data-action="boss" data-id="${id}" ${unlocked ? '' : 'disabled'}>${unlocked ? (completed ? 'Replay fight' : 'Face the boss') : 'Unlock through lessons'} →</button></article>`;
    }).join('');
    const practice = `<section class="practice-yard" data-practice-yard aria-labelledby="practice-title"><div class="practice-heading"><div><div class="eyebrow">TAKE A CODE BREAK</div><h2 id="practice-title">The practice green</h2><p>Three holes, one heroic dog. Pick an angle, set the power, and sink the putt.</p></div><div class="practice-dog" aria-hidden="true">🐶⛳</div></div><div class="practice-score"><span data-hole>HOLE 1 / 3 · PAR 2</span><span>STROKES <b data-strokes>0</b></span></div><div class="practice-canvas-wrap"><canvas class="practice-canvas" aria-label="Dog golf practice green with a ball and cup"></canvas></div><div class="practice-controls"><label class="practice-control"><span>Aim <output data-angle-label>0°</output></span><input type="range" data-aim min="-10" max="40" value="0" aria-label="Shot angle"></label><label class="practice-control"><span>Power <output data-power-label>70%</output></span><input type="range" data-power min="20" max="100" value="70" aria-label="Shot power"></label><button class="btn btn-primary practice-shoot" data-practice-action="shoot">Take the shot ↗</button></div><div class="practice-footer"><p data-practice-status role="status" aria-live="polite">Set your aim and power, then shoot. Three holes. One very serious dog.</p><button class="btn btn-secondary btn-small" data-practice-action="next" hidden>Next hole →</button></div></section>`;
    return `<div class="content-width">${topline('SIDE QUESTS')}<header class="page-title"><div class="eyebrow">OPTIONAL PRACTICE</div><h1>Challenges & boss fights.</h1><p>Try a stretch goal when you feel ready. These won't block your course progress.</p></header>${practice}<div class="section-head"><div><h2>Boss fights</h2><p>Defeat a coding gremlin. Earn +40 XP.</p></div></div><div class="module-grid">${bosses}</div><section class="progress-panel" style="margin-top:16px"><div class="eyebrow">BONUS CODE</div><h3 style="margin:8px 0">Need another practice prompt?</h3><p class="small-copy">Open any available lesson and take its side quest for an extra dog-golf twist.</p><button class="btn btn-secondary btn-small" data-action="continue">Open your current lesson</button></section></div>`;
  }

  function renderProject() {
    const unlocked = allDone(); const project = state().project;
    const allTasks = course.projectPhases.flatMap((phase) => phase.tasks);
    const count = allTasks.filter((_, index) => Boolean(project[`task-${index}`])).length;
    const phases = course.projectPhases.map((phase) => {
      let offset = course.projectPhases.slice(0,course.projectPhases.indexOf(phase)).reduce((sum,item)=>sum+item.tasks.length,0);
      const checks = phase.tasks.map((task,index) => {
        const taskIndex = offset + index; const checked = Boolean(project[`task-${taskIndex}`]);
        return `<label class="check-row"><input type="checkbox" data-project="${taskIndex}" ${checked ? 'checked' : ''} ${unlocked ? '' : 'disabled'}><span>${esc(task)}</span></label>`;
      }).join('');
      const phaseDone = phase.tasks.filter((_,index)=>Boolean(project[`task-${offset+index}`])).length;
      return `<section class="project-phase"><div class="phase-heading"><h3>${esc(phase.name)}</h3><span>${phaseDone} / ${phase.tasks.length}</span></div>${checks}</section>`;
    }).join('');
    return `<div class="content-width">${topline('THE BIG PROJECT')}<header class="page-title"><div class="eyebrow">YOUR CAPSTONE</div><h1>Make the game only you could make.</h1><p>Turn your new GDScript skills into a goofy physics golf game. The checklist is yours to tackle in any order.</p></header>${unlocked ? `<section class="project-hero"><div><div class="eyebrow">${count ? 'PROJECT IN PROGRESS' : 'FINAL PROJECT UNLOCKED'}</div><h2>Untitled Funny Dog Golf Game</h2><p>A physics-based golf adventure with a dog, dubious hazards, satisfying shots, and room for your own weird ideas.</p><div class="project-progress" style="margin-top:14px">${count} / ${allTasks.length} tasks · ${percent(count,allTasks.length)}%</div></div><div class="project-dog" aria-hidden="true">🐕⛳</div></section><div class="progress-track" style="margin-top:12px"><div class="progress-fill" style="width:${percent(count,allTasks.length)}%"></div></div>${phases}` : `<section class="project-hero"><div><div class="eyebrow">A GAME IS TAKING SHAPE</div><h2>Untitled Funny Dog Golf Game</h2><p>Learn the building blocks first, then bring the dog to the green. Finish all 46 lessons to unlock this project checklist.</p><button class="btn btn-primary" style="margin-top:15px" data-action="continue">Continue lesson ${nextLessonId()} →</button></div><div class="project-dog" aria-hidden="true">🐕</div></section><div class="locked-note" style="margin-top:11px">Project preview · checklist unlocks at 46 / 46 lessons</div><div class="locked-overlay">${phases}</div>`}</div>`;
  }

  function renderAchievements() {
    const earned = state().achievements;
    const cards = game.badges.map((badge) => `<article class="badge-card ${earned.includes(badge.id) ? '' : 'locked'}"><div class="badge-icon">${esc(badge.icon)}</div><strong>${esc(badge.title)} ${earned.includes(badge.id) ? '✓' : '· · ·'}</strong><p>${esc(badge.detail)}</p></article>`).join('');
    return `<div class="content-width">${topline('THE TROPHY SHELF')}<header class="page-title"><div class="eyebrow">MILESTONES</div><h1>Little wins add up.</h1><p>Achievements celebrate the skills you’ve practiced. No streak pressure, no timers.</p></header><div class="stat-grid" style="margin-bottom:15px"><article class="stat-card"><div class="stat-label">Unlocked</div><div class="stat-number">${earned.length} / ${game.badges.length}</div></article><article class="stat-card"><div class="stat-label">Lessons finished</div><div class="stat-number">${completedCount()} / 46</div></article></div><div class="achievement-grid">${cards}</div></div>`;
  }

  function renderProfile() {
    const s = state(); const lvl = game.levelInfo(s.xp); const categoryCounts = [...new Set(course.lessons.map((lesson) => lesson.category))].map((category) => {
      const all = course.lessons.filter((lesson) => lesson.category === category); const done = all.filter((lesson) => s.completed.includes(lesson.id)).length;
      return { name: ({data:'Values & logic',logic:'Decisions',function:'Functions',repeat:'Loops',collection:'Collections',structure:'Code craft',godot:'Godot',physics:'Game programming',systems:'Game systems'})[category], done, total: all.length };
    });
    const recent = (s.recent || []).map((item) => `<div class="lesson-mini done"><div class="lesson-mini-icon">✓</div><div class="lesson-mini-copy"><strong>${esc(item.title)}</strong><small>Lesson completed · ${esc(item.date)}</small></div></div>`).join('') || '<div class="empty-state">Finish a lesson and your recent activity will show up here.</div>';
    return `<div class="content-width">${topline('CODER PROFILE')}<header class="page-title"><div class="eyebrow">YOUR STATS, YOUR WAY</div><h1>Look how far you’ve come.</h1><p>Everything is saved on this device. Your adventure belongs to you.</p></header><div class="profile-layout"><section class="profile-card"><div class="profile-level"><div class="level-orb">${lvl.level}</div><div><div class="eyebrow">CODER LEVEL ${lvl.level}</div><h2 style="font-size:19px;margin:3px 0">Quest learner</h2><p style="margin:0">${s.profile.goal ? `Learning for: ${esc(s.profile.goal)}` : 'Building the next big idea, one line at a time.'}</p></div></div><div class="divider"></div><div class="progress-panel-top"><strong style="font-size:11px">Level progress</strong><span>${lvl.into} / ${lvl.next} XP</span></div><div class="progress-track"><div class="progress-fill" style="width:${lvl.pct}%"></div></div><p style="margin:9px 0 0">${s.xp.toLocaleString()} total XP · ${s.streak} day streak</p></section><section class="profile-card"><div class="stat-label">COURSE STATS</div><div class="stat-grid" style="margin-top:12px;grid-template-columns:1fr 1fr"><div><div class="stat-number">${completedCount()}</div><div class="stat-note">lessons finished</div></div><div><div class="stat-number">${s.achievements.length}</div><div class="stat-note">achievements</div></div></div><div class="divider"></div><button class="btn btn-secondary btn-small" data-view="achievements">See achievement shelf →</button></section></div><div class="section-head"><div><h2>Skill strengths</h2><p>Practice grows each skill over time.</p></div></div><div class="module-grid">${categoryCounts.map((item) => `<div class="profile-card"><div class="progress-panel-top"><strong style="font-size:12px">${esc(item.name)}</strong><span>${item.done} / ${item.total}</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent(item.done,item.total)}%"></div></div></div>`).join('')}</div><div class="section-head"><div><h2>Recent activity</h2><p>Your latest course milestones.</p></div></div><div class="lesson-list">${recent}</div></div>`;
  }

  function renderSettings() {
    const settings = state().settings;
    const toggle = (key, title, description) => `<div class="setting-row"><div><strong>${title}</strong><small>${description}</small></div><button class="switch" role="switch" aria-checked="${Boolean(settings[key])}" data-toggle="${key}" aria-label="${title}"></button></div>`;
    return `<div class="content-width">${topline('MAKE IT YOURS')}<header class="page-title"><div class="eyebrow">PREFERENCES</div><h1>Set up your quest.</h1><p>Changes save automatically on this device.</p></header><div class="settings-list"><div class="setting-row"><div><strong>Color theme</strong><small>Pick the look that feels right.</small></div><select data-setting="theme" aria-label="Color theme"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option></select></div>${toggle('reducedMotion','Reduce motion','Limit celebratory and interface animations.')}${toggle('sound','UI sounds','Play a tiny sound on success. Off by default.') }<div class="setting-row"><div><strong>Reading size</strong><small>Adjust the course text size.</small></div><select data-setting="fontSize" aria-label="Reading size"><option value="90" ${settings.fontSize === 90 ? 'selected' : ''}>Compact</option><option value="100" ${settings.fontSize === 100 ? 'selected' : ''}>Standard</option><option value="110" ${settings.fontSize === 110 ? 'selected' : ''}>Large</option><option value="120" ${settings.fontSize === 120 ? 'selected' : ''}>Extra large</option></select></div></div><section class="progress-panel" style="margin-top:16px"><div class="eyebrow danger">START OVER</div><h3 style="margin:8px 0">Reset all progress</h3><p class="small-copy">Erase lessons, XP, streaks, achievements, settings and project progress from this browser.</p><button class="btn btn-quiet danger-btn btn-small" data-action="reset-open">Reset all progress</button></section></div>`;
  }

  function onboarding() {
    if (state().onboarded) return '';
    return `<div class="onboarding-backdrop"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="onboard-title"><div class="eyebrow">WELCOME TO THE QUEST</div><h2 id="onboard-title">First, tell us a tiny bit about you.</h2><p>These answers shape your welcome. They never lock lessons or change your rewards.</p><div class="onboard-question"><strong>How much programming have you done?</strong><div class="radio-options">${['None','A little','Some','A lot'].map((value,index)=>`<label class="radio-choice"><input type="radio" name="experience" value="${esc(value)}" ${index===0?'checked':''}><span>${esc(value)}</span></label>`).join('')}</div></div><div class="onboard-question"><strong>What do you want to make?</strong><div class="radio-options">${['Games','Tools','Mods','Just learning'].map((value,index)=>`<label class="radio-choice"><input type="radio" name="goal" value="${esc(value)}" ${index===0?'checked':''}><span>${esc(value)}</span></label>`).join('')}</div></div><div class="modal-actions"><button class="btn btn-primary" data-action="onboard">Start my quest →</button></div></section></div>`;
  }

  function resetModal() {
    if (!resetDialog) return '';
    return `<div class="confirm-backdrop"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div class="eyebrow danger">THIS CANNOT BE UNDONE</div><h2 id="reset-title">Reset all progress?</h2><p>This will erase your lessons, XP, streaks, achievements, and project progress. This cannot be undone.</p><div class="modal-actions"><button class="btn btn-secondary" data-action="reset-cancel">CANCEL</button><button class="btn btn-primary" style="background:var(--red);color:#fff" data-action="reset-confirm">RESET EVERYTHING</button></div></section></div>`;
  }

  function render() {
    const pages = { dashboard: renderDashboard, tree: renderTree, lesson: renderLesson, challenges: renderChallenges, project: renderProject, achievements: renderAchievements, profile: renderProfile, settings: renderSettings };
    document.body.classList.toggle('light', state().settings.theme === 'light');
    document.documentElement.style.setProperty('--font-scale', String((state().settings.fontSize || 100) / 100));
    document.body.classList.toggle('motion-reduce', Boolean(state().settings.reducedMotion));
    main.innerHTML = `${(pages[view] || renderDashboard)()}${onboarding()}${resetModal()}`;
    if (view === 'challenges') window.QuestPractice?.mount(main);
    else window.QuestPractice?.unmount();
    document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === view || (view === 'lesson' && item.dataset.view === 'tree')));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open', mobileMenuOpen);
    const menuButton = document.querySelector('[data-action="mobile-menu"]');
    if (menuButton) { menuButton.setAttribute('aria-expanded', String(mobileMenuOpen)); menuButton.setAttribute('aria-label', mobileMenuOpen ? 'Close navigation' : 'Open navigation'); }
    if (celebration) celebration = false;
  }

  function openLesson(id, desiredStep = 'learn') {
    if (!canOpen(id)) { toast('Finish the earlier lesson to unlock this one.'); return; }
    lessonId = id; view = 'lesson'; step = desiredStep;
    const lineCount = course.lessons[id - 1].quiz.lines?.length || 2;
    const savedOrder = getProgress(id).rearrangeOrder;
    rearrangeOrder = savedOrder.length === lineCount ? [...savedOrder] : Array.from({ length: lineCount }, (_, index) => index);
    selectedChoice = null; quizAnswer = ''; feedback = {}; mobileMenuOpen = false; render(); window.scrollTo(0,0);
  }

  function persistEditor(kind, value) {
    const s = state(); s.drafts[`${lessonId}:${kind}`] = value; storage.save();
    const lineBox = document.querySelector(`[data-lines="${kind}"]`);
    if (lineBox) lineBox.textContent = Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1).join('\n');
  }

  function checkEditor(kind) {
    const lesson = current(); const config = lesson[kind];
    const textarea = document.querySelector(`[data-editor="${kind}"]`);
    if (!textarea) return;
    game.activity(state());
    const code = textarea.value; persistEditor(kind, code);
    const result = validator.checkCode(code, config.required, kind);
    const p = getProgress(lesson.id); const key = `${lesson.id}:${kind}`;
    if (result.ok) {
      p[kind] = true;
      const usedSolution = Boolean(p.revealed[kind]);
      award(`${key}:checked`, usedSolution ? (kind === 'fix' ? 15 : 15) : (kind === 'challenge' ? 40 : 25));
      feedback[key] = result;
      if (kind === 'challenge') p.challenge = true;
      storage.save();
      if (kind !== 'challenge' && gatesDone(p)) completeLesson(lesson.id);
    } else {
      p.attempts[kind] = (p.attempts[kind] || 0) + 1; feedback[key] = result; storage.save();
    }
    render();
  }

  function checkQuiz() {
    const lesson = current();
    const quiz = lesson.quiz;
    const typed = quiz.type === 'type-answer';
    const arranged = quiz.type === 'rearrange';
    if (!arranged && !(typed ? quizAnswer.trim() : selectedChoice !== null)) return;
    game.activity(state());
    const p = getProgress(lesson.id);
    const correct = arranged
      ? rearrangeOrder.every((line, index) => line === quiz.correctOrder[index])
      : typed
        ? quiz.accepted.some((answer) => validator.normalize(answer) === validator.normalize(quizAnswer))
        : selectedChoice === quiz.correct;
    const cheer = { prediction: 'Clean shot!', 'type-answer': 'Right on the nose!', 'bug-hunt': 'Syntax gremlin spotted!', 'true-false': 'The dog gives that a paw-stamp!', rearrange: 'Code in order. Tail wagging.', 'multiple-choice': 'Caddie-approved!' };
    const nudge = { prediction: 'Read the values from top to bottom, then take another shot.', 'type-answer': 'Close! Think of the keyword or value that fits the blank.', 'bug-hunt': 'That gremlin is still loose. Check the punctuation or operator.', 'true-false': 'Not quite. Think through what the code actually does.', rearrange: 'Almost! A function header goes before its indented instructions.', 'multiple-choice': 'Not that one. Reread the snippet and try another.' };
    if (correct) {
      p.quiz = true;
      feedback.quiz = { ok: true, correctIndex: typed || arranged ? null : selectedChoice, message: `${cheer[quiz.type] || cheer['multiple-choice']} ${quiz.explanation}` };
      award(`lesson:${lesson.id}:quiz`, 10);
    } else {
      feedback.quiz = { ok: false, correctIndex: null, message: nudge[quiz.type] || nudge['multiple-choice'] };
    }
    storage.save(); render();
  }

  function checkExplain() {
    const lesson = current(); const key = `${lesson.id}:explain`;
    const input = document.querySelector('[data-explain]'); if (!input) return;
    game.activity(state());
    state().drafts[key] = input.value; storage.save();
    const result = validator.checkExplanation(input.value, lesson.explain.keywords);
    feedback[key] = result;
    if (result.ok) {
      const p = getProgress(lesson.id); p.explain = true;
      award(`${key}:checked`, 15); storage.save();
      if (gatesDone(p)) completeLesson(lesson.id);
    }
    render();
  }

  function nextStep() {
    const index = steps.findIndex(([key]) => key === step);
    if (step === 'learn') award(`lesson:${lessonId}:read`, 5);
    if (step === 'explain' && gatesDone(getProgress(lessonId))) completeLesson(lessonId);
    step = steps[Math.min(steps.length - 1, index + 1)][0]; render();
  }

  function toggleProject(index, checked) {
    const s = state(); s.project[`task-${index}`] = checked;
    game.activity(s);
    if (checked) award(`project:started`, 0);
    const badges = checked ? game.unlock(s) : [];
    const allTasks = course.projectPhases.flatMap((phase) => phase.tasks);
    let offset = 0;
    course.projectPhases.forEach((phase, phaseIndex) => {
      const phaseIndexes = phase.tasks.map((_, i) => offset + i);
      if (phaseIndexes.every((taskIndex) => Boolean(s.project[`task-${taskIndex}`]))) award(`project:phase:${phaseIndex}`, 200);
      offset += phase.tasks.length;
    });
    storage.save(); badges.forEach((badge) => toast(`Achievement unlocked: ${badge.title}`, 'xp-toast'));
    render();
  }

  function handleAction(button) {
    const action = button.dataset.action;
    if (action === 'continue') { openLesson(nextLessonId()); return; }
    if (action === 'next-step') { nextStep(); return; }
    if (action === 'next-lesson') { openLesson(Math.min(46, lessonId + 1)); return; }
    if (action === 'quiz-check') { checkQuiz(); return; }
    if (action === 'reorder-move') {
      const from = Number(button.dataset.position); const to = from + Number(button.dataset.delta);
      if (to >= 0 && to < rearrangeOrder.length) {
        [rearrangeOrder[from], rearrangeOrder[to]] = [rearrangeOrder[to], rearrangeOrder[from]];
        getProgress(lessonId).rearrangeOrder = [...rearrangeOrder]; storage.save(); render();
      }
      return;
    }
    if (action === 'explain-check') { checkExplain(); return; }
    if (action === 'code-check') { checkEditor(button.dataset.kind); return; }
    if (action === 'hint') {
      const p = getProgress(lessonId); const kind = button.dataset.kind;
      p.hints[kind] = Math.min(3, (p.hints[kind] || 0) + 1); storage.save(); render(); return;
    }
    if (action === 'solution') {
      const kind = button.dataset.kind; const lesson = current(); const p = getProgress(lessonId); const key = `${lessonId}:${kind}`;
      p.revealed[kind] = true; state().drafts[key] = lesson[kind].solution || lesson.build.solution; storage.save();
      feedback[key] = { ok: false, message: 'Solution shown. Read each line, then use your own words to explain how it works. The exercise reward is gentler now.' };
      render(); return;
    }
    if (action === 'code-reset' || action === 'code-clear' || action === 'code-example') {
      const kind = button.dataset.kind; const key = `${lessonId}:${kind}`; const lesson = current();
      state().drafts[key] = action === 'code-clear' ? '' : action === 'code-example' ? lesson.example : (lesson[kind].starter || '');
      delete feedback[key]; storage.save(); render(); return;
    }
    if (action === 'code-copy') {
      const area = document.querySelector(`[data-editor="${button.dataset.kind}"]`);
      if (area && navigator.clipboard?.writeText) navigator.clipboard.writeText(area.value).then(() => toast('Code copied to clipboard.')).catch(() => toast('Clipboard access is not available here.'));
      else toast('Clipboard access is not available here.');
      return;
    }
    if (action === 'onboard') {
      state().profile.experience = document.querySelector('input[name="experience"]:checked')?.value || 'None';
      state().profile.goal = document.querySelector('input[name="goal"]:checked')?.value || 'Games';
      state().onboarded = true; storage.save(); render(); toast(`Awesome. We'll start at the beginning and build up.`); return;
    }
    if (action === 'reset-open') { resetDialog = true; render(); return; }
    if (action === 'reset-cancel') { resetDialog = false; render(); return; }
    if (action === 'reset-confirm') { storage.reset(); resetDialog = false; view = 'dashboard'; lessonId = 1; step = 'learn'; feedback = {}; selectedChoice = null; quizAnswer = ''; render(); toast('Your quest is ready for a fresh start.'); return; }
    if (action === 'mobile-menu') { mobileMenuOpen = !mobileMenuOpen; render(); return; }
    if (action === 'boss') { openLesson(Number(button.dataset.id), 'challenge'); return; }
  }

  app.addEventListener('click', (event) => {
    const target = event.target.closest('button, [data-view], [data-lesson], [data-step], [data-choice]');
    if (!target) return;
    if (target.dataset.action) { handleAction(target); return; }
    if (target.dataset.toggle) {
      const key = target.dataset.toggle;
      state().settings[key] = !state().settings[key]; storage.save(); render(); return;
    }
    if (target.dataset.view) { view = target.dataset.view; mobileMenuOpen = false; render(); window.scrollTo(0,0); return; }
    if (target.dataset.lesson) { openLesson(Number(target.dataset.lesson)); return; }
    if (target.dataset.step) { step = target.dataset.step; render(); return; }
    if (target.dataset.choice !== undefined) { selectedChoice = Number(target.dataset.choice); render(); }
  });

  app.addEventListener('quest:practice-clear', () => {
    const result = award('practice-yard:course-clear', 25);
    if (result.xp && !state().settings.reducedMotion) showConfetti();
  });

  app.addEventListener('input', (event) => {
    const editorArea = event.target.closest('[data-editor]');
    if (editorArea) persistEditor(editorArea.dataset.editor, editorArea.value);
    if (event.target.matches('[data-explain]')) { state().drafts[`${lessonId}:explain`] = event.target.value; storage.save(); }
    if (event.target.matches('[data-quiz-answer]')) quizAnswer = event.target.value;
  });

  app.addEventListener('change', (event) => {
    if (event.target.matches('[data-setting]')) {
      const key = event.target.dataset.setting;
      state().settings[key] = key === 'fontSize' ? Number(event.target.value) : event.target.value;
      storage.save(); render();
    }
    if (event.target.matches('[data-project]')) toggleProject(Number(event.target.dataset.project), event.target.checked);
  });

  app.addEventListener('keydown', (event) => {
    if (event.target.matches('[data-editor]') && event.key === 'Tab') {
      event.preventDefault();
      const area = event.target; const start = area.selectionStart; const end = area.selectionEnd;
      area.setRangeText('    ', start, end, 'end'); area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (event.target.matches('[data-lesson][role="button"]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); openLesson(Number(event.target.dataset.lesson));
    }
  });

  render();
})();
