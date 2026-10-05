/* Deterministic teaching checks. Submitted GDScript is never executed. */
(() => {
  const normalize = (text) => String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .toLowerCase();

  function checkCode(text, requirements, kind = 'build') {
    const code = normalize(text);
    const raw = String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().toLowerCase();
    const checksComment = requirements.some((part) => String(part).trim().startsWith('#'));
    if (!code && !(checksComment && raw)) return { ok: false, message: 'Give it a try: add a line of GDScript first.' };

    if (/\bif\s+\w+\s*=\s*[^=]/i.test(code)) {
      return { ok: false, message: 'Almost! A single = assigns a value. In an if condition, use == to compare values.' };
    }
    if (/\b(?:var|const)\s+[a-z_]\w*\s*==/.test(code)) {
      return { ok: false, message: 'A declaration uses = to assign its starting value. Use == when comparing two values.' };
    }
    if (/=>/.test(code)) {
      return { ok: false, message: 'Tiny symbol mix-up: GDScript uses <= for “less than or equal to,” not =>.' };
    }
    if (/for\s+\w+\s+\w+/.test(code) && !/\bin\b/.test(code)) {
      return { ok: false, message: 'A for loop needs the word in between the item name and the collection.' };
    }
    if (/^func\s+\w+\s*$/m.test(code)) {
      return { ok: false, message: 'A function declaration needs parentheses and a colon, like func bark():' };
    }
    if (/^func\s+\w+\s*\(.*\)\s*$/m.test(code)) {
      return { ok: false, message: 'A function declaration needs a colon after its closing parenthesis.' };
    }
    if (/^(?:if|elif|else|for|while)\b[^\n]*$/m.test(code.split('\n').filter((line) => /^(?:if|elif|else|for|while)\b/.test(line) && !/:$/.test(line)).join('\n'))) {
      return { ok: false, message: 'This control-flow line needs a colon at the end before its indented block.' };
    }
    const searchable = checksComment ? raw : code;
    const missing = requirements.filter((part) => !searchable.includes(normalize(part)));
    if (!missing.length) return { ok: true, message: kind === 'fix' ? 'Syntax repaired. The dog approves.' : 'Nice work. Your code shows the idea the exercise asked for.' };
    return { ok: false, message: `You're close! Check that your code includes: ${missing.join(', ')}. Use a hint if you want a nudge.` };
  }

  function checkExplanation(text, keywords) {
    const answer = normalize(text);
    if (answer.length < 5) return { ok: false, message: 'Add a few words so we can understand your explanation.' };
    const matches = keywords.filter((word) => answer.includes(normalize(word)));
    if (matches.length >= 1) return { ok: true, message: 'That explanation gets the key idea across. Teaching the dog counts as practice!' };
    if (keywords.includes('assign') && answer.includes('compare')) return { ok: false, message: 'Good comparison idea. Remember, a single = assigns a value; == compares two values.' };
    return { ok: false, message: `Not quite yet. Try including an idea like “${keywords.slice(0, 2).join('” or “')}.”` };
  }

  window.QuestValidator = { checkCode, checkExplanation, normalize };
})();
