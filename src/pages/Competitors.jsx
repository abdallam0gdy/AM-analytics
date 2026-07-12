import { useState } from 'react';
import {
  ExternalLink, Video, Users as UsersIcon, Eye, ThumbsUp,
  MessageSquare, ChevronDown, ChevronUp, Star, AlertTriangle,
  CheckCircle2, Search, ArrowUpDown, ArrowUpRight, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { useSupabaseData } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { isGeminiConfigured, analyzeCompetitorInsights, generateCombatLessonPlan, generateShortVideoScript } from '../lib/gemini';
import { runChannelAnalysisPipeline } from '../lib/frontendPipeline';
import {
  realCompetitors as localCompetitors,
  realVideos as localVideos,
  realInsights as localInsights,
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

// Helper to parse competitor details (handle strengths/weaknesses from JSON fallback inside description)
export function parseCompetitor(competitor) {
  if (!competitor) return competitor;
  let bio = competitor.description || '';
  let strengths = competitor.strengths;
  let weaknesses = competitor.weaknesses;

  if (bio.trim().startsWith('{') && bio.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(bio);
      bio = parsed.bio || '';
      strengths = strengths || parsed.strengths || [];
      weaknesses = weaknesses || parsed.weaknesses || [];
    } catch (e) {
      console.error('Failed to parse competitor description JSON:', e);
    }
  }

  return {
    ...competitor,
    description: bio,
    strengths: strengths && strengths.length > 0 ? strengths : null,
    weaknesses: weaknesses && weaknesses.length > 0 ? weaknesses : null
  };
}

function CompetitorCard({ competitor: rawCompetitor, videos, insights, isExpanded, onToggle, rankIndex, onRefresh, onGenerateLessonPlan, onGenerateShortScript }) {
  const competitor = parseCompetitor(rawCompetitor);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  
  const totalViews = videos.reduce((sum, v) => sum + parseInt(v.views || 0), 0);
  const coveredTopics = curriculumTopics.firstYear.filter(t => {
    return t.covered_by.includes(competitor.id) || 
           t.covered_by.includes(competitor.channel_id) ||
           (competitor.name && t.covered_by.some(cb => competitor.name.includes(cb)));
  });

  const growthRates = ['+18%', '+12%', '+8%', '+3%', '+2%'];
  const growthRate = growthRates[rankIndex % growthRates.length];

  const handleAIAnalyze = async () => {
    if (!isGeminiConfigured) {
      alert('الرجاء إضافة مفتاح Gemini API Key (VITE_GEMINI_API_KEY) في ملف .env');
      return;
    }
    
    setIsAnalyzing(true);
    setProgressMessage('جاري التحضير لبدء عملية سحب وتحليل قنوات المدرس...');
    
    try {
      await runChannelAnalysisPipeline(
        competitor.id,
        competitor.channel_id,
        (progress) => {
          setProgressMessage(progress.message);
        }
      );

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Failed to run dynamic competitor analysis:', err);
      alert(`حدث خطأ أثناء سحب وتحليل القناة: ${err.message || err}`);
    } finally {
      setIsAnalyzing(false);
      setProgressMessage('');
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-outline-variant/20 transition-all duration-300 flex flex-col gap-6">
      {/* Top Section */}
      <div className="flex gap-5 items-start">
        {/* Avatar image container */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm ring-4 ring-primary/5 bg-surface-container flex items-center justify-center">
            {competitor.avatar_url ? (
              <img
                src={competitor.avatar_url}
                alt={competitor.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-full h-full rounded-2xl flex items-center justify-center text-white text-xl font-bold ${competitor.avatar_url ? 'hidden' : ''}`}
              style={{ background: competitor.avatar_color || `linear-gradient(135deg, ${getAvatarColor(competitor.name)}, ${getAvatarColor(competitor.name)}dd)` }}
            >
              {competitor.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* Competitor Title & Compare Actions */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-base font-bold text-on-surface">
                  {competitor.name.includes(' - ') ? competitor.name.split(' - ')[1] : competitor.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                  {growthRate} نمو
                </span>
              </div>
              <p className="text-xs text-primary font-medium mt-0.5">
                {competitor.grade_focus || 'الصف الأول الثانوي'}
              </p>
            </div>
            
            <button 
              onClick={onToggle}
              className="bg-surface-container-high hover:bg-surface-variant text-on-surface-variant px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1 shrink-0"
            >
              <span>{isExpanded ? 'إغلاق التفاصيل' : 'تفاصيل التحليل'}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Quick Statistics Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4 bg-surface-container-low p-3.5 rounded-xl text-center">
            <div>
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">المشتركين</p>
              <p className="font-headline text-sm font-extrabold text-on-surface font-mono">
                {(parseInt(competitor.subscriber_count || 0)).toLocaleString('ar-EG')}
              </p>
            </div>
            <div className="border-x border-outline-variant/40">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">المشاهدات</p>
              <p className="font-headline text-sm font-extrabold text-on-surface font-mono">
                {totalViews >= 1000000 
                  ? `${(totalViews / 1000000).toFixed(1)}M` 
                  : totalViews >= 1000 
                    ? `${(totalViews / 1000).toFixed(0)}k` 
                    : totalViews.toLocaleString('ar-EG')}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5">الفيديوهات</p>
              <p className="font-headline text-sm font-extrabold text-on-surface font-mono">
                {competitor.video_count || videos.length}
              </p>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border-light/30 dark:border-border-dark/20">
            <a 
              href={competitor.channel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-container font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <span>رابط القناة على يوتيوب</span>
              <ArrowUpRight size={13} />
            </a>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="w-2 h-2 rounded-full bg-primary opacity-30"></span>
              <span className="w-2 h-2 rounded-full bg-primary opacity-10"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Analysis Drawer */}
      {isExpanded && (
        <div className="border-t border-border-light dark:border-border-dark/50 pt-5 mt-2 space-y-4 animate-fade-in">
          {/* Strengths & Weaknesses */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-border-light/35 dark:border-border-dark/15 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                تحليل نقاط القوة والضعف التلقائي (بالذكاء الاصطناعي)
              </span>
              <button
                onClick={handleAIAnalyze}
                disabled={isAnalyzing}
                className="text-[10px] font-bold text-primary hover:underline border border-primary/20 px-2 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isAnalyzing ? (
                  <>
                    <span className="animate-spin inline-block">🔄</span>
                    <span>جاري التحليل...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} />
                    <span>{competitor.strengths ? 'تحديث التحليل بالـ AI' : 'بدء التحليل بالـ AI'}</span>
                  </>
                )}
              </button>
            </div>

            {isAnalyzing && (
              <div className="text-xs text-primary font-bold flex items-center gap-1.5 p-3 bg-primary/5 rounded-xl border border-primary/10 animate-pulse">
                <span className="animate-spin text-sm">🔄</span>
                <span>{progressMessage}</span>
              </div>
            )}

            {competitor.strengths || competitor.weaknesses ? (
              <div className="space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div>
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> نقاط القوة في الشرح
                    </h4>
                    <div className="space-y-1.5">
                      {(competitor.strengths || []).map((s, i) => (
                        <p key={i} className="text-xs text-text-secondary-light dark:text-text-secondary-dark flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{s}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  {/* Weaknesses */}
                  <div className="border-t md:border-t-0 md:pr-4 md:border-r border-outline-variant/30">
                    <h4 className="text-xs font-bold text-red-500 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> نقاط الضعف والفجوات
                    </h4>
                    <div className="space-y-1.5">
                      {(competitor.weaknesses || []).map((w, i) => (
                        <p key={i} className="text-xs text-text-secondary-light dark:text-text-secondary-dark flex items-start gap-1.5">
                          <span className="text-red-500 font-bold">✗</span>
                          <span>{w}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onGenerateLessonPlan(competitor.name, competitor.weaknesses || [])}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-secondary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-secondary/90 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>توليد كورس مضاد بالـ AI لمنافسة نقاط ضعفه</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60 mb-3">
                  لم يتم تحليل نقاط القوة والضعف لهذا المدرس بالـ AI بعد. اضغط على الزر للتحليل التلقائي بناءً على فيديوهاته وتعليقات طلابه.
                </p>
                <button
                  onClick={handleAIAnalyze}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto animate-pulse"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin inline-block">🔄</span>
                      <span>جاري تشغيل تحليل الذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>تحليل المدرس واستخراج نقاط قوته وضعفه</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Curriculum Topics */}
          {coveredTopics.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-on-surface mb-2">المواضيع المغطاة من المنهج ({coveredTopics.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {coveredTopics.map(t => (
                  <span key={t.id} className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light border border-primary/5">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Video List */}
          {videos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-on-surface mb-2">أبرز الفيديوهات وتفاعلها</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {videos.map((video) => {
                  const insight = insights.find(i => i.video_id === video.id || i.video_id === video.youtube_id);
                  return (
                    <div
                      key={video.id}
                      className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container border border-border-light/20 dark:border-border-dark/10 hover:border-primary/20 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{video.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-mono">
                            <span><Eye size={10} className="inline mr-0.5" /> {(parseInt(video.views || 0)).toLocaleString('ar-EG')}</span>
                            <span><ThumbsUp size={10} className="inline mr-0.5" /> {(parseInt(video.likes || 0)).toLocaleString('ar-EG')}</span>
                            <span><MessageSquare size={10} className="inline mr-0.5" /> {video.comments_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {insight && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
                              {insight.engagement_score || 5}/10 تفاعل
                            </span>
                          )}
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-primary hover:bg-surface-container-low rounded-lg transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      {insight && ((insight.pain_points && insight.pain_points.length > 0) || (insight.student_requests && insight.student_requests.length > 0)) && (
                        <div className="mt-1 border-t border-outline-variant/10 pt-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {[...(insight.pain_points || []), ...(insight.student_requests || [])].slice(0, 3).map((pt, idx) => (
                              <button
                                key={idx}
                                onClick={() => onGenerateShortScript(pt)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-primary dark:text-primary-light border border-primary/10 hover:bg-primary/10 transition-colors text-[9px] font-semibold cursor-pointer"
                                title="اضغط لتوليد سيناريو شرح فيديو قصير"
                              >
                                <Sparkles size={8} />
                                <span>{pt}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Competitors() {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all'); // 'all' | 'first' | 'second'
  const [sortBy, setSortBy] = useState('subscribers'); // 'subscribers' | 'videos'

  // H2H Comparison State
  const [compAId, setCompAId] = useState('');
  const [compBId, setCompBId] = useState('');
  const [showH2H, setShowH2H] = useState(false);

  // AI Modal States
  const [activeLessonPlan, setActiveLessonPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTabPlan, setActiveTabPlan] = useState('outline'); // 'outline' | 'code' | 'quiz'

  const [activeScript, setActiveScript] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Load Competitors, Videos, and Insights dynamically from Supabase with local fallbacks
  const { data: competitors, refetch: refetchCompetitors } = useSupabaseData('competitors', { orderBy: { column: 'subscriber_count', ascending: false } }, localCompetitors);
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
      alert('حدث خطأ أثناء توليد خطة الدرس بالـ AI.');
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
      alert('حدث خطأ أثناء توليد سيناريو الفيديو بالـ AI.');
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

  // Calculate H2H Radar data
  const compA = competitors.find(c => c.id === compAId);
  const compB = competitors.find(c => c.id === compBId);
  
  let radarData = [];
  let sA = {}, sB = {};
  if (compA && compB) {
    const parseC = (c) => {
      let strengths = c.strengths || [];
      let weaknesses = c.weaknesses || [];
      if (c.description && c.description.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(c.description);
          strengths = parsed.strengths || [];
          weaknesses = parsed.weaknesses || [];
        } catch (e) {}
      }
      return { id: c.id, channel_id: c.channel_id, name: c.name, subscribers: c.subscriber_count, views: c.views || 0, strengths, weaknesses };
    };
    
    const cA = parseC(compA);
    const cB = parseC(compB);
    
    const calculateScores = (c) => {
      const subs = parseInt(c.subscribers || 0);
      const subsScore = Math.min(100, Math.max(30, Math.round(Math.log10(subs || 1) * 15)));
      const vids = videos.filter(v => v.competitor_id === c.id);
      const views = vids.reduce((sum, v) => sum + parseInt(v.views || 0), 0);
      const engagementScore = Math.min(100, Math.max(40, Math.round(Math.log10(views || 1) * 13)));
      
      const coveredCount = curriculumTopics.firstYear.filter(t => 
        t.covered_by.includes(c.id) || t.covered_by.includes(c.channel_id) || t.covered_by.some(cb => c.name.includes(cb))
      ).length;
      const coverageScore = Math.min(100, 30 + coveredCount * 15);
      
      const practicalCount = c.strengths.filter(s => 
        s.includes('عملي') || s.includes('كود') || s.includes('برمج') || s.includes('تطبيق')
      ).length;
      const practicalScore = Math.min(100, 40 + practicalCount * 20);
      
      const weaknessesCount = c.weaknesses.length;
      const sentimentScore = Math.max(30, 95 - weaknessesCount * 12);
      
      return { subsScore, engagementScore, coverageScore, practicalScore, sentimentScore };
    };
    
    sA = calculateScores(cA);
    sB = calculateScores(cB);
    
    const cleanNameA = cA.name.includes(' - ') ? cA.name.split(' - ')[1] : cA.name;
    const cleanNameB = cB.name.includes(' - ') ? cB.name.split(' - ')[1] : cB.name;
    
    radarData = [
      { subject: 'المتابعون والقناة', [cleanNameA]: sA.subsScore, [cleanNameB]: sB.subsScore },
      { subject: 'المشاهدات والتفاعل', [cleanNameA]: sA.engagementScore, [cleanNameB]: sB.engagementScore },
      { subject: 'تغطية المنهج الدراسي', [cleanNameA]: sA.coverageScore, [cleanNameB]: sB.coverageScore },
      { subject: 'التركيز العملي البرمجي', [cleanNameA]: sA.practicalScore, [cleanNameB]: sB.practicalScore },
      { subject: 'رضا وسعادة الطلاب', [cleanNameA]: sA.sentimentScore, [cleanNameB]: sB.sentimentScore },
    ];
  }

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
          <div className="p-1.5 rounded-lg bg-secondary/5 text-secondary w-fit mb-2">
            <Eye size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">إجمالي المشاهدات</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {formatBigNumber(totalViews)}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-tertiary/5 text-tertiary w-fit mb-2">
            <Video size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">عدد الفيديوهات</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {videos.length.toLocaleString('ar-EG')}
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
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
        <button
          onClick={() => setShowH2H(!showH2H)}
          className="flex items-center justify-between w-full font-headline text-sm font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span>🥊 مقارنة المدرسين رأس برأس (H2H Radar)</span>
            <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/15 px-2 py-0.5 rounded-lg">جديد</span>
          </span>
          <ChevronDown className={`transform transition-transform duration-300 ${showH2H ? 'rotate-180' : ''}`} size={16} />
        </button>

        {showH2H && (
          <div className="mt-5 space-y-5 animate-fade-in border-t border-outline-variant/20 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Competitor A */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant">المدرس الأول (A)</label>
                <select
                  value={compAId}
                  onChange={(e) => setCompAId(e.target.value)}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- اختر المدرس الأول --</option>
                  {competitors.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === compBId}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Competitor B */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant">المدرس الثاني (B)</label>
                <select
                  value={compBId}
                  onChange={(e) => setCompBId(e.target.value)}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- اختر المدرس الثاني --</option>
                  {competitors.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === compAId}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {compA && compB ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center border-t border-outline-variant/20 pt-5">
                {/* Radar Chart */}
                <div className="h-64 w-full flex items-center justify-center bg-surface-container/30 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="var(--color-outline-variant)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 9 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 8 }} />
                      <Radar name={compA.name.includes(' - ') ? compA.name.split(' - ')[1] : compA.name} dataKey={compA.name.includes(' - ') ? compA.name.split(' - ')[1] : compA.name} stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} />
                      <Radar name={compB.name.includes(' - ') ? compB.name.split(' - ')[1] : compB.name} dataKey={compB.name.includes(' - ') ? compB.name.split(' - ')[1] : compB.name} stroke="var(--color-secondary)" fill="var(--color-secondary)" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 45, 74, 0.95)', border: 'none', borderRadius: '8px', fontSize: '10px', color: '#fff' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* H2H Brief Analysis Card */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    تحليل المقارنة بالـ AI:
                  </h4>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      بالمقارنة بين <strong>{compA.name}</strong> و <strong>{compB.name}</strong>:
                    </p>
                    <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
                      <li>
                        المدرس الأكبر انتشاراً هو <strong>{parseInt(compA.subscriber_count) > parseInt(compB.subscriber_count) ? compA.name : compB.name}</strong> بعدد مشتركين يصل لـ <strong>{formatBigNumber(Math.max(parseInt(compA.subscriber_count), parseInt(compB.subscriber_count)))}</strong>.
                      </li>
                      <li>
                        المدرس الأكثر تفاعلاً بمشاهدات المحاضرات هو <strong>{sA.engagementScore > sB.engagementScore ? compA.name : compB.name}</strong>.
                      </li>
                      <li>
                        <strong>ميزة التغطية:</strong> يغطي <strong>{compA.name}</strong> مواضيع بمعدل <strong>{sA.coverageScore}%</strong> مقابل <strong>{sB.coverageScore}%</strong> للمنافس الثاني.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-on-surface-variant/55 bg-surface-container/20 rounded-2xl border border-dashed border-outline-variant/30">
                الرجاء اختيار مدرسين للمقارنة وعرض المخطط الراداري التفاعلي.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-3 rounded-2xl card-shadow">
        {/* Search Input & Sort Button */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary-light/40 dark:text-text-secondary-dark/40" size={14} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-surface-container-lowest rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 text-on-surface">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-primary/5">
              <div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg mb-1 inline-block">خطة الدرس المضادة بالـ AI</span>
                <h3 className="font-headline text-base font-bold">{activeLessonPlan.lesson_title || 'خطة الدرس المقترحة'}</h3>
              </div>
              <button 
                onClick={() => setActiveLessonPlan(null)}
                className="p-1.5 hover:bg-outline-variant/20 rounded-full transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-outline-variant/20 bg-surface-container/30">
              <button
                onClick={() => setActiveTabPlan('outline')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTabPlan === 'outline' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant'}`}
              >
                📖 محتوى الشرح
              </button>
              <button
                onClick={() => setActiveTabPlan('code')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTabPlan === 'code' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant'}`}
              >
                💻 كود وتطبيق Python
              </button>
              <button
                onClick={() => setActiveTabPlan('quiz')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTabPlan === 'quiz' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant'}`}
              >
                📝 اختبار التقييم
              </button>
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTabPlan === 'outline' && (
                <div className="space-y-6">
                  {/* Objectives */}
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">🎯 الأهداف التعليمية للدرس:</h4>
                    <ul className="list-disc list-inside text-xs text-on-surface-variant space-y-1.5">
                      {(activeLessonPlan.objectives || []).map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Strategy */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <h4 className="text-xs font-bold text-primary mb-1">🛡️ استراتيجية التميز (التغلب على المنافس):</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {activeLessonPlan.explanation_strategy}
                    </p>
                  </div>

                  {/* Outline Section */}
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-3">📋 تقسيم ومراحل الدرس:</h4>
                    <div className="space-y-3">
                      {(activeLessonPlan.outline || []).map((sec, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-on-surface">{sec.section_title}</span>
                            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono">{sec.duration}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant">{sec.concept}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTabPlan === 'code' && activeLessonPlan.python_exercise && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-1">🔥 عنوان التطبيق العملي:</h4>
                    <p className="text-xs text-on-surface font-semibold">{activeLessonPlan.python_exercise.title}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-primary mb-1.5">📝 وصف المسألة البرمجية للطلاب:</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{activeLessonPlan.python_exercise.description}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">💻 كود Python النموذجي:</h4>
                    <div className="relative">
                      <pre className="bg-surface-container text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto text-left ltr">
                        <code>{activeLessonPlan.python_exercise.code}</code>
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeLessonPlan.python_exercise.code);
                          alert('تم نسخ كود بايثون إلى الحافظة!');
                        }}
                        className="absolute top-3 right-3 text-[10px] bg-primary text-white font-bold px-2 py-1 rounded-lg hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        نسخ الكود
                      </button>
                    </div>
                  </div>

                  {activeLessonPlan.python_exercise.tips && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">💡 نصائح لشرح وتوصيل الكود بسهولة:</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{activeLessonPlan.python_exercise.tips}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTabPlan === 'quiz' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-primary mb-2">📝 أسئلة تفاعلية لتقييم الفهم:</h4>
                  {(activeLessonPlan.practice_quiz || []).map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-surface-container border border-outline-variant/10 space-y-3">
                      <p className="text-xs font-bold text-on-surface">{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/10 text-xs text-on-surface-variant font-medium">
                            {opt}
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-outline-variant/10 flex flex-wrap gap-2 text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">الإجابة الصحيحة: {q.correct_answer}</span>
                        <p className="text-on-surface-variant leading-relaxed w-full"><span className="font-bold">التفسير: </span>{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/30 flex justify-between bg-surface-container/20">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(activeLessonPlan, null, 2));
                  alert('تم نسخ خطة الدرس بالكامل بصيغة JSON!');
                }}
                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
              >
                نسخ الخطة كاملة (JSON)
              </button>
              <button
                onClick={() => setActiveLessonPlan(null)}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 AI Short Script Modal */}
      {activeScript && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 text-on-surface">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-secondary/5">
              <div>
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-lg mb-1 inline-block">سيناريو فيديو قصير للـ Shorts/Reels</span>
                <h3 className="font-headline text-base font-bold">{activeScript.video_title || 'سيناريو الشرح المقترح'}</h3>
              </div>
              <button 
                onClick={() => setActiveScript(null)}
                className="p-1.5 hover:bg-outline-variant/20 rounded-full transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Hook */}
              <div className="p-4 bg-secondary/5 border border-secondary/10 rounded-2xl">
                <h4 className="text-xs font-bold text-secondary mb-1">📢 خطاف جذب الانتباه (Hook) - أول 5 ثواني:</h4>
                <p className="text-xs font-bold text-on-surface leading-relaxed italic">"{activeScript.hook}"</p>
              </div>

              {/* Script Body */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-secondary mb-2">🎬 سيناريو ومسار الفيديو خطوة بخطوة:</h4>
                <div className="space-y-3">
                  {(activeScript.body || []).map((step, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 text-xs">
                      <div className="col-span-1 border-l border-outline-variant/20 pl-2">
                        <span className="font-bold text-primary block mb-1">📹 المشهد المرئي</span>
                        <span className="text-[10px] text-on-surface-variant">{step.visual}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-secondary block mb-1">🎙️ ما ستقوله بالعامية</span>
                        <span className="text-on-surface-variant font-medium leading-relaxed">"{step.audio}"</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              {activeScript.call_to_action && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">🎯 الدعوة للإجراء (Call to Action):</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">"{activeScript.call_to_action}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/30 flex justify-between bg-surface-container/20">
              <button
                onClick={() => {
                  const fullText = `عنوان الفيديو: ${activeScript.video_title}\n\nالخطاف (Hook):\n${activeScript.hook}\n\nالسيناريو:\n${activeScript.body.map((s, i) => `خطوة ${i+1}:\nالمرئي: ${s.visual}\nالصوت: ${s.audio}`).join('\n\n')}\n\nنهاية الفيديو: ${activeScript.call_to_action}`;
                  navigator.clipboard.writeText(fullText);
                  alert('تم نسخ سيناريو الفيديو بالكامل للمذكرة!');
                }}
                className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold rounded-xl hover:bg-secondary/20 transition-all cursor-pointer"
              >
                نسخ النص كاملاً
              </button>
              <button
                onClick={() => setActiveScript(null)}
                className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary/95 transition-all shadow cursor-pointer"
              >
                إغلاق السيناريو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
