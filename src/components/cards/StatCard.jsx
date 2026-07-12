import { TrendingUp } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary', delay = 0 }) {
  const colors = {
    primary: {
      iconBg: 'bg-primary/10 dark:bg-primary/15',
      iconColor: 'text-primary dark:text-primary-light',
      border: 'hover:border-primary/20 dark:hover:border-primary/30',
    },
    accent: {
      iconBg: 'bg-accent-container/10 dark:bg-accent-container/15',
      iconColor: 'text-accent dark:text-accent-container',
      border: 'hover:border-accent-container/20 dark:hover:border-accent-container/30',
    },
    success: {
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      border: 'hover:border-emerald-500/20 dark:hover:border-emerald-500/30',
    },
    purple: {
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      border: 'hover:border-violet-500/20 dark:hover:border-violet-500/30',
    },
  };

  const c = colors[color] || colors.primary;

  return (
    <div
      className={`
        group card-hover
        bg-surface-light dark:bg-surface-dark
        border border-border-light dark:border-border-dark
        rounded-2xl p-5
        card-shadow
        ${c.border}
        animate-slide-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${c.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={21} className={c.iconColor} />
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
            trend > 0
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              : 'text-red-600 dark:text-red-400 bg-red-500/10'
          }`}>
            <TrendingUp size={13} className={trend < 0 ? 'rotate-180' : ''} />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark mb-0.5 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
      </h3>

      <p className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">
        {title}
      </p>

      {subtitle && (
        <p className="text-xs text-text-secondary-light/50 dark:text-text-secondary-dark/50 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
