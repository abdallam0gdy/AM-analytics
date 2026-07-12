import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-1">{label}</p>
        <p className="text-sm font-bold text-accent-container">{payload[0].value} إشارة</p>
      </div>
    );
  }
  return null;
};

export default function PainPointsChart({ data }) {
  // Gradient orange/accent colors
  const barColors = ['#e85d00', '#fe6b08', '#ff8a3d', '#ff9f5f', '#ffb380', '#ffc8a2'];
  const maxCount = data && data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1;

  return (
    <div
      className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-5 card-shadow animate-slide-up h-full flex flex-col justify-between"
      style={{ animationDelay: '300ms' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-text-primary-light dark:text-text-primary-dark">
            أكثر نقاط الضعف في الشرح
          </h3>
          <p className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60 mt-0.5">
            تحليل تعليقات الطلاب عبر جميع المنافسين
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-accent-container/10 text-[11px] font-bold text-accent-container">
          بيانات حقيقية
        </span>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {data && data.length > 0 ? (
          data.slice(0, 6).map((item, index) => {
            const percentage = Math.round((item.count / maxCount) * 100);
            return (
              <div key={index} className="space-y-1.5 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex justify-between text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                  <span className="truncate max-w-[85%]">{item.name}</span>
                  <span className="text-accent-container font-mono">{item.count} إشارة</span>
                </div>
                <div className="w-full bg-bg-light dark:bg-surface-dark-2 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: barColors[index % barColors.length],
                      boxShadow: '0 0 10px rgba(254, 107, 8, 0.2)'
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-xs text-text-secondary-light/40 dark:text-text-secondary-dark/40">
            لا توجد بيانات نقاط ضعف حالياً. شغّل الرادار لجمع البيانات.
          </div>
        )}
      </div>
    </div>
  );
}
