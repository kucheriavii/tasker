import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { TaskItem } from './task-item';
import { ImportPanel } from './import-panel';
import { LibraryPanel } from './library-panel';
import { TaskStore } from './task-store';
import { Progress } from './progress';

@Component({
  selector: 'app-root',
  imports: [TaskItem, Progress, ImportPanel, LibraryPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '(window:paste)': 'onPaste($event)' },
})
export class App {
  readonly store = inject(TaskStore);
  readonly panel = signal<'none' | 'statuses' | 'trash' | 'import' | 'library'>('none');
  readonly dragging = signal(false);
  readonly rootDrop = signal(false);
  readonly editTitle = signal(false);
  readonly editDesc = signal(false);
  readonly descBox = viewChild<ElementRef<HTMLTextAreaElement>>('dd');

  constructor() {
    // leave edit modes when navigating to another task
    effect(() => {
      this.store.openId();
      this.editTitle.set(false);
      this.editDesc.set(false);
    });
  }

  resetSubtasks(id: string, statusId: string, name: string) {
    if (window.confirm(`Set ALL subtasks to "${name}"?`)) this.store.setSubtasksStatus(id, statusId);
  }

  async saveToLibrary(id: string) {
    await this.store.saveTaskToLibrary(id, 'book');
    this.panel.set('library');
  }

  onRootDrop(e: DragEvent) {
    this.rootDrop.set(false);
    const dragged = this.store.draggedId() || e.dataTransfer?.getData('text/plain') || '';
    this.store.draggedId.set(null);
    if (!dragged) return;
    e.preventDefault();
    this.store.moveTask(dragged, null, 'after');
  }

  confirm(msg: string) {
    return window.confirm(msg);
  }

  toggle(p: 'statuses' | 'trash' | 'import' | 'library') {
    this.panel.set(this.panel() === p ? 'none' : p);
  }

  /** Ctrl+V of an image while a task is open attaches it. */
  onPaste(e: ClipboardEvent) {
    const open = this.store.open();
    if (!open) return;
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); this.store.addImages(open.id, files); }
  }

  onFiles(input: HTMLInputElement) {
    const open = this.store.open();
    if (open && input.files) this.store.addImages(open.id, Array.from(input.files));
    input.value = '';
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const open = this.store.open();
    if (open) this.store.addImages(open.id, Array.from(e.dataTransfer?.files ?? []));
  }

  saveTitle(id: string, current: string, v: string) {
    v = v.trim();
    if (v && v !== current) this.store.updateTask(id, { title: v });
    this.editTitle.set(false);
  }

  saveDescription(id: string, current: string, v: string) {
    if (v !== current) this.store.updateTask(id, { description: v });
    this.editDesc.set(false);
  }
}
