/**
 * =====================================================
 * AM Analytics - Dynamic Data Pipeline
 * =====================================================
 * نظام حي يكتشف المنافسين تلقائياً ويحلل محتواهم
 *
 * المراحل:
 * 1. الرادار    - اكتشاف فيديوهات/قنوات جديدة من YouTube
 * 2. حارس البوابة - فلتر AI للتأكد من الصلة بالمنهج
 * 3. التحليل العميق - جلب التعليقات وتحليلها بـ Gemini
 * 4. التنظيف الذاتي - إلغاء تنشيط القنوات المتوقفة
 *
 * التشغيل:
 *   node pipeline.mjs                  # تشغيل كل المراحل
 *   node pipeline.mjs --stage=radar    # مرحلة الاكتشاف فقط
 *   node pipeline.mjs --stage=analyze  # مرحلة التحليل فقط
 *   node pipeline.mjs --stage=cleanup  # مرحلة التنظيف فقط
 * =====================================================
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// Configuration
// =====================================================
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,

  // Search terms for the radar
  SEARCH_QUERIES: [
    'شرح برمجة أولى ثانوي 2026',
    'برمجة وذكاء اصطناعي أولى ثانوي',
    'حاسب آلي أولى ثانوي ترم',
    'ICT أولى ثانوي مصر',
    'شرح JavaScript أولى ثانوي',
    'شرح Python أولى ثانوي',
    'منهج البرمجة الصف الأول الثانوي',
    'مراجعة برمجة أولى ثانوي',
    'برمجة تانية ثانوي 2026',
    'QUREO أولى ثانوي',
  ],

  // How many days back to search
  SEARCH_DAYS_BACK: 30,

  // Max results per search query
  MAX_RESULTS_PER_QUERY: 15,

  // Max comments to fetch per video
  MAX_COMMENTS_PER_VIDEO: 50,

  // Inactive threshold in days
  INACTIVE_THRESHOLD_DAYS: 90,
};

// =====================================================
// Utilities
// =====================================================
function log(stage, msg, data) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const stageEmoji = {
    radar: '📡', gate: '🛡️', analyze: '🔬', cleanup: '🧹', pipeline: '⚙️', error: '❌', success: '✅',
  };
  const emoji = stageEmoji[stage] || '📌';
  console.log(`${emoji} [${timestamp}] [${stage.toUpperCase()}] ${msg}`);
  if (data) console.log('   ', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

function validateConfig() {
  const missing = [];
  if (!CONFIG.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!CONFIG.SUPABASE_KEY) missing.push('SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY');
  if (!CONFIG.YOUTUBE_API_KEY) missing.push('YOUTUBE_API_KEY');
  if (!CONFIG.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');

  if (missing.length > 0) {
    log('error', `متغيرات البيئة التالية مفقودة: ${missing.join(', ')}`);
    log('error', 'أضفها في .env أو كـ environment variables');
    process.exit(1);
  }
}

// Initialize Supabase
function getSupabase() {
  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
}

// =====================================================
// YouTube API Helpers
// =====================================================
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

async function ytFetch(endpoint, params) {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  url.searchParams.set('key', CONFIG.YOUTUBE_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API Error (${res.status}): ${err.error?.message || 'Unknown'}`);
  }
  return res.json();
}

async function searchYouTube(query, publishedAfter) {
  return ytFetch('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    regionCode: 'EG',
    relevanceLanguage: 'ar',
    publishedAfter: publishedAfter,
    maxResults: String(CONFIG.MAX_RESULTS_PER_QUERY),
    order: 'relevance',
  });
}

async function getVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];
  return ytFetch('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
  });
}

async function getChannelDetails(channelIds) {
  if (channelIds.length === 0) return [];
  return ytFetch('channels', {
    part: 'snippet,statistics',
    id: [...new Set(channelIds)].join(','),
  });
}

async function getVideoComments(videoId) {
  try {
    const data = await ytFetch('commentThreads', {
      part: 'snippet',
      videoId: videoId,
      maxResults: String(CONFIG.MAX_COMMENTS_PER_VIDEO),
      order: 'relevance',
      textFormat: 'plainText',
    });
    return (data.items || []).map(item =>
      item.snippet.topLevelComment.snippet.textDisplay
    );
  } catch (err) {
    log('error', `فشل جلب تعليقات الفيديو ${videoId}: ${err.message}`);
    return [];
  }
}

// =====================================================
// Gemini AI Helpers
// =====================================================
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini Error: ${err.error?.message || res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('رد فارغ من Gemini');

  return JSON.parse(text);
}

async function filterVideoRelevance(title, description, channelName) {
  const prompt = `أنت مصنف ذكي. حدد هل الفيديو التالي موجه تحديداً لطلاب المرحلة الثانوية في مصر (الصف الأول أو الثاني الثانوي) في مادة البرمجة أو الحاسب الآلي أو الذكاء الاصطناعي أو ICT.

عنوان الفيديو: ${title}
وصف الفيديو: ${(description || '').substring(0, 500)}
اسم القناة: ${channelName}

أجب بصيغة JSON:
{
  "is_relevant": true أو false,
  "confidence": رقم من 0 إلى 1,
  "reason": "سبب قصير"
}

قواعد:
- "true" فقط إذا كان الفيديو موجه تحديداً لطلاب ثانوي في مصر (ليس كورس عام)
- ابحث عن كلمات مثل: أولى ثانوي، تانية ثانوي، ثانوية عامة، بكالوريا، المنهج المصري
- فيديوهات حل التقييمات والمراجعات = relevant
- كورسات عامة مثل "تعلم Python من الصفر" بدون ذكر ثانوي = NOT relevant`;

  return callGemini(prompt);
}

async function analyzeCommentsWithAI(videoTitle, comments) {
  if (comments.length === 0) {
    return {
      pain_points: [],
      missing_concepts: [],
      student_requests: [],
      engagement_score: 5,
      summary: 'لا توجد تعليقات كافية للتحليل',
      sentiment: 'neutral',
      recommendations: [],
    };
  }

  const commentsText = comments.slice(0, 30).map((c, i) => `${i + 1}. ${c}`).join('\n');

  const prompt = `أنت محلل تعليمي خبير في مادة البرمجة والذكاء الاصطناعي للثانوية المصرية.

الفيديو: ${videoTitle}

تعليقات الطلاب:
${commentsText}

حلل التعليقات واستخرج:

أجب بصيغة JSON:
{
  "pain_points": ["نقاط ألم محددة من التعليقات - ماذا لم يفهم الطلاب"],
  "missing_concepts": ["مفاهيم ناقصة في الشرح"],
  "student_requests": ["ماذا يطلب الطلاب تحديداً"],
  "engagement_score": (1-10 بناءً على تفاعل التعليقات),
  "summary": "ملخص مختصر للتحليل",
  "sentiment": "positive" أو "negative" أو "neutral" أو "mixed",
  "recommendations": ["توصيات لتقديم محتوى أفضل"]
}`;

  return callGemini(prompt);
}

// =====================================================
// STAGE 1: RADAR - اكتشاف المنافسين الجدد
// =====================================================
async function stageRadar(supabase, runId) {
  log('radar', '🚀 بدء مسح السوق...');

  const publishedAfter = new Date();
  publishedAfter.setDate(publishedAfter.getDate() - CONFIG.SEARCH_DAYS_BACK);
  const afterISO = publishedAfter.toISOString();

  const allVideoIds = new Set();
  const videoSnippets = new Map();

  // Search across all queries
  for (const query of CONFIG.SEARCH_QUERIES) {
    log('radar', `🔍 بحث: "${query}"`);
    try {
      const results = await searchYouTube(query, afterISO);
      const items = results.items || [];
      log('radar', `   وُجد ${items.length} نتيجة`);

      for (const item of items) {
        const videoId = item.id.videoId;
        if (!allVideoIds.has(videoId)) {
          allVideoIds.add(videoId);
          videoSnippets.set(videoId, {
            title: item.snippet.title,
            description: item.snippet.description,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          });
        }
      }

      // Rate limiting - YouTube API has quotas
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      log('error', `فشل البحث عن "${query}": ${err.message}`);
    }
  }

  log('radar', `📊 إجمالي الفيديوهات المكتشفة: ${allVideoIds.size}`);

  // Get full video details (views, likes, etc.)
  const videoIdArray = [...allVideoIds];
  const detailedVideos = new Map();

  for (let i = 0; i < videoIdArray.length; i += 50) {
    const batch = videoIdArray.slice(i, i + 50);
    try {
      const details = await getVideoDetails(batch);
      for (const item of details.items || []) {
        detailedVideos.set(item.id, {
          views: parseInt(item.statistics.viewCount || '0'),
          likes: parseInt(item.statistics.likeCount || '0'),
          comments: parseInt(item.statistics.commentCount || '0'),
          duration: item.contentDetails?.duration,
        });
      }
    } catch (err) {
      log('error', `فشل جلب تفاصيل الفيديوهات: ${err.message}`);
    }
  }

  return { videoSnippets, detailedVideos, allVideoIds };
}

// =====================================================
// STAGE 2: GATEKEEPER - فلتر الذكاء الاصطناعي
// =====================================================
async function stageGatekeeper(supabase, radarData, runId) {
  log('gate', '🛡️ بدء فلتر الذكاء الاصطناعي...');

  const { videoSnippets, detailedVideos } = radarData;
  let relevantCount = 0;
  let newCompetitorCount = 0;

  // Check which videos already exist in DB
  const existingVideoIds = new Set();
  const { data: existingVideos } = await supabase
    .from('videos')
    .select('youtube_id')
    .in('youtube_id', [...videoSnippets.keys()]);

  if (existingVideos) {
    existingVideos.forEach(v => existingVideoIds.add(v.youtube_id));
  }

  const newVideoIds = [...videoSnippets.keys()].filter(id => !existingVideoIds.has(id));
  log('gate', `🆕 فيديوهات جديدة للفحص: ${newVideoIds.length} (${existingVideoIds.size} موجودة مسبقاً)`);

  // Get existing competitors
  const existingChannels = new Map();
  const { data: channels } = await supabase.from('competitors').select('id, channel_id');
  if (channels) {
    channels.forEach(c => existingChannels.set(c.channel_id, c.id));
  }

  // Process new videos in batches
  for (const videoId of newVideoIds) {
    const snippet = videoSnippets.get(videoId);
    const details = detailedVideos.get(videoId) || {};

    try {
      // Ask Gemini if this video is relevant
      const relevance = await filterVideoRelevance(
        snippet.title,
        snippet.description,
        snippet.channelTitle
      );

      if (!relevance.is_relevant || relevance.confidence < 0.6) {
        log('gate', `   ❌ غير متعلق: "${snippet.title.substring(0, 50)}..." (${(relevance.confidence * 100).toFixed(0)}%)`);
        continue;
      }

      log('gate', `   ✅ متعلق: "${snippet.title.substring(0, 50)}..." (${(relevance.confidence * 100).toFixed(0)}%)`);
      relevantCount++;

      // Ensure competitor exists
      let competitorId = existingChannels.get(snippet.channelId);

      if (!competitorId) {
        // New competitor! Fetch channel details
        log('gate', `   🆕 منافس جديد: ${snippet.channelTitle}`);

        let channelInfo = {};
        try {
          const chData = await getChannelDetails([snippet.channelId]);
          const ch = chData.items?.[0];
          if (ch) {
            channelInfo = {
              subscriber_count: parseInt(ch.statistics.subscriberCount || '0'),
              video_count: parseInt(ch.statistics.videoCount || '0'),
              description: ch.snippet.description?.substring(0, 500),
              avatar_url: ch.snippet.thumbnails?.default?.url,
            };
          }
        } catch (err) {
          log('error', `فشل جلب بيانات القناة: ${err.message}`);
        }

        const { data: newComp, error: compError } = await supabase
          .from('competitors')
          .insert({
            name: snippet.channelTitle,
            channel_id: snippet.channelId,
            channel_url: `https://www.youtube.com/channel/${snippet.channelId}`,
            is_verified: true,
            discovery_method: 'auto_radar',
            last_active_date: snippet.publishedAt,
            status: 'active',
            ...channelInfo,
          })
          .select('id')
          .single();

        if (compError) {
          log('error', `فشل إضافة منافس: ${compError.message}`);
          continue;
        }

        competitorId = newComp.id;
        existingChannels.set(snippet.channelId, competitorId);
        newCompetitorCount++;
      }

      // Update last_active_date for the competitor
      await supabase
        .from('competitors')
        .update({ last_active_date: snippet.publishedAt, status: 'active' })
        .eq('id', competitorId);

      // Insert the video
      await supabase.from('videos').upsert({
        competitor_id: competitorId,
        youtube_id: videoId,
        title: snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        description: snippet.description,
        views: details.views || 0,
        likes: details.likes || 0,
        comments_count: details.comments || 0,
        duration: details.duration,
        thumbnail_url: snippet.thumbnail,
        is_relevant: true,
        relevance_score: relevance.confidence,
        published_at: snippet.publishedAt,
        scraped_at: new Date().toISOString(),
      }, { onConflict: 'youtube_id' });

      // Rate limit Gemini
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      log('error', `خطأ في معالجة الفيديو ${videoId}: ${err.message}`);
    }
  }

  // Update pipeline run stats
  await supabase
    .from('pipeline_runs')
    .update({
      videos_discovered: radarData.allVideoIds.size,
      videos_relevant: relevantCount,
      new_competitors: newCompetitorCount,
    })
    .eq('id', runId);

  log('gate', `📊 النتيجة: ${relevantCount} فيديو متعلق، ${newCompetitorCount} منافس جديد`);
  return { relevantCount, newCompetitorCount };
}

// =====================================================
// STAGE 3: DEEP ANALYSIS - تحليل التعليقات
// =====================================================
async function stageAnalysis(supabase, runId) {
  log('analyze', '🔬 بدء التحليل العميق...');

  // Get videos that don't have insights yet
  const { data: videosToAnalyze } = await supabase
    .from('videos')
    .select('id, youtube_id, title')
    .eq('is_relevant', true)
    .not('id', 'in',
      `(SELECT video_id FROM ai_insights)`
    )
    .order('published_at', { ascending: false })
    .limit(20); // Process 20 at a time to manage API costs

  if (!videosToAnalyze || videosToAnalyze.length === 0) {
    log('analyze', '✅ كل الفيديوهات محللة مسبقاً');
    return { insightsGenerated: 0 };
  }

  log('analyze', `📋 ${videosToAnalyze.length} فيديو يحتاج تحليل`);

  let insightsGenerated = 0;

  for (const video of videosToAnalyze) {
    try {
      log('analyze', `   🎬 تحليل: "${video.title.substring(0, 50)}..."`);

      // Fetch comments from YouTube
      const comments = await getVideoComments(video.youtube_id);
      log('analyze', `      💬 ${comments.length} تعليق`);

      // Analyze with Gemini
      const analysis = await analyzeCommentsWithAI(video.title, comments);

      // Store the insight
      const { error } = await supabase.from('ai_insights').insert({
        video_id: video.id,
        pain_points: analysis.pain_points || [],
        missing_concepts: analysis.missing_concepts || [],
        student_requests: analysis.student_requests || [],
        engagement_score: analysis.engagement_score || 5,
        summary: analysis.summary || '',
        sentiment: analysis.sentiment || 'neutral',
        recommendations: analysis.recommendations || [],
        analyzed_comments: comments.length,
        raw_comments: comments.slice(0, 20), // Store first 20 comments
      });

      if (error) {
        log('error', `فشل حفظ التحليل: ${error.message}`);
      } else {
        insightsGenerated++;
        log('analyze', `      ✅ درجة التفاعل: ${analysis.engagement_score}/10 | نقاط ألم: ${(analysis.pain_points || []).length}`);
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      log('error', `خطأ في تحليل الفيديو ${video.youtube_id}: ${err.message}`);
    }
  }

  // Update run stats
  await supabase
    .from('pipeline_runs')
    .update({ insights_generated: insightsGenerated })
    .eq('id', runId);

  log('analyze', `📊 تم توليد ${insightsGenerated} تحليل جديد`);
  return { insightsGenerated };
}

// =====================================================
// STAGE 4: CLEANUP - التنظيف الذاتي
// =====================================================
async function stageCleanup(supabase) {
  log('cleanup', '🧹 بدء التنظيف الذاتي...');

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - CONFIG.INACTIVE_THRESHOLD_DAYS);

  // Deactivate competitors with no recent activity
  const { data: deactivated, error } = await supabase
    .from('competitors')
    .update({ status: 'inactive' })
    .eq('status', 'active')
    .lt('last_active_date', thresholdDate.toISOString())
    .select('name');

  if (error) {
    log('error', `فشل التنظيف: ${error.message}`);
  } else if (deactivated && deactivated.length > 0) {
    log('cleanup', `⚠️ تم إلغاء تنشيط ${deactivated.length} منافس:`);
    deactivated.forEach(c => log('cleanup', `   - ${c.name}`));
  } else {
    log('cleanup', '✅ كل المنافسين نشطون');
  }
}

// =====================================================
// MAIN PIPELINE
// =====================================================
async function runPipeline() {
  const startTime = Date.now();
  const stage = process.argv.find(a => a.startsWith('--stage='))?.split('=')[1];

  log('pipeline', '═══════════════════════════════════════');
  log('pipeline', '  AM Analytics - Dynamic Data Pipeline');
  log('pipeline', '═══════════════════════════════════════');

  validateConfig();

  const supabase = getSupabase();

  // Create pipeline run record
  const { data: run } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  const runId = run?.id;

  try {
    if (!stage || stage === 'radar' || stage === 'all') {
      // Stage 1 & 2: Radar + Gatekeeper
      const radarData = await stageRadar(supabase, runId);
      await stageGatekeeper(supabase, radarData, runId);
    }

    if (!stage || stage === 'analyze' || stage === 'all') {
      // Stage 3: Deep Analysis
      await stageAnalysis(supabase, runId);
    }

    if (!stage || stage === 'cleanup' || stage === 'all') {
      // Stage 4: Cleanup
      await stageCleanup(supabase);
    }

    // Mark run as completed
    if (runId) {
      await supabase
        .from('pipeline_runs')
        .update({ status: 'completed', finished_at: new Date().toISOString() })
        .eq('id', runId);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log('success', `═══════════════════════════════════════`);
    log('success', `  ✅ اكتمل التشغيل في ${elapsed} ثانية`);
    log('success', `═══════════════════════════════════════`);

  } catch (err) {
    log('error', `فشل Pipeline: ${err.message}`);

    if (runId) {
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_log: err.message,
        })
        .eq('id', runId);
    }

    process.exit(1);
  }
}

// Run!
runPipeline();
