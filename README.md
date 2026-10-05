# GDScript Quest

**Learn GDScript. Build games. Become dangerous with code.**

GDScript Quest is a free, interactive course for Godot 4-style GDScript. It guides learners from their first variables through Godot nodes, physics, game systems, and a final project: **Untitled Funny Dog Golf Game**.

The course is a static website. It needs no account, backend, database, API key, build step, package install, or paid service. Course progress is saved in this browser with `localStorage`.

## Run locally

For a reliable local preview, run this command in the project folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. This serves the static files only; the site itself has no backend. You can also open `index.html` directly to preview the UI, though some browsers restrict persistent storage and offline caching on `file://` pages. Once served over localhost or HTTPS and loaded, the app shell is cached for later offline visits.

## Publish with GitHub Pages

1. Create a GitHub repository and upload the files in this folder to its root.
2. Open the repository’s **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose the branch that contains the files and the `/ (root)` folder, then save.
5. Open the Pages URL shown in the repository settings.

All links and assets use relative paths, and there is no server-side routing or build step.

## Files

```text
index.html       Semantic page shell and local script/style references
favicon.svg      Small custom browser tab icon
style.css        Responsive dark/light themes and interface styling
accessibility.css Focus indicators and explicit reduced-motion preference
offline.js       Registers the offline cache when served over HTTPS or localhost
service-worker.js Caches the static app shell for later offline visits
course-data.js   The 46 structured lesson prompts and final-project phases
app.js           Navigation, lesson flow, editor UI, settings and rendering
validator.js     Safe, deterministic checks for code and written answers
storage.js       Versioned localStorage state and progress drafts
gamification.js  XP, levels, streaks and achievement rules
README.md        Setup, hosting and course editing guide
```

## How lessons work

Each lesson includes a plain-language explanation, a small GDScript example, a dog-golf connection, a question, a repair exercise, a write-it-yourself task, and a short explain-it-back response. Questions vary across prediction, true/false, and line ordering; some writing prompts are fill-in-the-blank. Optional bonus and boss challenges add another way to practice. Hints appear one at a time; the solution button appears after three unsuccessful code checks. A revealed solution lowers that exercise’s XP reward without blocking progress.

The course checker looks for the requested code structure and selected tokens, strips comments for those checks, and gives feedback for common mistakes. It **does not execute GDScript**, parse the full language, or run Godot. A passing check means the submission matches the lesson’s learning pattern; it is not a guarantee that a script will run in Godot unchanged.

## Edit or add lesson content

Edit `course-data.js`. Lessons are grouped into sections. Each lesson row follows this order:

```js
[
  title, category, concept, example, dogGolfConnection,
  writeTask, starterCode, requiredCodeFragments, solution,
  predictionQuestion, explanationKeywords, feedbackExplanation
]
```

For example, a row begins with a title such as `Variables` and a category such as `data`. Categories currently used are `data`, `logic`, `function`, `repeat`, `collection`, `structure`, `godot`, `physics`, and `systems`. The app derives the lesson number, section, difficulty, quiz choices, repair exercise, and reward from the row. Keep the required fragments specific enough to check the goal, but flexible enough to allow equivalent formatting.

To add a new exercise type or a different validation rule, update `validator.js` and the lesson rendering/check flow in `app.js`. Never evaluate or execute submitted editor text; the editor is intentionally a checker, not a runtime.

## XP and progress

- Reading a lesson section: **5 XP**, once per lesson
- Correct prediction: **10 XP**, once per lesson
- Repair and write exercises: **25 XP each**, once each (15 XP if that exercise’s solution was revealed)
- Explain-it-back response: **15 XP**, once per lesson
- Lesson completion: **50 XP**, once per lesson
- Optional bonus challenge: **40 XP**, once per lesson
- Completing a final-project phase: **200 XP**, once per phase

Completing every step in a lesson can award up to **130 XP** across those actions. The lesson card shows the 50 XP completion reward. The level threshold starts at 250 XP and grows gradually. A streak advances on activity days and continues when the next activity is on the following local calendar day. Nothing expires, and streaks do not gate course access.

## Where progress is stored

The site stores state under `gdscript_quest_save` in this browser’s `localStorage`. It includes completed lessons, XP, streak and last activity date, achievements, project checklist, settings, and editor drafts. Clearing browser storage removes that local save. **Settings → Reset all progress** also clears it after a confirmation step. There is no account sync or cross-device backup.

## Accessibility and privacy

The site supports keyboard navigation, visible focus, labels for inputs, reduced motion, text sizing, and dark/light themes. UI sounds are off by default. Lesson text, code checks, and saves stay in the browser; the app sends no analytics or user data to a service.
