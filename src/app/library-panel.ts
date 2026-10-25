import { Component, computed, inject, output, signal } from '@angular/core';
import { ImportPanel } from './import-panel';
import { LibraryItem } from './models';
import { TaskStore } from './task-store';

/** Shared repository of books, YouTube playlists, and courses that any user can clone into their tasks. */
@Component({
  selector: 'app-library',
  imports: [ImportPanel],
  template: `
    <section class="panel">
      <div class="head">
        <h2># library (shared books / playlists / courses)</h2>
        <div>
          <button class="ok" (click)="adding.set(!adding())">[{{ adding() ? 'close' : '+ add new' }}]</button>
          <button (click)="closed.emit()">[close]</button>
        </div>
      </div>
      <p class="hint">shared catalog of books, playlists and courses. anyone can add templates here or clone them into their own tasks.</p>

      @if (adding()) {
        <app-import [onlyLibrary]="true" (closed)="adding.set(false)" />
      }

      @if (store.tree().length) {
        <div class="pub">
          <span class="hint">publish existing task to library:</span>
          <select #tk>
            @for (t of store.tree(); track t.id) { <option [value]="t.id">{{ t.title }}</option> }
          </select>
          <select #kd>
            <option value="book">book</option>
            <option value="playlist">playlist</option>
            <option value="course">course</option>
            <option value="other">other</option>
          </select>
          <button (click)="publishTask(tk.value, $any(kd.value))">publish</button>
        </div>
      }

      <div class="filters">
        @for (f of kinds; track f) {
          <button [class.ok]="filter() === f" (click)="filter.set(f)">[{{ f }}]</button>
        }
        <input placeholder="search library..." [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>

      @for (item of filtered(); track item.id) {
        <div class="card">
          <div class="crow">
            <span class="tag">[{{ item.kind }}]</span>
            <strong class="title">{{ item.title }}</strong>
            <span class="hint">{{ item.totalItems }} items</span>
            @if (item.sourceUrl) {
              <a class="link" [href]="item.sourceUrl" target="_blank" rel="noopener">link</a>
            }
            <button (click)="togglePreview(item.id)">{{ expandedId() === item.id ? 'hide' : 'preview' }}</button>
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
        </div>
      } @empty {
        <p class="hint">library is empty. add a book or YouTube playlist above, or publish one of your tasks.</p>
      }
    </section>
  `,
  styles: `
    .panel { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    h2 { font-size: 13px; margin: 0; }
    .hint { color: var(--muted); font-size: 12px; margin: 4px 0 8px; }
    .pub { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding: 6px 0; border-bottom: 1px dashed var(--line); margin-bottom: 8px; }
    .filters { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
    .filters input { flex: 1; min-width: 160px; }
    .card { border: 1px solid var(--line); background: var(--bg); padding: 8px 10px; margin-bottom: 8px; }
    .crow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .tag { color: var(--accent); font-size: 12px; }
    .title { flex: 1; min-width: 160px; word-break: break-word; }
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
  readonly adding = signal(false);
  readonly expandedId = signal<string | null>(null);

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

  async publishTask(taskId: string, kind: LibraryItem['kind']) {
    if (!taskId) return;
    await this.store.saveTaskToLibrary(taskId, kind);
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
