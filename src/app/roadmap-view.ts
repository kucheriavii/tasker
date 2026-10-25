import { Component, computed, effect, inject, signal } from '@angular/core';
import { RoadmapDraft, Task } from './models';
import { Progress } from './progress';
import { TaskItem } from './task-item';
import { TaskStore } from './task-store';

/**
 * Dedicated Roadmaps view: AI-generated & editable skill trees with strict stage & branch traversal order.
 * Every stage, branch, and skill is backed by a real Task node in SQLite (supports statuses, progress, images, notes, drag & drop).
 */
@Component({
  selector: 'app-roadmaps',
  imports: [Progress, TaskItem],
  template: `
    <section class="rm-wrap">
      <div class="rm-bar">
        @for (r of store.roadmaps(); track r.id) {
          <button class="rm-tab" [class.ok]="selected()?.id === r.id && !creating()"
            (click)="creating.set(false); selectedId.set(r.id)">
            <strong>{{ r.title }}</strong>
            <span class="hint">{{ pct(r.progress) }}%</span>
          </button>
        }
        <button class="ok" (click)="creating.set(!creating())">[{{ creating() ? 'close generator' : '+ new roadmap (AI)' }}]</button>
      </div>

      @if (creating()) {
        <section class="panel">
          <h2># generate skill tree / roadmap</h2>
          @if (!draft()) {
            <p class="hint">enter a subject or profession (e.g. "Диференціальні рівняння", "iOS Swift Developer"). AI builds an ordered tree of stages, branches and skills.</p>
            <input [value]="topic()" (input)="topic.set($any($event.target).value)"
              placeholder="topic or profession (e.g. Диференціальні рівняння)..." autofocus
              (keydown.enter)="generate()" />
            <input [value]="details()" (input)="details.set($any($event.target).value)"
              placeholder="optional: your current level or goal (e.g. з нуля до інженерних задач)..." />
            @if (error()) { <p class="err">! {{ error() }}</p> }
            <div class="actions">
              <button class="ok" [disabled]="busy()" (click)="generate()">{{ busy() ? 'building skill tree...' : 'generate roadmap' }}</button>
              <button (click)="creating.set(false)">cancel</button>
            </div>
          } @else {
            <p class="hint">check the order of stages &amp; branches before creating. use ^ / v to reorder branches.</p>
            <input class="big" [value]="draft()!.title" (input)="draft()!.title = $any($event.target).value" />
            <textarea rows="2" [value]="draft()!.description" (input)="draft()!.description = $any($event.target).value"></textarea>

            @for (st of draft()!.stages; track $index; let si = $index) {
              <div class="d-stage">
                <div class="drow">
                  <span class="step-tag">STAGE {{ si + 1 }}</span>
                  <input [value]="st.title" (input)="st.title = $any($event.target).value" />
                  <button class="icon" [disabled]="si === 0" (click)="moveArr(draft()!.stages, si, -1)">^</button>
                  <button class="icon" [disabled]="si === draft()!.stages.length - 1" (click)="moveArr(draft()!.stages, si, 1)">v</button>
                  <button class="icon danger" (click)="draft()!.stages.splice(si, 1)">x</button>
                </div>
                @for (br of st.branches; track $index; let bi = $index) {
                  <div class="d-branch">
                    <div class="drow">
                      <span class="step-tag">{{ si + 1 }}.{{ bi + 1 }}</span>
                      <input [value]="br.title" (input)="br.title = $any($event.target).value" />
                      <button class="icon" [disabled]="bi === 0" (click)="moveArr(st.branches, bi, -1)">^</button>
                      <button class="icon" [disabled]="bi === st.branches.length - 1" (click)="moveArr(st.branches, bi, 1)">v</button>
                      <button class="icon danger" (click)="st.branches.splice(bi, 1)">x</button>
                    </div>
                    @for (sk of br.skills; track $index; let ki = $index) {
                      <div class="drow d-skill">
                        <span class="hint">-</span>
                        <input [value]="sk.title" (input)="sk.title = $any($event.target).value" />
                        <button class="icon danger" (click)="br.skills.splice(ki, 1)">x</button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
            @if (error()) { <p class="err">! {{ error() }}</p> }
            <div class="actions">
              <button class="ok" [disabled]="busy()" (click)="saveDraft()">create roadmap</button>
              <button (click)="draft.set(null)">back</button>
              <button (click)="creating.set(false)">cancel</button>
            </div>
          }
        </section>
      }

      @if (selected(); as rm) {
        <div class="rm-head">
          <div class="rm-title-row">
            <h1 class="rm-title">{{ rm.title }}</h1>
            <app-progress [value]="rm.progress" [done]="rm.leafDone" [total]="rm.leafTotal" />
            <span class="hint">{{ rm.leafDone }}/{{ rm.leafTotal }} skills mastered</span>
            <button (click)="store.openId.set(rm.id)" title="open as task">[edit / notes]</button>
            <button class="danger" (click)="removeRoadmap(rm)">[delete]</button>
          </div>
          @if (rm.description) {
            <p class="rm-desc">{{ rm.description }}</p>
          }

          <!-- Linear traversal strip showing exact branch order -->
          @if (orderedBranches().length) {
            <div class="path-strip">
              <span class="hint">path order:</span>
              @for (b of orderedBranches(); track b.branch.id; let idx = $index; let last = $last) {
                <a class="path-pill"
                  [class.done]="store.isDone(b.branch.statusId)"
                  [class.cancelled]="store.isCancelled(b.branch.statusId)"
                  [class.next]="nextBranchId() === b.branch.id"
                  (click)="scrollTo(b.branch.id)">
                  #{{ idx + 1 }} {{ b.code }} {{ b.branch.title }}
                  @if (nextBranchId() === b.branch.id) { <strong>&lt;&lt; NEXT</strong> }
                </a>
                @if (!last) { <span class="arrow">--&gt;</span> }
              }
            </div>
          }
        </div>

        <!-- Stages & ordered branches -->
        @for (stage of rm.children; track stage.id; let si = $index; let lastStage = $last) {
          <div class="stage-box" [class.done]="store.isDone(stage.statusId)">
            <div class="stage-head">
              <span class="stage-num">STAGE 0{{ si + 1 }}</span>
              <strong class="stage-title" (click)="store.openId.set(stage.id)">{{ stage.title }}</strong>
              <app-progress [value]="stage.progress" [done]="stage.leafDone" [total]="stage.leafTotal" />
              <button class="icon" [disabled]="si === 0" (click)="moveSibling(rm.children, si, -1)" title="move stage up">^</button>
              <button class="icon" [disabled]="lastStage" (click)="moveSibling(rm.children, si, 1)" title="move stage down">v</button>
              <button class="icon danger" (click)="store.removeTask(stage.id)" title="trash stage">x</button>
            </div>
            @if (stage.description) {
              <p class="stage-desc">{{ stage.description }}</p>
            }

            <div class="branches">
              @for (branch of stage.children; track branch.id; let bi = $index; let lastBr = $last) {
                <div class="branch-card" [id]="'br-' + branch.id"
                  [class.next]="nextBranchId() === branch.id"
                  [class.done]="store.isDone(branch.statusId)"
                  [class.cancelled]="store.isCancelled(branch.statusId)">
                  <div class="branch-head">
                    <span class="branch-code">[{{ si + 1 }}.{{ bi + 1 }}]</span>
                    @if (nextBranchId() === branch.id) {
                      <span class="next-badge">&gt;&gt; NEXT BRANCH IN ORDER</span>
                    }
                    <strong class="branch-title" (click)="store.openId.set(branch.id)">{{ branch.title }}</strong>
                    <app-progress [value]="branch.progress" [done]="branch.leafDone" [total]="branch.leafTotal" />
                    <select [value]="branch.statusId" (change)="store.updateTask(branch.id, { statusId: $any($event.target).value })">
                      @for (s of store.statuses(); track s.id) {
                        <option [value]="s.id" [selected]="s.id === branch.statusId">{{ s.name }}</option>
                      }
                    </select>
                    <button class="icon" [disabled]="bi === 0" (click)="moveSibling(stage.children, bi, -1)" title="earlier in branch order">^</button>
                    <button class="icon" [disabled]="lastBr" (click)="moveSibling(stage.children, bi, 1)" title="later in branch order">v</button>
                    <button class="icon danger" (click)="store.removeTask(branch.id)" title="trash branch">x</button>
                  </div>

                  @if (branch.description) {
                    <p class="branch-desc">{{ branch.description }}</p>
                  }

                  <div class="skills">
                    @for (skill of branch.children; track skill.id) {
                      <div class="skill-wrap">
                        <app-task-item [task]="skill" />
                        @if (skill.description) {
                          <p class="skill-desc">{{ skill.description }}</p>
                        }
                      </div>
                    }
                    <form class="add-inline" (submit)="$event.preventDefault(); addNode(branch.id, skIn)">
                      <input #skIn placeholder="+ add skill / topic to this branch..." />
                    </form>
                  </div>
                </div>

                @if (!lastBr) {
                  <div class="branch-connector">│<br />▼ next branch ({{ si + 1 }}.{{ bi + 2 }})</div>
                }
              }

              <form class="add-inline" (submit)="$event.preventDefault(); addNode(stage.id, brIn)">
                <input #brIn placeholder="+ add branch to stage {{ si + 1 }}..." />
              </form>
            </div>
          </div>

          @if (!lastStage) {
            <div class="stage-connector">║<br />▼ STAGE 0{{ si + 2 }}</div>
          }
        }

        <form class="add" (submit)="$event.preventDefault(); addNode(rm.id, stIn)">
          <input #stIn placeholder="+ add new stage to roadmap..." />
        </form>
      } @else if (!creating()) {
        <p class="hint">no roadmaps yet. click [+ new roadmap (AI)] above to generate your first skill tree (for example: "Диференціальні рівняння").</p>
      }
    </section>
  `,
  styles: `
    .rm-bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
    .rm-tab { display: inline-flex; gap: 6px; align-items: center; border: 1px solid var(--line); background: #fff; padding: 4px 10px; }
    .panel { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 16px; }
    .panel input:not([type='checkbox']), .panel textarea { width: 100%; margin: 4px 0; }
    textarea { font: inherit; border: 1px solid var(--line); padding: 8px; background: var(--bg); }
    .actions { display: flex; gap: 8px; margin-top: 8px; }
    .d-stage { border-left: 2px solid var(--fg); padding-left: 10px; margin: 10px 0; }
    .d-branch { border-left: 1px dashed var(--muted); padding-left: 10px; margin: 6px 0 6px 8px; }
    .d-skill { margin-left: 16px; }
    .drow { display: flex; gap: 6px; align-items: center; }
    .drow input { flex: 1; min-width: 0; }
    .step-tag { font-size: 11px; font-weight: bold; color: var(--accent); white-space: nowrap; }

    .rm-head { border: 1px solid var(--line); background: #fff; padding: 12px; margin-bottom: 14px; }
    .rm-title-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .rm-title { font-size: 18px; margin: 0; flex: 1; min-width: 180px; }
    .rm-desc { margin: 6px 0 0; color: var(--muted); font-size: 13px; white-space: pre-wrap; }

    .path-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--line); font-size: 12px; }
    .path-pill { border: 1px solid var(--line); padding: 2px 6px; cursor: pointer; background: var(--bg); }
    .path-pill.done { text-decoration: line-through; color: var(--muted); }
    .path-pill.cancelled { text-decoration: line-through; opacity: 0.5; }
    .path-pill.next { border-color: var(--accent); color: var(--accent); background: #eef6ff; }
    .arrow { color: var(--muted); font-size: 11px; }

    .stage-box { border: 2px solid var(--fg); background: #fff; padding: 12px; }
    .stage-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 8px; }
    .stage-num { background: var(--fg); color: #fff; padding: 2px 6px; font-size: 12px; font-weight: bold; }
    .stage-title { flex: 1; font-size: 15px; cursor: pointer; }
    .stage-desc { margin: 0 0 10px; font-size: 12px; color: var(--muted); }
    .stage-connector { text-align: center; color: var(--fg); font-weight: bold; line-height: 1.1; padding: 6px 0; user-select: none; }

    .branches { display: flex; flex-direction: column; }
    .branch-card { border: 1px solid var(--line); background: var(--bg); padding: 10px; }
    .branch-card.next { border: 2px solid var(--accent); background: #f5f9ff; }
    .branch-card.done .branch-title { text-decoration: line-through; color: var(--muted); }
    .branch-card.cancelled { opacity: 0.6; }
    .branch-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .branch-code { font-weight: bold; color: var(--accent); }
    .next-badge { background: var(--accent); color: #fff; font-size: 11px; font-weight: bold; padding: 1px 6px; }
    .branch-title { flex: 1; min-width: 160px; cursor: pointer; font-weight: 700; }
    .branch-desc { margin: 6px 0; font-size: 12px; color: var(--muted); white-space: pre-wrap; }
    .branch-connector { text-align: left; margin-left: 18px; color: var(--accent); font-size: 12px; line-height: 1.1; padding: 4px 0; user-select: none; }

    .skills { margin-top: 6px; padding-left: 8px; border-left: 2px solid var(--line); }
    .skill-desc { margin: 0 0 4px 28px; font-size: 11px; color: var(--muted); }
    .add-inline { margin-top: 6px; }
    .add-inline input { width: 100%; font-size: 12px; }

    .ok { border-color: var(--accent); color: var(--accent); background: #fff; }
    .icon { color: var(--muted); font-size: 12px; min-width: 24px; }
    .err { color: var(--danger); white-space: pre-wrap; }
    .hint { color: var(--muted); font-size: 12px; }
    button.danger:hover { color: var(--danger); }
  `,
})
export class RoadmapView {
  readonly store = inject(TaskStore);
  readonly selectedId = signal<string | null>(null);
  readonly creating = signal(false);
  readonly topic = signal('');
  readonly details = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly draft = signal<RoadmapDraft | null>(null);

