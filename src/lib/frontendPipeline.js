import { supabase } from './supabase';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

// Search terms for the radar (covering both 1st and 2nd Secondary Grades)
const SEARCH_QUERIES = [
  'شرح برمجة أولى ثانوي 2026',
  'برمجة وذكاء اصطناعي أولى ثانوي',
  'مراجعة برمجة أولى ثانوي',
  'منهج البرمجة الصف الأول الثانوي',
  'QUREO أولى ثانوي',
  'مستر السقا برمجة أولى ثانوي',
  'مستر السقا حاسب آلي',
];

// Helper for YouTube fetching
async function ytFetch(endpoint, params) {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  url.searchParams.set('key', YOUTUBE_API_KEY);
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

// Helper for Gemini AI structured call
async function callGemini(prompt, modelIndex = 0, retries = 3, delayMs = 3000) {
  let text = '';
  try {
    const modelName = MODELS[modelIndex];
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
      if (res.status === 429 || res.status === 404) {
        if (modelIndex < MODELS.length - 1) {
          console.warn(`[Gemini API] Error ${res.status} for ${modelName}. Falling back to ${MODELS[modelIndex + 1]}...`);
          return callGemini(prompt, modelIndex + 1, retries, delayMs);
        } else if (retries > 0) {
          console.warn(`[Gemini API] Rate limit hit on all models. Retrying in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
          return callGemini(prompt, 0, retries - 1, delayMs * 2);
        }
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini Error: ${err.error?.message || res.status}`);
    }

    const data = await res.json();
    text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('رد فارغ من Gemini');

  } catch (error) {
    if (retries > 0 && (error.message.includes('fetch') || error.message.includes('Network'))) {
      console.warn(`[Gemini API] Network error hit. Retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
      return callGemini(prompt, modelIndex, retries - 1, delayMs * 2);
    }
    throw error;
  }

  try {
    const cleanText = text.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error('Gemini parsing error in pipeline:', err, text);
    throw new Error('فشل في قراءة رد الذكاء الاصطناعي');
  }
}

// Phase 2: AI relevance check
async function checkVideoRelevance(title, description, channelName) {
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

// Phase 3: AI Comment Analysis
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

  const commentsText = comments.slice(0, 20).map((c, i) => `${i + 1}. ${c}`).join('\n');

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

/**
 * Runs the dynamic radar pipeline inside the browser
 * @param {Function} onProgress - Callback for progress reporting
 */
export async function runFrontendPipeline(onProgress = () => {}) {
  if (!supabase) {
    throw new Error('Supabase غير متصل. يرجى إعداد المتغيرات البيئية.');
  }
  if (!YOUTUBE_API_KEY) {
    throw new Error('مفتاح YouTube API مفقود (VITE_YOUTUBE_API_KEY).');
  }
  if (!GEMINI_API_KEY) {
    throw new Error('مفتاح Gemini API مفقود (VITE_GEMINI_API_KEY).');
  }

  const startTime = Date.now();
  onProgress({ status: 'started', message: 'بدء تشغيل الرادار التلقائي...' });

  // 1. Create pipeline run log
  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  if (runError) throw new Error(`فشل إنشاء سجل التشغيل: ${runError.message}`);
  const runId = run.id;

  try {
    // Stage 1: RADAR YouTube search
    onProgress({ status: 'radar', message: '📡 جاري فحص يوتيوب عن المدرسين والفيديوهات الجديدة...' });
    
    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - 30); // 30 days back
    const afterISO = publishedAfter.toISOString();

    const discoveredVideos = new Map();
    const channelIdsToFetch = new Set();

    for (const query of SEARCH_QUERIES) {
      onProgress({ status: 'radar', message: `📡 جاري البحث عن: "${query}"...` });
      try {
        const results = await ytFetch('search', {
          part: 'snippet',
          q: query,
          type: 'video',
          regionCode: 'EG',
          relevanceLanguage: 'ar',
          publishedAfter: afterISO,
          maxResults: '5', // Small limits for client performance
        });

        for (const item of results.items || []) {
          const videoId = item.id.videoId;
          if (videoId) {
            discoveredVideos.set(videoId, {
              youtube_id: videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            });
            channelIdsToFetch.add(item.snippet.channelId);
          }
        }
      } catch (e) {
        console.warn(`[Pipeline] Failed query "${query}":`, e);
      }
      // Brief delay
      await new Promise(r => setTimeout(r, 200));
    }

    const videoIds = [...discoveredVideos.keys()];
    onProgress({ status: 'radar', message: `📡 تم العثور على ${videoIds.length} فيديوهات مكتشفة. جاري جلب التفاصيل...` });

    if (videoIds.length === 0) {
      onProgress({ status: 'completed', message: 'لا توجد فيديوهات جديدة في الـ 30 يوماً الأخيرة.' });
      await supabase.from('pipeline_runs').update({ status: 'completed', finished_at: new Date().toISOString() }).eq('id', runId);
      return { videosDiscovered: 0, videosRelevant: 0, newCompetitors: 0 };
    }

    // Fetch video stats (views, likes, comments)
    const videoStats = new Map();
    const statsData = await ytFetch('videos', {
      part: 'statistics,contentDetails',
      id: videoIds.slice(0, 30).join(','), // Limit to top 30
    });

    for (const item of statsData.items || []) {
      videoStats.set(item.id, {
        views: parseInt(item.statistics.viewCount || '0'),
        likes: parseInt(item.statistics.likeCount || '0'),
        comments_count: parseInt(item.statistics.commentCount || '0'),
        duration: item.contentDetails?.duration,
      });
    }

    // Stage 2: GATEKEEPER AI filtering & Supabase saving
    onProgress({ status: 'gatekeeper', message: '🛡️ جاري فلترة الفيديوهات بـ Gemini للتأكد من صلتها بمصر وبكالوريا...' });

    // Load existing channels from DB
    const { data: existingCompetitors } = await supabase.from('competitors').select('id, channel_id');
    const competitorMap = new Map((existingCompetitors || []).map(c => [c.channel_id, c.id]));

    let relevantCount = 0;
    let newCompetitorsCount = 0;
    let insightsCount = 0;

    const filteredVideos = [];
    // Process top 10 relevant videos (to prevent rate limits/timeouts)
    const videosToProcess = videoIds.slice(0, 10);

    for (let index = 0; index < videosToProcess.length; index++) {
      const vidId = videosToProcess[index];
      const video = discoveredVideos.get(vidId);
      const stats = videoStats.get(vidId) || { views: 0, likes: 0, comments_count: 0 };

      onProgress({
        status: 'gatekeeper',
        message: `🛡️ جاري فحص الفيديو (${index + 1}/${videosToProcess.length}): "${video.title.substring(0, 35)}..."`
      });

      try {
        const relevance = await checkVideoRelevance(video.title, video.description, video.channelTitle);
        const isRelevant = relevance.is_relevant === true || String(relevance.is_relevant).toLowerCase() === 'true';
        
        if (isRelevant && relevance.confidence >= 0.6) {
          relevantCount++;
          
          // Ensure competitor exists in DB
          let competitorDbId = competitorMap.get(video.channelId);

          if (!competitorDbId) {
            // Fetch channel metadata
            onProgress({ status: 'gatekeeper', message: `📺 قناة جديدة: "${video.channelTitle}"، جاري إضافتها...` });
            let channelMeta = { subscriber_count: 0, video_count: 0 };
            
            try {
              const chRes = await ytFetch('channels', { part: 'statistics,snippet', id: video.channelId });
              const ch = chRes.items?.[0];
              if (ch) {
                channelMeta = {
                  subscriber_count: parseInt(ch.statistics.subscriberCount || '0'),
                  video_count: parseInt(ch.statistics.videoCount || '0'),
                  avatar_url: ch.snippet.thumbnails?.default?.url,
                  description: ch.snippet.description?.substring(0, 500),
                };
              }
            } catch (e) {
              console.warn('Failed to fetch channel details:', e);
            }

            const { data: newComp, error: newCompErr } = await supabase
              .from('competitors')
              .insert({
                name: video.channelTitle,
                channel_id: video.channelId,
                channel_url: `https://www.youtube.com/channel/${video.channelId}`,
                is_verified: true,
                discovery_method: 'auto_radar',
                last_active_date: video.publishedAt,
                status: 'active',
                ...channelMeta,
              })
              .select('id')
              .single();

            if (!newCompErr && newComp) {
              competitorDbId = newComp.id;
              competitorMap.set(video.channelId, competitorDbId);
              newCompetitorsCount++;
            } else {
              console.error('Failed to create competitor:', newCompErr);
              continue;
            }
          } else {
            // Update last active
            await supabase.from('competitors').update({ last_active_date: video.publishedAt, status: 'active' }).eq('id', competitorDbId);
          }

          // Insert video
          const { data: savedVideo, error: videoErr } = await supabase
            .from('videos')
            .upsert({
              competitor_id: competitorDbId,
              youtube_id: vidId,
              title: video.title,
              url: `https://www.youtube.com/watch?v=${vidId}`,
              description: video.description,
              views: stats.views || 0,
              likes: stats.likes || 0,
              comments_count: stats.comments_count || 0,
              duration: stats.duration || '',
              thumbnail_url: video.thumbnail_url,
              is_relevant: true,
              relevance_score: relevance.confidence,
              published_at: video.publishedAt,
              scraped_at: new Date().toISOString(),
            }, { onConflict: 'youtube_id' })
            .select('id')
            .single();

          if (!videoErr && savedVideo) {
            filteredVideos.push({ dbId: savedVideo.id, ytId: vidId, title: video.title, commentsCount: stats.comments_count, competitorId: competitorDbId });
          }
        }
      } catch (err) {
        console.error(`Error processing relevance for ${vidId}:`, err);
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    // Stage 3: Deep analysis of comments
    onProgress({ status: 'analyze', message: '🔬 جاري جلب تعليقات الطلاب وتحليلها بواسطة AI...' });
    
    for (let index = 0; index < filteredVideos.length; index++) {
      const vid = filteredVideos[index];
      onProgress({
        status: 'analyze',
        message: `🔬 جاري تحليل تعليقات الفيديو (${index + 1}/${filteredVideos.length}): "${vid.title.substring(0, 30)}..."`
      });

      try {
        // Fetch comments threads (rich object arrays)
        const commentsList = vid.commentsCount > 0 ? await getVideoComments(vid.ytId) : [];
        
        // Save all comments to the dedicated comments table!
        if (commentsList.length > 0) {
          await saveCommentsToDb(vid.competitorId, vid.dbId, commentsList);
        }

        // Analyze comments with Gemini using the text content
        const commentsTextOnly = commentsList.map(c => c.content);
        const analysis = await analyzeCommentsWithAI(vid.title, commentsTextOnly);

        // Save AI insights
        await supabase.from('ai_insights').insert({
          video_id: vid.dbId,
          pain_points: analysis.pain_points || [],
          missing_concepts: analysis.missing_concepts || [],
          student_requests: analysis.student_requests || [],
          engagement_score: analysis.engagement_score || 5,
          summary: analysis.summary || '',
          sentiment: analysis.sentiment || 'neutral',
          recommendations: analysis.recommendations || [],
          analyzed_comments: commentsList.length,
          raw_comments: commentsList.slice(0, 10),
        });

        insightsCount++;
      } catch (err) {
        console.error(`Failed to analyze comments for ${vid.ytId}:`, err);
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    // Stage 4: Cleanup
    onProgress({ status: 'cleanup', message: '🧹 جاري التنظيف وإلغاء تنشيط القنوات غير النشطة...' });
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 90); // 90 days threshold
    
    await supabase
      .from('competitors')
      .update({ status: 'inactive' })
      .eq('status', 'active')
      .lt('last_active_date', thresholdDate.toISOString());

    // Update runs log to completed
    await supabase.from('pipeline_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      videos_discovered: videoIds.length,
      videos_relevant: relevantCount,
      new_competitors: newCompetitorsCount,
      insights_generated: insightsCount,
    }).eq('id', runId);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(0);
    onProgress({
      status: 'completed',
      message: `✅ اكتمل التحديث الذاتي بنجاح! تم فحص ${videoIds.length} فيديو، وإضافة ${newCompetitorsCount} منافس جديد، وتحليل ${insightsCount} فيديو بالـ AI خلال ${elapsedSeconds} ثانية.`
    });

    return {
      videosDiscovered: videoIds.length,
      videosRelevant: relevantCount,
      newCompetitors: newCompetitorsCount,
      insightsGenerated: insightsCount,
    };

  } catch (error) {
    console.error('Frontend Pipeline Failed:', error);
    await supabase.from('pipeline_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_log: error.message || 'Unknown error',
    }).eq('id', runId);

    onProgress({ status: 'failed', message: `❌ فشل التحديث: ${error.message}` });
    throw error;
  }
}

