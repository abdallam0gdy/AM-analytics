import { useState } from 'react';
import { 
  MessageSquare, Search, Filter, ExternalLink, ThumbsUp, 
  Sparkles, ChevronLeft, Calendar, BrainCircuit, Play, Smile
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabase';
import { generateShortVideoScript } from '../lib/gemini';

// Helper to assign consistent avatar colors based on name string
function getAvatarColor(name) {
  if (!name) return '#4F46E5';
  const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#2563EB', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const localCommentsFallback = [
  {
    id: "comment-1",
    author_name: "عبد الرحمن محمود",
    author_avatar: "",
    content: "يا مستر شرحك ممتاز بس ياريت تحل مسائل أكتر على المصفوفات والـ Arrays في بايثون عشان بتلخبط فيها",
    like_count: 24,
    published_at: "2026-07-12T04:22:00Z",
    sentiment: "negative",
    video: { title: "مقدمة البرمجة والـ Arrays للصف الأول الثانوي" },
    competitor: { name: "مستر أحمد السقا" }
  },
  {
    id: "comment-2",
    author_name: "سارة حسام",
    author_avatar: "",
    content: "أنا مش فاهمة الـ nested loops خالص، ممكن تشرحها في فيديو قصير مستقل وبأكواد سهلة؟",
    like_count: 18,
    published_at: "2026-07-11T19:30:00Z",
    sentiment: "negative",
    video: { title: "شرح الحلقات التكرارية Loops تانية ثانوي" },
    competitor: { name: "المهندس شريف" }
  },
  {
    id: "comment-3",
    author_name: "محمد علاء",
    author_avatar: "",
    content: "جزاك الله خيراً يا مستر، الشرح ممتاز جداً والتطبيقات العملية فرقت معايا كتير في فهم الـ If Conditions",
    like_count: 42,
    published_at: "2026-07-12T01:45:00Z",
    sentiment: "positive",
    video: { title: "مراجعة أدوات الشرط والـ Loops" },
    competitor: { name: "مستر أحمد السقا" }
  },
  {
    id: "comment-4",
    author_name: "ندى أحمد",
    author_avatar: "",
    content: "هل منهج الذكاء الاصطناعي مقرر علينا حفظ الأكواد ولا فهمها بس يا باشمهندس؟",
    like_count: 12,
    published_at: "2026-07-10T14:15:00Z",
    sentiment: "neutral",
    video: { title: "مقدمة الذكاء الاصطناعي لثانوي" },
    competitor: { name: "المهندس شريف" }
  }
];

export default function Comments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all'); // 'all' | 'positive' | 'negative' | 'neutral'
  const [competitorFilter, setCompetitorFilter] = useState('all');
  
  // AI Script Modal States
  const [activeScript, setActiveScript] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Load comments, competitors from Supabase
  const { data: rawComments } = useSupabaseData('comments', {
    select: '*, video:videos(title, url), competitor:competitors(name)',
    orderBy: { column: 'published_at', ascending: false }
  }, localCommentsFallback);

  const { data: competitors } = useSupabaseData('competitors', {}, []);

  // Format comments to match nested structure safely
  const comments = (rawComments || []).map(c => {
    // If supabase didn't populate relationships properly, add fallback properties
    const videoTitle = c.video?.title || 'فيديو غير محدد';
    const videoUrl = c.video?.url || '#';
    const competitorName = c.competitor?.name || 'مدرس غير محدد';
    
    return {
      ...c,
      videoTitle,
      videoUrl,
      competitorName
    };
  });

  // Unique competitor names for filter dropdown
  const competitorNames = [...new Set(comments.map(c => c.competitorName))];

  // Filtering logic
  const filteredComments = comments.filter(c => {
    const textMatches = (c.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.author_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const sentimentMatches = sentimentFilter === 'all' ? true : c.sentiment === sentimentFilter;
    const competitorMatches = competitorFilter === 'all' ? true : c.competitorName === competitorFilter;
    
    return textMatches && sentimentMatches && competitorMatches;
  });

  // Stats
  const totalCommentsCount = comments.length;
  const negativeCommentsCount = comments.filter(c => c.sentiment === 'negative').length;
  const positiveCommentsCount = comments.filter(c => c.sentiment === 'positive').length;
  const positiveRatio = totalCommentsCount > 0 ? Math.round((positiveCommentsCount / totalCommentsCount) * 100) : 100;

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

  return (
    <div className="space-y-6 w-full animate-fade-in text-on-surface">
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-headline text-2xl font-extrabold text-on-background tracking-tight">
            أصوات تعليقات الطلاب 💬
          </h2>
          <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed mt-1">
            ورقة عمل شاملة ترصد وتجمع تعليقات طلاب المدرسين المنافسين من يوتيوب. حلل مشاعر الطلاب البرمجية، واصنع محتوى مضاد فوراً بالـ AI.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-primary/5 text-primary w-fit mb-2">
            <MessageSquare size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">التعليقات المرصودة</span>
          <span className="font-headline text-xl font-extrabold text-on-surface font-mono">
            {totalCommentsCount}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-emerald-500/5 text-emerald-600 w-fit mb-2">
            <Smile size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">التعليقات الإيجابية</span>
          <span className="font-headline text-xl font-extrabold text-emerald-600 font-mono">
            {positiveCommentsCount}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-red-500/5 text-red-600 w-fit mb-2">
            <MessageSquare size={18} />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">التعليقات السلبية (نقاط ضعف)</span>
          <span className="font-headline text-xl font-extrabold text-red-600 font-mono">
            {negativeCommentsCount}
          </span>
        </div>

        <div className="bg-primary-container p-5 rounded-2xl shadow-sm border border-primary text-white flex flex-col gap-1">
          <div className="p-1.5 rounded-lg bg-white/10 text-white w-fit mb-2">
            <Sparkles size={18} />
          </div>
          <span className="text-[10px] font-bold opacity-90">نسبة رضا الطلاب العامة</span>
          <span className="font-headline text-xl font-extrabold font-mono">{positiveRatio}%</span>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={14} />
          <input
            type="text"
            placeholder="البحث في التعليقات أو أسماء الطلاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5">
          {/* Sentiment Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-on-surface-variant/60" />
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none"
            >
              <option value="all">كل المشاعر</option>
              <option value="positive">إيجابي فقط</option>
              <option value="negative">سلبية ونقاط ضعف</option>
              <option value="neutral">استفسارات ومحايد</option>
            </select>
          </div>

          {/* Competitor Filter */}
          <select
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none"
          >
            <option value="all">كل المدرسين</option>
            {competitorNames.map((name, idx) => (
              <option key={idx} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comments Sheet Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/20 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">الطالب</th>
                <th className="p-4">التعليق</th>
                <th className="p-4">المنافس</th>
                <th className="p-4">الفيديو</th>
                <th className="p-4">الإعجابات</th>
                <th className="p-4">تاريخ النشر</th>
                <th className="p-4 text-center">المشاعر</th>
                <th className="p-4 text-center">AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => {
                  const avatarColor = getAvatarColor(comment.author_name);
                  return (
                    <tr key={comment.id} className="hover:bg-surface-container/20 transition-colors">
                      {/* Author */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {comment.author_name ? comment.author_name.charAt(0) : 'S'}
                          </div>
                          <span className="font-bold text-on-surface">{comment.author_name || 'طالب مجهول'}</span>
                        </div>
                      </td>

                      {/* Content */}
                      <td className="p-4 min-w-[250px] max-w-[400px]">
                        <p className="text-on-surface-variant leading-relaxed line-clamp-2 hover:line-clamp-none transition-all duration-200">
                          {comment.content}
                        </p>
                      </td>

                      {/* Competitor */}
                      <td className="p-4 whitespace-nowrap font-semibold">
                        {comment.competitorName}
                      </td>

                      {/* Video */}
                      <td className="p-4 max-w-[200px] truncate">
                        <a 
                          href={comment.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 w-fit"
                        >
                          <Play size={10} className="shrink-0" />
                          <span className="truncate">{comment.videoTitle}</span>
                        </a>
                      </td>

                      {/* Likes */}
                      <td className="p-4 font-mono font-bold text-on-surface-variant">
                        <div className="flex items-center gap-1">
                          <ThumbsUp size={10} className="text-on-surface-variant/40" />
                          <span>{comment.like_count || 0}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 whitespace-nowrap text-on-surface-variant/70 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{new Date(comment.published_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </td>

                      {/* Sentiment */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          comment.sentiment === 'positive' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : comment.sentiment === 'negative'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-primary/5 text-primary'
                        }`}>
                          {comment.sentiment === 'positive' ? 'إيجابي' : comment.sentiment === 'negative' ? 'سلبي' : 'محايد'}
                        </span>
                      </td>

                      {/* AI Script trigger */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleGenerateShortScript(comment.content)}
                          className="p-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl transition-all hover:scale-[1.05] cursor-pointer"
                          title="توليد سيناريو كورس/فيديو قصير رداً على الطالب"
                        >
                          <Sparkles size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-on-surface-variant/50">
                    لا توجد تعليقات مطابقة للبحث أو الفلاتر الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎬 Fullscreen AI Loading Overlay */}
      {isGeneratingScript && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-50 animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-secondary border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-on-background animate-pulse">🎬 جاري استخلاص تعليق الطالب وتوليد سيناريو فيديو قصير (Short Script)...</p>
        </div>
      )}

      {/* 🎬 AI Short Script Modal */}
      {activeScript && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 text-on-surface animate-scale-up">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-right" dir="rtl">
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
