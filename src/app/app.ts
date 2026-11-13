import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TaskItem } from './task-item';
import { ImportPanel } from './import-panel';
import { PopupModal, PopupService } from './popup';
import { TaskStore } from './task-store';
import { Progress } from './progress';
import { I18nService } from './i18n';
import { DebugProfile } from './models';

@Component({
  selector: 'app-root',
  imports: [TaskItem, Progress, ImportPanel, PopupModal],
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
  readonly panel = signal<'none' | 'statuses' | 'trash' | 'import' | 'purgatory'>('none');
  readonly menuOpen = signal(false);
  readonly profileMenuOpen = signal(false);
  readonly authModalOpen = signal(false);
  readonly dragging = signal(false);
  readonly rootDrop = signal(false);
  readonly editTitle = signal(false);
  readonly editDesc = signal(false);
  readonly editTags = signal(false);
  readonly descBox = viewChild<ElementRef<HTMLTextAreaElement>>('dd');
  readonly tagsInput = viewChild<ElementRef<HTMLInputElement>>('tagsBox');
  readonly avatarImgFailed = signal(false);

  isAvatarUrl(val?: string | null): boolean {
    if (!val) return false;
    return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:');
  }

  getProfileEmoji(profile?: DebugProfile | null): string {
    if (!profile) return '👤';
    if (this.isAvatarUrl(profile.avatar)) {
      return profile.role === 'admin' ? '👑' : '👤';
    }
    return profile.avatar || (profile.role === 'admin' ? '👑' : '👤');
  }

  formatCharName(c?: string | null): string {
    const val = (c || 'book').trim().toLowerCase();
    if (val === 'book') return '📖 ' + this.i18n.t().charBook;
    if (val === 'course') return '🎓 ' + this.i18n.t().charCourse;
    return '🔖 ' + val;
  }

  countBooksWithChar(c: string): number {
    const target = c.trim().toLowerCase();
    return this.store.books().filter((b) => (b.characteristic || 'book').trim().toLowerCase() === target).length;
  }

  adminAddCustomChar() {
    const val = prompt(this.i18n.t().enterCustomChar, '');
    if (val && val.trim()) {
      this.store.selectedChar.set(val.trim().toLowerCase());
    }
  }

  onAddCharChange(e: Event, selectEl: HTMLSelectElement) {
    if (selectEl.value === '__custom__') {
      const val = prompt(this.i18n.t().enterCustomChar, '');
      if (val && val.trim()) {
        const clean = val.trim().toLowerCase();
        const opt = document.createElement('option');
        opt.value = clean;
        opt.textContent = '🔖 ' + clean;
        opt.selected = true;
        selectEl.insertBefore(opt, selectEl.lastElementChild);
      } else {
        selectEl.value = 'course';
      }
    }
  }

  async promptCustomChar(taskId: string, currentChar?: string) {
    const val = prompt(this.i18n.t().enterCustomChar, currentChar || '');
    if (val !== null && val.trim()) {
      await this.store.updateTask(taskId, { characteristic: val.trim().toLowerCase() });
    }
  }

  readonly activeList = computed(() =>
    this.tab() === 'book' ? this.store.filteredBooks() : this.store.tree());

  constructor() {
    // Check for auth error in query string
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const authError = url.searchParams.get('auth_error');
      if (authError) {
        url.searchParams.delete('auth_error');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        if (authError === 'google_not_configured') {
          this.popup.alert('Google OAuth не налаштовано', 'Будь ласка, вкажіть GOOGLE_CLIENT_ID та GOOGLE_CLIENT_SECRET у файлі .env.');
        } else if (authError === 'github_not_configured') {
          this.popup.alert('GitHub OAuth не налаштовано', 'Будь ласка, вкажіть GITHUB_CLIENT_ID та GITHUB_CLIENT_SECRET у файлі .env.');
        } else {
          this.popup.alert('Помилка авторизації', `Не вдалося виконати вхід: ${authError}`);
        }
      }
    }

    // leave edit modes when navigating to another task; sync tab with root task kind
    effect(() => {
      this.store.openId();
      this.editTitle.set(false);
      this.editDesc.set(false);
      this.editTags.set(false);
      const root = this.store.breadcrumbs()[0];
      if (root) this.tab.set(root.kind === 'book' ? 'book' : 'task');
    });
  }

  switchTab(t: 'task' | 'book') {
    this.tab.set(t);
    this.panel.set('none');
    this.store.openId.set(null);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen()) this.profileMenuOpen.set(false);
  }

  closeMenu() {
    this.menuOpen.set(false);
    this.profileMenuOpen.set(false);
  }

  toggleProfileMenu() {
    this.profileMenuOpen.update((v) => !v);
  }

  openAuthModal() {
    this.authModalOpen.set(true);
    this.profileMenuOpen.set(false);
    this.closeMenu();
  }

  closeAuthModal() {
    this.authModalOpen.set(false);
  }

  async logout() {
    await this.store.logout();
    this.profileMenuOpen.set(false);
    this.closeMenu();
  }

  async devLogin(p: DebugProfile) {
    await this.store.devLogin(p);
    this.authModalOpen.set(false);
    this.profileMenuOpen.set(false);
    this.closeMenu();
  }

  selectProfile(p: DebugProfile) {
    this.store.switchProfile(p);
    this.profileMenuOpen.set(false);
    this.menuOpen.set(false);
  }

  switchTabMobile(t: 'task' | 'book') {
    this.switchTab(t);
    this.closeMenu();
  }

  toggleMobile(p: 'statuses' | 'trash' | 'import' | 'purgatory') {
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
        if (this.panel() === 'import' || this.panel() === 'statuses' || this.panel() === 'trash' || this.panel() === 'purgatory') {
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

  async purgeBook(id: string, title: string) {
    if (await this.popup.confirm(this.i18n.t().confirmPurgeBook(title), this.i18n.t().purgeBookBtn)) {
      this.store.purgeTask(id);
    }
  }

  async emptyPurgatory() {
    if (await this.popup.confirm(this.i18n.t().confirmEmptyPurgatory, this.i18n.t().purgatory)) {
      this.store.emptyPurgatory();
    }
  }

  saveTags(id: string, tags: string) {
    this.store.updateTask(id, { tags: tags.trim() });
    this.editTags.set(false);
  }

  parseTags(tags: string | null | undefined): string[] {
    return (tags || '').split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
  }

  filterByTag(tag: string) {
    this.store.selectedTag.set(tag);
    this.store.openId.set(null);
    this.tab.set('book');
  }

  toggle(p: 'statuses' | 'trash' | 'import' | 'purgatory') {
    this.panel.set(this.panel() === p ? 'none' : p);
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

  async cloneBookToTasks(id: string) {
    const rootId = this.store.breadcrumbs()[0]?.id ?? id;
    try {
      const newId = await this.store.cloneBookToTasks(rootId);
      this.tab.set('task');
      this.store.openId.set(newId);
    } catch (e: any) {
      await this.popup.alert(e?.error?.error || 'Failed to clone book', 'error');
    }
  }

  getStatusName(statusId: string): string {
    return this.store.statuses().find((s) => s.id === statusId)?.name ?? '';
  }

  toggleKind(id: string, current: 'task' | 'book') {
    if (!this.store.isAdmin()) return;
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
