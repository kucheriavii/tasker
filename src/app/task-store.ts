import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiData, LibraryItem, Status, Task, TaskRow } from './models';

/**
 * Thin client over the SQLite-backed REST API (server/server.mjs).
 * Server is the source of truth; every mutation re-fetches the state.
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private http = inject(HttpClient);

  readonly data = signal<ApiData>({ statuses: [], tasks: [] });
  readonly library = signal<LibraryItem[]>([]);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  /** Task currently opened in the detail view (null = root list). */
  readonly openId = signal<string | null>(null);
  /** Currently dragged task ID for Drag & Drop. */
  readonly draggedId = signal<string | null>(null);

  readonly statuses = computed(() => this.data().statuses);
  private doneIds = computed(() => new Set(this.statuses().filter((s) => s.done).map((s) => s.id)));
  private cancelledIds = computed(() => new Set(this.statuses().filter((s) => s.cancelled).map((s) => s.id)));

  /** Forest of non-deleted tasks, with progress computed. */
  readonly tree = computed<Task[]>(() => {
    const done = this.doneIds();
    const cancelled = this.cancelledIds();
    const rows = this.data().tasks.filter((t) => !t.deletedAt);
    const byParent = new Map<string | null, TaskRow[]>();
    for (const r of rows) {
      const k = r.parentId;
      (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(r);
    }
    const build = (r: TaskRow): Task => {
      const children = (byParent.get(r.id) ?? []).map(build);
      let leafTotal = 0, leafDone = 0;
      if (children.length) {
        for (const c of children) { leafTotal += c.leafTotal; leafDone += c.leafDone; }
      } else {
        const skip = cancelled.has(r.statusId); // cancelled leaves don't count
        leafTotal = skip ? 0 : 1;
        leafDone = !skip && done.has(r.statusId) ? 1 : 0;
      }
      return { ...r, children, leafTotal, leafDone, progress: leafTotal ? leafDone / leafTotal : 0 };
    };
    return (byParent.get(null) ?? []).map(build);
  });

  private index = computed(() => {
    const m = new Map<string, Task>();
    const walk = (l: Task[]) => l.forEach((t) => { m.set(t.id, t); walk(t.children); });
    walk(this.tree());
    return m;
  });

  /** Trashed tasks (flat, newest first). */
  readonly trash = computed<TaskRow[]>(() =>
    this.data().tasks.filter((t) => t.deletedAt).sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!)));

  readonly open = computed<Task | null>(() => {
    const id = this.openId();
    return id ? (this.index().get(id) ?? null) : null;
  });

  /** Path from root to the opened task (inclusive). */
  readonly breadcrumbs = computed<Task[]>(() => {
    const idx = this.index();
    const out: Task[] = [];
    let cur = this.open();
    while (cur) { out.unshift(cur); cur = cur.parentId ? idx.get(cur.parentId) ?? null : null; }
    return out;
  });

  constructor() {
    this.refresh();
    this.refreshLibrary();
  }

  isDone(statusId: string): boolean { return this.doneIds().has(statusId); }
  isCancelled(statusId: string): boolean { return this.cancelledIds().has(statusId); }

  async refresh() {
    try {
      this.data.set(await firstValueFrom(this.http.get<ApiData>('/api/data')));
      this.error.set(null);
    } catch {
      this.error.set('API is not reachable. Start it with: npm start');
    }
    this.loaded.set(true);
  }

  async refreshLibrary() {
    try {
      this.library.set(await firstValueFrom(this.http.get<LibraryItem[]>('/api/library')));
    } catch {}
  }

  private async call(p: Promise<unknown>) {
    try {
      await p;
    } catch (e: any) {
      this.error.set(e?.error?.error || 'request failed');
    }
    await this.refresh();
  }

  addTask(parentId: string | null, title: string) {
    if (!title.trim()) return;
    return this.call(firstValueFrom(this.http.post('/api/tasks', { parentId, title })));
  }
  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'statusId' | 'collapsed'>>) {
    return this.call(firstValueFrom(this.http.patch(`/api/tasks/${id}`, patch)));
  }
  /** Drag & Drop: reorder before/after targetId, or move inside targetId as a subtask. */
  moveTask(id: string, targetId: string | null, mode: 'before' | 'after' | 'inside') {
    if (!id || id === targetId) return;
    return this.call(firstValueFrom(this.http.post(`/api/tasks/${id}/move`, { targetId, mode })));
  }
  /** Moves task (with subtree) to trash. */
  removeTask(id: string) {
    if (this.openId() === id || this.breadcrumbs().some((b) => b.id === id)) {
      this.openId.set(this.index().get(id)?.parentId ?? null);
    }
    return this.call(firstValueFrom(this.http.delete(`/api/tasks/${id}`)));
  }
  /** Sets every subtask (any depth) of a task to the given status. */
  setSubtasksStatus(id: string, statusId: string) {
    return this.call(firstValueFrom(this.http.post(`/api/tasks/${id}/set-subtasks`, { statusId })));
  }
  restoreTask(id: string) { return this.call(firstValueFrom(this.http.post(`/api/tasks/${id}/restore`, {}))); }
  purgeTask(id: string) { return this.call(firstValueFrom(this.http.delete(`/api/trash/${id}`))); }
  emptyTrash() { return this.call(firstValueFrom(this.http.delete('/api/trash'))); }

  // ---- Library (shared repository of books, playlists, courses) ----
  async saveTaskToLibrary(taskId: string, kind: LibraryItem['kind'] = 'book', sourceUrl = '') {
    await firstValueFrom(this.http.post(`/api/library/from-task/${taskId}`, { kind, sourceUrl }));
    await this.refreshLibrary();
  }
  async createLibraryItem(body: { kind: LibraryItem['kind']; title: string; description?: string; sourceUrl?: string; items: any[] }) {
    await firstValueFrom(this.http.post('/api/library', body));
    await this.refreshLibrary();
  }
  async updateLibraryItem(id: string, patch: Partial<Pick<LibraryItem, 'kind' | 'title' | 'description' | 'sourceUrl' | 'items'>>) {
    await firstValueFrom(this.http.patch(`/api/library/${id}`, patch));
    await this.refreshLibrary();
  }
  async cloneFromLibrary(libId: string): Promise<string> {
    const r = await firstValueFrom(this.http.post<{ id: string }>(`/api/library/${libId}/clone`, {}));
    await this.refresh();
    return r.id;
  }
  async deleteLibraryItem(libId: string) {
    await firstValueFrom(this.http.delete(`/api/library/${libId}`));
    await this.refreshLibrary();
  }

  // ---- images ----
  async addImages(taskId: string, files: File[]) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        await firstValueFrom(this.http.post(`/api/tasks/${taskId}/images?name=${encodeURIComponent(f.name)}`, f,
          { headers: { 'Content-Type': f.type } }));
      } catch { this.error.set(`upload failed: ${f.name}`); }
    }
    await this.refresh();
  }
  removeImage(id: string) { return this.call(firstValueFrom(this.http.delete(`/api/images/${id}`))); }
  imageUrl(id: string) { return `/api/images/${id}`; }

  // ---- statuses ----
  addStatus(name: string) {
    if (!name.trim()) return;
    return this.call(firstValueFrom(this.http.post('/api/statuses', { name })));
  }
  updateStatus(id: string, patch: Partial<Pick<Status, 'name' | 'done' | 'cancelled' | 'active'>>) {
    return this.call(firstValueFrom(this.http.patch(`/api/statuses/${id}`, patch)));
  }
  moveStatus(id: string, dir: -1 | 1) { return this.call(firstValueFrom(this.http.post(`/api/statuses/${id}/move`, { dir }))); }
  removeStatus(id: string) { return this.call(firstValueFrom(this.http.delete(`/api/statuses/${id}`))); }
}
