import { Component, inject, input, signal } from '@angular/core';
import { Task } from './models';
import { TaskStore } from './task-store';
import { Progress } from './progress';

/** Recursive node: renders a task and its subtasks (unlimited depth). Tap the row to open the task. */
@Component({
  selector: 'app-task-item',
  imports: [Progress],
  template: `
    <div class="row" [class.done]="store.isDone(task().statusId)" [class.cancelled]="store.isCancelled(task().statusId)" (click)="onRowClick($event)">
      <div class="main">
        <button class="icon" (click)="toggle()" [style.visibility]="task().children.length ? 'visible' : 'hidden'"
          title="collapse/expand">{{ task().collapsed ? '+' : '-' }}</button>

        @if (editing()) {
          <input #ed class="title-edit" [value]="task().title" autofocus
            (keydown.enter)="save(ed.value)" (keydown.escape)="editing.set(false)" />
          <button class="ok" (click)="save(ed.value)">ok</button>
        } @else {
          <span class="title">{{ task().title }}</span>
          @if (task().description) { <span class="badge" title="has description">=</span> }
          @if (task().imageIds.length) { <span class="badge" title="images">img:{{ task().imageIds.length }}</span> }
        }
      </div>

      <div class="meta">
        <app-progress [value]="task().progress" [done]="task().leafDone" [total]="task().leafTotal" />
        <select [value]="task().statusId" (change)="setStatus($any($event.target).value)">
          @for (s of store.statuses(); track s.id) {
            <option [value]="s.id" [selected]="s.id === task().statusId">{{ s.name }}</option>
          }
        </select>
        @if (!editing()) { <button class="icon" (click)="editing.set(true)">edit</button> }
        <button class="icon" (click)="adding.set(!adding())">+sub</button>
        <button class="icon danger" (click)="store.removeTask(task().id)" title="move to trash">x</button>
      </div>
    </div>

    @if (adding()) {
      <form class="add indent" (submit)="$event.preventDefault(); addChild(inp.value); inp.value = ''">
        <input #inp placeholder="subtask..." autofocus />
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
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 6px 0;
      border-bottom: 1px dashed var(--line); cursor: pointer; }
    .row:hover { background: #fff; }
    .main { display: flex; align-items: center; gap: 6px; flex: 1 1 220px; min-width: 0; }
    .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .title { flex: 1; word-break: break-word; }
    .title-edit { flex: 1; min-width: 0; }
    .row.done .title { text-decoration: line-through; color: var(--muted); }
    .row.cancelled .title { text-decoration: line-through; color: var(--muted); font-style: italic; }
    .row.cancelled { opacity: 0.6; }
    .badge { font-size: 11px; color: var(--muted); }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    .icon.danger:hover { color: var(--danger); }
    select { max-width: 130px; }
    .children { margin-left: 10px; padding-left: 8px; border-left: 1px solid var(--line); }
    .indent { margin-left: 30px; }
    .add input { width: 100%; }

    @media (max-width: 640px) {
      .meta { width: 100%; margin-left: 30px; }
      .meta select { flex: 1; }
      button { min-height: 36px; min-width: 40px; }
    }
  `,
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly store = inject(TaskStore);
  readonly editing = signal(false);
  readonly adding = signal(false);

  /** Tapping the container opens the task, unless an interactive control was hit. */
  onRowClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button,select,input,form,app-progress a')) return;
    this.store.openId.set(this.task().id);
  }
  toggle() {
    this.store.updateTask(this.task().id, { collapsed: !this.task().collapsed });
  }
  setStatus(statusId: string) {
    this.store.updateTask(this.task().id, { statusId });
  }
  save(title: string) {
    title = title.trim();
    if (title && title !== this.task().title) this.store.updateTask(this.task().id, { title });
    this.editing.set(false);
  }
  addChild(title: string) {
    this.store.addTask(this.task().id, title);
  }
}
