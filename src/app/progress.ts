import { Component, computed, input } from '@angular/core';

/** Fill gauge: share of finished leaf tasks. */
@Component({
  selector: 'app-progress',
  template: `
    <span class="bar" [title]="done() + ' / ' + total() + ' done'"><i [style.width.%]="pct()"></i></span>
    <span class="pct">{{ pct() }}%</span>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 6px; }
    .bar { display: inline-block; width: 70px; height: 8px; border: 1px solid var(--fg); background: #fff; }
    .bar i { display: block; height: 100%; background: var(--accent); }
    .pct { font-size: 11px; color: var(--muted); min-width: 32px; text-align: right; }
    @media (max-width: 640px) {
      :host { gap: 4px; }
      .bar { width: 42px; height: 6px; }
      .pct { min-width: 26px; font-size: 10px; font-weight: 600; }
    }
  `,
})
export class Progress {
  readonly value = input.required<number>();
  readonly done = input(0);
  readonly total = input(0);
  readonly pct = computed(() => Math.round(this.value() * 100));
}
