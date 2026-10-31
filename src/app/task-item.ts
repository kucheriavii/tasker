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
              <button class="ok" (click)="save(ed.value, dueEd.value)">ok</button>
              <button (click)="editing.set(false)">cancel</button>
            </div>
          </div>
        } @else {
          <span class="title">{{ task().title }}</span>
          <span class="badges">
            @if (task().dueAt) {
              <span class="due-badge" [class.overdue]="store.isOverdue(task())" [title]="'due: ' + formatDue(task().dueAt!)">
                {{ store.isOverdue(task()) ? '! ' : '' }}{{ formatDue(task().dueAt!) }}
              </span>
            }
            @if (task().description) { <span class="badge" title="has description">=</span> }
            @if (task().imageIds.length) { <span class="badge" title="images">img:{{ task().imageIds.length }}</span> }
          </span>
        }
      </div>

      @if (!editing()) {
        <div class="meta">
          <app-progress [value]="task().progress" [done]="task().leafDone" [total]="task().leafTotal" />
          <select [value]="task().statusId" (change)="setStatus($any($event.target).value)">
            @for (s of store.statuses(); track s.id) {
              <option [value]="s.id" [selected]="s.id === task().statusId">{{ s.name }}</option>
            }
          </select>
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
          <button type="submit" class="ok">add</button>
          <button type="button" (click)="adding.set(false)">cancel</button>
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
    .title { flex: 1; word-break: break-word; line-height: 1.35; }
    .badges { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .edit-box { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
    .title-edit { flex: 1 1 180px; min-width: 0; }
    .edit-tools { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .due-in { font-size: 12px; max-width: 175px; }
    .due-badge { font-size: 11px; color: var(--muted); border: 1px solid var(--line); padding: 1px 5px; background: #fff; white-space: nowrap; }
    .due-badge.overdue { color: var(--danger); border-color: var(--danger); font-weight: bold; }
    .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-left: auto; }
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
        padding: 8px 2px;
        gap: 6px;
      }
      .grip { display: none; }
      .main {
        flex: 1 1 100%;
        align-items: flex-start;
      }
      .toggle-btn {
        min-height: 26px;
        min-width: 26px;
        padding: 0 4px;
      }
      .dot {
        line-height: 22px;
      }
      .meta {
        width: 100%;
        margin-left: 0;
        padding-top: 4px;
        justify-content: space-between;
        gap: 6px;
      }
      .meta select {
        flex: 1 1 95px;
        max-width: none;
        min-height: 32px;
        padding: 2px 20px 2px 6px;
        font-size: 13px;
      }
      .row-btns button {
        min-height: 32px;
        min-width: 34px;
        padding: 2px 7px;
        font-size: 12px;
      }
      .edit-box .title-edit, .addrow .sub-title {
        flex: 1 1 100%;
      }
      .edit-tools {
        width: 100%;
      }
      .edit-tools .due-in {
        flex: 1 1 140px;
        max-width: none;
      }
      .children {
        margin: 4px 0 4px 4px;
        padding: 2px 4px 2px 8px;
      }
      .indent {
        margin-left: 8px;
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
