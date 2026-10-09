import React from 'react';
import Button from './Button';

// Shown when a request fails. Says what happened and gives a way to try again.
export default function RetryBox({ title = 'تعذر تحميل البيانات', message, onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <h3>{title}</h3>
      <p>{message || 'تأكد من اتصال الإنترنت ثم حاول مرة أخرى.'}</p>
      {onRetry && <Button onClick={onRetry}>إعادة المحاولة</Button>}
    </div>
  );
}
