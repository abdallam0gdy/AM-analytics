import { useState } from 'react';
import {
  BrainCircuit, Send, Loader2, AlertCircle, Lightbulb,
  Target, MessageSquare, Star, Sparkles, BookOpen,
} from 'lucide-react';
import { analyzeVideo, analyzeChannel, generateContentIdeas, isGeminiConfigured } from '../lib/gemini';
import { realCompetitors as localCompetitors } from '../data/mockData';
import { supabase } from '../lib/supabase';
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
    <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon size={15} />
        </div>
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[13px] text-text-secondary-light dark:text-text-secondary-dark">
            <span className="text-text-secondary-light/30 dark:text-text-secondary-dark/30 mt-0.5 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIReports() {
  const [mode, setMode] = useState('video'); // 'video' | 'channel' | 'ideas'
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [comments, setComments] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load competitors from Supabase with local fallback
  const { data: competitors } = useSupabaseData('competitors', { orderBy: { column: 'subscriber_count', ascending: false } }, localCompetitors);

  // Helper to save analysis results (strengths & weaknesses) to Supabase
  const updateCompetitorInsights = async (competitorId, currentDescription, strengths, weaknesses) => {
    try {
      const { error: directError } = await supabase
        .from('competitors')
        .update({ strengths, weaknesses })
        .eq('id', competitorId);
      
      if (directError && directError.message && (directError.message.includes('column') || directError.message.includes('does not exist'))) {
        // Fallback: description JSON workaround
        let bioText = currentDescription || '';
        if (bioText.trim().startsWith('{') && bioText.trim().endsWith('}')) {
          try {
            const parsed = JSON.parse(bioText);
            bioText = parsed.bio || '';
          } catch (e) {}
        }
        const encoded = JSON.stringify({
          bio: bioText,
          strengths: strengths || [],
          weaknesses: weaknesses || []
        });
        await supabase
          .from('competitors')
          .update({ description: encoded })
          .eq('id', competitorId);
      }
    } catch (err) {
      console.error('Failed to update competitor insights:', err);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let data;

      if (mode === 'video') {
        if (!videoTitle.trim()) {
          setError('اكتب عنوان الفيديو');
          setLoading(false);
          return;
        }
        const commentsArray = comments
          .split('\n')
          .map(c => c.trim())
          .filter(Boolean);
        data = await analyzeVideo(videoTitle, videoDesc, commentsArray);
      } else if (mode === 'channel') {
        const comp = (competitors || []).find(c => c.id === selectedChannel);
        if (!comp) {
          setError('اختر قناة منافسة');
          setLoading(false);
          return;
        }
        
        // Fetch top 15 video titles from Supabase for this channel
        const { data: compVideos } = await supabase
          .from('videos')
          .select('title')
          .eq('competitor_id', comp.id)
          .order('views', { ascending: false })
          .limit(15);
          
        const videoTitles = (compVideos || []).map(v => v.title);
        data = await analyzeChannel(comp.name, videoTitles);
        
        // Save the analysis results (strengths & weaknesses) back to Supabase
        await updateCompetitorInsights(comp.id, comp.description, data.strengths, data.weaknesses);
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
      setError(err.message || 'حصل خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 'video', label: 'تحليل فيديو', icon: '🎬' },
    { id: 'channel', label: 'تحليل قناة', icon: '📺' },
    { id: 'ideas', label: 'أفكار محتوى', icon: '💡' },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <BrainCircuit size={24} className="text-primary" />
          تقارير الذكاء الاصطناعي
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
          حلل المنافسين واستخرج فرص التحسين باستخدام Gemini AI
        </p>
      </div>

      {/* API Status */}
      {!isGeminiConfigured && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 animate-slide-up">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Gemini API غير متصل
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5">
              أضف <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-[11px]">VITE_GEMINI_API_KEY</code> في ملف <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-[11px]">.env</code> ثم أعد تشغيل السيرفر
            </p>
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              mode === m.id
                ? 'bg-gradient-to-l from-primary to-primary-container text-white shadow-lg shadow-primary/20'
                : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-50 dark:hover:bg-surface-dark-hover'
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div
        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-5 card-shadow animate-slide-up"
        style={{ animationDelay: '150ms' }}
      >
        {mode === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-1.5">
                عنوان الفيديو *
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="مثال: شرح JavaScript للمبتدئين - أولى ثانوي 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/30 dark:placeholder:text-text-secondary-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-1.5">
                وصف الفيديو (اختياري)
              </label>
              <textarea
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
                placeholder="ضع وصف الفيديو هنا..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/30 dark:placeholder:text-text-secondary-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-1.5">
                تعليقات الطلاب (اختياري - كل تعليق في سطر)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={"الشرح سريع محتاج أمثلة أكتر\nياريت تعملوا ملخص PDF\nالفيديو طويل أوي"}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/30 dark:placeholder:text-text-secondary-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"
              />
            </div>
          </div>
        )}

        {mode === 'channel' && (
          <div>
            <label className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-1.5">
              اختر قناة منافسة للتحليل
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-light dark:bg-surface-dark-2 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            >
              <option value="">-- اختر قناة --</option>
              {(competitors || []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name.includes(' - ') ? c.name.split(' - ')[1] : c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'ideas' && (
          <div className="text-center py-4">
            <Sparkles size={32} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
              توليد أفكار محتوى بناءً على تحليل جميع المنافسين
            </p>
            <p className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60 mt-1">
              الذكاء الاصطناعي هيحلل نقاط ضعف المنافسين ويقترح فيديوهات تملأ الفجوات
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !isGeminiConfigured}
          className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-primary to-primary-container shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> جاري التحليل...</>
          ) : (
            <><Send size={16} /> {mode === 'ideas' ? 'ولّد أفكار' : 'حلّل بالذكاء الاصطناعي'}</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400 font-semibold animate-scale-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            ✨ نتائج التحليل
          </h3>

          {/* Summary */}
          {result.summary && (
            <div className="p-4 rounded-xl bg-gradient-to-l from-primary/5 to-primary-container/5 dark:from-primary/10 dark:to-primary-container/10 border border-primary/10">
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
                {result.summary}
              </p>
              {result.engagement_score && (
                <div className="flex items-center gap-2 mt-2">
                  <Star size={16} className="text-accent-container" />
                  <span className="text-sm font-bold text-accent-container">
                    درجة التفاعل: {result.engagement_score}/10
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Video Analysis Results */}
          {result.pain_points && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ResultSection title="نقاط الضعف" icon={Target} items={result.pain_points} color="red" />
              <ResultSection title="مفاهيم مفقودة" icon={BookOpen} items={result.missing_concepts} color="accent" />
              <ResultSection title="طلبات الطلاب" icon={MessageSquare} items={result.student_requests} color="primary" />
              <ResultSection title="توصيات التحسين" icon={Lightbulb} items={result.recommendations} color="emerald" />
            </div>
          )}

          {/* Channel Analysis Results */}
          {result.strengths && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ResultSection title="نقاط القوة" icon={Lightbulb} items={result.strengths} color="emerald" />
              <ResultSection title="نقاط الضعف" icon={Target} items={result.weaknesses} color="red" />
              <ResultSection title="فجوات المحتوى" icon={BookOpen} items={result.content_gaps} color="accent" />
              <ResultSection title="فرص لك" icon={Sparkles} items={result.opportunities} color="purple" />
            </div>
          )}

          {/* Content Ideas Results */}
          {result.content_ideas && (
            <div className="space-y-2.5">
              {result.content_strategy && (
                <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                  <p className="text-sm font-semibold text-primary dark:text-primary-light">💡 الاستراتيجية: {result.content_strategy}</p>
                </div>
              )}
              {result.content_ideas.map((idea, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark card-hover"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-text-primary-light dark:text-text-primary-dark">
                        🎬 {idea.title}
                      </p>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                        {idea.description}
                      </p>
                    </div>
                    <span className={`shrink-0 ms-3 px-2 py-1 rounded-lg text-[11px] font-bold ${
                      idea.priority === 'عالية'
                        ? 'bg-red-500/10 text-red-500'
                        : idea.priority === 'متوسطة'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {idea.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light">
                      {idea.target_grade}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-accent-container/5 dark:bg-accent-container/10 text-accent-container">
                      {idea.topic}
                    </span>
                  </div>
                  {idea.why && (
                    <p className="text-[11px] text-text-secondary-light/60 dark:text-text-secondary-dark/60 mt-2">
                      💬 {idea.why}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
