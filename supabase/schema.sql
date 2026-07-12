-- =====================================================
-- AM Analytics - Complete Database Schema v2
-- =====================================================
-- ⚡ انسخ الكود ده كله ونفذه مرة واحدة في Supabase SQL Editor
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Competitors Table (القنوات المنافسة)
-- =====================================================
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;

CREATE TABLE competitors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  channel_id       TEXT UNIQUE,           -- YouTube channel ID (e.g. UC...)
  channel_url      TEXT NOT NULL,
  avatar_url       TEXT,
  subscriber_count BIGINT DEFAULT 0,
  video_count      INTEGER DEFAULT 0,
  description      TEXT,
  is_verified      BOOLEAN DEFAULT false, -- هل تم التحقق بالـ AI أنه منافس حقيقي
  discovery_method TEXT DEFAULT 'manual', -- 'manual' | 'auto_radar'
  last_active_date TIMESTAMPTZ,           -- تاريخ آخر فيديو تم رصده
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitors_channel_id ON competitors (channel_id);
CREATE INDEX idx_competitors_status ON competitors (status);
CREATE INDEX idx_competitors_last_active ON competitors (last_active_date DESC);

-- =====================================================
-- 2. Videos Table (الفيديوهات)
-- =====================================================
CREATE TABLE videos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id   UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  youtube_id      TEXT UNIQUE,             -- YouTube video ID
  title           TEXT NOT NULL,
  url             TEXT NOT NULL,
  description     TEXT,
  views           BIGINT DEFAULT 0,
  likes           BIGINT DEFAULT 0,
  comments_count  BIGINT DEFAULT 0,
  duration        TEXT,
  thumbnail_url   TEXT,
  is_relevant     BOOLEAN DEFAULT true,    -- هل الفيديو متعلق بالمنهج فعلاً (فلتر AI)
  relevance_score REAL DEFAULT 0,          -- درجة الصلة (0-1) من Gemini
  published_at    TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ DEFAULT now(), -- آخر مرة تم جمع بياناته
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_competitor ON videos (competitor_id);
CREATE INDEX idx_videos_youtube_id ON videos (youtube_id);
CREATE INDEX idx_videos_published ON videos (published_at DESC);
CREATE INDEX idx_videos_relevant ON videos (is_relevant) WHERE is_relevant = true;

-- =====================================================
-- 3. AI Insights Table (تحليلات الذكاء الاصطناعي)
-- =====================================================
CREATE TABLE ai_insights (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id          UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  pain_points       JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_concepts  JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_requests  JSONB NOT NULL DEFAULT '[]'::jsonb,
  engagement_score  INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 10),
  summary           TEXT,
  sentiment         TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  recommendations   JSONB DEFAULT '[]'::jsonb,
  analyzed_comments INTEGER DEFAULT 0,     -- عدد التعليقات اللي تم تحليلها
  raw_comments      JSONB DEFAULT '[]'::jsonb, -- التعليقات الخام
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_video ON ai_insights (video_id);
CREATE INDEX idx_insights_score ON ai_insights (engagement_score DESC);
CREATE INDEX idx_insights_pain ON ai_insights USING GIN (pain_points);
CREATE INDEX idx_insights_requests ON ai_insights USING GIN (student_requests);

-- =====================================================
-- 4. Pipeline Runs Log (سجل تشغيل الـ Pipeline)
-- =====================================================
CREATE TABLE pipeline_runs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at        TIMESTAMPTZ,
  status             TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  videos_discovered  INTEGER DEFAULT 0,
  videos_relevant    INTEGER DEFAULT 0,
  new_competitors    INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  error_log          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. Auto-update trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_competitors_updated
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_videos_updated
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_insights_updated
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Auto-deactivate inactive competitors
-- (يتم تشغيلها يدوياً أو بـ cron)
-- =====================================================
CREATE OR REPLACE FUNCTION deactivate_inactive_competitors()
RETURNS void AS $$
BEGIN
  UPDATE competitors
  SET status = 'inactive'
  WHERE last_active_date < NOW() - INTERVAL '90 days'
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Helpful Views
-- =====================================================

-- عرض المنافسين النشطين فقط
CREATE OR REPLACE VIEW active_competitors AS
SELECT * FROM competitors
WHERE status = 'active'
  AND (last_active_date IS NULL OR last_active_date > NOW() - INTERVAL '90 days')
ORDER BY subscriber_count DESC;

-- إحصائيات سريعة للداشبورد
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM competitors WHERE status = 'active') AS total_competitors,
  (SELECT COUNT(*) FROM videos WHERE is_relevant = true) AS total_videos,
  (SELECT COALESCE(SUM(comments_count), 0) FROM videos WHERE is_relevant = true) AS total_comments,
  (SELECT ROUND(AVG(engagement_score)::numeric, 1) FROM ai_insights) AS avg_engagement,
  (SELECT COUNT(*) FROM pipeline_runs WHERE status = 'completed') AS total_runs;

-- أكثر نقاط الألم تكراراً
CREATE OR REPLACE VIEW top_pain_points AS
SELECT
  pain_point,
  COUNT(*) AS frequency
FROM ai_insights,
  jsonb_array_elements_text(pain_points) AS pain_point
GROUP BY pain_point
ORDER BY frequency DESC
LIMIT 20;

-- أكثر طلبات الطلاب تكراراً
CREATE OR REPLACE VIEW top_student_requests AS
SELECT
  request,
  COUNT(*) AS frequency
FROM ai_insights,
  jsonb_array_elements_text(student_requests) AS request
GROUP BY request
ORDER BY frequency DESC
LIMIT 20;

-- =====================================================
-- 8. Comments Table (تعليقات الطلاب التفصيلية)
-- =====================================================
CREATE TABLE comments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id            UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  competitor_id       UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  youtube_comment_id  TEXT UNIQUE,             -- YouTube comment ID to avoid duplicates
  author_name         TEXT,                    -- اسم الطالب
  author_avatar       TEXT,                    -- صورة الطالب
  content             TEXT NOT NULL,           -- نص التعليق
  like_count          INTEGER DEFAULT 0,       -- إعجابات التعليق
  published_at        TIMESTAMPTZ,             -- تاريخ نشر التعليق
  sentiment           TEXT DEFAULT 'neutral',  -- مشاعر التعليق (positive/negative/neutral)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_video ON comments (video_id);
CREATE INDEX idx_comments_competitor ON comments (competitor_id);
CREATE INDEX idx_comments_published ON comments (published_at DESC);
CREATE INDEX idx_comments_youtube_id ON comments (youtube_comment_id);

-- =====================================================
-- 9. Row Level Security (RLS)
-- =====================================================
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- سياسة: السماح بكل العمليات للمستخدمين المصادق عليهم
-- (عدّل حسب احتياجاتك الأمنية)
DO $$
DECLARE
  t TEXT;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['competitors', 'videos', 'ai_insights', 'pipeline_runs', 'comments'])
  LOOP
    EXECUTE format('CREATE POLICY "anon_read_%1$s" ON %1$s FOR SELECT TO anon USING (true)', t);
    EXECUTE format('CREATE POLICY "anon_insert_%1$s" ON %1$s FOR INSERT TO anon WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "anon_update_%1$s" ON %1$s FOR UPDATE TO anon USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "anon_delete_%1$s" ON %1$s FOR DELETE TO anon USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_read_%1$s" ON %1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON %1$s FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_update_%1$s" ON %1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_delete_%1$s" ON %1$s FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;

-- =====================================================
-- ✅ تم! الآن نفذ seed.sql لإدخال بيانات أولية
-- =====================================================
