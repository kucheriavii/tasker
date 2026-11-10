import { HttpInterceptorFn } from '@angular/common/http';

const USER_ID_STORAGE = 'tasker.userId';

export function getUserId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'anonymous';
  let uid = localStorage.getItem(USER_ID_STORAGE);
  if (!uid) {
    uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(USER_ID_STORAGE, uid);
  }
  return uid;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const headers: Record<string, string> = {
    'x-user-id': getUserId(),
  };
  const key = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('tasker.adminKey') : null;
  if (key) {
    headers['x-admin-key'] = key;
  }
  return next(req.clone({ setHeaders: headers }));
};
