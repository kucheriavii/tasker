import { Component, computed, inject, signal } from '@angular/core';
import { TaskStore } from './task-store';
import { I18nService } from './i18n';
import { PopupService } from './popup';
import { Roadmap, RoadmapNode } from './models';

@Component({
  selector: 'app-roadmap',
  template: `
    <div class="roadmap-container">
      <!-- Top Control Bar -->
      <div class="roadmap-topbar">
        <div class="roadmap-select-wrap">
          <label class="rm-label">{{ i18n.t().roadmap }}:</label>
          <select class="rm-select" [value]="store.activeRoadmapId() || ''" (change)="onRoadmapSelect($any($event.target).value)">
            @for (rm of store.roadmaps(); track rm.id) {
              <option [value]="rm.id">{{ rm.title }}</option>
            }
          </select>
          @if (store.activeRoadmap()) {
            <button class="icon-btn danger" (click)="deleteCurrentRoadmap()" [title]="i18n.t().deleteBtn">🗑️</button>
          }
        </div>

        <div class="topbar-actions">
          <button class="ai-create-btn" (click)="openAiModal()">
            ✨ {{ i18n.t().createRoadmapBtn }}
          </button>
        </div>
      </div>

      @if (store.activeRoadmap(); as rm) {
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
          <!-- Tiers columns -->
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
                      <div class="socket-meta">
                        <span class="socket-branch">{{ node.branch }}</span>
                        @if (node.topics && node.topics.length) {
                          <span class="socket-points">
                            {{ (node.completedTopics?.length || 0) }}/{{ node.topics.length }}
                          </span>
                        }
                      </div>
                    </div>

                    <div class="socket-status-badge">
                      @if (node.status === 'completed') {
                        <span class="status-tag tag-mastered">{{ i18n.t().skillCompleted }}</span>
                      } @else if (node.status === 'in_progress') {
                        <span class="status-tag tag-learning">{{ i18n.t().skillInProgress }}</span>
                      } @else if (node.status === 'available') {
                        <span class="status-tag tag-ready">{{ i18n.t().skillUnlocked }}</span>
                      } @else {
                        <span class="status-tag tag-locked">{{ i18n.t().skillLocked }}</span>
                      }
                    </div>

                    @if (node.prerequisites && node.prerequisites.length) {
                      <div class="prereq-indicators" [title]="i18n.t().prerequisitesTitle">
                        @for (pid of node.prerequisites; track pid) {
                          <span class="prereq-dot" [class.dot-met]="isPrereqMet(pid)">•</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty-roadmap">
          <div class="empty-icon">🗺️</div>
          <p>{{ i18n.t().noRoadmapsYet }}</p>
          <button class="ai-create-btn large" (click)="openAiModal()">
            ✨ {{ i18n.t().createRoadmapBtn }}
          </button>
        </div>
      }

      <!-- Skill Inspector Modal -->
      @if (inspectNode(); as node) {
        <div class="skill-modal-backdrop" (click)="inspectNode.set(null)"></div>
        <div class="skill-modal" role="dialog">
          <div class="modal-header">
            <div class="modal-header-main">
              <span class="modal-icon">{{ node.icon }}</span>
              <div>
                <h3 class="modal-title">{{ node.title }}</h3>
                <div class="modal-sub">
                  <span class="badge">Tier {{ node.tier }}</span>
                  <span class="badge-branch">{{ node.branch }}</span>
                  <span class="status-badge" [class.badge-completed]="node.status === 'completed'" [class.badge-learning]="node.status === 'in_progress'" [class.badge-available]="node.status === 'available'" [class.badge-locked]="node.status === 'locked'">
                    {{ getStatusLabel(node.status) }}
                  </span>
                </div>
              </div>
            </div>
            <button class="modal-close" (click)="inspectNode.set(null)">✕</button>
          </div>

          <div class="modal-body">
            <!-- Description -->
            <p class="node-desc">{{ node.description }}</p>

            @if (node.whyImportant) {
              <div class="node-importance">
                <span class="importance-label">💡 {{ i18n.t().whyImportantTitle }}</span>
                <p>{{ node.whyImportant }}</p>
              </div>
            }

            <!-- Prerequisites Checklist -->
            @if (node.prerequisites && node.prerequisites.length) {
              <div class="node-prereqs">
                <span class="section-label">🔗 {{ i18n.t().prerequisitesTitle }}</span>
                <div class="prereqs-list">
                  @for (pid of node.prerequisites; track pid) {
                    <div class="prereq-item" [class.met]="isPrereqMet(pid)">
                      <span class="prereq-status-icon">{{ isPrereqMet(pid) ? '✅' : '🔒' }}</span>
                      <span class="prereq-name">{{ getNodeTitle(pid) }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Topics Checklist -->
            @if (node.topics && node.topics.length) {
              <div class="node-topics">
                <span class="section-label">📋 {{ i18n.t().topicsChecklist }}</span>
                <div class="topics-checklist">
                  @for (topic of node.topics; track topic) {
                    <label class="topic-row">
                      <input
                        type="checkbox"
                        [checked]="isTopicDone(node, topic)"
                        [disabled]="node.status === 'locked'"
                        (change)="toggleTopic(node.id, topic)" />
                      <span class="topic-text" [class.topic-checked]="isTopicDone(node, topic)">
                        {{ topic }}
                      </span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Actions Footer -->
          <div class="modal-actions">
            @if (node.status === 'locked') {
              <span class="locked-warning">🔒 {{ i18n.t().skillLocked }}</span>
            } @else {
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
            }

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
              </div>
            </div>

            @if (store.generatingRoadmap()) {
              <div class="generating-status">
                <div class="spinner"></div>
                <span>{{ i18n.t().generatingRoadmap }}</span>
              </div>
            }
          </div>

          <div class="ai-modal-footer">
            <button class="cancel-btn" [disabled]="store.generatingRoadmap()" (click)="aiModalOpen.set(false)">
              {{ i18n.t().cancel }}
            </button>
            <button
              class="generate-btn"
              [disabled]="store.generatingRoadmap() || !goalInput.value.trim()"
              (click)="generateFromGoal(goalInput.value)">
              ✨ {{ i18n.t().generateAiRoadmap }}
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
  private popup = inject(PopupService);

  readonly inspectNode = signal<RoadmapNode | null>(null);
  readonly aiModalOpen = signal(false);

  // Compute total nodes and completion
  readonly allNodes = computed<RoadmapNode[]>(() => this.store.activeRoadmap()?.nodes || []);
  readonly totalNodesCount = computed(() => this.allNodes().length);
  readonly completedCount = computed(() => this.allNodes().filter((n) => n.status === 'completed').length);
  readonly inProgressNodes = computed(() => this.allNodes().filter((n) => n.status === 'in_progress'));

  readonly completionPercentage = computed(() => {
    const total = this.totalNodesCount();
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  // Calculate Level & Rank based on completed skills
  readonly userLevel = computed(() => {
    const done = this.completedCount();
    return Math.min(5, Math.floor(done / 3) + 1);
  });

  readonly tiersList = computed(() => {
    const set = new Set<number>();
    for (const n of this.allNodes()) {
      set.add(n.tier || 1);
    }
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length ? arr : [1, 2, 3, 4, 5];
  });

  getNodesForTier(tier: number): RoadmapNode[] {
    return this.allNodes().filter((n) => (n.tier || 1) === tier);
  }

  getTierName(tier: number): string {
    const namesUk: Record<number, string> = {
      1: 'Фундамент',
      2: 'Базові навички',
      3: 'Основні технології',
      4: 'Спеціалізація',
      5: 'Майстерність & HighLoad',
    };
    const namesEn: Record<number, string> = {
      1: 'Foundation',
      2: 'Core Skills',
      3: 'Applied Tech',
      4: 'Specialization',
      5: 'Mastery & Scale',
    };
    const dict = this.i18n.lang() === 'uk' ? namesUk : namesEn;
    return dict[tier] || `Tier ${tier}`;
  }

  onRoadmapSelect(id: string) {
    if (!id) return;
    this.store.selectRoadmap(id);
    this.inspectNode.set(null);
  }

  selectSkill(node: RoadmapNode) {
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
      await this.popup.alert(this.i18n.t().taskCreatedSuccess);
      this.inspectNode.set(null);
    }
  }

  async deleteCurrentRoadmap() {
    const cur = this.store.activeRoadmap();
    if (!cur) return;
    const ok = await this.popup.confirm(this.i18n.t().deleteRoadmapConfirm(cur.title));
    if (ok) {
      await this.store.deleteRoadmap(cur.id);
      this.inspectNode.set(null);
    }
  }

  openAiModal() {
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

  getStatusLabel(status: string): string {
    if (status === 'completed') return this.i18n.t().skillCompleted;
    if (status === 'in_progress') return this.i18n.t().skillInProgress;
    if (status === 'available') return this.i18n.t().skillUnlocked;
    return this.i18n.t().skillLocked;
  }
}
