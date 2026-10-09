import React from 'react';

// Catches render errors (including a failed lazy-loaded chunk after a new deploy)
// so the person sees a clear message and a way out instead of a blank page.
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Zad render error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="loading-screen" role="alert">
        <h2>حصلت مشكلة في تحميل الصفحة</h2>
        <p>جرّب تحديث الصفحة. لو المشكلة مستمرة، ارجع للرئيسية.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => window.location.reload()}>تحديث الصفحة</button>
          <a className="btn btn-outline" href="/">الرئيسية</a>
        </div>
      </div>
    );
  }
}
