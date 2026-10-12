import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  highlight?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  highlight = 'default',
  className = '',
}) => {
  const highlightBorder = {
    default: 'border-slate-200/80 hover:border-slate-300',
    success: 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300',
    danger: 'border-rose-200 bg-rose-50/20 hover:border-rose-300',
    warning: 'border-amber-200 bg-amber-50/20 hover:border-amber-300',
    primary: 'border-blue-200 bg-blue-50/20 hover:border-blue-300',
  };

  const highlightIcon = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-800',
    primary: 'bg-blue-100 text-blue-700',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-xs transition-all ${highlightBorder[highlight]} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${highlightIcon[highlight]}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.value} {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