// Fetch rich comments helper (ID, author name, avatar, likes, date)
async function getVideoComments(videoId) {
  try {
    const data = await ytFetch('commentThreads', {
      part: 'snippet',
      videoId: videoId,
      maxResults: '30', // Pull up to 30 comments per video
      order: 'relevance',
      textFormat: 'plainText',
    });
    return (data.items || []).map(item => {
      const c = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.snippet.topLevelComment.id,
        authorName: c.authorDisplayName,
        authorAvatar: c.authorProfileImageUrl,
        content: c.textDisplay,
        likeCount: parseInt(c.likeCount || 0),
        publishedAt: c.publishedAt
      };
    });
  } catch (e) {
    console.warn(`Failed comments for ${videoId}:`, e);
    return [];
  }
}

// Save/Upsert comments to Supabase 'comments' table
async function saveCommentsToDb(competitorId, videoId, commentsList) {
  if (!commentsList || commentsList.length === 0) return;
  
  const records = commentsList.map(c => ({
    video_id: videoId,
    competitor_id: competitorId,
    youtube_comment_id: c.commentId,
    author_name: c.authorName,
    author_avatar: c.authorAvatar,
    content: c.content,
    like_count: c.likeCount,
    published_at: c.publishedAt,
    sentiment: 'neutral'
  }));
  
  try {
    const { error } = await supabase
      .from('comments')
      .upsert(records, { onConflict: 'youtube_comment_id' });
    if (error) {
      console.warn('Failed to upsert comments to DB:', error.message);
    }
  } catch (err) {
    console.error('Error saving comments:', err);
  }
}

