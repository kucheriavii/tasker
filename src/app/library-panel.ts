import { Component, computed, inject, output, signal } from '@angular/core';
import { LibraryItem, LibraryNode } from './models';
import { TaskStore } from './task-store';

/** Shared repository of books, YouTube playlists, and courses (no duplicates, editable items). */
@Component({
  selector: 'app-library',
  template: `
    <section class="panel">
      <div class="head">
        <h2># library (shared books / playlists / courses)</h2>
        <button (click)="closed.emit()">[close]</button>
      </div>
      <p class="hint">shared catalog of books, playlists and courses. edit items here or clone them into your tasks.</p>

      @if (error()) { <p class="err">! {{ error() }}</p> }

      <div class="filters">
        @for (f of kinds; track f) {
          <button [class.ok]="filter() === f" (click)="filter.set(f)">[{{ f }}]</button>
        }
        <input placeholder="search library..." [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>

      @for (item of filtered(); track item.id) {
        <div class="card">
          @if (editingId() === item.id && editCopy(); as ed) {
            <div class="crow">
              <select [value]="ed.kind" (change)="ed.kind = $any($event.target).value">
                <option value="book">book</option>
                <option value="playlist">playlist</option>
                <option value="course">course</option>
                <option value="other">other</option>
              </select>
              <input class="title-in" [value]="ed.title" (input)="ed.title = $any($event.target).value" placeholder="title..." />
              <button class="ok" (click)="saveEdit(item.id)">ok</button>
              <button (click)="cancelEdit()">cancel</button>
            </div>
            <input class="full-in" [value]="ed.description" (input)="ed.description = $any($event.target).value" placeholder="description..." />
            <input class="full-in" [value]="ed.sourceUrl" (input)="ed.sourceUrl = $any($event.target).value" placeholder="source url..." />

            <div class="ed-items">
              @for (n of ed.items; track $index; let i = $index) {
                <div class="erow">
                  <span class="hint">#{{ i + 1 }}</span>
                  <input [value]="n.title" (input)="n.title = $any($event.target).value" />
                  <button class="icon" [disabled]="i === 0" (click)="move(ed.items, i, -1)">^</button>
                  <button class="icon" [disabled]="i === ed.items.length - 1" (click)="move(ed.items, i, 1)">v</button>
                  <button class="icon danger" (click)="ed.items.splice(i, 1)">x</button>
                </div>
                @for (c of n.children || []; track $index; let j = $index) {
                  <div class="erow sub">
                    <span class="hint">{{ i + 1 }}.{{ j + 1 }}</span>
                    <input [value]="c.title" (input)="c.title = $any($event.target).value" />
                    <button class="icon" [disabled]="j === 0" (click)="move(n.children!, j, -1)">^</button>
                    <button class="icon" [disabled]="j === n.children!.length - 1" (click)="move(n.children!, j, 1)">v</button>
                    <button class="icon danger" (click)="n.children!.splice(j, 1)">x</button>
                  </div>
                }
              }
              <form class="erow" (submit)="$event.preventDefault(); addNode(ed.items, newIn)">
                <input #newIn placeholder="+ add item..." />
                <button type="submit">add</button>
              </form>
            </div>
          } @else {
            <div class="crow">
              <span class="tag">[{{ item.kind }}]</span>
              <strong class="title">{{ item.title }}</strong>
              <span class="hint">{{ item.totalItems }} items</span>
              @if (item.sourceUrl) {
                <a class="link" [href]="item.sourceUrl" target="_blank" rel="noopener">link</a>
              }
              <button (click)="togglePreview(item.id)">{{ expandedId() === item.id ? 'hide' : 'preview' }}</button>
              <button (click)="startEdit(item)">edit</button>
              <button class="ok" (click)="cloneItem(item.id)">+ to my tasks</button>
              <button class="danger" (click)="removeItem(item.id)" title="delete from library">x</button>
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
        <p class="hint">library is empty. use [import] to add books, playlists, or AI-generated study plans.</p>
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
  `,
})
export class LibraryPanel {
  readonly store = inject(TaskStore);
  readonly closed = output<void>();

  readonly kinds: ('all' | LibraryItem['kind'])[] = ['all', 'book', 'playlist', 'course', 'other'];
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

  async cloneItem(libId: string) {
    const newId = await this.store.cloneFromLibrary(libId);
    this.store.openId.set(newId);
    this.closed.emit();
  }

  removeItem(libId: string) {
    if (window.confirm('Delete this template from the shared library?')) {
      this.store.deleteLibraryItem(libId);
    }
  }
}
