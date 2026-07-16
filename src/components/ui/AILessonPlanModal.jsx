import { useState } from 'react';
import { copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function AILessonPlanModal({ activeLessonPlan, onClose }) {
  const { showToast } = useToast();
  const [activeTabPlan, setActiveTabPlan] = useState('outline');

  if (!activeLessonPlan) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
      <div className="bg-surface-container-lowest dark:bg-surface-container-lowest rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 text-on-surface">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-primary/5">
          <div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg mb-1 inline-block">خطة الدرس المضادة بالـ AI</span>
            <h3 className="font-headline text-base font-bold">{activeLessonPlan.lesson_title || 'خطة الدرس المقترحة'}</h3>
          </div>
          <button 
            onClick={onClose}
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
                    onClick={async () => {
                      const ok = await copyToClipboard(activeLessonPlan.python_exercise.code);
                      if (ok) {
                        showToast('تم نسخ كود بايثون إلى الحافظة!', 'success');
                      } else {
                        showToast('فشل نسخ النص تلقائياً، يرجى نسخه يدوياً.', 'error');
                      }
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
            onClick={async () => {
              const ok = await copyToClipboard(JSON.stringify(activeLessonPlan, null, 2));
              if (ok) {
                showToast('تم نسخ خطة الدرس بالكامل بصيغة JSON!', 'success');
              } else {
                showToast('فشل نسخ النص تلقائياً، يرجى نسخه يدوياً.', 'error');
              }
            }}
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
          >
            نسخ الخطة كاملة (JSON)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}
