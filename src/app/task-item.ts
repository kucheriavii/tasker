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

      <div class="task-left">
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
        } @else {
          <div class="badges empty-badges"></div>
        }
      </div>

      @if (!editing()) {
        <div class="meta-controls">
          <div class="meta-status">
            <select [value]="task().statusId" (change)="setStatus($any($event.target).value)">
              @for (s of store.statuses(); track s.id) {
                <option [value]="s.id" [selected]="s.id === task().statusId">{{ s.name }}</option>
              }
            </select>
          </div>

          <div class="meta-right">
            <app-progress [value]="task().progress" [done]="task().leafDone" [total]="task().leafTotal" />
            <div class="row-btns">
              <button class="icon" (click)="editing.set(true)">edit</button>
              <button class="icon" (click)="adding.set(!adding())">+sub</button>
              <button class="icon danger" (click)="remove()" title="move to trash">x</button>
            </div>
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
      align-items: center;
      justify-content: space-between;
      gap: 6px 8px;
      padding: 5px 6px;
      border-bottom: 1px dashed var(--line);
      cursor: pointer;
    }
    .row.root { border-bottom-style: solid; background: #fff; }
    .row:hover { background: #f6f8fa; }
    .row.root .title { font-weight: 700; }
    .row.overdue { background: #fff8f8; border-color: #f5c2c7; }
    .row.overdue:hover { background: #fdf0f0; }
    .row.root.overdue { background: #fff5f5; }
    .grip { color: var(--muted); cursor: grab; user-select: none; font-size: 12px; padding: 0 2px; }
    .grip:active { cursor: grabbing; }
    .dot { color: var(--muted); width: 16px; text-align: center; user-select: none; }
    .toggle-btn { min-width: 22px; padding: 1px 5px; font-weight: bold; }
    .row.drop-before { border-top: 2px solid var(--accent); }
    .row.drop-after { border-bottom: 2px solid var(--accent); }
    .row.drop-inside { outline: 2px dashed var(--accent); background: #eef6ff; }
    .task-left { display: flex; flex-direction: column; gap: 2px; flex: 1 1 200px; min-width: 0; }
    .task-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .title { flex: 1; word-break: break-word; line-height: 1.35; }
    .badges { display: inline-flex; align-items: center; gap: 4px; padding-left: 28px; }
    .empty-badges { display: none; }
    .edit-box { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
    .title-edit { flex: 1 1 180px; min-width: 0; }
    .edit-tools { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .edit-btns { display: inline-flex; gap: 4px; align-items: center; }
    .due-in { font-size: 12px; max-width: 175px; }
    .due-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      color: var(--muted);
      border: 1px solid var(--line);
      padding: 1px 5px;
      margin-top: 5px;
      background: #fff;
      white-space: nowrap;
      border-radius: 2px;
    }
    .due-badge.overdue {
      color: #b71c1c;
      border-color: #f5c2c7;
      background: #ffebee;
      font-weight: 700;
    }
    .meta-controls { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex: 0 0 auto; }
    .meta-status { display: inline-flex; }
    .meta-status select { max-width: 130px; }
    .meta-right { display: inline-flex; align-items: center; gap: 6px; }
    .row-btns { display: inline-flex; gap: 4px; align-items: center; }
    .row.done .title { text-decoration: line-through; color: var(--muted); }
    .row.cancelled .title { text-decoration: line-through; color: var(--muted); font-style: italic; }
    .row.cancelled { opacity: 0.6; }
    .badge { font-size: 11px; color: var(--muted); }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    .icon.danger:hover { color: var(--danger); }
    .children { margin: 4px 0 6px 10px; padding: 2px 6px 2px 10px; border-left: 2px solid var(--line); background: #fafaf7; }
    .indent { margin-left: 20px; }
    .addrow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid var(--line); padding: 6px; }
    .sub-title { flex: 1 1 180px; min-width: 0; }

    @media (max-width: 640px) {
      .row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 2px 6px;
        padding: 4px 6px;
        margin-bottom: 3px;
        background: #fff;
        border: 1px solid var(--line);
        min-height: 34px;
        max-height: 64px;
        overflow: hidden;
      }
      .row.overdue {
        background: #fff8f8;
        border-color: #f5c2c7;
      }
      .grip { display: none; }
      .task-left {
        display: contents;
      }
      .task-head {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
      }
      .toggle-btn {
        min-height: 18px;
        height: 18px;
        min-width: 18px;
        padding: 0 2px;
        font-size: 11px;
        flex: 0 0 18px;
      }
      .dot {
        line-height: 16px;
        width: 12px;
        font-size: 13px;
        flex: 0 0 12px;
      }
      .title {
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meta-controls {
        display: contents;
      }
      .meta-status {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        display: flex;
        justify-content: flex-end;
      }
      .meta-status select {
        width: 84px;
        max-width: 90px;
        min-height: 20px;
        height: 20px;
        padding: 1px 3px;
        font-size: 10.5px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .badges {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 3px;
        padding-left: 23px;
        overflow: hidden;
      }
      .empty-badges {
        display: block;
        height: 0;
      }
      .due-badge, .badge {
        display: inline-flex;
        align-items: center;
        font-size: 9.5px;
        padding: 1px 3px;
        margin-top: 5px;
        background: #f6f8fa;
        border: 1px solid var(--line);
        line-height: 1.15;
        white-space: nowrap;
      }
      .due-badge.overdue {
        color: #b71c1c;
        border-color: #f5c2c7;
        background: #ffebee;
        font-weight: 700;
      }
      .meta-right {
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }
      .row-btns {
        display: inline-flex;
        gap: 2px;
      }
      .row-btns button {
        min-height: 20px;
        height: 20px;
        min-width: 22px;
        padding: 0 4px;
        font-size: 10px;
        font-weight: 500;
        text-align: center;
        background: #fff;
        border: 1px solid var(--line);
      }
      .edit-box {
        grid-column: 1 / 3;
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
      }
      .title-edit {
        width: 100%;
        min-height: 24px;
        height: 24px;
        padding: 1px 4px;
        font-size: 12px;
      }
      .edit-tools {
        display: flex;
        gap: 3px;
        align-items: center;
        width: 100%;
      }
      .edit-tools .due-in {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 22px;
        height: 22px;
        font-size: 10.5px;
        padding: 1px 3px;
      }
      .edit-btns {
        display: inline-flex;
        gap: 3px;
        flex: 0 0 auto;
      }
      .edit-btns button {
        min-height: 22px;
        height: 22px;
        font-size: 10.5px;
        padding: 1px 6px;
      }
      .addrow {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 4px 6px;
        margin: 2px 0 4px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .sub-title {
        width: 100%;
        min-height: 24px;
        height: 24px;
        padding: 1px 4px;
        font-size: 12px;
      }
      .children {
        margin: 2px 0 3px 5px;
        padding: 1px 0 1px 5px;
        border-left: 2px solid var(--line);
        background: transparent;
      }
      .indent {
        margin-left: 5px;
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
