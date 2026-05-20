// =============================================================
// GREENPULSE — EmptyState
// =============================================================

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: 'audit' | 'report' | 'project' | 'search' | 'generic';
}

const ILLUSTRATIONS: Record<NonNullable<EmptyStateProps['icon']>, ReactNode> = {
  audit: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <rect x="12" y="8" width="56" height="64" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
      <rect x="22" y="22" width="36" height="4" rx="2" fill="#374151" />
      <rect x="22" y="32" width="28" height="4" rx="2" fill="#374151" />
      <rect x="22" y="42" width="20" height="4" rx="2" fill="#374151" />
      <circle cx="57" cy="57" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      <path d="M51 57l4 4 8-8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  report: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <rect x="10" y="6" width="46" height="60" rx="6" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
      <rect x="20" y="18" width="26" height="3" rx="1.5" fill="#374151" />
      <rect x="20" y="25" width="20" height="3" rx="1.5" fill="#374151" />
      <rect x="20" y="38" width="26" height="12" rx="3" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M58 44 L64 38 L70 44" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 50 L64 44 L70 50" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
    </svg>
  ),
  project: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <rect x="8" y="24" width="30" height="40" rx="6" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
      <rect x="42" y="16" width="30" height="48" rx="6" fill="#111827" stroke="#374151" strokeWidth="1.5" />
      <rect x="15" y="34" width="16" height="3" rx="1.5" fill="#374151" />
      <rect x="15" y="42" width="12" height="3" rx="1.5" fill="#374151" />
      <rect x="49" y="26" width="16" height="3" rx="1.5" fill="#374151" />
      <rect x="49" y="34" width="12" height="3" rx="1.5" fill="#374151" />
      <rect x="49" y="42" width="14" height="3" rx="1.5" fill="#374151" />
      <circle cx="40" cy="64" r="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      <path d="M37 64l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <circle cx="34" cy="34" r="20" fill="#1f2937" stroke="#374151" strokeWidth="2" />
      <circle cx="34" cy="34" r="10" fill="#111827" />
      <path d="M49 49L64 64" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 34 h12 M34 28 v12" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  generic: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <rect x="16" y="16" width="48" height="48" rx="10" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
      <circle cx="40" cy="36" r="8" fill="#111827" stroke="#4b5563" strokeWidth="1.5" />
      <path d="M28 54c0-7 5.4-12 12-12s12 5 12 12" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function EmptyState({
  title,
  description,
  action,
  icon = 'generic',
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="mb-6"
      >
        {ILLUSTRATIONS[icon]}
      </motion.div>

      <motion.h3
        className="text-base font-semibold text-white mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