// Parse ISO 8601 duration format from YouTube into seconds
function parseISO8601Duration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Fetch channel videos via RSS to bypass YouTube API Key quota usage
export async function fetchChannelVideosViaRSS(channelId) {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const entries = xmlDoc.getElementsByTagName('entry');
    const videos = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const videoId = entry.getElementsByTagName('yt:videoId')[0]?.textContent || 
                      entry.getElementsByTagName('videoId')[0]?.textContent;
      const title = entry.getElementsByTagName('title')[0]?.textContent || '';
      const description = entry.getElementsByTagName('media:description')[0]?.textContent || 
                          entry.getElementsByTagName('description')[0]?.textContent || '';
      const published = entry.getElementsByTagName('published')[0]?.textContent || new Date().toISOString();
      const authorName = entry.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]?.textContent || '';
      
      if (videoId) {
        videos.push({
          videoId,
          title,
          description,
          publishedAt: published,
          channelId,
          channelTitle: authorName,
          thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      }
    }
    
    return videos;
  } catch (err) {
    console.warn(`[RSS Scraper] Failed to fetch via RSS for channel ${channelId}. Falling back to standard YouTube Search API...`, err);
    return null;
  }
}

// On-demand scraper and AI analyzer pipeline for a specific competitor
export async function runChannelAnalysisPipeline(competitorId, channelId, onProgress = () => {}) {
  const startTime = Date.now();
  onProgress({ status: 'fetching', message: '📡 جاري فحص تغذية RSS للقناة لتوفير الكوتا...' });

  try {
    let videoMap = new Map();
    
    // Try to fetch via RSS first (costs 0 quota!)
    const rssVideos = await fetchChannelVideosViaRSS(channelId);
    
    if (rssVideos && rssVideos.length > 0) {
      onProgress({ status: 'fetching', message: `📡 تم العثور على ${rssVideos.length} فيديو عبر RSS (0 كوتا مستهلكة!)` });
      for (const item of rssVideos) {
        videoMap.set(item.videoId, {
          title: item.title,
          description: item.description,
          publishedAt: item.publishedAt,
          thumbnails: { high: { url: item.thumbnail_url } },
          channelTitle: item.channelTitle
        });
      }
    } else {
      // Fallback to standard YouTube API search
      onProgress({ status: 'fetching', message: '📡 جاري جلب أحدث وأشهر فيديوهات المدرس عبر YouTube API...' });
      const latestRes = await ytFetch('search', {
        channelId,
        part: 'snippet',
        order: 'date',
        maxResults: 12,
        type: 'video'
      });

      const popularRes = await ytFetch('search', {
        channelId,
        part: 'snippet',
        order: 'viewCount',
        maxResults: 12,
        type: 'video'
      });

      for (const item of [...(latestRes.items || []), ...(popularRes.items || [])]) {
        if (item.id?.videoId) {
          videoMap.set(item.id.videoId, item.snippet);
        }
      }
    }

    const videoIds = [...videoMap.keys()];
    if (videoIds.length === 0) {
      throw new Error('لم يتم العثور على أي فيديوهات لهذه القناة.');
    }

    // 3. Fetch detailed statistics and duration for these videos
    onProgress({ status: 'details', message: '📊 جاري جلب تفاصيل الفيديوهات واستبعاد المقاطع الإعلانية القصير...' });
    const statsData = await ytFetch('videos', {
      part: 'statistics,contentDetails',
      id: videoIds.join(','),
    });

    const detailedVideos = [];
    for (const item of statsData.items || []) {
      const snippet = videoMap.get(item.id);
      const title = snippet.title || '';
      const durationStr = item.contentDetails?.duration || '';
      const durationSec = parseISO8601Duration(durationStr);

      // Check if it is promotional or short (less than 2 mins)
      const promoKeywords = ['اعلان', 'أبليكشن', 'خصم', 'عرض', 'promo', 'promo', 'trailer', 'اشتراك', 'خصومات', 'سجل الآن', 'انتظرونا', 'مقدمة'];
      const isPromo = promoKeywords.some(k => title.toLowerCase().includes(k)) || durationSec < 120;

      if (isPromo) {
        continue;
      }

      detailedVideos.push({
        id: item.id,
        title: title,
        description: snippet.description || '',
        publishedAt: snippet.publishedAt,
        thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        views: parseInt(item.statistics.viewCount || '0'),
        likes: parseInt(item.statistics.likeCount || '0'),
        comments_count: parseInt(item.statistics.commentCount || '0'),
        duration: durationStr,
      });
    }

    // Sort: We want top explanation videos (sort by viewCount) and latest explanation videos
    detailedVideos.sort((a, b) => b.views - a.views);
    const topVideos = detailedVideos.slice(0, 4); // Pick top 4 viewed
    
    const remaining = detailedVideos.slice(4);
    remaining.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const latestVideos = remaining.slice(0, 3); // Pick latest 3 explanation videos

    const finalVideosToAnalyze = [...topVideos, ...latestVideos];
    if (finalVideosToAnalyze.length === 0) {
      throw new Error('لم يتم العثور على فيديوهات شرح تعليمية (غير إعلانية) كافية.');
    }

    // 4. Save/Upsert Videos and Fetch Comments & Analyze
    let analyzedCount = 0;
    const allVideoSummaries = [];

    for (let index = 0; index < finalVideosToAnalyze.length; index++) {
      const vid = finalVideosToAnalyze[index];
      onProgress({ 
        status: 'comments', 
        message: `💬 جاري جلب وتحليل التعليقات (${index + 1}/${finalVideosToAnalyze.length}): "${vid.title.substring(0, 25)}..."` 
      });

      // Upsert video to DB
      const { data: savedVideo, error: videoErr } = await supabase
        .from('videos')
        .upsert({
          competitor_id: competitorId,
          youtube_id: vid.id,
          title: vid.title,
          url: `https://www.youtube.com/watch?v=${vid.id}`,
          description: vid.description,
          views: vid.views,
          likes: vid.likes,
          comments_count: vid.comments_count,
          duration: vid.duration,
          thumbnail_url: vid.thumbnail_url,
          is_relevant: true,
          published_at: vid.publishedAt,
          scraped_at: new Date().toISOString(),
        }, { onConflict: 'youtube_id' })
        .select('id')
        .single();

      if (videoErr) {
        continue;
      }

      // Fetch comments from YouTube
      const commentsList = vid.comments_count > 0 ? await getVideoComments(vid.id) : [];

      // Save rich comments to the comments table!
      if (commentsList.length > 0) {
        await saveCommentsToDb(competitorId, savedVideo.id, commentsList);
      }

      // Run AI Comments analysis using comment content strings
      let analysis = {
        pain_points: [],
        missing_concepts: [],
        student_requests: [],
        engagement_score: 5,
        summary: 'لا توجد تعليقات كافية للتحليل',
        sentiment: 'neutral',
        recommendations: [],
      };

      if (commentsList.length > 0) {
        analysis = await analyzeCommentsWithAI(vid.title, commentsList.map(c => c.content));
      }

      // Save insights to DB
      await supabase.from('ai_insights').upsert({
        video_id: savedVideo.id,
        pain_points: analysis.pain_points || [],
        missing_concepts: analysis.missing_concepts || [],
        student_requests: analysis.student_requests || [],
        engagement_score: analysis.engagement_score || 5,
        summary: analysis.summary || '',
        sentiment: analysis.sentiment || 'neutral',
        recommendations: analysis.recommendations || [],
        analyzed_comments: commentsList.length,
        raw_comments: commentsList.slice(0, 15),
      }, { onConflict: 'video_id' });

      analyzedCount++;
      allVideoSummaries.push(`
        - عنوان الفيديو: ${vid.title}
        - نقاط الضعف والفهم لدى الطلاب: ${analysis.pain_points.join(', ') || 'لا يوجد'}
        - طلبات الطلاب المحددة: ${analysis.student_requests.join(', ') || 'لا يوجد'}
      `);

      // 1.5s delay to be polite
      await new Promise(r => setTimeout(r, 1500));
    }

    // 5. Aggregate overall channel strengths and weaknesses
    onProgress({ status: 'aggregate', message: '🧠 جاري استخلاص نقاط القوة والضعف الكلية للمدرس بالـ AI...' });
    
    const prompt = `أنت محلل تعليمي خبير في مادة البرمجة والذكاء الاصطناعي للثانوية المصرية.
حلل المدرس التالي واستخرج نقاط قوته (أبرز 3 نقاط في الشرح والأسلوب) ونقاط ضعفه وفجواته التعليمية (أبرز 3 نقاط في فجوات المحتوى أو طلبات الطلاب) بناءً على تفاصيل فيديوهاته والتعليقات المكتشفة لديه.

اسم القناة/المدرس: ${finalVideosToAnalyze[0].title.split(' - ')[0]}

تفاصيل فيديوهات الشرح وتعليقات الطلاب المكتشفة:
${allVideoSummaries.join('\n')}

أعطني الرد بصيغة JSON كالتالي:
{
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2", "نقطة ضعف 3"]
}`;

    const result = await callGemini(prompt);

    if (result && (result.strengths || result.weaknesses)) {
      const strengths = result.strengths || [];
      const weaknesses = result.weaknesses || [];

      // Save to Database
      const { error: directError } = await supabase
        .from('competitors')
        .update({ strengths, weaknesses })
        .eq('id', competitorId);

      if (directError && directError.message && (directError.message.includes('column') || directError.message.includes('does not exist'))) {
        const { data: compRow } = await supabase.from('competitors').select('description').eq('id', competitorId).single();
        let bioText = compRow?.description || '';
        if (bioText.trim().startsWith('{') && bioText.trim().endsWith('}')) {
          try {
            bioText = JSON.parse(bioText).bio || '';
          } catch (e) {}
        }
        const encoded = JSON.stringify({
          bio: bioText,
          strengths: strengths,
          weaknesses: weaknesses
        });
        await supabase
          .from('competitors')
          .update({ description: encoded })
          .eq('id', competitorId);
      }
    }

    onProgress({ status: 'completed', message: '✅ اكتمل تحليل المدرس بالكامل بنجاح!' });
    return true;

  } catch (error) {
    console.error('Channel Analysis Pipeline Failed:', error);
    onProgress({ status: 'error', message: `❌ فشل التحليل: ${error.message || error}` });
    throw error;
  }
}
