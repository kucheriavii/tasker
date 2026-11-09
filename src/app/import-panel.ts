import { Component, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LibraryItem } from './models';
import { PopupService } from './popup';
import { TaskStore } from './task-store';
import { I18nService } from './i18n';

interface DraftChild { title: string; description?: string; }
interface DraftItem { title: string; description?: string; children: DraftChild[]; }
interface Draft { title: string; description?: string; items: DraftItem[]; }
interface ShotImage { id: number; name: string; preview: string; base64: string; mime: string; }

/** Longest side of a screenshot sent to AI; keeps 10 shots well under Gemini's inline request limit. */
const MAX_SHOT_SIDE = 2000;

/**
 * Unified [import] panel:
 * 1) [link / text / screenshot] — YouTube playlist, book/course URL, text TOC, or screenshot
 * 2) [+ ai task] — generate an ordered study/action task from scratch by topic
 * Once a task draft is generated in import:
 * - [+ to books]    -> creates long-term item in [books] tab and deletes draft from import
 * - [+ to tasks]    -> creates short-term item in [tasks] tab and deletes draft from import
 * - [-> to library] -> (admin only) sends to shared library and deletes draft from import
 * - [delete task]   -> deletes draft from import directly without sending anywhere
 */
@Component({
  selector: 'app-import',
  template: `
    <section class="panel">
      <div class="head">
        <div class="tabs">
          <h2>{{ i18n.t().importHeading }}</h2>
          <button [class.ok]="tab() === 'source'" (click)="tab.set('source')">[{{ i18n.lang() === 'uk' ? 'посилання / текст / скріншот' : 'link / text / screenshot' }}]</button>
          <button [class.ok]="tab() === 'ai'" (click)="tab.set('ai')">[+ {{ i18n.t().tabAi }}]</button>
        </div>
        <button (click)="closed.emit()">[{{ i18n.t().close }}]</button>
      </div>

      @if (!draft()) {
        @if (tab() === 'ai') {
          <p class="hint">{{ i18n.lang() === 'uk' ? 'не знаєте як вивчити тему? введіть її нижче (наприклад: "Диференціальні рівняння", "Docker з нуля", "iOS Swift") — AI згенерує покроковий план з підзавданнями.' : 'don\'t know how to study a topic? enter it below (e.g. "Differential equations", "iOS Swift") — AI will generate an ordered task with branches and subtasks.' }}</p>
          <input [value]="topic()" (input)="topic.set($any($event.target).value)"
            [placeholder]="i18n.lang() === 'uk' ? 'що ви хочете вивчити або зробити? (наприклад: Docker з нуля)...' : 'what do you want to learn or accomplish? (e.g. Docker from scratch)...'" autofocus
            (keydown.enter)="generateAiTask()" />
          <input [value]="details()" (input)="details.set($any($event.target).value)"
            [placeholder]="i18n.lang() === 'uk' ? 'необовʼязково: ваш рівень або мета (наприклад: за 2 тижні для роботи)...' : 'optional: your level or goal (e.g. in 2 weeks for work)...'"
            (keydown.enter)="generateAiTask()" />

          @if (error()) { <p class="err">! {{ error() }}</p> }
          <div class="actions">
            <button class="ok" [disabled]="busy()" (click)="generateAiTask()">{{ busy() ? (i18n.lang() === 'uk' ? 'генерую план...' : 'generating task...') : (i18n.lang() === 'uk' ? 'згенерувати завдання через ai' : 'generate ai task') }}</button>
          </div>
        } @else {
          <p class="hint">{{ i18n.lang() === 'uk' ? 'вставте посилання на YouTube плейліст, книгу чи курс, або текст змісту/списку, або перетягніть / вставте (Ctrl+V) скріншот.' : 'paste a YouTube playlist link (works without AI key), a book / course page link, or the table of contents text, or drop / paste (Ctrl+V) / pick a screenshot.' }}</p>
          <input [value]="url()" (input)="onUrl($any($event.target).value)" [placeholder]="i18n.lang() === 'uk' ? 'https://www.youtube.com/playlist?list=... або посилання на курс/книгу' : 'https://www.youtube.com/playlist?list=... or book/course URL'" />
          <textarea rows="5" [value]="text()" (input)="onText($any($event.target).value)" [placeholder]="i18n.lang() === 'uk' ? '...або вставте сюди зміст книги, список тем, розділів чи завдань' : '...or paste table of contents / list here'"></textarea>

          <div class="shot" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            @for (img of images(); track img.id; let i = $index) {
              <div class="thumb">
                <img [src]="img.preview" [alt]="img.name" />
                <span class="num">{{ i + 1 }}</span>
                <button class="rm" (click)="removeImage(i)" [title]="i18n.lang() === 'uk' ? 'видалити' : 'remove'">x</button>
              </div>
            }
            @if (images().length < maxImages) {
              <span class="hint">{{ i18n.lang() === 'uk'
                ? 'скріншоти (до ' + maxImages + ', порядок неважливий — ші визначить сам): перетягніть сюди, Ctrl+V, або'
                : 'screenshots (up to ' + maxImages + ', any order — AI figures out the sequence): drop here, Ctrl+V, or' }}</span>
              <button (click)="f.click()">[{{ i18n.lang() === 'uk' ? 'обрати файли' : 'pick files' }}]</button>
            } @else {
              <span class="hint">{{ i18n.lang() === 'uk' ? 'досягнуто ліміт ' + maxImages + ' скріншотів' : 'limit of ' + maxImages + ' screenshots reached' }}</span>
            }
            @if (images().length > 1) {
              <button (click)="confirmClearImages()">[{{ i18n.lang() === 'uk' ? 'очистити всі' : 'clear all' }}]</button>
            }
            <input #f type="file" accept="image/*" multiple hidden (change)="onPick(f)" />
          </div>

          @if (error()) { <p class="err">! {{ error() }}</p> }
          <div class="actions">
            <button class="ok" [disabled]="busy()" (click)="generate()">{{ busy() ? (i18n.lang() === 'uk' ? 'обробка...' : 'thinking...') : (i18n.lang() === 'uk' ? 'розпізнати та згенерувати план' : 'generate plan') }}</button>
          </div>
        }
      } @else {
        <div class="draft-box">
          <div class="draft-head">
            <span class="hint">{{ i18n.lang() === 'uk' ? 'чернетка (' + count() + ' підзавдань) — збережіть у курси або завдання:' : 'draft (' + count() + ' subtasks) — save to courses or tasks:' }}</span>
            <button class="danger" [disabled]="busy()" (click)="confirmDiscardDraft()">[{{ i18n.lang() === 'uk' ? 'видалити чернетку' : 'delete draft' }}]</button>
          </div>

          <div class="ditem">
            <select [value]="kind()" (change)="kind.set($any($event.target).value)">
              <option value="book">{{ i18n.t().filterBook }}</option>
              <option value="playlist">{{ i18n.t().filterPlaylist }}</option>
              <option value="course">{{ i18n.t().filterCourse }}</option>
              <option value="other">{{ i18n.t().filterOther }}</option>
            </select>
            <input class="big" [value]="draft()!.title" (input)="draft()!.title = $any($event.target).value" [placeholder]="i18n.t().titlePlaceholder" />
          </div>

          @if (draft()!.description !== undefined) {
            <input [value]="draft()!.description || ''" (input)="draft()!.description = $any($event.target).value" [placeholder]="i18n.t().descPlaceholder" />
          }

          @for (it of draft()!.items; track $index; let i = $index) {
            <div class="ditem">
              <span class="step">#{{ i + 1 }}</span>
              <input [value]="it.title" (input)="it.title = $any($event.target).value" />
              <button class="icon" [disabled]="i === 0" (click)="move(draft()!.items, i, -1)" title="move up">^</button>
              <button class="icon" [disabled]="i === draft()!.items.length - 1" (click)="move(draft()!.items, i, 1)" title="move down">v</button>
              <button class="danger" (click)="removeItem(i)" title="remove">x</button>
            </div>
            @for (c of it.children; track $index; let j = $index) {
              <div class="ditem sub">
                <span class="hint">{{ i + 1 }}.{{ j + 1 }}</span>
                <input [value]="c.title" (input)="c.title = $any($event.target).value" />
                <button class="icon" [disabled]="j === 0" (click)="move(it.children, j, -1)" title="move up">^</button>
                <button class="icon" [disabled]="j === it.children.length - 1" (click)="move(it.children, j, 1)" title="move down">v</button>
                <button class="danger" (click)="removeChild(i, j)" title="remove">x</button>
              </div>
            }
          }

          @if (error()) { <p class="err">! {{ error() }}</p> }

          <div class="actions">
            <button class="ok" [disabled]="busy()" (click)="createIn('book')">{{ i18n.t().sendToBooksBtn }} ({{ count() }})</button>
            <button class="ok" [disabled]="busy()" (click)="createIn('task')">{{ i18n.t().sendToTasksBtn }} ({{ count() }})</button>
            <button class="danger" [disabled]="busy()" (click)="confirmDiscardDraft()">{{ i18n.lang() === 'uk' ? 'видалити чернетку' : 'delete draft' }}</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .tabs { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    input:not([type='checkbox']), textarea { width: 100%; margin: 4px 0; }
    textarea { font: inherit; border: 1px solid var(--line); padding: 8px; background: var(--bg); }
    .shot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border: 1px dashed var(--line); padding: 8px; margin: 6px 0 10px; }
    .shot img { max-width: 160px; max-height: 120px; }
    .thumb { position: relative; display: inline-block; border: 1px solid var(--line); background: var(--bg); }
    .thumb img { display: block; width: 96px; height: 72px; object-fit: cover; max-width: none; max-height: none; }
    .thumb .num { position: absolute; left: 2px; top: 2px; background: #fff; border: 1px solid var(--line); font-size: 11px; padding: 0 4px; }
    .thumb .rm { position: absolute; right: 2px; top: 2px; min-width: 20px; height: 20px; min-height: 20px; padding: 0 4px; font-size: 11px; background: #fff; }
    .draft-box { border-top: 1px dashed var(--line); padding-top: 8px; }
    .draft-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
    .ditem { display: flex; gap: 6px; align-items: center; }
    .ditem.sub { margin-left: 24px; }
    .ditem input { flex: 1; min-width: 0; }
    .step { font-size: 12px; font-weight: bold; color: var(--accent); min-width: 22px; }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .big { font-weight: bold; font-size: 16px; }
    .err { color: var(--danger); white-space: pre-wrap; margin: 6px 0; }
    .hint { color: var(--muted); font-size: 12px; margin: 4px 0 8px; }
    .panel { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 16px; }
    h2 { font-size: 13px; margin: 0; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    button.danger:hover { color: var(--danger); }
    @media (max-width: 640px) {
      .ditem.sub { margin-left: 10px; }
      .actions button { flex: 1 1 auto; }
    }
  `,
  host: { '(window:paste)': 'onPaste($event)' },
})
export class ImportPanel {
  private http = inject(HttpClient);
  private popup = inject(PopupService);
  readonly store = inject(TaskStore);
  readonly i18n = inject(I18nService);
  readonly closed = output<void>();
  readonly savedToLibrary = output<void>();

