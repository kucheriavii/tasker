import { Component, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LibraryItem } from './models';
import { TaskStore } from './task-store';

interface DraftItem { title: string; children: { title: string }[]; }
interface Draft { title: string; items: DraftItem[]; }

/** "Screenshot / link / text of a table of contents -> draft plan -> tasks or shared library". */
@Component({
  selector: 'app-import',
  template: `
    <section class="panel">
      <h2># {{ onlyLibrary() ? 'add to library (book / playlist / course)' : 'import plan' }}</h2>
      @if (!draft()) {
        <p class="hint">paste a YouTube playlist link (works without AI key), a book / course page link, or the table of contents text, or drop / paste (Ctrl+V) / pick a screenshot.</p>
        <input [value]="url()" (input)="onUrl($any($event.target).value)" placeholder="https://www.youtube.com/playlist?list=... or book/course URL" />
        <textarea rows="5" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="...or paste table of contents here"></textarea>

        <div class="shot" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          @if (preview()) {
            <img [src]="preview()" alt="" /> <button (click)="clearImage()">remove</button>
          } @else {
            <span class="hint">screenshot: drop here, Ctrl+V, or</span>
            <button (click)="f.click()">[pick file]</button>
          }
          <input #f type="file" accept="image/*" hidden (change)="onPick(f)" />
        </div>

        @if (error()) { <p class="err">! {{ error() }}</p> }
        <button class="ok" [disabled]="busy()" (click)="generate()">{{ busy() ? 'thinking...' : 'generate plan' }}</button>
        <button (click)="closed.emit()">cancel</button>
      } @else {
        <p class="hint">review the draft: edit titles, remove what you do not need.</p>
        <input class="big" [value]="draft()!.title" (input)="draft()!.title = $any($event.target).value" />

        <div class="lib-opts">
          <label>
            kind:
            <select [value]="kind()" (change)="kind.set($any($event.target).value)">
              <option value="book">book</option>
              <option value="playlist">playlist</option>
              <option value="course">course</option>
              <option value="other">other</option>
            </select>
          </label>
          @if (!onlyLibrary()) {
            <label>
              <input type="checkbox" [checked]="alsoSaveToLibrary()" (change)="alsoSaveToLibrary.set($any($event.target).checked)" />
              also save to shared library
            </label>
          }
        </div>

        @for (it of draft()!.items; track $index; let i = $index) {
          <div class="ditem">
            <input [value]="it.title" (input)="it.title = $any($event.target).value" />
            <button class="danger" (click)="removeItem(i)" title="remove">x</button>
          </div>
          @for (c of it.children; track $index; let j = $index) {
            <div class="ditem sub">
              <input [value]="c.title" (input)="c.title = $any($event.target).value" />
              <button class="danger" (click)="removeChild(i, j)" title="remove">x</button>
            </div>
          }
        }
        @if (error()) { <p class="err">! {{ error() }}</p> }
        @if (onlyLibrary()) {
          <button class="ok" [disabled]="busy()" (click)="saveLibraryOnly()">save to library ({{ count() }})</button>
        } @else {
          <button class="ok" [disabled]="busy()" (click)="create()">create tasks ({{ count() }})</button>
        }
        <button (click)="draft.set(null)">back</button>
        <button (click)="closed.emit()">cancel</button>
      }
    </section>
  `,
  styles: `
    input:not([type='checkbox']), textarea { width: 100%; margin: 4px 0; }
    textarea { font: inherit; border: 1px solid var(--line); padding: 8px; background: var(--bg); }
    .shot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border: 1px dashed var(--line); padding: 8px; margin: 6px 0 10px; }
    .shot img { max-width: 160px; max-height: 120px; }
    .lib-opts { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 6px 0 10px; font-size: 13px; }
    .ditem { display: flex; gap: 6px; align-items: center; }
    .ditem.sub { margin-left: 24px; }
    .ditem input { flex: 1; min-width: 0; }
    .big { font-weight: bold; font-size: 16px; }
    .err { color: var(--danger); white-space: pre-wrap; }
    .hint { color: var(--muted); font-size: 12px; margin: 4px 0 8px; }
    .panel { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 16px; }
    h2 { font-size: 13px; margin: 0 0 4px; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    button.danger:hover { color: var(--danger); }
  `,
  host: { '(window:paste)': 'onPaste($event)' },
})
export class ImportPanel {
  private http = inject(HttpClient);
  private store = inject(TaskStore);
  readonly onlyLibrary = input(false);
  readonly closed = output<void>();

  readonly url = signal('');
  readonly text = signal('');
  readonly kind = signal<LibraryItem['kind']>('book');
  readonly alsoSaveToLibrary = signal(true);
  readonly preview = signal<string | null>(null);
  private image: { base64: string; mime: string } | null = null;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null);

  onUrl(v: string) {
    this.url.set(v);
    if (/youtube\.com|youtu\.be/i.test(v)) this.kind.set('playlist');
    else if (/udemy\.com|coursera\.org|edx\.org/i.test(v)) this.kind.set('course');
  }

  count() {
    const d = this.draft();
    return d ? d.items.reduce((n, i) => n + 1 + i.children.length, 0) : 0;
  }

  onPaste(e: ClipboardEvent) {
    if (this.draft()) return;
    const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); this.setImage(f); }
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    const f = Array.from(e.dataTransfer?.files ?? []).find((x) => x.type.startsWith('image/'));
    if (f) this.setImage(f);
  }
  onPick(input: HTMLInputElement) {
    if (input.files?.[0]) this.setImage(input.files[0]);
    input.value = '';
  }
  private setImage(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      this.preview.set(dataUrl);
      this.image = { base64: dataUrl.split(',')[1], mime: file.type };
    };
    r.readAsDataURL(file);
  }
  clearImage() { this.preview.set(null); this.image = null; }

  private err(e: any, fallback: string) {
    this.error.set(e?.error?.error ?? fallback);
  }

  async generate() {
    this.error.set(null);
    this.busy.set(true);
    try {
      const d = await firstValueFrom(this.http.post<Draft>('/api/import/plan', {
        url: this.url(), text: this.text(),
        imageBase64: this.image?.base64, imageMime: this.image?.mime,
      }));
      d.items = (d.items ?? []).map((i) => ({ title: i.title, children: i.children ?? [] }));
      this.draft.set(d);
    } catch (e) { this.err(e, 'Request failed'); }
    this.busy.set(false);
  }

  removeItem(i: number) { this.draft()!.items.splice(i, 1); }
  removeChild(i: number, j: number) { this.draft()!.items[i].children.splice(j, 1); }

  async saveLibraryOnly() {
    const d = this.draft()!;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.store.createLibraryItem({
        kind: this.kind(),
        title: d.title,
        sourceUrl: this.url(),
        items: d.items,
      });
      this.closed.emit();
    } catch (e) { this.err(e, 'Could not save to library'); }
    this.busy.set(false);
  }

  async create() {
    const d = this.draft()!;
    this.error.set(null);
    this.busy.set(true);
    try {
      if (this.alsoSaveToLibrary()) {
        await this.store.createLibraryItem({
          kind: this.kind(),
          title: d.title,
          sourceUrl: this.url(),
          items: d.items,
        });
      }
      const r = await firstValueFrom(this.http.post<{ id: string }>('/api/import/create', d));
      await this.store.refresh();
      this.store.openId.set(r.id);
      this.closed.emit();
    } catch (e) { this.err(e, 'Could not create tasks'); }
    this.busy.set(false);
  }
}
