import { copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function AIShortScriptModal({ activeScript, onClose }) {
  const { showToast } = useToast();

  if (!activeScript) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fade-in">
      <div className="bg-surface-container-lowest dark:bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/30 text-on-surface">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-secondary/5">
          <div>
            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-lg mb-1 inline-block">سيناريو فيديو قصير للـ Shorts/Reels</span>
            <h3 className="font-headline text-base font-bold">{activeScript.video_title || 'سيناريو الشرح المقترح'}</h3>
          </div>
          <button 
            onClick={onClose}
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
                  <div className="col-span-1 border-l border-outline-variant/20 pl-2 text-right" dir="rtl">
                    <span className="font-bold text-primary block mb-1">📹 المشهد المرئي</span>
                    <span className="text-[10px] text-on-surface-variant">{step.visual}</span>
                  </div>
                  <div className="col-span-2 text-right" dir="rtl">
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
            onClick={async () => {
              const fullText = `عنوان الفيديو: ${activeScript.video_title}\n\nالخطاف (Hook):\n${activeScript.hook}\n\nالسيناريو:\n${activeScript.body.map((s, i) => `خطوة ${i+1}:\nالمرئي: ${s.visual}\nالصوت: ${s.audio}`).join('\n\n')}\n\nنهاية الفيديو: ${activeScript.call_to_action}`;
              const ok = await copyToClipboard(fullText);
              if (ok) {
                showToast('تم نسخ سيناريو الفيديو بالكامل للمذكرة!', 'success');
              } else {
                showToast('فشل نسخ النص تلقائياً، يرجى نسخه يدوياً.', 'error');
              }
            }}
            className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold rounded-xl hover:bg-secondary/20 transition-all cursor-pointer"
          >
            نسخ النص كاملاً
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary/95 transition-all shadow cursor-pointer"
          >
            إغلاق السيناريو
          </button>
        </div>
      </div>
    </div>
  );
}
