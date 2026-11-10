import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiData, LibraryItem, Status, Task, TaskRow } from './models';

const ADMIN_KEY_STORAGE = 'tasker.adminKey';

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

  /** User role: 'admin' can add/edit/delete in library; 'user' can only browse & clone. */
  readonly adminKey = signal<string>(localStorage.getItem(ADMIN_KEY_STORAGE) || '');
  readonly role = computed<'user' | 'admin'>(() => (this.adminKey() ? 'admin' : 'user'));
  readonly isAdmin = computed(() => this.role() === 'admin');

  readonly statuses = computed(() => this.data().statuses);
  private doneIds = computed(() => new Set(this.statuses().filter((s) => s.done).map((s) => s.id)));
  private cancelledIds = computed(() => new Set(this.statuses().filter((s) => s.cancelled).map((s) => s.id)));

  /** All non-deleted root trees. */
  private readonly allRoots = computed<Task[]>(() => {
    const done = this.doneIds();
    const cancelled = this.cancelledIds();
    const rows = this.data().tasks.filter((t) => !t.deletedAt);
    const byParent = new Map<string | null, TaskRow[]>();
    for (const r of rows) {
      const k = r.parentId;
      (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(r);
    }
    const build = (r: TaskRow, rootKind: 'task' | 'book'): Task => {
      const children = (byParent.get(r.id) ?? []).map((c) => build(c, rootKind));
      let leafTotal = 0, leafDone = 0;
      if (children.length) {
        for (const c of children) { leafTotal += c.leafTotal; leafDone += c.leafDone; }
      } else {
        const skip = cancelled.has(r.statusId); // cancelled leaves don't count
        leafTotal = skip ? 0 : 1;
        leafDone = !skip && done.has(r.statusId) ? 1 : 0;
      }
      return { ...r, rootKind, children, leafTotal, leafDone, progress: leafTotal ? leafDone / leafTotal : 0 };
    };
    return (byParent.get(null) ?? []).map((r) => build(r, r.kind === 'book' ? 'book' : 'task'));
  });

  /** Short-term tasks ([tasks] tab). */
  readonly tree = computed<Task[]>(() =>
    this.allRoots().filter((t) => (t.kind ?? 'task') !== 'book'));

  /** Long-term books, playlists & courses ([books] tab). */
  readonly books = computed<Task[]>(() =>
    this.allRoots().filter((t) => t.kind === 'book'));

  /** Book search and tag filter signals */
  readonly bookSearch = signal<string>('');
  readonly selectedTag = signal<string | null>(null);

  /** All unique tags across all active books */
  readonly allBookTags = computed<string[]>(() => {
    const set = new Set<string>();
    for (const b of this.books()) {
      if (b.tags) {
        for (const t of b.tags.split(',')) {
          const clean = t.trim().toLowerCase().replace(/^#/, '');
          if (clean) set.add(clean);
        }
      }
    }
    return Array.from(set).sort();
  });

  /** Filtered books based on search query and selected tag */
  readonly filteredBooks = computed<Task[]>(() => {
    const list = this.books();
    const q = this.bookSearch().trim().toLowerCase();
    const tag = this.selectedTag()?.trim().toLowerCase();
    if (!q && !tag) return list;
    return list.filter((b) => {
      if (tag) {
        const bTags = (b.tags || '').split(',').map((t) => t.trim().toLowerCase().replace(/^#/, ''));
        if (!bTags.includes(tag)) return false;
      }
      if (q) {
        const inTitle = b.title.toLowerCase().includes(q);
        const inDesc = (b.description || '').toLowerCase().includes(q);
        const inTags = (b.tags || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
  });

  private index = computed(() => {
    const m = new Map<string, Task>();
    const walk = (l: Task[]) => l.forEach((t) => { m.set(t.id, t); walk(t.children); });
    walk(this.allRoots());
    return m;
  });

  /** Trashed tasks (flat, newest first; books go to purgatory). */
  readonly trash = computed<TaskRow[]>(() =>
    this.data().tasks.filter((t) => t.deletedAt && t.kind !== 'book').sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!)));

  /** Deleted books & courses (admin purgatory, newest first). */
  readonly purgatory = computed<TaskRow[]>(() =>
    this.data().tasks.filter((t) => t.deletedAt && t.kind === 'book' && t.parentId === null).sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!)));

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

  isOverdue(t: TaskRow): boolean {
    if (!t.dueAt || this.isDone(t.statusId) || this.isCancelled(t.statusId)) return false;
    return new Date(t.dueAt).getTime() < Date.now();
  }

  async loginAdmin(password: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post('/api/auth/admin', { password }));
      localStorage.setItem(ADMIN_KEY_STORAGE, password);
      this.adminKey.set(password);
      return true;
    } catch {
      return false;
    }
  }

  logoutAdmin() {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    this.adminKey.set('');
  }

  private adminHeaders() {
    return { headers: { 'x-admin-key': this.adminKey() } };
  }

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

  addTask(parentId: string | null, title: string, kind: 'task' | 'book' = 'task', dueAt: string | null = null, tags = '') {
    if (!title.trim()) return;
    return this.call(firstValueFrom(this.http.post('/api/tasks', { parentId, title, kind, dueAt: dueAt || null, tags: tags || '' }, this.adminHeaders())));
  }
  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'statusId' | 'collapsed' | 'kind' | 'dueAt' | 'tags'>>) {
    return this.call(firstValueFrom(this.http.patch(`/api/tasks/${id}`, patch, this.adminHeaders())));
  }
  /** Drag & Drop: reorder before/after targetId, or move inside targetId as a subtask. */
  moveTask(id: string, targetId: string | null, mode: 'before' | 'after' | 'inside', rootKind?: 'task' | 'book') {
    if (!id || id === targetId) return;
    return this.call(firstValueFrom(this.http.post(`/api/tasks/${id}/move`, { targetId, mode, rootKind }, this.adminHeaders())));
  }
  /** Moves task (with subtree) to trash / purgatory. */
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
  emptyPurgatory() { return this.call(firstValueFrom(this.http.delete('/api/purgatory', this.adminHeaders()))); }

  /** Deep clones a book (or task tree) to tasks tab with fresh initial status. */
  async cloneBookToTasks(bookId: string): Promise<string> {
    const res = await firstValueFrom(this.http.post<{ id: string }>(`/api/tasks/${bookId}/clone-to-tasks`, {}));
    await this.refresh();
    return res.id;
  }

  // ---- Library (shared repository of books, playlists, courses) ----
  async saveTaskToLibrary(taskId: string, kind: LibraryItem['kind'] = 'book', sourceUrl = '') {
    await firstValueFrom(this.http.post(`/api/library/from-task/${taskId}`, { kind, sourceUrl }, this.adminHeaders()));
    await this.refreshLibrary();
  }
  async createLibraryItem(body: { kind: LibraryItem['kind']; title: string; description?: string; sourceUrl?: string; items: any[] }) {
    await firstValueFrom(this.http.post('/api/library', body, this.adminHeaders()));
    await this.refreshLibrary();
  }
  async updateLibraryItem(id: string, patch: Partial<Pick<LibraryItem, 'kind' | 'title' | 'description' | 'sourceUrl' | 'items'>>) {
    await firstValueFrom(this.http.patch(`/api/library/${id}`, patch, this.adminHeaders()));
    await this.refreshLibrary();
  }
  async cloneFromLibrary(libId: string, targetKind: 'task' | 'book' = 'book'): Promise<string> {
    const r = await firstValueFrom(this.http.post<{ id: string }>(`/api/library/${libId}/clone`, { targetKind }));
    await this.refresh();
    return r.id;
  }
  async deleteLibraryItem(libId: string) {
    await firstValueFrom(this.http.delete(`/api/library/${libId}`, this.adminHeaders()));
    await this.refreshLibrary();
  }

  // ---- images ----
  async addImages(taskId: string, files: File[]) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const headers: Record<string, string> = { 'Content-Type': f.type };
        if (this.adminKey()) headers['x-admin-key'] = this.adminKey();
        await firstValueFrom(this.http.post(`/api/tasks/${taskId}/images?name=${encodeURIComponent(f.name)}`, f, { headers }));
      } catch { this.error.set(`upload failed: ${f.name}`); }
    }
    await this.refresh();
  }
  removeImage(id: string) { return this.call(firstValueFrom(this.http.delete(`/api/images/${id}`, this.adminHeaders()))); }
  imageUrl(id: string) { return `/api/images/${id}`; }

  // ---- statuses ----
  addStatus(name: string) {
    if (!name.trim()) return;
    return this.call(firstValueFrom(this.http.post('/api/statuses', { name }, this.adminHeaders())));
  }
  updateStatus(id: string, patch: Partial<Pick<Status, 'name' | 'done' | 'cancelled' | 'active'>>) {
    return this.call(firstValueFrom(this.http.patch(`/api/statuses/${id}`, patch, this.adminHeaders())));
  }
  moveStatus(id: string, dir: -1 | 1) { return this.call(firstValueFrom(this.http.post(`/api/statuses/${id}/move`, { dir }, this.adminHeaders()))); }
  removeStatus(id: string) { return this.call(firstValueFrom(this.http.delete(`/api/statuses/${id}`, this.adminHeaders()))); }
}
