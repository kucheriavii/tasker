import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const key = localStorage.getItem('tasker.adminKey');
  if (key) {
    req = req.clone({
      setHeaders: { 'x-admin-key': key },
    });
  }
  return next(req);
};
