'use client';

// Small shared UI helpers for the Startup Hub.

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-columbia-500 bg-white';
export const btnPrimary =
  'px-4 py-2 bg-columbia-600 text-white rounded-lg hover:bg-columbia-700 text-sm font-medium disabled:opacity-50';
export const btnGhost =
  'px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm text-slate-700 disabled:opacity-50';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'blue' | 'amber' | 'purple' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    blue: 'bg-columbia-50 text-columbia-700 border border-columbia-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-8">{children}</div>;
}
