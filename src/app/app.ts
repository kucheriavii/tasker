import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TaskItem } from './task-item';
import { ImportPanel } from './import-panel';
import { LibraryPanel } from './library-panel';
import { PopupModal, PopupService } from './popup';
import { TaskStore } from './task-store';
import { Progress } from './progress';
import { I18nService } from './i18n';

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
  readonly i18n = inject(I18nService);
  /** Active top-level tab: 'task' = short-term tasks, 'book' = long-term books/courses. */
  readonly tab = signal<'task' | 'book'>('task');
  readonly panel = signal<'none' | 'statuses' | 'trash' | 'import' | 'library'>('none');
  readonly menuOpen = signal(false);
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
    this.panel.set('none');
    this.store.openId.set(null);
  }

  onLibraryCloned(e: { id: string; targetKind: 'task' | 'book' }) {
    this.tab.set(e.targetKind);
    this.panel.set('none');
    this.store.openId.set(e.id);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  switchTabMobile(t: 'task' | 'book') {
    this.switchTab(t);
    this.closeMenu();
  }

  toggleMobile(p: 'statuses' | 'trash' | 'import' | 'library') {
    this.toggle(p);
    this.closeMenu();
  }

  async toggleRoleMobile() {
    this.closeMenu();
    await this.toggleRole();
  }

  async toggleRole() {
    const t = this.i18n.t();
    if (this.store.isAdmin()) {
      if (await this.popup.confirm(t.confirmSwitchToUser, t.role)) {
        this.store.logoutAdmin();
        if (this.panel() === 'import' || this.panel() === 'statuses' || this.panel() === 'trash') {
          this.panel.set('none');
        }
      }
      return;
    }
    const pwd = await this.popup.prompt(t.adminPrompt, {
      title: t.adminLoginTitle,
      placeholder: t.adminPasswordPlaceholder,
      inputType: 'password',
      defaultValue: 'admin',
    });
    if (pwd === null) return;
    const ok = await this.store.loginAdmin(pwd);
    if (!ok) await this.popup.alert(t.invalidAdminPassword, t.accessDenied);
  }

  async resetSubtasks(id: string, statusId: string, name: string) {
    if (await this.popup.confirm(this.i18n.t().confirmResetSubtasks(name), this.i18n.t().resetBtn)) {
      this.store.setSubtasksStatus(id, statusId);
    }
  }

  async purgeFromTrash(id: string) {
    if (await this.popup.confirm(this.i18n.t().confirmPurgeTask, this.i18n.t().purgeBtn)) {
      this.store.purgeTask(id);
    }
  }

  async emptyTrash() {
    if (await this.popup.confirm(this.i18n.t().confirmEmptyTrash, this.i18n.t().trash)) {
      this.store.emptyTrash();
    }
  }

  async removeImage(id: string) {
    if (await this.popup.confirm(this.i18n.t().confirmDeleteImage, this.i18n.t().imagesHeading)) {
      this.store.removeImage(id);
    }
  }

  async removeStatus(id: string, name: string) {
    if (await this.popup.confirm(this.i18n.t().confirmDeleteStatus(name), this.i18n.t().statuses)) {
      this.store.removeStatus(id);
    }
  }

  saveDue(id: string, dueAt: string) {
    this.store.updateTask(id, { dueAt: dueAt || null });
  }

  async clearDue(id: string) {
    if (await this.popup.confirm(this.i18n.t().confirmClearDue, this.i18n.t().deadlineHeading)) {
      this.store.updateTask(id, { dueAt: null });
    }
  }

  formatDue(iso: string): string {
    return iso.replace('T', ' ').slice(0, 16);
  }

  async saveToLibrary(id: string) {
    if (!this.store.isAdmin()) return;
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
