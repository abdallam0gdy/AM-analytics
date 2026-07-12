import { useState } from 'react';
import {
  BrainCircuit, Send, Loader2, AlertCircle, Lightbulb,
  Target, MessageSquare, Star, Sparkles, BookOpen,
} from 'lucide-react';
import { analyzeVideo, generateContentIdeas, isGeminiConfigured } from '../lib/gemini';
import { realCompetitors as localCompetitors } from '../data/mockData';
import { useSupabaseData } from '../hooks/useSupabase';
import { parseCompetitor } from './Competitors';

function ResultSection({ title, icon: Icon, items, color = 'primary' }) {
  if (!items || items.length === 0) return null;

  const colorClasses = {
    primary: 'text-primary dark:text-primary-light bg-primary/5 dark:bg-primary/10',
    accent: 'text-accent-container bg-accent-container/5 dark:bg-accent-container/10',
    red: 'text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10',
    purple: 'text-violet-600 dark:text-violet-400 bg-violet-500/5 dark:bg-violet-500/10',
  };

  return (
    <div className="p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface">
      <h4 className={`text-xs font-bold mb-3.5 flex items-center gap-2 ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon size={14} />
        </div>
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs text-on-surface-variant leading-relaxed">
            <span className="text-primary font-mono text-[10px] bg-primary/5 px-1.5 py-0.5 rounded-md font-bold mt-0.5">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIReports() {
  const [mode, setMode] = useState('ideas'); // Default to the most useful tool: 'ideas'
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [comments, setComments] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load competitors from Supabase with local fallback
  const { data: competitors } = useSupabaseData('competitors', { orderBy: { column: 'subscriber_count', ascending: false } }, localCompetitors);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let data;

      if (mode === 'video') {
        if (!videoTitle.trim()) {
          setError('يرجى كتابة عنوان الفيديو أولاً.');
          setLoading(false);
          return;
        }
        const commentsArray = comments
          .split('\n')
          .map(c => c.trim())
          .filter(Boolean);
        data = await analyzeVideo(videoTitle, videoDesc, commentsArray);
      } else if (mode === 'ideas') {
        const competitorSummary = (competitors || []).map(c => {
          const parsed = parseCompetitor(c);
          return {
            name: parsed.name,
            weaknesses: parsed.weaknesses || ['نقص التطبيقات البرمجية التفاعلية', 'غياب الملخصات والمراجعات المنظمة'],
          };
        });
        data = await generateContentIdeas(competitorSummary);
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'حصل خطأ غير متوقع أثناء معالجة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 'ideas', label: 'أفكار محتوى ومناهج مضادة', icon: '💡', desc: 'توليد خطة فيديوهات جديدة تملأ فجوات المدرسين وتتغلب على نقاط ضعفهم' },
    { id: 'video', label: 'تحليل فيديو مخصص', icon: '🎬', desc: 'تحليل فيديو تعليمي معين للتعرف على نقاط فهم الطلاب وما لم يعجبهم في الشرح' },
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in text-on-surface">
      {/* Header */}
      <div>
        <h2 className="font-headline text-2xl font-extrabold text-on-background tracking-tight">
          تقارير المنهج والذكاء الاصطناعي 🧠
        </h2>
        <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed mt-1">
          استخدم الذكاء الاصطناعي لدمج بيانات المنافسين وتوليد محتوى تعليمي كاسح. اختر الاستراتيجية المناسبة لك للبدء فوراً.
        </p>
      </div>

      {/* API Status */}
      {!isGeminiConfigured && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-on-surface">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">
              مفتاح Gemini API غير متصل
            </p>
            <p className="text-[10px] text-amber-600/80 mt-0.5 leading-relaxed">
              يرجى إضافة <code className="bg-white/40 px-1 py-0.5 rounded font-mono text-[9px]">VITE_GEMINI_API_KEY</code> في ملف البيئة <code className="bg-white/40 px-1 py-0.5 rounded font-mono text-[9px]">.env</code> للحصول على كامل مزايا التحليل.
            </p>
          </div>
        </div>
      )}

      {/* Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); setError(''); }}
            className={`p-5 rounded-2xl border text-right transition-all flex items-start gap-4 hover:scale-[1.01] cursor-pointer ${
              mode === m.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low/50'
            }`}
          >
            <div className={`p-2 rounded-xl text-lg ${mode === m.id ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-on-surface">{m.label}</h4>
              <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Input Form Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
        {mode === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5">
                عنوان الفيديو التعليمي *
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="مثال: شرح لغة بايثون أولى ثانوي 2026"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5">
                وصف الفيديو (اختياري)
              </label>
              <textarea
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
                placeholder="تفاصيل الدرس التي كتبها المدرس في الوصف..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5">
                التعليقات اليدوية للطلاب (اختياري - كل تعليق في سطر مستقل)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={"أنا مش فاهم الجزء ده يا مستر\nياريت تحل كود بايثون كامل"}
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        )}

        {mode === 'ideas' && (
          <div className="text-center py-6 space-y-2">
            <Sparkles size={32} className="text-primary mx-auto animate-pulse" />
            <h4 className="text-xs font-bold">توليد استراتيجية الفيديوهات والمناهج الكاسحة</h4>
            <p className="text-[10px] text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              سيقوم خبير الذكاء الاصطناعي بفحص جميع جوانب الضعف، والفجوات المنهجية التي تم رصدها لدى كافة المدرسين المنافسين، ويقترح لك قائمة بأفضل 5 مواضيع فيديوهات شرح لتصويرها مع الأولويات والمحاور المفقودة.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !isGeminiConfigured}
          className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/95 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> جاري التحليل وصياغة التقرير...</>
          ) : (
            <><Send size={14} /> {mode === 'ideas' ? 'توليد أفكار المحتوى الآن' : 'بدء التحليل الفوري للفيديو'}</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold animate-scale-in">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-5 animate-fade-in border-t border-outline-variant/20 pt-6">
          <h3 className="font-headline text-sm font-bold text-on-surface flex items-center gap-2">
            ✨ مسودة تقرير التحليل النهائي:
          </h3>

          {/* Summary */}
          {result.summary && (
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-on-surface font-medium leading-relaxed">
                {result.summary}
              </p>
              {result.engagement_score && (
                <div className="flex items-center gap-2 mt-3 text-xs font-bold text-primary">
                  <Star size={14} className="fill-primary" />
                  <span>معدل التفاعل المقدر: {result.engagement_score}/10</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Video Analysis results */}
          {result.pain_points && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResultSection title="نقاط الألم (صعوبات فهم الطلاب)" icon={Target} items={result.pain_points} color="red" />
              <ResultSection title="المفاهيم المنهجية المفقودة بالشرح" icon={BookOpen} items={result.missing_concepts} color="accent" />
              <ResultSection title="طلبات وتساؤلات الطلاب المحددة" icon={MessageSquare} items={result.student_requests} color="primary" />
              <ResultSection title="توصيات AI لتقديم شرح أفضل" icon={Lightbulb} items={result.recommendations} color="emerald" />
            </div>
          )}

          {/* Content Ideas strategy */}
          {result.content_ideas && (
            <div className="space-y-4">
              {result.content_strategy && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs leading-relaxed font-semibold">
                  💡 استراتيجية المنافسة المقترحة: {result.content_strategy}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4">
                {result.content_ideas.map((idea, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/45 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md mb-1 inline-block">فكرة {i + 1}</span>
                        <h4 className="text-xs font-bold text-on-surface">🎬 {idea.title}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        idea.priority === 'عالية'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        أولوية {idea.priority}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {idea.description}
                    </p>

                    <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant">
                        🎓 {idea.target_grade}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant">
                        🔑 {idea.topic}
                      </span>
                    </div>

                    {idea.why && (
                      <p className="text-[10px] text-on-surface-variant/80 border-t border-outline-variant/10 pt-2 flex items-center gap-1">
                        <span>💬 لماذا هذا الفيديو؟</span>
                        <span className="font-medium italic">"{idea.why}"</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
