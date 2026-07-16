import { useState } from 'react';
import {
  Users as UsersIcon, Video, Eye, Sparkles, ArrowUpDown, Search
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { useSupabaseData } from '../hooks/useSupabase';
import { generateCombatLessonPlan, generateShortVideoScript } from '../lib/gemini';
import {
  realCompetitors as localCompetitors,
  realVideos as localVideos,
  realInsights as localInsights
} from '../data/mockData';

import { parseCompetitor } from '../lib/utils';
import { useToast } from '../context/ToastContext';

// Import modular components
import CompetitorCard from '../components/cards/CompetitorCard';
import HeadToHeadComparison from '../components/cards/HeadToHeadComparison';
import AILessonPlanModal from '../components/ui/AILessonPlanModal';
import AIShortScriptModal from '../components/ui/AIShortScriptModal';

export default function Competitors() {
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all'); // 'all' | 'first' | 'second'
  const [sortBy, setSortBy] = useState('subscribers'); // 'subscribers' | 'videos'

  // AI Modal States
  const [activeLessonPlan, setActiveLessonPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeScript, setActiveScript] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Load Competitors, Videos, and Insights dynamically from Supabase with local fallbacks
  const { data: competitors, refetch: refetchCompetitors } = useSupabaseData(
    'competitors',
    { orderBy: { column: 'subscriber_count', ascending: false } },
    localCompetitors
  );
  const { data: videos } = useSupabaseData('videos', {}, localVideos);
  const { data: insights } = useSupabaseData('ai_insights', {}, localInsights);

  const handleGenerateLessonPlan = async (competitorName, weaknesses) => {
    setIsGeneratingPlan(true);
    setActiveLessonPlan(null);
    try {
      const plan = await generateCombatLessonPlan(competitorName, weaknesses);
      if (plan) {
        let parsed = plan;
        if (typeof plan === 'string') {
          try {
            const clean = plan.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(clean);
          } catch (e) {
            console.error('Failed to parse lesson plan JSON:', e);
          }
        }
        setActiveLessonPlan(parsed);
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء توليد خطة الدرس بالـ AI.', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateShortScript = async (painPoint) => {
    setIsGeneratingScript(true);
    setActiveScript(null);
    try {
      const script = await generateShortVideoScript(painPoint, 'مستر أحمد (AM Platform)');
      if (script) {
        let parsed = script;
        if (typeof script === 'string') {
          try {
            const clean = script.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(clean);
          } catch (e) {
            console.error('Failed to parse script JSON:', e);
          }
        }
        setActiveScript(parsed);
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء توليد سيناريو الفيديو بالـ AI.', 'error');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Math Calculations for Bento Stats
  const totalSubscribers = competitors.reduce((sum, c) => sum + parseInt(c.subscriber_count || 0), 0);
  const totalViews = videos.reduce((sum, v) => sum + parseInt(v.views || 0), 0);
  const averageSubscribers = Math.round(totalSubscribers / (competitors.length || 1));

  // Format big numbers
  const formatBigNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toLocaleString('ar-EG');
  };

  // Filtering & Sorting Competitors list
  const filteredCompetitors = competitors
    .filter(c => {
      const nameMatches = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (gradeFilter === 'all') return nameMatches;
      const cParsed = parseCompetitor(c);
      const targetGrade = gradeFilter === 'first' ? 'الأول' : 'الثاني';
      const gradeMatches = (cParsed.grade_focus || '').includes(targetGrade) || 
                           (cParsed.description || '').includes(targetGrade);
      return nameMatches && gradeMatches;
    })
    .sort((a, b) => {
      if (sortBy === 'subscribers') {
        return parseInt(b.subscriber_count || 0) - parseInt(a.subscriber_count || 0);
      } else {
        return (b.video_count || 0) - (a.video_count || 0);
      }
    });

  // Recharts Chart Dataset mapping (Top 5 for visual quality in vertical chart)
  const chartData = filteredCompetitors
    .map(c => ({
      name: c.name.includes(' - ') ? c.name.split(' - ')[1] : c.name,
      subscribers: parseInt(c.subscriber_count || 0),
    }))
    .slice(0, 5);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-headline text-2xl font-extrabold text-on-background tracking-tight">
            تحليل المنافسين 📊
          </h2>
          <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed mt-1">
            نظرة شاملة ومدعومة بالذكاء الاصطناعي على أداء أفضل المحاضرين في مجال البرمجة والذكاء الاصطناعي. تتبع النمو، التفاعل، ومحتوى الدورات التعليمية.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant font-medium text-xs">عرض الفيديوهات:</span>
          <button className="px-3.5 py-1.5 bg-primary text-on-primary rounded-full font-bold text-xs shadow-md transition-all">
            جميع الفيديوهات
          </button>
        </div>
      </div>

      {/* Bento Highlight Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-primary/5 text-primary w-fit mb-2">
            <UsersIcon size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">إجمالي المتابعين</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {formatBigNumber(totalSubscribers)}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 w-fit mb-2">
            <Eye size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">إجمالي المشاهدات</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {formatBigNumber(totalViews)}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-secondary/5 text-secondary w-fit mb-2">
            <Video size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">متوسط حجم القناة</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {formatBigNumber(averageSubscribers)}
          </span>
        </div>

        <div className="bg-primary-container p-5 rounded-2xl shadow-sm border border-primary text-white flex flex-col gap-1 overflow-hidden relative">
          <div className="p-1.5 rounded-lg bg-white/10 text-white w-fit mb-2">
            <Sparkles size={18} />
          </div>
          <span className="text-[10px] font-bold opacity-90">توصية الذكاء الاصطناعي</span>
          <span className="font-headline text-xs font-extrabold">التركيز على تطبيقات Python</span>
          <div className="absolute -bottom-2 -left-2 opacity-10">
            <Sparkles size={48} />
          </div>
        </div>
      </div>

      {/* 🥊 Head-to-Head Comparison Widget */}
      <HeadToHeadComparison competitors={competitors} videos={videos} />

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-2xl shadow-sm">
        {/* Right side Search & Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute start-3 top-2.5 text-text-secondary-light/40 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث في التحليلات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <button
            onClick={() => setSortBy(sortBy === 'subscribers' ? 'videos' : 'subscribers')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover transition-colors"
          >
            <ArrowUpDown size={13} />
            <span>ترتيب حسب: {sortBy === 'subscribers' ? 'المشتركين' : 'الفيديوهات'}</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-bg-light dark:bg-surface-dark-2 p-1 rounded-xl border border-border-light dark:border-border-dark/50 shrink-0">
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${gradeFilter === 'all' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-text-secondary-light/60 dark:text-text-secondary-dark/60'}`}
          >
            الكل
          </button>
          <button
            onClick={() => setGradeFilter('first')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${gradeFilter === 'first' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-text-secondary-light/60 dark:text-text-secondary-dark/60'}`}
          >
            الصف الأول
          </button>
          <button
            onClick={() => setGradeFilter('second')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${gradeFilter === 'second' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-text-secondary-light/60 dark:text-text-secondary-dark/60'}`}
          >
            الصف الثاني
          </button>
        </div>
      </div>

      {/* Competitors 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredCompetitors.length > 0 ? (
          filteredCompetitors.map((comp) => {
            const originalIndex = competitors.findIndex(c => c.id === comp.id);
            return (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                videos={videos.filter(v => v.competitor_id === comp.id)}
                insights={insights}
                rankIndex={originalIndex !== -1 ? originalIndex : 0}
                isExpanded={expandedId === comp.id}
                onToggle={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                onRefresh={refetchCompetitors}
                onGenerateLessonPlan={handleGenerateLessonPlan}
                onGenerateShortScript={handleGenerateShortScript}
              />
            );
          })
        ) : (
          <div className="col-span-1 xl:col-span-2 text-center py-10 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl text-xs text-text-secondary-light/50">
            لا توجد قنوات منافسة مطابقة للبحث الحالي.
          </div>
        )}
      </div>

      {/* Visualization Chart Section */}
      {chartData.length > 0 && (
        <div className="mt-8 bg-surface-container-lowest rounded-2xl p-6 custom-shadow border border-outline-variant/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-xs font-bold text-on-surface flex items-center gap-2">
              📊 مقارنة تفاعل المتابعين وقوة القناة
            </h3>
            <div className="flex gap-4 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-on-surface-variant">القنوات الرئيسية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                <span className="text-on-surface-variant">الشركاء والآخرون</span>
              </div>
            </div>
          </div>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={(value) => [value.toLocaleString('ar-EG'), 'مشترك']}
                  contentStyle={{
                    backgroundColor: 'rgba(30, 45, 74, 0.95)',
                    border: '1px solid #1e2d4a',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '11px',
                    fontFamily: 'Cairo, sans-serif'
                  }}
                />
                <Bar dataKey="subscribers" radius={[5, 5, 0, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index % 2 === 0 ? 'var(--color-primary)' : 'var(--color-secondary-container)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 🧠 Fullscreen AI Loading Overlay - Lesson Plan */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-50 animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-on-background animate-pulse">🧠 جاري تشغيل خبير الذكاء الاصطناعي لتوليد خطة الدرس والمادة البرمجية المضادة...</p>
        </div>
      )}

      {/* 🎬 Fullscreen AI Loading Overlay - Short Video Script */}
      {isGeneratingScript && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-50 animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-secondary border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-on-background animate-pulse">🎬 جاري استخلاص تعليقات المدرس وتوليد سيناريو فيديو قصير (Short/Reel)...</p>
        </div>
      )}

      {/* 🧠 AI Lesson Plan Modal */}
      {activeLessonPlan && (
        <AILessonPlanModal 
          activeLessonPlan={activeLessonPlan} 
          onClose={() => setActiveLessonPlan(null)} 
        />
      )}

      {/* 🎬 AI Short Script Modal */}
      {activeScript && (
        <AIShortScriptModal 
          activeScript={activeScript} 
          onClose={() => setActiveScript(null)} 
        />
      )}
    </div>
  );
}
