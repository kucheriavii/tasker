import { Component, Injectable, inject, signal } from '@angular/core';
import { I18nService } from './i18n';

export interface PopupReq {
  kind: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  placeholder?: string;
  inputType?: 'text' | 'password';
  value?: string;
  resolve: (val: any) => void;
}

@Injectable({ providedIn: 'root' })
export class PopupService {
  readonly current = signal<PopupReq | null>(null);

  alert(message: string, title = 'notice'): Promise<void> {
    return new Promise<void>((resolve) => {
      this.current.set({ kind: 'alert', title, message, resolve });
    });
  }

  confirm(message: string, title = 'confirm'): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.current.set({ kind: 'confirm', title, message, resolve });
    });
  }

  prompt(
    message: string,
    opts: { title?: string; placeholder?: string; inputType?: 'text' | 'password'; defaultValue?: string } = {},
  ): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.current.set({
        kind: 'prompt',
        title: opts.title ?? 'input',
        message,
        placeholder: opts.placeholder ?? '',
        inputType: opts.inputType ?? 'text',
        value: opts.defaultValue ?? '',
        resolve,
      });
    });
  }

  close(result: any) {
    const req = this.current();
    this.current.set(null);
    req?.resolve(result);
  }
}

@Component({
  selector: 'app-popup',
  template: `
    @if (svc.current(); as p) {
      <div class="backdrop" (click)="onCancel(p)">
        <div class="modal" (click)="$event.stopPropagation()" (keydown.escape)="onCancel(p)">
          <div class="mhead"># {{ p.title }}</div>
          <p class="mmsg">{{ p.message }}</p>

          @if (p.kind === 'prompt') {
            <input #inp
              [type]="p.inputType || 'text'"
              [placeholder]="p.placeholder || ''"
              [value]="p.value || ''"
              autofocus
              (input)="p.value = inp.value"
              (keydown.enter)="onOk(p)" />
          }

          <div class="mactions">
            <button class="ok" autofocus (click)="onOk(p)">[{{ i18n.t().ok }}]</button>
            @if (p.kind !== 'alert') {
              <button (click)="onCancel(p)">[{{ i18n.t().cancel }}]</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed; inset: 0; background: rgba(31, 35, 40, 0.35);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; z-index: 1000;
    }
    .modal {
      width: 100%; max-width: 400px; background: #fff;
      border: 2px solid var(--fg); box-shadow: 4px 4px 0 var(--line);
      padding: 14px 16px;
    }
    .mhead { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: var(--accent); }
    .mmsg { margin: 0 0 12px; white-space: pre-wrap; word-break: break-word; }
    input { width: 100%; margin-bottom: 12px; }
    .mactions { display: flex; justify-content: flex-end; gap: 8px; }
    .ok { border-color: var(--accent); color: var(--accent); background: #fff; font-weight: bold; }
    @media (max-width: 640px) {
      .mactions button { flex: 1; min-height: 38px; }
    }
  `,
})
export class PopupModal {
  readonly svc = inject(PopupService);
  readonly i18n = inject(I18nService);

  onOk(p: PopupReq) {
    if (p.kind === 'prompt') this.svc.close(p.value ?? '');
    else if (p.kind === 'confirm') this.svc.close(true);
    else this.svc.close(undefined);
  }

  onCancel(p: PopupReq) {
    if (p.kind === 'prompt') this.svc.close(null);
    else if (p.kind === 'confirm') this.svc.close(false);
    else this.svc.close(undefined);
  }
}
