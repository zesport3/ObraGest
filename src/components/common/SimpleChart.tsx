import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface BarChartItem {
  label: string;
  value1: number; // e.g. Rendimentos
  value2?: number; // e.g. Gastos
  label1?: string;
  label2?: string;
}

export const DoubleBarChart: React.FC<{
  data: BarChartItem[];
  label1?: string;
  label2?: string;
  height?: number;
}> = ({ data, label1 = 'Rendimentos', label2 = 'Gastos', height = 220 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        Sem dados para apresentar no período selecionado
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...data.flatMap((d) => [d.value1 || 0, d.value2 || 0])
  );

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-end gap-5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-emerald-500" />
          <span>{label1}</span>
        </div>
        {label2 && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-rose-500" />
            <span>{label2}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-3 sm:gap-6 pt-2 pb-6 px-2 overflow-x-auto" style={{ height }}>
        {data.map((item, idx) => {
          const h1 = Math.max(4, ((item.value1 || 0) / maxValue) * (height - 50));
          const h2 = item.value2 !== undefined ? Math.max(4, ((item.value2 || 0) / maxValue) * (height - 50)) : 0;

          return (
            <div key={idx} className="flex-1 min-w-[50px] flex flex-col items-center justify-end h-full group relative">
              <div className="flex items-end gap-1.5 w-full justify-center">
                {/* Bar 1 */}
                <div
                  style={{ height: `${h1}px` }}
                  className="w-4 sm:w-6 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-110 relative"
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">
                    {label1}: {formatCurrency(item.value1)}
                  </div>
                </div>

                {/* Bar 2 */}
                {item.value2 !== undefined && (
                  <div
                    style={{ height: `${h2}px` }}
                    className="w-4 sm:w-6 bg-rose-500 rounded-t-sm transition-all group-hover:brightness-110 relative"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">
                      {label2}: {formatCurrency(item.value2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Label */}
              <span className="mt-2 text-[11px] font-medium text-slate-500 text-center truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CategoryBarItem {
  label: string;
  amount: number;
  color?: string;
}

export const CategoryBreakdownList: React.FC<{
  items: CategoryBarItem[];
  total?: number;
}> = ({ items, total }) => {
  const sumTotal = total || items.reduce((acc, it) => acc + it.amount, 0);

  const defaultColors = [
    'bg-blue-600',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-purple-500',
  ];

  return (
    <div className="space-y-3.5">
      {items.map((it, idx) => {
        const pct = sumTotal > 0 ? (it.amount / sumTotal) * 100 : 0;
        const color = it.color || defaultColors[idx % defaultColors.length];

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate max-w-[180px]">{it.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[11px]">{pct.toFixed(1)}%</span>
                <span className="font-semibold text-slate-900">{formatCurrency(it.amount)}</span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${color} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(1, pct))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