  readonly selected = computed<Task | null>(() => {
    const list = this.store.roadmaps();
    if (!list.length) return null;
    const id = this.selectedId();
    return list.find((r) => r.id === id) ?? list[0];
  });

  /** Flattened sequence of branches in strict traversal order (1.1, 1.2, 2.1, ...). */
  readonly orderedBranches = computed(() => {
    const rm = this.selected();
    if (!rm) return [];
    const out: { code: string; branch: Task }[] = [];
    rm.children.forEach((st, si) => {
      st.children.forEach((br, bi) => {
        out.push({ code: `${si + 1}.${bi + 1}`, branch: br });
      });
    });
    return out;
  });

  /** First branch in sequence that is neither done nor cancelled. */
  readonly nextBranchId = computed<string | null>(() => {
    for (const item of this.orderedBranches()) {
      const sid = item.branch.statusId;
      if (!this.store.isDone(sid) && !this.store.isCancelled(sid)) return item.branch.id;
    }
    return null;
  });

  constructor() {
    effect(() => {
      if (!this.store.roadmaps().length && this.store.loaded()) {
        this.creating.set(true);
      }
    });
  }

  pct(v: number) { return Math.round(v * 100); }

  moveArr<T>(arr: T[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  moveSibling(siblings: Task[], i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    this.store.moveTask(siblings[i].id, siblings[j].id, dir < 0 ? 'before' : 'after');
  }

  scrollTo(branchId: string) {
    document.getElementById('br-' + branchId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  addNode(parentId: string, input: HTMLInputElement) {
    const v = input.value.trim();
    if (!v) return;
    this.store.addTask(parentId, v);
    input.value = '';
  }

  async generate() {
    if (!this.topic().trim()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      this.draft.set(await this.store.generateRoadmapDraft(this.topic(), this.details()));
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Could not generate roadmap');
    }
    this.busy.set(false);
  }

  async saveDraft() {
    const d = this.draft();
    if (!d) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const id = await this.store.createRoadmap(d);
      this.selectedId.set(id);
      this.draft.set(null);
      this.creating.set(false);
      this.topic.set('');
      this.details.set('');
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Could not save roadmap');
    }
    this.busy.set(false);
  }

  removeRoadmap(rm: Task) {
    if (window.confirm(`Move roadmap "${rm.title}" to trash?`)) {
      this.store.removeTask(rm.id);
    }
  }
}
