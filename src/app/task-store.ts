import { Injectable, signal, effect } from '@angular/core';
import { AppState, Status, Task } from './models';

const KEY = 'tasker.v1';

const DEFAULT_STATE: AppState = {
  statuses: [
    { id: 's-todo', name: 'todo', done: false },
    { id: 's-doing', name: 'in progress', done: false },
    { id: 's-blocked', name: 'blocked', done: false },
    { id: 's-done', name: 'done', done: true },
  ],
  tasks: [],
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Plain-data state + pure-ish mutations, persisted to localStorage.
 * Kept framework-light so the model/logic ports easily to Swift later.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  readonly state = signal<AppState>(this.load());

  constructor() {
    effect(() => localStorage.setItem(KEY, JSON.stringify(this.state())));
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as AppState;
    } catch {}
    return structuredClone(DEFAULT_STATE);
  }

  private mutate(fn: (s: AppState) => void) {
    const next = structuredClone(this.state());
    fn(next);
    this.state.set(next);
  }

  private find(list: Task[], id: string): { list: Task[]; index: number } | null {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list, index: i };
      const r = this.find(list[i].children, id);
      if (r) return r;
    }
    return null;
  }

  isDone(statusId: string): boolean {
    return !!this.state().statuses.find((s) => s.id === statusId)?.done;
  }

  addTask(parentId: string | null, title: string) {
    title = title.trim();
    if (!title) return;
    this.mutate((s) => {
      const t: Task = {
        id: uid(),
        title,
        statusId: s.statuses[0]?.id ?? '',
        collapsed: false,
        children: [],
      };
      if (parentId === null) s.tasks.push(t);
      else {
        const r = this.find(s.tasks, parentId);
        if (r) {
          const p = r.list[r.index];
          p.children.push(t);
          p.collapsed = false;
        }
      }
    });
  }

  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'statusId' | 'collapsed'>>) {
    this.mutate((s) => {
      const r = this.find(s.tasks, id);
      if (r) Object.assign(r.list[r.index], patch);
    });
  }

  removeTask(id: string) {
    this.mutate((s) => {
      const r = this.find(s.tasks, id);
      if (r) r.list.splice(r.index, 1);
    });
  }

  // ---- statuses ----
  addStatus(name: string) {
    name = name.trim();
    if (!name) return;
    this.mutate((s) => s.statuses.push({ id: uid(), name, done: false }));
  }

  updateStatus(id: string, patch: Partial<Pick<Status, 'name' | 'done'>>) {
    this.mutate((s) => {
      const st = s.statuses.find((x) => x.id === id);
      if (st) Object.assign(st, patch);
    });
  }

  moveStatus(id: string, dir: -1 | 1) {
    this.mutate((s) => {
      const i = s.statuses.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.statuses.length) return;
      [s.statuses[i], s.statuses[j]] = [s.statuses[j], s.statuses[i]];
    });
  }

  /** Removes a status; its tasks fall back to the first remaining status. Last status can't be removed. */
  removeStatus(id: string) {
    this.mutate((s) => {
      if (s.statuses.length <= 1) return;
      s.statuses = s.statuses.filter((x) => x.id !== id);
      const fallback = s.statuses[0].id;
      const walk = (list: Task[]) =>
        list.forEach((t) => {
          if (t.statusId === id) t.statusId = fallback;
          walk(t.children);
        });
      walk(s.tasks);
    });
  }
}
