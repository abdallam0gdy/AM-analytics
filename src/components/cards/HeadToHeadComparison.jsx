import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';
import { curriculumTopics } from '../../data/mockData';

const formatBigNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
  return num.toLocaleString('ar-EG');
};

export default function HeadToHeadComparison({ competitors, videos }) {
  const [showH2H, setShowH2H] = useState(false);
  const [compAId, setCompAId] = useState('');
  const [compBId, setCompBId] = useState('');

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
  );
}
