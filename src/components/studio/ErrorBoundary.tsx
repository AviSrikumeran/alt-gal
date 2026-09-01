'use client';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { S } from './strings';

interface Props {
  children: ReactNode;
  /** Shown instead of the default card; used by the canvas for per-specimen failures. */
  message?: string;
}
interface State {
  failed: boolean;
}

/**
 * D-205: one malformed spec never white-screens the canvas. Each specimen and each page section
 * is wrapped, so a broken component renders an error card in place and everything else survives.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[alt.gal] component render failed', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="alt-errorcard" role="alert">
        {this.props.message ?? S.componentBroke}
      </div>
    );
  }
}
