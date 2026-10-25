import { Component, inject, signal } from '@angular/core';
import { TaskItem } from './task-item';
import { TaskStore } from './task-store';

@Component({
  selector: 'app-root',
  imports: [TaskItem],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly store = inject(TaskStore);
  readonly showSettings = signal(false);
}
