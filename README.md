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

