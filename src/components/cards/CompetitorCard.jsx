import { useState } from 'react';
import {
  ExternalLink, Video, Users as UsersIcon, Eye, ThumbsUp,
  MessageSquare, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, ArrowUpRight, Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { isGeminiConfigured } from '../../lib/gemini';
import { runChannelAnalysisPipeline } from '../../lib/frontendPipeline';
import { curriculumTopics } from '../../data/mockData';
import { getAvatarColor, parseCompetitor } from '../../lib/utils';

export default function CompetitorCard({
  competitor: rawCompetitor,
  videos,
  insights,
  isExpanded,
  onToggle,
  rankIndex,
  onRefresh,
  onGenerateLessonPlan,
  onGenerateShortScript
}) {
  const competitor = parseCompetitor(rawCompetitor);
  const { showToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  
  const totalViews = videos.reduce((sum, v) => sum + parseInt(v.views || 0), 0);
  const coveredTopics = curriculumTopics.firstYear.filter(t => {
    return t.covered_by.includes(competitor.id) || 
           t.covered_by.includes(competitor.channel_id) ||
           (competitor.name && t.covered_by.some(cb => competitor.name.includes(cb)));
  });

  const handleAIAnalyze = async () => {
    if (!isGeminiConfigured) {
      showToast('الرجاء إضافة مفتاح Gemini API Key (VITE_GEMINI_API_KEY) في ملف .env', 'error');
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
      showToast(`حدث خطأ أثناء سحب وتحليل القناة: ${err.message || err}`, 'error');
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                  competitor.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-on-surface-variant/10 text-on-surface-variant'
                }`}>
                  {competitor.status === 'active' ? 'نشط' : 'غير نشط'}
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
