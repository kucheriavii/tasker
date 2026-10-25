import { Component, inject, input, signal } from '@angular/core';
import { Task } from './models';
import { TaskStore } from './task-store';
import { Progress } from './progress';

/** Recursive node: renders a task and its subtasks (unlimited depth). */
@Component({
  selector: 'app-task-item',
  imports: [Progress],
  template: `
    <div class="row" [class.done]="store.isDone(task().statusId)">
      <button class="icon" (click)="toggle()" [style.visibility]="task().children.length ? 'visible' : 'hidden'"
        title="collapse/expand">{{ task().collapsed ? '+' : '-' }}</button>

      @if (editing()) {
        <input class="title-edit" [value]="task().title" autofocus
          (keydown.enter)="save($any($event.target).value)"
          (keydown.escape)="editing.set(false)"
          (blur)="save($any($event.target).value)" />
      } @else {
        <span class="title" (dblclick)="editing.set(true)" title="double-click to edit">{{ task().title }}</span>
      }

      @if (task().description) { <span class="badge" title="has description">=</span> }
      @if (task().imageIds.length) { <span class="badge" title="images">img:{{ task().imageIds.length }}</span> }

      <app-progress [value]="task().progress" [done]="task().leafDone" [total]="task().leafTotal" />

      <select [value]="task().statusId" (change)="setStatus($any($event.target).value)">
        @for (s of store.statuses(); track s.id) {
          <option [value]="s.id" [selected]="s.id === task().statusId">{{ s.name }}</option>
        }
      </select>
      <button class="icon" (click)="store.openId.set(task().id)" title="open task">open</button>
      <button class="icon" (click)="adding.set(!adding())" title="add subtask">+sub</button>
      <button class="icon danger" (click)="store.removeTask(task().id)" title="move to trash">x</button>
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
    .row { display: flex; align-items: center; gap: 6px; padding: 3px 0; border-bottom: 1px dashed var(--line); }
    .row:hover { background: #fff; }
    .title { flex: 1; cursor: text; word-break: break-word; }
    .title-edit { flex: 1; }
    .row.done .title { text-decoration: line-through; color: var(--muted); }
    .badge { font-size: 11px; color: var(--muted); }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .icon.danger:hover { color: var(--danger); }
    select { max-width: 130px; }
    .children { margin-left: 14px; padding-left: 10px; border-left: 1px solid var(--line); }
    .indent { margin-left: 30px; }
    .add input { width: 100%; }
  `,
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly store = inject(TaskStore);
  readonly editing = signal(false);
  readonly adding = signal(false);

  toggle() {
    this.store.updateTask(this.task().id, { collapsed: !this.task().collapsed });
  }
  setStatus(statusId: string) {
    this.store.updateTask(this.task().id, { statusId });
  }
  save(title: string) {
    if (!this.editing()) return;
    title = title.trim();
    if (title) this.store.updateTask(this.task().id, { title });
    this.editing.set(false);
  }
  addChild(title: string) {
    this.store.addTask(this.task().id, title);
  }
}
