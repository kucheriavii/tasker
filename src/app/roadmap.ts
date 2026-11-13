import { Component, computed, inject, signal } from '@angular/core';
import { TaskStore } from './task-store';
import { I18nService } from './i18n';
import { PopupService } from './popup';
import { Roadmap, RoadmapNode } from './models';

@Component({
  selector: 'app-roadmap',
  template: `
    <div class="roadmap-container">
      @if (store.activeRoadmap(); as rm) {
        <!-- ================= INSIDE ROADMAP VIEW (Diablo 2 Skill Tree) ================= -->
        <div class="roadmap-topbar inside-bar">
          <div class="roadmap-breadcrumbs">
            <button class="crumb-btn" (click)="backToCatalog()">~ {{ i18n.t().roadmap }}</button>
            <span class="crumb-sep">/</span>
            <button class="crumb-btn cat-crumb" (click)="selectCategoryAndBack(rm.category || 'Загальні')">
              📁 {{ rm.category || 'Загальні' }}
            </button>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">{{ rm.icon || '🗺️' }} {{ rm.title }}</span>
          </div>

          <div class="topbar-actions">
            <button class="back-catalog-btn" (click)="backToCatalog()">
              {{ i18n.t().backToRoadmaps }}
            </button>
            @if (store.isAdmin()) {
              <button class="icon-btn danger" (click)="deleteCurrentRoadmap()" [title]="i18n.t().deleteBtn">🗑️</button>
            } @else {
              <span class="learner-badge" [title]="i18n.t().roadmapPersonalProgressHint">
                {{ i18n.t().roadmapLearnerBadge }}
              </span>
            }
          </div>
        </div>

        <!-- Diablo Hero Progress Banner -->
        <div class="hero-banner">
          <div class="hero-rank-orb">
            <span class="orb-icon">⚔️</span>
            <div class="orb-lvl">L{{ userLevel() }}</div>
          </div>

          <div class="hero-stats">
            <div class="hero-title-row">
              <h2 class="hero-title">{{ rm.title }}</h2>
              <span class="hero-role-badge">[{{ rm.targetRole }}]</span>
              <span class="hero-cat-badge">📁 {{ rm.category || 'Загальні' }}</span>
            </div>
            <p class="hero-desc">{{ rm.description }}</p>

            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" [style.width.%]="completionPercentage()"></div>
              <span class="progress-text">{{ i18n.t().progressCount(completedCount(), totalNodesCount(), completionPercentage()) }}</span>
            </div>

            <!-- Current Focus (In progress nodes) -->
            @if (inProgressNodes().length) {
              <div class="focus-row">
                <span class="focus-label">⚡ {{ i18n.t().currentFocusTitle }}</span>
                @for (node of inProgressNodes(); track node.id) {
                  <button class="focus-chip" (click)="selectSkill(node)">
                    <span>{{ node.icon }}</span>
                    <span>{{ node.title }}</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Diablo 2 Skill Tree Board -->
        <div class="skill-tree-board">
          @for (tier of tiersList(); track tier) {
            <div class="tier-column">
              <div class="tier-header">
                <span class="tier-title">TIER {{ tier }}</span>
                <span class="tier-desc">{{ getTierName(tier) }}</span>
              </div>

              <div class="tier-nodes">
                @for (node of getNodesForTier(tier); track node.id) {
                  <div
                    class="skill-socket"
                    [class.socket-completed]="node.status === 'completed'"
                    [class.socket-in-progress]="node.status === 'in_progress'"
                    [class.socket-available]="node.status === 'available'"
                    [class.socket-locked]="node.status === 'locked'"
                    [class.socket-selected]="store.selectedSkillId() === node.id"
                    (click)="selectSkill(node)">

                    <div class="socket-rune-frame">
                      <span class="socket-icon">{{ node.icon }}</span>
                      @if (node.status === 'locked') {
                        <span class="lock-overlay">🔒</span>
                      } @else if (node.status === 'completed') {
                        <span class="check-overlay">✅</span>
                      } @else if (node.status === 'in_progress') {
                        <span class="active-spark">⚡</span>
                      }
                    </div>

                    <div class="socket-info">
                      <div class="socket-title">{{ node.title }}</div>
                      <div class="socket-branch">{{ node.branch }}</div>
                      <div class="socket-status-label">{{ getStatusText(node.status) }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- ================= FRONTPAGE / CATALOG VIEW (Categorized Folders) ================= -->
        <div class="frontpage-container">
          <div class="frontpage-hero">
            <div class="hero-left">
              <h2 class="frontpage-title">🗺️ {{ i18n.t().roadmapFrontpageTitle }}</h2>
              <p class="frontpage-desc">{{ i18n.t().roadmapFrontpageDesc }}</p>
            </div>
            <div class="hero-right">
              @if (store.isAdmin()) {
                <button class="ai-create-btn large" (click)="openAiModal()">
                  ✨ {{ i18n.t().createRoadmapBtn }}
                </button>
              } @else {
                <span class="learner-badge" [title]="i18n.t().roadmapPersonalProgressHint">
                  {{ i18n.t().roadmapLearnerBadge }}
                </span>
              }
            </div>
          </div>

          <!-- Controls: Search & Category Chips -->
          <div class="frontpage-toolbar">
            <div class="search-wrap">
              <input
                type="text"
                class="search-input"
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)"
                [placeholder]="i18n.t().searchRoadmapsPlaceholder" />
              @if (searchQuery()) {
                <button class="clear-search-btn" (click)="searchQuery.set('')">✕</button>
              }
            </div>

            <div class="category-chips">
              <button
                class="category-chip"
                [class.active]="selectedCategory() === null"
                (click)="selectedCategory.set(null)">
                📁 {{ i18n.t().allCategories }} ({{ store.roadmaps().length }})
              </button>
              @for (cat of categories(); track cat.name) {
                <button
                  class="category-chip"
                  [class.active]="selectedCategory() === cat.name"
                  (click)="selectedCategory.set(selectedCategory() === cat.name ? null : cat.name)">
                  📁 {{ cat.name }} ({{ cat.count }})
                </button>
              }
            </div>
          </div>

          <!-- Categorized Folders Grid -->
          <div class="categories-list">
            @for (group of groupedByCategory(); track group.category) {
              <div class="category-folder-block">
                <div class="folder-header">
                  <span class="folder-icon">📁</span>
                  <h3 class="folder-title">{{ group.category }}</h3>
                  <span class="folder-count">({{ group.roadmaps.length }})</span>
                </div>

                <div class="cards-grid">
                  @for (crd of group.roadmaps; track crd.id) {
                    <div class="roadmap-card" (click)="openRoadmap(crd)">
                      <div class="card-header">
                        <span class="card-icon">{{ crd.icon || '🗺️' }}</span>
                        <div class="card-title-wrap">
                          <h4 class="card-title">{{ crd.title }}</h4>
                          <span class="card-role">[{{ crd.targetRole }}]</span>
                        </div>
                      </div>

                      <p class="card-description">{{ crd.description }}</p>

                      <div class="card-meta">
                        <span class="card-skills-tag">⚡ {{ crd.nodes.length }} навичок • Tier I–V</span>
                        @let p = getRoadmapProgress(crd);
                        <span class="card-prog-tag" [class.has-prog]="p.completed > 0 || p.inProgress > 0">
                          L{{ p.level }} • {{ p.completed }}/{{ p.total }} ({{ p.pct }}%)
                        </span>
                      </div>

                      <div class="card-footer">
                        <button class="card-enter-btn">
                          {{ i18n.t().enterRoadmapBtn }} →
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-roadmaps">
                <p class="hint">{{ i18n.t().noRoadmapsFound }}</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Skill Inspector Modal -->
      @if (inspectNode(); as node) {
        <div class="skill-modal-backdrop" (click)="inspectNode.set(null)"></div>
        <div class="skill-modal" role="dialog">
          <div class="modal-header">
            <div class="modal-header-icon">{{ node.icon }}</div>
            <div class="modal-header-text">
              <span class="modal-tier-badge">TIER {{ node.tier }} • {{ node.branch }}</span>
              <h3 class="modal-title">{{ node.title }}</h3>
            </div>
            <button class="modal-close" (click)="inspectNode.set(null)">✕</button>
          </div>

          <div class="modal-body">
            <p class="node-full-desc">{{ node.description }}</p>

            @if (node.whyImportant) {
              <div class="importance-box">
                <span class="importance-label">💡 {{ i18n.t().whyImportantTitle }}</span>
                <p class="importance-text">{{ node.whyImportant }}</p>
              </div>
            }

            <!-- Prerequisites Indicator -->
            <div class="section-block">
              <h4 class="section-title">{{ i18n.t().prerequisitesTitle }}</h4>
              @if (node.prerequisites && node.prerequisites.length) {
                <div class="prereq-list">
                  @for (pid of node.prerequisites; track pid) {
                    <div class="prereq-item" [class.met]="isPrereqMet(pid)">
                      <span class="prereq-icon">{{ isPrereqMet(pid) ? '✅' : '🔒' }}</span>
                      <span class="prereq-name">{{ getNodeTitle(pid) }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="prereq-item met">
                  <span class="prereq-icon">⚡</span>
                  <span class="prereq-name">Базова фундаментальна навичка (Tier 1)</span>
                </div>
              }
            </div>

            <!-- Topics Checklist -->
            @if (node.topics && node.topics.length) {
              <div class="section-block">
                <h4 class="section-title">{{ i18n.t().topicsChecklist }}</h4>
                <div class="topics-checklist">
                  @for (topic of node.topics; track topic) {
                    <label class="topic-row">
                      <input
                        type="checkbox"
                        [checked]="isTopicDone(node, topic)"
                        (change)="toggleTopic(node.id, topic)" />
                      <span class="topic-text" [class.done]="isTopicDone(node, topic)">{{ topic }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Actions Footer -->
          <div class="modal-footer">
            <div class="status-actions">
              @if (node.status === 'locked') {
                <span class="locked-hint">🔒 Виконайте передумови для розблокування</span>
              }
              @if (node.status === 'available') {
                <button class="action-btn btn-learn" (click)="setSkillStatus(node.id, 'in_progress')">
                  ⚡ {{ i18n.t().startLearning }}
                </button>
              }
              @if (node.status === 'in_progress') {
                <button class="action-btn btn-complete" (click)="setSkillStatus(node.id, 'completed')">
                  ✅ {{ i18n.t().markCompleted }}
                </button>
              }
              @if (node.status === 'completed') {
                <button class="action-btn btn-reset" (click)="setSkillStatus(node.id, 'available')">
                  ↩️ {{ i18n.t().resetSkillProgress }}
                </button>
              }
            </div>

            <button class="action-btn btn-task" (click)="exportToTasks(node.id)" [title]="i18n.t().exportToTasksBtn">
              ➕ {{ i18n.t().exportToTasksBtn }}
            </button>
          </div>
        </div>
      }

      <!-- AI Generation Modal -->
      @if (aiModalOpen()) {
        <div class="skill-modal-backdrop" (click)="aiModalOpen.set(false)"></div>
        <div class="ai-gen-modal" role="dialog">
          <div class="modal-header">
            <h3 class="modal-title">✨ {{ i18n.t().createRoadmapBtn }}</h3>
            <button class="modal-close" (click)="aiModalOpen.set(false)">✕</button>
          </div>

          <div class="ai-modal-body">
            <p class="ai-prompt-desc">{{ i18n.t().roadmapGoalPrompt }}</p>

            <textarea
              #goalInput
              class="ai-prompt-textarea"
              rows="3"
              autofocus
              [placeholder]="'наприклад: хочу вивчитися на девопса з нуля'"></textarea>

            <!-- Quick Presets -->
            <div class="preset-section">
              <span class="preset-label">{{ i18n.t().quickPresets }}</span>
              <div class="preset-chips">
                <button type="button" class="preset-chip" (click)="goalInput.value = 'DevOps Інженер з нуля (Linux, Docker, CI/CD, Kubernetes, IaC)'">
                  🐧 DevOps Інженер
                </button>
                <button type="button" class="preset-chip" (click)="goalInput.value = 'Senior Frontend Розробник (TypeScript, Angular, React, Performance, SSR)'">
                  🎨 Frontend Розробник
                </button>
                <button type="button" class="preset-chip" (click)="goalInput.value = 'Backend Інженер (Golang / Node.js, PostgreSQL, Microservices, Kafka)'">
                  ⚙️ Backend Інженер
                </button>
                <button type="button" class="preset-chip" (click)="goalInput.value = 'AI & LLM Інженер (Python, LangChain, Agents, RAG, PyTorch)'">
                  🧠 AI / ML Інженер
                </button>
                <button type="button" class="preset-chip" (click)="goalInput.value = 'QA Automation Інженер (Playwright, Python, API, CI/CD, k6)'">
                  🧪 QA Automation
                </button>
                <button type="button" class="preset-chip" (click)="goalInput.value = 'Cybersecurity & AppSec Спеціаліст (OWASP, DevSecOps, SIEM)'">
                  🛡️ Кібербезпека
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-cancel-btn" (click)="aiModalOpen.set(false)">
              {{ i18n.t().cancel }}
            </button>
            <button
              class="ai-submit-btn"
              [disabled]="store.generatingRoadmap()"
              (click)="generateFromGoal(goalInput.value)">
              @if (store.generatingRoadmap()) {
                ⏳ {{ i18n.t().generatingRoadmap }}
              } @else {
                ✨ {{ i18n.t().generateAiRoadmap }}
              }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './roadmap.css',
})
export class RoadmapComponent {
  readonly store = inject(TaskStore);
  readonly i18n = inject(I18nService);
  readonly popup = inject(PopupService);

  readonly inspectNode = signal<RoadmapNode | null>(null);
  readonly aiModalOpen = signal(false);

  // Frontpage filtering & search signals
  readonly selectedCategory = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  /** Unique categories with roadmap count */
  readonly categories = computed<{ name: string; count: number }[]>(() => {
    const map = new Map<string, number>();
    for (const r of this.store.roadmaps()) {
      const cat = r.category || 'Загальні';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  });

  /** Filtered roadmaps according to category and search query */
  readonly filteredRoadmaps = computed<Roadmap[]>(() => {
    const all = this.store.roadmaps();
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    return all.filter((r) => {
      if (cat && (r.category || 'Загальні') !== cat) {
        return false;
      }
      if (q) {
        const inTitle = r.title.toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        const inRole = (r.targetRole || '').toLowerCase().includes(q);
        const inCat = (r.category || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inRole && !inCat) return false;
      }
      return true;
    });
  });

  /** Roadmaps grouped by category folder for the frontpage */
  readonly groupedByCategory = computed<{ category: string; roadmaps: Roadmap[] }[]>(() => {
    const list = this.filteredRoadmaps();
    const groups = new Map<string, Roadmap[]>();

    for (const rm of list) {
      const cat = rm.category || 'Загальні';
      const arr = groups.get(cat) || [];
      arr.push(rm);
      groups.set(cat, arr);
    }

    return Array.from(groups.entries()).map(([category, roadmaps]) => ({ category, roadmaps }));
  });

  // Current active roadmap nodes
  readonly allNodes = computed<RoadmapNode[]>(() => {
    return this.store.activeRoadmap()?.nodes || [];
  });

  readonly tiersList = computed<number[]>(() => {
    const nodes = this.allNodes();
    if (!nodes.length) return [1, 2, 3, 4, 5];
    const tiers = Array.from(new Set(nodes.map((n) => n.tier || 1))).sort((a, b) => a - b);
    return tiers.length ? tiers : [1, 2, 3, 4, 5];
  });

  readonly totalNodesCount = computed(() => this.allNodes().length);

  readonly completedCount = computed(() => {
    return this.allNodes().filter((n) => n.status === 'completed').length;
  });

  readonly inProgressNodes = computed(() => {
    return this.allNodes().filter((n) => n.status === 'in_progress');
  });

  readonly completionPercentage = computed(() => {
    const total = this.totalNodesCount();
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  readonly userLevel = computed(() => {
    const done = this.completedCount();
    return Math.max(1, done + 1);
  });

  openRoadmap(rm: Roadmap) {
    this.store.selectRoadmap(rm.id);
    this.inspectNode.set(null);
  }

  backToCatalog() {
    this.store.activeRoadmapId.set(null);
    this.store.selectedSkillId.set(null);
    this.inspectNode.set(null);
  }

  selectCategoryAndBack(cat: string) {
    this.selectedCategory.set(cat);
    this.backToCatalog();
  }

  getRoadmapProgress(rm: Roadmap): { total: number; completed: number; inProgress: number; pct: number; level: number } {
    const nodes = rm.nodes || [];
    const total = nodes.length;
    const completed = nodes.filter((n) => n.status === 'completed').length;
    const inProgress = nodes.filter((n) => n.status === 'in_progress').length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const level = Math.max(1, completed + 1);
    return { total, completed, inProgress, pct, level };
  }

  getTierName(tier: number): string {
    switch (tier) {
      case 1:
        return 'Фундамент';
      case 2:
        return 'Базові інструменти';
      case 3:
        return 'Поглиблені навички';
      case 4:
        return 'Майстерність & Екосистема';
      case 5:
        return 'Архітектура & Highload';
      default:
        return `Рівень ${tier}`;
    }
  }

  getNodesForTier(tier: number): RoadmapNode[] {
    return this.allNodes().filter((n) => n.tier === tier);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'completed':
        return this.i18n.t().skillCompleted;
      case 'in_progress':
        return this.i18n.t().skillInProgress;
      case 'available':
        return this.i18n.t().skillUnlocked;
      case 'locked':
      default:
        return this.i18n.t().skillLocked;
    }
  }

  selectSkill(node: RoadmapNode) {
    this.store.selectedSkillId.set(node.id);
    this.inspectNode.set(node);
  }

  isPrereqMet(pid: string): boolean {
    const target = this.allNodes().find((n) => n.id === pid);
    return target ? target.status === 'completed' : false;
  }

  getNodeTitle(pid: string): string {
    const target = this.allNodes().find((n) => n.id === pid);
    return target ? `${target.icon} ${target.title}` : pid;
  }

  isTopicDone(node: RoadmapNode, topic: string): boolean {
    return (node.completedTopics || []).includes(topic);
  }

  async toggleTopic(nodeId: string, topic: string) {
    await this.store.toggleSkillTopic(nodeId, topic);
    const updated = this.allNodes().find((n) => n.id === nodeId);
    if (updated) this.inspectNode.set(updated);
  }

  async setSkillStatus(nodeId: string, status: 'locked' | 'available' | 'in_progress' | 'completed') {
    await this.store.updateSkillStatus(nodeId, status);
    const updated = this.allNodes().find((n) => n.id === nodeId);
    if (updated) this.inspectNode.set(updated);
  }

  async exportToTasks(nodeId: string) {
    const cur = this.store.activeRoadmap();
    if (!cur) return;
    const taskId = await this.store.exportSkillToTasks(cur.id, nodeId);
    if (taskId) {
      await this.popup.alert(this.i18n.t().taskCreatedSuccess, 'info');
    }
  }

  async deleteCurrentRoadmap() {
    if (!this.store.isAdmin()) {
      await this.popup.alert(this.i18n.t().roadmapAdminOnlyCreate, 'info');
      return;
    }
    const cur = this.store.activeRoadmap();
    if (!cur) return;
    const ok = await this.popup.confirm(this.i18n.t().deleteRoadmapConfirm(cur.title));
    if (ok) {
      await this.store.deleteRoadmap(cur.id);
      this.inspectNode.set(null);
    }
  }

  openAiModal() {
    if (!this.store.isAdmin()) {
      this.popup.alert(this.i18n.t().roadmapAdminOnlyCreate, 'info');
      return;
    }
    this.aiModalOpen.set(true);
  }

  async generateFromGoal(goal: string) {
    if (!goal.trim()) return;
    try {
      const res = await this.store.generateRoadmap(goal.trim(), this.i18n.lang());
      if (res?.id) {
        this.aiModalOpen.set(false);
      }
    } catch (e: any) {
      await this.popup.alert(e?.error?.error || 'Failed to generate roadmap', 'error');
    }
  }
}
