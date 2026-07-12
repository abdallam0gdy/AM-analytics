import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, MessageSquare, Zap, Users, ExternalLink, BookOpen, RefreshCw, Loader2, Sparkles, AlertCircle, Check, ShieldCheck, ChevronLeft, Target, BrainCircuit } from 'lucide-react';
import StatCard from '../components/cards/StatCard';
import PainPointsChart from '../components/charts/PainPointsChart';
import { useSupabaseData, useSupabaseStatus } from '../hooks/useSupabase';
import { runFrontendPipeline } from '../lib/frontendPipeline';
import {
  dashboardStats as localStats,
  painPointsChartData as localPainPoints,
  realCompetitors as localCompetitors,
  curriculumTopics,
} from '../data/mockData';

// Helper to assign consistent avatar colors based on name string
function getAvatarColor(name) {
  const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#2563EB', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function Overview() {
  // Pipeline State
  const [pipelineState, setPipelineState] = useState({ active: false, status: '', message: '', logs: [] });
  const { isConfigured: isSupabaseConnected } = useSupabaseStatus();

  // 1. Fetch Stats
  const { data: dbStatsRaw, refetch: refetchStats } = useSupabaseData('dashboard_stats', {}, [localStats]);
  // Extract stats object from first row if database returned data
  const stats = dbStatsRaw && dbStatsRaw.length > 0 && dbStatsRaw[0].total_competitors !== undefined
    ? {
        totalVideos: dbStatsRaw[0].total_videos,
        totalComments: dbStatsRaw[0].total_comments,
        avgEngagement: dbStatsRaw[0].avg_engagement,
        totalCompetitors: dbStatsRaw[0].total_competitors,
      }
    : localStats;

  // 2. Fetch Pain Points
  const { data: dbPainPoints, refetch: refetchPainPoints } = useSupabaseData('top_pain_points', {}, []);
  // Map Supabase view format { pain_point, frequency } to chart format { name, count }
  const painPointsData = dbPainPoints && dbPainPoints.length > 0 && dbPainPoints[0].pain_point !== undefined
    ? dbPainPoints.map(row => ({ name: row.pain_point, count: row.frequency }))
    : localPainPoints;

  // 3. Fetch Competitors
  const { data: competitors, refetch: refetchCompetitors } = useSupabaseData('active_competitors', {}, localCompetitors);

  // Trigger browser pipeline
  const handleRunRadar = async () => {
    setPipelineState({ active: true, status: 'started', message: 'جاري تشغيل رادار الاكتشاف والتحديث المباشر...', logs: [] });
    try {
      await runFrontendPipeline((progress) => {
        setPipelineState(prev => ({
          ...prev,
          status: progress.status,
          message: progress.message,
          logs: [...prev.logs, progress.message]
        }));
      });
      // Refetch all dashboard data to refresh UI with live values
      await Promise.all([refetchStats(), refetchPainPoints(), refetchCompetitors()]);
    } catch (e) {
      setPipelineState(prev => ({
        ...prev,
        status: 'failed',
        message: `فشل التحديث: ${e.message}`
      }));
    }
  };

  // Uncovered Topics (Mock calculation using local config since it maps curriculum coverage)
  const uncoveredTopics = curriculumTopics.firstYear.filter(t => t.covered_by.length === 0);

  return (
    <div className="space-y-5 w-full text-on-surface">
      {/* Welcome & Radar Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest dark:bg-surface-container-lowest p-4 px-5 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-on-surface mb-1">مرحباً، عبدالله 👋</h1>
          <p className="text-xs text-on-surface-variant">ملخص تحليل المنافسين في مادة البرمجة والذكاء الاصطناعي</p>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              قاعدة البيانات متصلة
            </span>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini AI نشط
            </span>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              رادار يوتيوب جاهز
            </span>
          </div>
        </div>
        {isSupabaseConnected && (
          <button
            onClick={handleRunRadar}
            disabled={pipelineState.active && pipelineState.status !== 'completed' && pipelineState.status !== 'failed'}
            className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {pipelineState.active && pipelineState.status !== 'completed' && pipelineState.status !== 'failed' ? (
              <><Loader2 size={14} className="animate-spin" /> جاري التحديث...</>
            ) : (
              <>
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>تحديث بيانات السوق</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Pipeline Status Drawer/Card */}
      {pipelineState.active && (
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm animate-scale-in">
          <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark/50 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary animate-pulse" />
              <h3 className="text-xs font-bold text-on-surface">
                مسار البيانات النشط (رادار يوتيوب والذكاء الاصطناعي)
              </h3>
            </div>
            {(pipelineState.status === 'completed' || pipelineState.status === 'failed') && (
              <button
                onClick={() => setPipelineState({ active: false, status: '', message: '', logs: [] })}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary dark:text-primary-light hover:bg-primary/20 transition-all"
              >
                إغلاق النافذة
              </button>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            {pipelineState.status === 'completed' ? (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0"><Check size={16} /></div>
            ) : pipelineState.status === 'failed' ? (
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 shrink-0"><AlertCircle size={16} /></div>
            ) : (
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0"><Loader2 size={16} className="animate-spin" /></div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface">
                {pipelineState.message}
              </p>

              {/* Mini Log Console */}
              <div className="mt-2.5 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 dark:border-border-dark font-mono text-[9px] text-on-surface-variant h-20 overflow-y-auto flex flex-col-reverse gap-1">
                {pipelineState.logs.slice().reverse().map((logMsg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-primary shrink-0">➜</span>
                    <span>{logMsg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-primary-fixed rounded-lg text-primary">
              <Users size={16} />
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">+12%</span>
          </div>
          <div className="text-lg font-bold mb-0.5 text-on-surface">{stats.totalCompetitors}</div>
          <div className="text-xs text-on-surface-variant">قنوات تعليمية مراقبة</div>
          <div className="mt-3.5 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary w-3/4"></div>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-secondary-fixed rounded-lg text-secondary">
              <Zap size={16} />
            </div>
            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">+5%</span>
          </div>
          <div className="text-lg font-bold mb-0.5 text-on-surface">{stats.avgEngagement} / 10</div>
          <div className="text-xs text-on-surface-variant">متوسط التفاعل العام</div>
          <div className="mt-3.5 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-secondary w-2/3"></div>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-tertiary-fixed rounded-lg text-tertiary">
              <MessageSquare size={16} />
            </div>
            <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded-full">+8%</span>
          </div>
          <div className="text-lg font-bold mb-0.5 text-on-surface">{stats.totalComments}</div>
          <div className="text-xs text-on-surface-variant">التعليقات المحللة بالذكاء الاصطناعي</div>
          <div className="mt-3.5 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-tertiary w-1/2"></div>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-primary-fixed rounded-lg text-primary">
              <Video size={16} />
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">+22%</span>
          </div>
          <div className="text-lg font-bold mb-0.5 text-on-surface">{stats.totalVideos}</div>
          <div className="text-xs text-on-surface-variant">فيديوهات تم تحليلها مؤخراً</div>
          <div className="mt-3.5 h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary w-4/5"></div>
          </div>
        </div>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Strength/Weakness Chart */}
        <div className="xl:col-span-2 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-base font-bold text-on-surface">أكثر نقاط الضعف في الشرح</h2>
              <p className="text-xs text-on-surface-variant">تحليل تعليقات الطلاب عبر جميع المنافسين</p>
            </div>
            <div className="bg-secondary/10 text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold">بيانات حقيقية</div>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {painPointsData && painPointsData.length > 0 ? (
              painPointsData.slice(0, 5).map((item, index) => {
                const barColors = ['#e85d00', '#fe6b08', '#ff8a3d', '#ff9f5f', '#ffb380'];
                const maxCount = Math.max(...painPointsData.map(d => d.count), 1);
                const percentage = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-on-surface">{item.name}</span>
                      <span className="text-on-surface-variant font-bold">{item.count}</span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 chart-bar"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: barColors[index % barColors.length]
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-on-surface-variant">
                لا توجد بيانات نقاط ضعف حالياً. شغّل الرادار لجمع البيانات.
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-between items-center text-[10px] text-outline font-mono">
            <span>0</span>
            <span>0.5</span>
            <span>1</span>
            <span>1.5</span>
            <span>2</span>
          </div>
        </div>

        {/* Competitor Rankings */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 dark:border-border-dark shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-on-surface">المنافسون الرئيسيون</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">أعلى ٤</span>
            </div>

            <div className="space-y-2.5">
              {competitors.slice(0, 4).map((comp, idx) => {
                const avatarBgColor = comp.avatar_color || getAvatarColor(comp.name);
                const growthRates = ['+18%', '+12%', '+8%', '+3%'];
                const rankEmblems = ['👑', '🥈', '🥉', '🔹'];

                return (
                  <div
                    key={comp.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-surface-container-low border border-transparent hover:border-outline-variant/20 transition-all rounded-xl group cursor-pointer hover:shadow-sm"
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      {comp.avatar_url ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm ring-2 ring-surface-container-lowest shrink-0 flex items-center justify-center bg-surface-container">
                          <img
                            src={comp.avatar_url}
                            alt={comp.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.nextSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div
                            className="w-full h-full rounded-xl items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: avatarBgColor, display: 'none' }}
                          >
                            {comp.name.charAt(0)}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-sm ring-2 ring-surface-container-lowest"
                          style={{ backgroundColor: avatarBgColor }}
                        >
                          {comp.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                        {comp.name.includes(' - ') ? comp.name.split(' - ')[1] : comp.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {(comp.subscriber_count || 0).toLocaleString('ar-EG')} مشترك
                        </span>
                        <span className="text-outline-variant text-[9px]">•</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {comp.video_count || 0} فيديو
                        </span>
                      </div>
                    </div>

                    {/* Growth Indicator Pill */}
                    <div className="text-left shrink-0">
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        {growthRates[idx]} نمو
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Link
            to="/competitors"
            className="w-full mt-5 py-2 text-center text-primary font-bold text-xs border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors block"
          >
            عرض جميع المنافسين
          </Link>
        </div>
      </div>

      {/* Opportunities Section */}
      {uncoveredTopics.length > 0 && (
        <div className="mt-6 bg-surface-container-high/30 dark:bg-surface-container-low/30 p-5 rounded-xl border-2 border-dashed border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 bg-secondary/15 rounded-lg text-secondary shrink-0">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-on-surface">فرص ذهبية - مواضيع لم يغطها أي منافس</h2>
              <p className="text-xs text-on-surface-variant">مواضيع من المنهج الجديد لم يشرحها أي من المنافسين - فرصة ممتازة لك</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uncoveredTopics.slice(0, 4).map((topic, index) => {
              const isEven = index % 2 === 0;
              const themeColor = isEven ? 'primary' : 'secondary';
              const bgClass = isEven ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary';
              const borderHoverClass = isEven ? 'hover:border-primary' : 'hover:border-secondary';
              const textHoverClass = isEven ? 'group-hover:text-primary' : 'group-hover:text-secondary';

              return (
                <div
                  key={topic.id}
                  className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 dark:border-border-dark ${borderHoverClass} transition-all cursor-pointer group flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${bgClass} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
                      {isEven ? <Target size={16} /> : <BrainCircuit size={16} />}
                    </div>
                    <div>
                      <div className={`font-bold text-xs text-on-surface ${textHoverClass} transition-colors`}>{topic.name}</div>
                      <div className="text-[10px] text-on-surface-variant">{topic.unit}</div>
                    </div>
                  </div>
                  <ChevronLeft size={16} className="text-outline group-hover:text-primary transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
