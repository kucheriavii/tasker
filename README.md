# tasker

Personal nested task tracker (Angular, monospace light UI).

- Unlimited subtask nesting
- Custom status list (rename/reorder/mark as 'done'); done tasks are struck through but stay in the list
- Data stored in localStorage (key `tasker.v1`)

## Run

```n npm install
 npm start
```n
Open http://localhost:4200. Logic lives in `src/app/task-store.ts` / `models.ts` (plain data model, easy to port to Swift/iOS).

