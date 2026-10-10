import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // % change (+/-)
  changePeriod?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changePeriod = 'vs m-1',
  icon,
  trend,
  color = 'blue',
  onClick,
}) => {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  const progressColors = {
    blue: 'bg-[#8f1722]',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-red-500',
    purple: 'bg-purple-600',
    slate: 'bg-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white p-5 rounded-md border border-[#dedbd7] shadow-[0_1px_2px_rgba(15,15,16,0.04)] flex flex-col justify-between transition-all',
        onClick && 'cursor-pointer hover:border-[#8f1722]'
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate pr-2">
          {title}
        </span>
        {typeof change === 'number' && (
          <span
            className={cn(
              'text-xs font-bold shrink-0',
              isPositive && 'text-emerald-500',
              isNegative && 'text-red-500',
              !isPositive && !isNegative && 'text-slate-400'
            )}
          >
            {isPositive ? `+${change}%` : `${change}%`}
          </span>
        )}
        {!change && subtitle && (
          <span className="text-slate-400 text-xs font-medium shrink-0 truncate max-w-[90px]">
            {subtitle}
          </span>
        )}
      </div>

      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1">
        {value}
      </div>

      {/* Mini Progress Bar or Subtitle */}
      {typeof change === 'number' ? (
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden w-full">
          <div
            className={cn('h-full rounded-full', progressColors[color])}
            style={{ width: `${Math.min(Math.max(Math.abs(change) * 5 + 30, 25), 100)}%` }}
          />
        </div>
      ) : subtitle ? (
        <div className="text-xs text-slate-400 mt-1 truncate">
          {subtitle}
        </div>
      ) : (
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden w-full">
          <div className={cn('h-full w-2/3', progressColors[color])} />
        </div>
      )}
    </div>
  );
};
