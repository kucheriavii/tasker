import { Component, computed, inject, output, signal } from '@angular/core';
import { LibraryItem, LibraryNode } from './models';
import { PopupService } from './popup';
import { TaskStore } from './task-store';
import { I18nService } from './i18n';

/** Shared repository of books, YouTube playlists, and courses (no duplicates, Admin-only edit/delete). */
@Component({
  selector: 'app-library',
  template: `
    <section class="panel">
      <div class="head">
        <h2>{{ i18n.t().libraryHeading }}</h2>
        <button (click)="closed.emit()">[{{ i18n.t().close }}]</button>
      </div>
      <p class="hint">
        @if (store.isAdmin()) {
          {{ i18n.t().libraryHintAdmin }}
        } @else {
          {{ i18n.t().libraryHintUser }}
        }
      </p>

      @if (error()) { <p class="err">! {{ error() }}</p> }

      <div class="filters">
        @for (f of kinds; track f) {
          <button [class.ok]="filter() === f" (click)="filter.set(f)">[{{ getKindLabel(f) }}]</button>
        }
        <input [placeholder]="i18n.t().searchLibrary" [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>

      @for (item of filtered(); track item.id) {
        <div class="card">
          @if (store.isAdmin() && editingId() === item.id && editCopy(); as ed) {
            <div class="crow">
              <select [value]="ed.kind" (change)="ed.kind = $any($event.target).value">
                <option value="book">{{ i18n.t().filterBook }}</option>
                <option value="playlist">{{ i18n.t().filterPlaylist }}</option>
                <option value="course">{{ i18n.t().filterCourse }}</option>
                <option value="other">{{ i18n.t().filterOther }}</option>
              </select>
              <input class="title-in" [value]="ed.title" (input)="ed.title = $any($event.target).value" [placeholder]="i18n.t().titlePlaceholder" />
              <button class="ok" (click)="saveEdit(item.id)">{{ i18n.t().ok }}</button>
              <button (click)="cancelEdit()">{{ i18n.t().cancel }}</button>
            </div>
            <input class="full-in" [value]="ed.description" (input)="ed.description = $any($event.target).value" [placeholder]="i18n.t().descPlaceholder" />
            <input class="full-in" [value]="ed.sourceUrl" (input)="ed.sourceUrl = $any($event.target).value" [placeholder]="i18n.t().sourceUrlPlaceholder" />

            <div class="ed-items">
              @for (n of ed.items; track $index; let i = $index) {
                <div class="erow">
                  <span class="hint">#{{ i + 1 }}</span>
                  <input [value]="n.title" (input)="n.title = $any($event.target).value" />
                  <button class="icon" [disabled]="i === 0" (click)="move(ed.items, i, -1)">^</button>
                  <button class="icon" [disabled]="i === ed.items.length - 1" (click)="move(ed.items, i, 1)">v</button>
                  <button class="icon danger" (click)="removeEditItem(ed.items, i, n.title)">x</button>
                </div>
                @for (c of n.children || []; track $index; let j = $index) {
                  <div class="erow sub">
                    <span class="hint">{{ i + 1 }}.{{ j + 1 }}</span>
                    <input [value]="c.title" (input)="c.title = $any($event.target).value" />
                    <button class="icon" [disabled]="j === 0" (click)="move(n.children!, j, -1)">^</button>
                    <button class="icon" [disabled]="j === n.children!.length - 1" (click)="move(n.children!, j, 1)">v</button>
                    <button class="icon danger" (click)="removeEditItem(n.children!, j, c.title)">x</button>
                  </div>
                }
              }
              <form class="erow" (submit)="$event.preventDefault(); addNode(ed.items, newIn)">
                <input #newIn placeholder="+ add item..." />
                <button type="submit">{{ i18n.t().addBtn }}</button>
              </form>
            </div>
          } @else {
            <div class="crow">
              <span class="tag">[{{ getKindLabel(item.kind) }}]</span>
              <strong class="title">{{ item.title }}</strong>
              <span class="hint">{{ item.totalItems }}</span>
              @if (item.sourceUrl) {
                <a class="link" [href]="item.sourceUrl" target="_blank" rel="noopener">link</a>
              }
              <button (click)="togglePreview(item.id)">{{ expandedId() === item.id ? (i18n.lang() === 'uk' ? 'сховати' : 'hide') : (i18n.lang() === 'uk' ? 'перегляд' : 'preview') }}</button>
              @if (store.isAdmin()) {
                <button (click)="startEdit(item)">{{ i18n.t().edit }}</button>
              }
              <button class="ok" (click)="cloneItem(item.id, 'task')">+ {{ i18n.t().cloneToTasks }}</button>
              <button class="ok" (click)="cloneItem(item.id, 'book')">+ {{ i18n.t().cloneToBooks }}</button>
              @if (store.isAdmin()) {
                <button class="danger" (click)="removeItem(item.id)" [title]="i18n.t().deleteLibraryItem">x</button>
              }
            </div>
            @if (item.description) {
              <p class="desc">{{ item.description }}</p>
            }
            @if (expandedId() === item.id) {
              <ul class="preview">
                @for (n of item.items; track $index) {
                  <li>
                    {{ n.title }}
                    @if (n.children?.length) {
                      <ul>
                        @for (c of n.children; track $index) { <li>{{ c.title }}</li> }
                      </ul>
                    }
                  </li>
                }
              </ul>
            }
          }
        </div>
      } @empty {
        <p class="hint">library is empty.</p>
      }
    </section>
  `,
  styles: `
    .panel { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    h2 { font-size: 13px; margin: 0; }
    .hint { color: var(--muted); font-size: 12px; margin: 4px 0 8px; }
    .err { color: var(--danger); font-size: 12px; margin: 4px 0 8px; }
    .filters { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
    .filters input { flex: 1; min-width: 160px; }
    .card { border: 1px solid var(--line); background: var(--bg); padding: 8px 10px; margin-bottom: 8px; }
    .crow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .tag { color: var(--accent); font-size: 12px; }
    .title { flex: 1; min-width: 160px; word-break: break-word; }
    .title-in { flex: 1; min-width: 160px; font-weight: bold; }
    .full-in { width: 100%; margin-top: 4px; }
    .ed-items { margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--line); }
    .erow { display: flex; gap: 6px; align-items: center; margin: 3px 0; }
    .erow.sub { margin-left: 22px; }
    .erow input { flex: 1; min-width: 0; }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .link { color: var(--accent); font-size: 12px; }
    .desc { margin: 4px 0 0; font-size: 12px; color: var(--muted); white-space: pre-wrap; }
    .preview { margin: 6px 0 2px; padding-left: 20px; font-size: 12px; max-height: 220px; overflow: auto; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    button.danger:hover { color: var(--danger); }
    @media (max-width: 640px) {
      .filters input { flex: 1 1 100%; }
      .title { flex: 1 1 calc(100% - 75px); }
      .erow.sub { margin-left: 10px; }
    }
  `,
})
export class LibraryPanel {
  readonly store = inject(TaskStore);
  private popup = inject(PopupService);
  readonly i18n = inject(I18nService);
  readonly closed = output<void>();
  readonly cloned = output<{ id: string; targetKind: 'task' | 'book' }>();

