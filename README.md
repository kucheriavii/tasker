# tasker

Personal nested task tracker: Angular UI + zero-dependency Node API with SQLite (built-in `node:sqlite`, Node >= 22.5).

- Unlimited subtask nesting, custom status list (`done` statuses are struck through, never removed)
- Task page: description, images (drop / paste / upload), subtasks, breadcrumbs
- Progress gauge per task = finished leaf tasks in its subtree
- Deleted tasks go to trash (restore / purge)
- Data: `server/data/tasker.db` (override dir with env `TASKER_DATA_DIR`)

## Run

```n npm install
 npm start   # API :3000 + UI :4200
```n
Open http://localhost:4200.


## Import plan from a table of contents (AI)

Header button `[import]`: paste a link, text of a table of contents, or a screenshot (drop / Ctrl+V). Gemini turns it into a draft (title + chapters/lessons), you edit it and press *create tasks*.

1. Get a key: https://aistudio.google.com/apikey
2. Copy `.env.example` to `.env`, set `GEMINI_API_KEY`, restart `npm start`.

Note: Udemy blocks automatic page loading (HTTP 403), so for Udemy paste the curriculum text or a screenshot.

YouTube playlists: paste a playlist link into `[import]` — videos become subtasks (no AI key needed; public/unlisted playlists).
