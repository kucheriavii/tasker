import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TaskItem } from './task-item';
import { ImportPanel } from './import-panel';
import { LibraryPanel } from './library-panel';
import { PopupModal, PopupService } from './popup';
import { TaskStore } from './task-store';
import { Progress } from './progress';

@Component({
  selector: 'app-root',
  imports: [TaskItem, Progress, ImportPanel, LibraryPanel, PopupModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '(window:paste)': 'onPaste($event)' },
})
export class App {
  readonly store = inject(TaskStore);
  readonly popup = inject(PopupService);
  /** Active top-level tab: 'task' = short-term tasks, 'book' = long-term books/courses. */
  readonly tab = signal<'task' | 'book'>('task');
  readonly panel = signal<'none' | 'statuses' | 'trash' | 'import' | 'library'>('none');
  readonly dragging = signal(false);
  readonly rootDrop = signal(false);
  readonly editTitle = signal(false);
  readonly editDesc = signal(false);
  readonly descBox = viewChild<ElementRef<HTMLTextAreaElement>>('dd');

  readonly activeList = computed(() =>
    this.tab() === 'book' ? this.store.books() : this.store.tree());

  constructor() {
    // leave edit modes when navigating to another task; sync tab with root task kind
    effect(() => {
      this.store.openId();
      this.editTitle.set(false);
      this.editDesc.set(false);
      const root = this.store.breadcrumbs()[0];
      if (root) this.tab.set(root.kind === 'book' ? 'book' : 'task');
    });
  }

  switchTab(t: 'task' | 'book') {
    this.tab.set(t);
    this.store.openId.set(null);
  }

  async toggleRole() {
    if (this.store.isAdmin()) {
      if (await this.popup.confirm('Switch from admin to regular user mode?', 'switch role')) {
        this.store.logoutAdmin();
      }
      return;
    }
    const pwd = await this.popup.prompt('Enter admin password (default: admin):', {
      title: 'admin login',
      placeholder: 'admin password...',
      inputType: 'password',
      defaultValue: 'admin',
    });
    if (pwd === null) return;
    const ok = await this.store.loginAdmin(pwd);
    if (!ok) await this.popup.alert('Invalid admin password.', 'access denied');
  }

  async resetSubtasks(id: string, statusId: string, name: string) {
    if (await this.popup.confirm(`Set ALL subtasks to "${name}"?`, 'reset subtasks')) {
      this.store.setSubtasksStatus(id, statusId);
    }
  }

  async purgeFromTrash(id: string) {
    if (await this.popup.confirm('Delete this task forever?', 'purge task')) {
      this.store.purgeTask(id);
    }
  }

  async emptyTrash() {
    if (await this.popup.confirm('Empty trash? This cannot be undone.', 'empty trash')) {
      this.store.emptyTrash();
    }
  }

  async removeImage(id: string) {
    if (await this.popup.confirm('Delete this image?', 'delete image')) {
      this.store.removeImage(id);
    }
  }

  async saveToLibrary(id: string) {
    try {
      await this.store.saveTaskToLibrary(id, 'book');
      this.panel.set('library');
    } catch (e: any) {
      await this.popup.alert(e?.error?.error || 'Could not save to library', 'library');
    }
  }

  toggleKind(id: string, current: 'task' | 'book') {
    const next = current === 'book' ? 'task' : 'book';
    this.store.updateTask(id, { kind: next });
    this.tab.set(next);
  }

  onRootDrop(e: DragEvent) {
    this.rootDrop.set(false);
    const dragged = this.store.draggedId() || e.dataTransfer?.getData('text/plain') || '';
    this.store.draggedId.set(null);
    if (!dragged) return;
    e.preventDefault();
    this.store.moveTask(dragged, null, 'after', this.tab());
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