  readonly kinds: ('all' | LibraryItem['kind'])[] = ['all', 'book', 'playlist', 'course', 'other'];

  getKindLabel(k: 'all' | LibraryItem['kind']): string {
    const t = this.i18n.t();
    switch (k) {
      case 'all': return t.filterAll;
      case 'book': return t.filterBook;
      case 'playlist': return t.filterPlaylist;
      case 'course': return t.filterCourse;
      case 'other': return t.filterOther;
    }
  }
  readonly filter = signal<'all' | LibraryItem['kind']>('all');
  readonly query = signal('');
  readonly error = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editCopy = signal<{
    kind: LibraryItem['kind'];
    title: string;
    description: string;
    sourceUrl: string;
    items: LibraryNode[];
  } | null>(null);

  readonly filtered = computed(() => {
    const f = this.filter();
    const q = this.query().trim().toLowerCase();
    return this.store.library().filter((it) => {
      if (f !== 'all' && it.kind !== f) return false;
      if (q && !it.title.toLowerCase().includes(q) && !it.description.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  togglePreview(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  startEdit(item: LibraryItem) {
    this.error.set(null);
    this.editingId.set(item.id);
    this.editCopy.set(structuredClone({
      kind: item.kind,
      title: item.title,
      description: item.description,
      sourceUrl: item.sourceUrl,
      items: item.items ?? [],
    }));
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editCopy.set(null);
    this.error.set(null);
  }

  move<T>(arr: T[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  addNode(items: LibraryNode[], input: HTMLInputElement) {
    const v = input.value.trim();
    if (!v) return;
    items.push({ title: v, children: [] });
    input.value = '';
  }

  async removeEditItem(arr: LibraryNode[], i: number, title: string) {
    if (await this.popup.confirm(`Delete "${title || 'item'}"?`, 'delete item')) {
      arr.splice(i, 1);
    }
  }

  async saveEdit(id: string) {
    const ed = this.editCopy();
    if (!ed || !ed.title.trim()) return;
    this.error.set(null);
    try {
      await this.store.updateLibraryItem(id, ed);
      this.cancelEdit();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Could not update library item');
    }
  }

  async cloneItem(libId: string, targetKind: 'task' | 'book' = 'book') {
    const newId = await this.store.cloneFromLibrary(libId, targetKind);
    this.cloned.emit({ id: newId, targetKind });
    this.closed.emit();
  }

  async removeItem(libId: string) {
    const it = this.store.library().find((x) => x.id === libId);
    const title = it ? it.title : 'item';
    if (await this.popup.confirm(this.i18n.t().confirmDeleteLibraryItem(title), this.i18n.t().deleteLibraryItem)) {
      this.store.deleteLibraryItem(libId);
    }
  }
}
