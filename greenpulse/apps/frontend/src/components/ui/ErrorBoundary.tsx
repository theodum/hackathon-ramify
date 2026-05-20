// =============================================================
// GREENPULSE — ErrorBoundary
// =============================================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GreenPulse] Uncaught error:', error, info);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// ─────────────────────────────────────────
// Default fallback UI
// ─────────────────────────────────────────

interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <motion.div
        className="max-w-md w-full bg-gray-900 border border-red-500/20 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-red-400" size={28} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-gray-400 text-sm mb-4 leading-relaxed">
          L'application a rencontré un problème inattendu. Vous pouvez essayer
          de recharger cette section.
        </p>

        {/* Error details (dev mode only) */}
        {error && import.meta.env.DEV && (
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-left mb-6 overflow-auto max-h-32">
            <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} />
              Réessayer
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
          >
            Recharger la page
          </button>
        </div>
      </motion.div>
    </div>
  );
}
