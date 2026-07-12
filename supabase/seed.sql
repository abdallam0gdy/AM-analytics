-- =====================================================
-- AM Analytics - Seed Data (Real Competitors)
-- Run AFTER schema.sql in the Supabase SQL Editor
-- =====================================================

-- Insert real competitors
INSERT INTO competitors (id, name, channel_url, subscriber_count, video_count, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Eng Muhammad Yahia - الباشمهندس محمد يحيى', 'https://www.youtube.com/@EngMuhammadYahia', 5320, 85, 'شرح شامل لمنهج البرمجة والذكاء الاصطناعي للصف الأول الثانوي'),
  ('22222222-2222-2222-2222-222222222222', 'Coding With Ghonaim - البرمجة مع غنيم', 'https://www.youtube.com/@CodingWithGhonaim', 12800, 150, 'متخصصة في شرح ICT والبرمجة والذكاء الاصطناعي. HTML, JavaScript, Python'),
  ('33333333-3333-3333-3333-333333333333', 'Mr. Sief Tamer - مستر سيف تامر', 'https://www.youtube.com/@MrSiefTamer', 8900, 120, 'شرح برمجة وذكاء اصطناعي لطلاب عربي ولغات مع منصة تعليمية خاصة'),
  ('44444444-4444-4444-4444-444444444444', 'esmail mohamed - إسماعيل محمد', 'https://www.youtube.com/@esmail_mohamed', 6200, 95, 'قوائم تشغيل مخصصة مع حل تقييمات وشرح أسباب الإجابات'),
  ('55555555-5555-5555-5555-555555555555', 'نفهم - Nafham', 'https://www.youtube.com/@Nafham', 1200000, 5000, 'منصة تعليمية عامة تغطي جميع المواد - محتوى الحاسب عام');

-- Insert sample videos
INSERT INTO videos (id, competitor_id, title, url, views, likes, comments_count, published_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'الوحدة الأولى - المعلومات والوسائط | برمجة أولى ثانوي 2026', 'https://youtube.com/watch?v=ex1', 15200, 420, 45, '2025-09-15T10:00:00Z'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'مقدمة في JavaScript للمبتدئين | أولى ثانوي', 'https://youtube.com/watch?v=ex2', 22100, 680, 78, '2025-10-05T10:00:00Z'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Computer Software - برمجيات الحاسب | ICT أولى ثانوي', 'https://youtube.com/watch?v=ex3', 31500, 890, 95, '2025-09-10T14:00:00Z'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'HTML من الصفر - الدرس العملي الأول | تانية ثانوي', 'https://youtube.com/watch?v=ex4', 42300, 1200, 134, '2025-10-15T14:00:00Z'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'المراجعة النهائية - منهج البرمجة والذكاء الاصطناعي ترم أول', 'https://youtube.com/watch?v=ex5', 38900, 1100, 156, '2025-12-20T12:00:00Z'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'شرح الدرس الأول - المعلومات ووسائل الإعلام | أولى ثانوي 2026', 'https://youtube.com/watch?v=ex6', 12400, 380, 42, '2025-09-18T08:00:00Z'),
  ('00000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'أساسيات البرمجة - مقدمة عامة | حاسب آلي', 'https://youtube.com/watch?v=ex7', 185000, 4500, 320, '2024-08-15T10:00:00Z');

-- Insert AI insights for key videos
INSERT INTO ai_insights (video_id, pain_points, missing_concepts, student_requests, engagement_score, summary, sentiment) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '["شرح JavaScript سريع بدون تمارين تفاعلية", "عدم ربط المحتوى بمنصة كيريو QUREO", "غياب أمثلة من الحياة اليومية"]'::jsonb,
   '["التطبيق العملي على منصة QUREO", "الفرق بين JavaScript و Python", "مشاريع صغيرة ينفذها الطالب"]'::jsonb,
   '["أمثلة عملية أكثر", "ربط الشرح بالامتحان", "فيديوهات أقصر ومركزة", "ملخصات PDF"]'::jsonb,
   6, 'الشرح جيد لكن ينقصه التطبيق العملي والربط بالمنصة المعتمدة', 'mixed'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '["الفيديو طويل جداً +45 دقيقة", "لا يوجد فهرس زمني", "سرعة الكتابة على الشاشة صعبة المتابعة"]'::jsonb,
   '["CSS Basics مع HTML", "تطبيق على موقع حقيقي", "أدوات التطوير DevTools"]'::jsonb,
   '["تقسيم الفيديو لأجزاء صغيرة", "إضافة timestamps", "ملفات كود جاهزة للتحميل", "مشروع تطبيقي"]'::jsonb,
   7, 'محتوى قوي لكن طريقة العرض تحتاج تحسين من حيث التقسيم والتنظيم', 'positive'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '["المراجعة تغطي المنهج بسرعة كبيرة", "لا يوجد تمارين تفاعلية", "الاعتماد على الحفظ أكثر من الفهم"]'::jsonb,
   '["حل مسائل برمجية حقيقية", "أسئلة تحتاج تفكير وليس حفظ", "تطبيقات AI العملية"]'::jsonb,
   '["نماذج امتحانات محلولة", "شرح أبطأ للمفاهيم الصعبة", "فيديوهات Q&A مباشرة"]'::jsonb,
   8, 'مراجعة شاملة لكن تميل للحفظ. الطلاب يحتاجون فهم أعمق', 'positive');
