import { Component, inject, input, signal } from '@angular/core';
import { Task } from './models';
import { PopupService } from './popup';
import { TaskStore } from './task-store';
import { Progress } from './progress';

/** Recursive node: renders a task and its subtasks (unlimited depth). Tap the row to open the task; drag to reorder or nest. */
@Component({
  selector: 'app-task-item',
  imports: [Progress],
  template: `
    <div class="row"
      [class.root]="task().parentId === null"
      [class.done]="store.isDone(task().statusId)"
      [class.cancelled]="store.isCancelled(task().statusId)"
      [class.overdue]="store.isOverdue(task())"
      [class.drop-before]="dropZone() === 'before'"
      [class.drop-after]="dropZone() === 'after'"
      [class.drop-inside]="dropZone() === 'inside'"
      [attr.draggable]="!editing()"
      (dragstart)="onDragStart($event)"
      (dragend)="onDragEnd()"
      (dragover)="onDragOver($event)"
      (dragleave)="dropZone.set(null)"
      (drop)="onDrop($event)"
      (click)="onRowClick($event)">
      <div class="main">
        <div class="task-head">
          <span class="grip" title="drag: top/bottom = reorder, center = make subtask">::</span>
          @if (task().children.length) {
            <button class="icon toggle-btn" (click)="toggle()" title="collapse/expand">
              {{ task().collapsed ? '+' : '-' }}
            </button>
          } @else {
            <span class="dot">·</span>
          }

          @if (editing()) {
            <div class="edit-box">
              <input #ed class="title-edit" [value]="task().title" autofocus
                (keydown.enter)="save(ed.value, dueEd.value)" (keydown.escape)="editing.set(false)" />
              <div class="edit-tools">
                <input #dueEd type="datetime-local" class="due-in" [value]="task().dueAt || ''" title="deadline" />
                <div class="edit-btns">
                  <button class="ok" (click)="save(ed.value, dueEd.value)">ok</button>
                  <button (click)="editing.set(false)">cancel</button>
                </div>
              </div>
            </div>
          } @else {
            <span class="title">{{ task().title }}</span>
          }
        </div>

        @if (!editing() && (task().dueAt || task().description || task().imageIds.length)) {
          <div class="badges">
            @if (task().dueAt) {
              <span class="due-badge" [class.overdue]="store.isOverdue(task())" [title]="'due: ' + formatDue(task().dueAt!)">
                {{ store.isOverdue(task()) ? '! due: ' : 'due: ' }}{{ formatDue(task().dueAt!) }}
              </span>
            }
            @if (task().description) { <span class="badge" title="has description">[desc]</span> }
            @if (task().imageIds.length) { <span class="badge" title="images">[img:{{ task().imageIds.length }}]</span> }
          </div>
        }
      </div>

      @if (!editing()) {
        <div class="meta">
          <div class="meta-progress">
            <app-progress [value]="task().progress" [done]="task().leafDone" [total]="task().leafTotal" />
          </div>
          <div class="meta-status">
            <select [value]="task().statusId" (change)="setStatus($any($event.target).value)">
              @for (s of store.statuses(); track s.id) {
                <option [value]="s.id" [selected]="s.id === task().statusId">{{ s.name }}</option>
              }
            </select>
          </div>
          <div class="row-btns">
            <button class="icon" (click)="editing.set(true)">edit</button>
            <button class="icon" (click)="adding.set(!adding())">+sub</button>
            <button class="icon danger" (click)="remove()" title="move to trash">x</button>
          </div>
        </div>
      }
    </div>

    @if (adding()) {
      <form class="add indent addrow" (submit)="$event.preventDefault(); addChild(inp.value, subDue.value); inp.value = ''; subDue.value = ''">
        <input #inp class="sub-title" placeholder="subtask..." autofocus (keydown.escape)="adding.set(false)" />
        <div class="edit-tools">
          <input #subDue type="datetime-local" class="due-in" title="optional deadline" />
          <div class="edit-btns">
            <button type="submit" class="ok">add</button>
            <button type="button" (click)="adding.set(false)">cancel</button>
          </div>
        </div>
      </form>
    }

    @if (!task().collapsed && task().children.length) {
      <div class="children">
        @for (c of task().children; track c.id) {
          <app-task-item [task]="c" />
        }
      </div>
    }
  `,
  styles: `
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
      padding: 6px 4px;
      border-bottom: 1px dashed var(--line);
      cursor: pointer;
    }
    .row.root { border-bottom-style: solid; background: #fff; }
    .row:hover { background: #f6f8fa; }
    .row.root .title { font-weight: 700; }
    .grip { color: var(--muted); cursor: grab; user-select: none; font-size: 12px; padding: 0 2px; }
    .grip:active { cursor: grabbing; }
    .dot { color: var(--muted); width: 16px; text-align: center; user-select: none; }
    .toggle-btn { min-width: 22px; padding: 1px 5px; font-weight: bold; }
    .row.drop-before { border-top: 2px solid var(--accent); }
    .row.drop-after { border-bottom: 2px solid var(--accent); }
    .row.drop-inside { outline: 2px dashed var(--accent); background: #eef6ff; }
    .main { display: flex; align-items: center; gap: 6px; flex: 1 1 220px; min-width: 0; }
    .task-head { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
    .title { flex: 1; word-break: break-word; line-height: 1.35; }
    .badges { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .edit-box { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
    .title-edit { flex: 1 1 180px; min-width: 0; }
    .edit-tools { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .edit-btns { display: inline-flex; gap: 4px; align-items: center; }
    .due-in { font-size: 12px; max-width: 175px; }
    .due-badge { font-size: 11px; color: var(--muted); border: 1px solid var(--line); padding: 1px 5px; background: #fff; white-space: nowrap; }
    .due-badge.overdue { color: var(--danger); border-color: var(--danger); font-weight: bold; }
    .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .meta-progress { display: inline-flex; align-items: center; }
    .meta-status { display: inline-flex; }
    .row-btns { display: inline-flex; gap: 4px; align-items: center; }
    .row.done .title { text-decoration: line-through; color: var(--muted); }
    .row.cancelled .title { text-decoration: line-through; color: var(--muted); font-style: italic; }
    .row.cancelled { opacity: 0.6; }
    .badge { font-size: 11px; color: var(--muted); }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    .icon.danger:hover { color: var(--danger); }
    select { max-width: 130px; }
    .children { margin: 4px 0 6px 10px; padding: 2px 6px 2px 10px; border-left: 2px solid var(--line); background: #fafaf7; }
    .indent { margin-left: 20px; }
    .addrow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid var(--line); padding: 6px; }
    .sub-title { flex: 1 1 180px; min-width: 0; }

    @media (max-width: 640px) {
      .row {
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
        padding: 6px 8px;
        margin-bottom: 5px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .grip { display: none; }
      .main {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 3px;
      }
      .task-head {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
      }
      .toggle-btn {
        min-height: 22px;
        min-width: 22px;
        padding: 0 4px;
        font-size: 12px;
      }
      .dot {
        line-height: 20px;
        width: 14px;
        font-size: 14px;
      }
      .title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.35;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        width: 100%;
        padding-left: 28px;
      }
      .due-badge, .badge {
        font-size: 10px;
        padding: 1px 4px;
        background: #f6f8fa;
        border: 1px solid var(--line);
      }
      .meta {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
        width: 100%;
        margin-left: 0;
        padding-top: 4px;
        border-top: 1px dashed var(--line);
      }
      .meta-progress {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        background: transparent;
        padding: 0;
        border: none;
      }
      .meta-status {
        flex: 1 1 auto;
        min-width: 0;
      }
      .meta-status select {
        width: 100%;
        max-width: 100%;
        min-height: 26px;
        height: 26px;
        padding: 2px 4px;
        font-size: 11px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .row-btns {
        display: inline-flex;
        gap: 3px;
        flex: 0 0 auto;
      }
      .row-btns button {
        min-height: 26px;
        height: 26px;
        width: auto;
        min-width: 26px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 500;
        text-align: center;
        background: #fff;
        border: 1px solid var(--line);
      }
      .edit-box {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      .title-edit {
        width: 100%;
        min-height: 28px;
        height: 28px;
        padding: 2px 6px;
        font-size: 13px;
      }
      .edit-tools {
        display: flex;
        gap: 4px;
        align-items: center;
        width: 100%;
      }
      .edit-tools .due-in {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 26px;
        height: 26px;
        font-size: 11px;
        padding: 2px 4px;
      }
      .edit-btns {
        display: inline-flex;
        gap: 4px;
        flex: 0 0 auto;
      }
      .edit-btns button {
        min-height: 26px;
        height: 26px;
        font-size: 11px;
        padding: 2px 8px;
      }
      .addrow {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 6px;
        margin: 4px 0 6px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .sub-title {
        width: 100%;
        min-height: 28px;
        height: 28px;
        padding: 2px 6px;
        font-size: 13px;
      }
      .children {
        margin: 4px 0 5px 6px;
        padding: 2px 0 2px 6px;
        border-left: 2px solid var(--line);
        background: transparent;
      }
      .indent {
        margin-left: 6px;
      }
    }
  `,
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly store = inject(TaskStore);
  private popup = inject(PopupService);
  readonly editing = signal(false);
  readonly adding = signal(false);
  readonly dropZone = signal<'before' | 'after' | 'inside' | null>(null);

  formatDue(iso: string): string {
    return iso.replace('T', ' ').slice(0, 16);
  }

  /** Tapping the container opens the task, unless an interactive control was hit. */
  onRowClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button,select,input,form,app-progress a,.grip')) return;
    this.store.openId.set(this.task().id);
  }
  toggle() {
    this.store.updateTask(this.task().id, { collapsed: !this.task().collapsed });
  }
  setStatus(statusId: string) {
    this.store.updateTask(this.task().id, { statusId });
  }
  save(title: string, dueAt: string) {
    title = title.trim();
    const patch: Partial<Task> = {};
    if (title && title !== this.task().title) patch.title = title;
    const cleanDue = dueAt ? dueAt : null;
    if (cleanDue !== (this.task().dueAt ?? null)) patch.dueAt = cleanDue;
    if (Object.keys(patch).length) this.store.updateTask(this.task().id, patch);
    this.editing.set(false);
  }
  addChild(title: string, dueAt: string) {
    this.store.addTask(this.task().id, title, 'task', dueAt || null);
    this.adding.set(false);
  }
  async remove() {
    const t = this.task();
    const msg = t.children.length
      ? `Delete "${t.title}" and its subtasks?`
      : `Delete "${t.title}"?`;
    if (await this.popup.confirm(msg, 'delete task')) {
      this.store.removeTask(t.id);
    }
  }

  onDragStart(e: DragEvent) {
    e.stopPropagation();
    this.store.draggedId.set(this.task().id);
    e.dataTransfer?.setData('text/plain', this.task().id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  onDragEnd() {
    this.store.draggedId.set(null);
    this.dropZone.set(null);
  }
  onDragOver(e: DragEvent) {
    const dragged = this.store.draggedId();
    if (!dragged || dragged === this.task().id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientY - rect.top) / (rect.height || 1);
    this.dropZone.set(rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'inside');
  }
  onDrop(e: DragEvent) {
    const dragged = this.store.draggedId() || e.dataTransfer?.getData('text/plain') || '';
    const mode = this.dropZone();
    this.dropZone.set(null);
    this.store.draggedId.set(null);
    if (!dragged || !mode || dragged === this.task().id) return;
    e.preventDefault();
    e.stopPropagation();
    this.store.moveTask(dragged, this.task().id, mode);
  }
}
