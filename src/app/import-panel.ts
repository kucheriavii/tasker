import { Component, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TaskStore } from './task-store';

interface DraftItem { title: string; children: { title: string }[]; }
interface Draft { title: string; items: DraftItem[]; }

/** "Screenshot / link / text of a table of contents -> draft plan -> tasks". */
@Component({
  selector: 'app-import',
  template: `
    <section class="panel">
      <h2># import plan</h2>
      @if (!draft()) {
        <p class="hint">paste a YouTube playlist link (works without AI key), a book / course page link, or the table of contents text, or drop / paste (Ctrl+V) / pick a screenshot.</p>
        <input [value]="url()" (input)="url.set($any($event.target).value)" placeholder="https://www.udemy.com/course/..." />
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
        <button class="ok" [disabled]="busy()" (click)="create()">create tasks ({{ count() }})</button>
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
  readonly closed = output<void>();

  readonly url = signal('');
  readonly text = signal('');
  readonly preview = signal<string | null>(null);
  private image: { base64: string; mime: string } | null = null;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null);

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

  async create() {
    const d = this.draft()!;
    this.error.set(null);
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.http.post<{ id: string }>('/api/import/create', d));
      await this.store.refresh();
      this.store.openId.set(r.id);
      this.closed.emit();
    } catch (e) { this.err(e, 'Could not create tasks'); }
    this.busy.set(false);
  }
}