  readonly tab = signal<'source' | 'ai'>('source');
  readonly topic = signal('');
  readonly details = signal('');
  readonly url = signal('');
  readonly text = signal('');
  readonly kind = signal<LibraryItem['kind']>('book');
  readonly maxImages = 10;
  readonly images = signal<ShotImage[]>([]);
  private shotSeq = 0;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null);

  onUrl(v: string) {
    this.url.set(v);
    if (/youtube\.com|youtu\.be/i.test(v)) this.kind.set('playlist');
    else if (/udemy\.com|coursera\.org|edx\.org/i.test(v)) this.kind.set('course');
  }

  onText(v: string) {
    const trimmed = v.trim();
    if (!this.url() && /^https?:\/\/[^\s]+$/i.test(trimmed)) {
      this.onUrl(trimmed);
      this.text.set('');
      return;
    }
    this.text.set(v);
  }

  count() {
    const d = this.draft();
    return d ? d.items.reduce((n, i) => n + 1 + i.children.length, 0) : 0;
  }

  move<T>(arr: T[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  onPaste(e: ClipboardEvent) {
    if (this.draft() || this.tab() === 'ai') return;
    const files = Array.from(e.clipboardData?.files ?? []).filter((x) => x.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); this.addImages(files); }
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.addImages(Array.from(e.dataTransfer?.files ?? []));
  }
  onPick(input: HTMLInputElement) {
    this.addImages(Array.from(input.files ?? []));
    input.value = '';
  }
  private async addImages(files: File[]) {
    const imgs = files.filter((x) => x.type.startsWith('image/'));
    if (!imgs.length) return;
    const free = this.maxImages - this.images().length;
    if (imgs.length > free) {
      this.error.set(this.i18n.lang() === 'uk'
        ? `Максимум ${this.maxImages} скріншотів. Додано лише ${Math.max(free, 0)}.`
        : `Max ${this.maxImages} screenshots. Only ${Math.max(free, 0)} added.`);
    } else {
      this.error.set(null);
    }
    for (const file of imgs.slice(0, Math.max(free, 0))) {
      try {
        const shot = await this.readShot(file);
        if (this.images().length >= this.maxImages) break;
        this.images.update((list) => [...list, shot]);
      } catch {
        this.error.set(`Could not read ${file.name}`);
      }
    }
  }
  /** Reads an image and downscales it (if large) to JPEG to keep the request small. */
  private readShot(file: File): Promise<ShotImage> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error);
      r.onload = () => {
        const dataUrl = String(r.result);
        const img = new Image();
        img.onerror = () => reject(new Error('bad image'));
        img.onload = () => {
          const scale = Math.min(1, MAX_SHOT_SIDE / Math.max(img.width, img.height));
          let out = dataUrl;
          let mime = file.type;
          if (scale < 1 || file.size > 1.5 * 1024 * 1024) {
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            out = c.toDataURL('image/jpeg', 0.88);
            mime = 'image/jpeg';
          }
          resolve({ id: ++this.shotSeq, name: file.name, preview: out, base64: out.split(',')[1], mime });
        };
        img.src = dataUrl;
      };
      r.readAsDataURL(file);
    });
  }
  removeImage(i: number) {
    this.images.update((list) => list.filter((_, idx) => idx !== i));
  }
  clearImages() { this.images.set([]); }

  async confirmClearImages() {
    if (await this.popup.confirm(this.i18n.lang() === 'uk' ? 'Видалити всі скріншоти?' : 'Delete all screenshots?', 'delete screenshots')) {
      this.clearImages();
    }
  }

  /** Completely removes the draft task and resets inputs in [import]. */
  discardDraft() {
    this.draft.set(null);
    this.error.set(null);
    this.url.set('');
    this.text.set('');
    this.topic.set('');
    this.details.set('');
    this.clearImages();
  }

  async confirmDiscardDraft() {
    const title = this.draft()?.title || 'this draft';
    if (await this.popup.confirm(`Delete "${title}" from import?`, 'delete task')) {
      this.discardDraft();
    }
  }

  private err(e: any, fallback: string) {
    this.error.set(e?.error?.error ?? fallback);
  }

  async generateAiTask() {
    if (!this.topic().trim()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const d = await firstValueFrom(this.http.post<Draft>('/api/ai-task/generate', {
        topic: this.topic(),
        details: this.details(),
      }));
      this.kind.set('course');
      d.items = (d.items ?? []).map((i) => ({ title: i.title, description: i.description, children: i.children ?? [] }));
      this.draft.set(d);
    } catch (e) { this.err(e, 'Request failed'); }
    this.busy.set(false);
  }

  async generate() {
    this.error.set(null);
    this.busy.set(true);
    try {
      const d = await firstValueFrom(this.http.post<Draft>('/api/import/plan', {
        url: this.url(), text: this.text(),
        images: this.images().map((im) => ({ base64: im.base64, mime: im.mime })),
      }));
      d.items = (d.items ?? []).map((i) => ({ title: i.title, description: i.description, children: i.children ?? [] }));
      this.draft.set(d);
    } catch (e) { this.err(e, 'Request failed'); }
    this.busy.set(false);
  }

  async removeItem(i: number) {
    const item = this.draft()!.items[i];
    if (await this.popup.confirm(`Delete "${item?.title || 'item'}"?`, 'delete item')) {
      this.draft()!.items.splice(i, 1);
    }
  }
  async removeChild(i: number, j: number) {
    const child = this.draft()!.items[i]?.children[j];
    if (await this.popup.confirm(`Delete "${child?.title || 'subtask'}"?`, 'delete item')) {
      this.draft()!.items[i].children.splice(j, 1);
    }
  }

  /** Sends the draft to Library and deletes it from [import]. */
  async sendToLibrary() {
    const d = this.draft()!;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.store.createLibraryItem({
        kind: this.kind(),
        title: d.title,
        description: d.description,
        sourceUrl: this.url(),
        items: d.items,
      });
      this.discardDraft();
      this.savedToLibrary.emit();
    } catch (e) { this.err(e, 'Could not save to library'); }
    this.busy.set(false);
  }

  /** Creates the item in [tasks] or [books] and deletes it from [import]. */
  async createIn(targetKind: 'task' | 'book') {
    const d = this.draft()!;
    this.error.set(null);
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.http.post<{ id: string }>('/api/import/create', { ...d, targetKind }));
      await this.store.refresh();
      this.discardDraft();
      this.store.openId.set(r.id);
      this.closed.emit();
    } catch (e) { this.err(e, 'Could not create tasks'); }
    this.busy.set(false);
  }
}
