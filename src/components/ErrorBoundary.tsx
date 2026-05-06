'use client';

import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[UI] Render failure', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl rounded-2xl border border-red-900/40 bg-red-950/40 p-6 text-sm text-red-100">
          Something went wrong in this panel. Please reload the page.
        </div>
      );
    }
    return this.props.children;
  }
}
