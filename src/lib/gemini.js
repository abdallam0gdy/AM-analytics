/**
 * Gemini AI Service for AM Analytics
 * Analyzes educational competitor content using Google's Gemini API
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];

export const isGeminiConfigured = Boolean(GEMINI_API_KEY) || import.meta.env.PROD;

/**
 * Send a prompt to Gemini and get a response
 * @param {string} prompt - The prompt to send
 * @param {object} config - Optional generation config overrides { temperature, maxOutputTokens }
 * @param {number} modelIndex - Internal: current model fallback index
 * @param {number} retries - Internal: remaining retries
 * @param {number} delayMs - Internal: delay between retries
 */
export async function callGemini(prompt, config = {}, modelIndex = 0, retries = 3, delayMs = 3000) {
  if (!isGeminiConfigured) {
    throw new Error('Gemini AI غير مُهيأ حالياً. يُرجى تهيئة المفاتيح.');
  }

  const temperature = config.temperature ?? 0.7;
  const maxOutputTokens = config.maxOutputTokens ?? 4096;

  const modelName = GEMINI_MODELS[modelIndex];
  let response;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topP: 0.9,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    };

    // In production, we FORCE using the proxy to prevent any client-side exposure.
    // In development (local), we can call directly if the key is defined.
    const useProxy = import.meta.env.PROD || !GEMINI_API_KEY;

    if (!useProxy) {
      // Direct call (local development mode)
      const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // Proxy call (production mode)
      response = await fetch(`/api/gemini?model=${modelName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {


    // Network error - retry if possible
    if (retries > 0 && (error.message.includes('fetch') || error.message.includes('Network'))) {
      console.warn(`[Gemini API] Network error. Retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
      return callGemini(prompt, config, modelIndex, retries - 1, delayMs * 2);
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status === 429 || response.status === 404) {
      if (modelIndex < GEMINI_MODELS.length - 1) {
        console.warn(`[Gemini API] Error ${response.status} for ${modelName}. Falling back to ${GEMINI_MODELS[modelIndex + 1]}...`);
        return callGemini(prompt, config, modelIndex + 1, retries, delayMs);
      } else if (retries > 0) {
        console.warn(`[Gemini API] Rate limit hit on all models. Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        return callGemini(prompt, config, 0, retries - 1, delayMs * 2);
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `خطأ من Gemini API: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('لم يتم استلام رد من Gemini');
  }

  try {
    const cleanText = text.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('Gemini JSON parsing error:', e, text);
    return { rawText: text, error: 'Failed to parse JSON' };
  }
}

/**
 * Analyze a competitor's video for pain points, missing concepts, and student requests
 */
export async function analyzeVideo(videoTitle, videoDescription = '', comments = []) {
  const commentsText = comments.length > 0
    ? `\n\nتعليقات الطلاب:\n${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
    : '';

  const prompt = `أنت محلل تعليمي متخصص في تحليل المحتوى التعليمي لمادة "البرمجة والذكاء الاصطناعي" في نظام البكالوريا المصرية (الصف الأول والثاني الثانوي).

حلل الفيديو التالي وأعطني تحليل مفصّل:

عنوان الفيديو: ${videoTitle}
${videoDescription ? `وصف الفيديو: ${videoDescription}` : ''}
${commentsText}

أعطني الرد بصيغة JSON بالشكل التالي:
{
  "pain_points": ["نقطة ضعف 1", "نقطة ضعف 2", ...],
  "missing_concepts": ["مفهوم مفقود 1", "مفهوم مفقود 2", ...],
  "student_requests": ["طلب 1", "طلب 2", ...],
  "engagement_score": (رقم من 1 إلى 10),
  "summary": "ملخص قصير للتحليل",
  "recommendations": ["توصية 1 لتحسين المحتوى", "توصية 2", ...],
  "sentiment": "positive" أو "negative" أو "neutral" أو "mixed"
}

ركّز على:
1. هل الشرح مبسط ومناسب لطلاب الثانوية؟
2. هل يوجد أمثلة عملية كافية؟
3. هل المحتوى يتبع منهج كيريو (QUREO) المعتمد؟
4. هل يغطي JavaScript/Python بشكل صحيح؟
5. ما هي الفجوات في المحتوى؟`;

  return await callGemini(prompt);
}

/**
 * Analyze a competitor channel overall
 */
export async function analyzeChannel(channelName, videoTitles = []) {
  const videosText = videoTitles.length > 0
    ? `\n\nعناوين فيديوهات القناة:\n${videoTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : '';

  const prompt = `أنت محلل تعليمي متخصص. حلل القناة التعليمية التالية التي تشرح مادة البرمجة والذكاء الاصطناعي لطلاب الثانوية المصرية:

اسم القناة: ${channelName}
${videosText}

أعطني الرد بصيغة JSON:
{
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", ...],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2", ...],
  "content_gaps": ["فجوة 1", "فجوة 2", ...],
  "audience_fit": "ممتاز" أو "جيد" أو "متوسط" أو "ضعيف",
  "overall_score": (رقم من 1 إلى 10),
  "opportunities": ["فرصة 1 يمكنك استغلالها", "فرصة 2", ...],
  "summary": "ملخص التحليل"
}

ركّز على فرص التحسين التي يمكن لقناة جديدة استغلالها.`;

  return await callGemini(prompt);
}

/**
 * Generate content ideas based on competitor analysis
 */
export async function generateContentIdeas(competitorData) {
  const prompt = `أنت خبير في صناعة المحتوى التعليمي. بناءً على تحليل المنافسين التالي لمادة البرمجة والذكاء الاصطناعي (أولى وتانية ثانوي - بكالوريا مصرية):

المنافسون وأبرز نقاط ضعفهم:
${JSON.stringify(competitorData, null, 2)}

اقترح أفكار محتوى تملأ الفجوات وتتفوق على المنافسين.

أعطني الرد بصيغة JSON:
{
  "content_ideas": [
    {
      "title": "عنوان الفيديو المقترح",
      "description": "وصف قصير",
      "target_grade": "أولى ثانوي" أو "تانية ثانوي",
      "topic": "الموضوع (مثل: Python, JavaScript, AI, Networks)",
      "priority": "عالية" أو "متوسطة" أو "منخفضة",
      "why": "لماذا هذا الفيديو مهم"
    }
  ],
  "content_strategy": "استراتيجية عامة للمحتوى"
}`;

  return await callGemini(prompt);
}

/**
 * Analyze competitor strengths and weaknesses dynamically based on videos and student insights
 */
export async function analyzeCompetitorInsights(channelName, videoDetails = []) {
  const prompt = `أنت محلل تعليمي خبير في مادة البرمجة والذكاء الاصطناعي للثانوية المصرية.
حلل القناة التعليمية التالية واستخرج نقاط القوة ونقاط الضعف بناءً على عناوين الفيديوهات وتعليقات الطلاب المكتشفة لديه.

اسم القناة: ${channelName}

تفاصيل الفيديوهات والتعليقات والتحليلات السابقة:
${videoDetails.map((v, i) => `${i + 1}. ${v}`).join('\n')}

أعطني الرد بصيغة JSON كالتالي:
{
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2", "نقطة ضعف 3"]
}`;

  return await callGemini(prompt);
}

/**
 * Generate a combat lesson plan structure to target competitor weaknesses
 */
export async function generateCombatLessonPlan(competitorName, weaknesses = [], targetGrade = 'الصف الأول الثانوي') {
  const weaknessesText = weaknesses && weaknesses.length > 0
    ? weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')
    : 'نقص التطبيق العملي وغياب الأمثلة التطبيقية البرمجية';

  const prompt = `أنت خبير تعليمي ومطور مناهج حاسب آلي وثانوي بمصر.
صمم خطة درس (كورس مضاد) متكاملة تتفوق بها على المدرس المنافس (${competitorName}) الذي يعاني من نقاط الضعف التالية:
${weaknessesText}

الهدف: تصميم كورس لـ (${targetGrade}) يركز تماماً على معالجة وحل هذه النقاط وتقديم أفضل تجربة شرح للطلاب.

أعطني الرد بصيغة JSON كالتالي:
{
  "lesson_title": "عنوان الدرس المقترح",
  "objectives": ["هدف تعليمي 1", "هدف تعليمي 2"],
  "explanation_strategy": "كيف سنشرح هذا الدرس بطريقة تتغلب على عيوب المنافس الكسلان",
  "outline": [
    {
      "section_title": "عنوان الجزء 1",
      "duration": "المدة المقترحة بالدقائق",
      "concept": "ما سيتم شرحه وكيفية تبسيطه"
    }
  ],
  "python_exercise": {
    "title": "عنوان التطبيق العملي",
    "description": "وصف المشكلة المطلوب حلها بالبرمجة",
    "code": "كود بايثون البرمجي النموذجي للحل مع تعليقات توضيحية بالعربية",
    "tips": "نصائح لشرح الكود للطلاب بسهولة"
  },
  "practice_quiz": [
    {
      "question": "السؤال 1 (اختيار من متعدد)",
      "options": ["أ", "ب", "ج", "د"],
      "correct_answer": "الإجابة الصحيحة",
      "explanation": "لماذا هذه الإجابة صحيحة لتوضيح الفهم"
    }
  ]
}`;

  return await callGemini(prompt);
}

/**
 * Generate a short 60-second video script to explain a student pain point/request
 */
export async function generateShortVideoScript(painPoint, channelName) {
  const prompt = `أنت صانع محتوى تعليمي محترف ومحاضر تيك توك ويوتيوب شورتس ذكي.
اكتب سيناريو فيديو قصير (YouTube Shorts / Reels) مدته 60 ثانية لحل المشكلة أو السؤال التالي الذي طرحه الطلاب:
السؤال/نقطة الألم: "${painPoint}"

المستهدف: تبسيط هذا المفهوم البرمجي لطلاب ثانوي في دقيقة واحدة بطريقة ممتعة وتفاعلية وجذابة جداً من الأستاذ (${channelName}).

أعطني الرد بصيغة JSON كالتالي:
{
  "video_title": "عنوان الفيديو الجذاب (خطاف الانتباه)",
  "hook": "الـ Hook (أول 5 ثواني لشد انتباه الطالب)",
  "body": [
    {
      "visual": "ماذا يظهر على الشاشة (مثال: رسم كود، تعبيرات الوجه)",
      "audio": "ما ستقوله بصوتك بالعامية المصرية المبسطة"
    }
  ],
  "call_to_action": "ماذا تطلب من الطالب في النهاية (المتابعة، كتابة تعليق، إلخ)"
}`;

  return await callGemini(prompt);
}

/**
 * Analyze a batch of comments and classify their sentiment
 */
export async function analyzeCommentsSentimentBatch(comments) {
  if (!comments || comments.length === 0) return [];

  const prompt = `أنت محلل مشاعر ذكي وخبير في تصنيف تعليقات الطلاب المصريين حول مواد البرمجة والكمبيوتر.
صنّف مشاعر التعليقات البرمجية التالية إلى أحد التصنيفات الثلاثة فقط:
- 'positive': إذا كان التعليق يحمل ثناءً أو شكراً أو حماساً أو فهماً كاملاً للدرس.
- 'negative': إذا كان الطالب يعبّر عن عدم الفهم، أو متلخبط، أو يواجه مشكلة، أو يطلب إعادة شرح أو أمثلة أكثر (سؤال أو نقطة ألم).
- 'neutral': إذا كان التعليق يحمل استفساراً عاماً (مثال: موعد المحاضرة القادمة) أو ليس به مشاعر واضحة.

التعليقات المطلوب تصنيفها:
${JSON.stringify(comments.map(c => ({ id: c.id, content: c.content })), null, 2)}

أجب فقط بصيغة JSON كقائمة تحتوي على معرّف التعليق والتصنيف:
[
  {
    "id": "معرف التعليق هنا",
    "sentiment": "positive" أو "negative" أو "neutral"
  }
]`;

  return await callGemini(prompt);
}

/**
 * Filter out spam/emoji comments and classify sentiment of useful ones
 */
export async function filterAndClassifyCommentsWithAI(comments) {
  if (!comments || comments.length === 0) return [];

  const commentsPayload = comments.map(c => ({
    id: c.commentId,
    text: c.content
  }));

  const prompt = `أنت خبير في مراجعة وتصفية تعليقات الطلاب حول البرمجة.
أمامك قائمة من التعليقات البرمجية المكتوبة على فيديوهات يوتيوب.
مهمتك هي تصفية هذه القائمة لاستبعاد أي تعليق غير مفيد أو عديم القيمة (مثل: الرموز التعبيرية فقط مثل القلوب والوجوه التعبيرية ❤️👍🔥، الشكر والتحية العامة جداً دون تفصيل مثل "بالتوفيق يا مستر" أو "شكرا" أو "منور").

⚠️ تنبيه هام جداً: أي تعليق يحتوي على رابط إلكتروني (URL) أو إشارة لجروب واتساب أو تليجرام أو درايف (مثل: http:// أو https:// أو t.me أو chat.whatsapp.com)، يجب الاحتفاظ به حتماً وعدم حذفه أو فلترته نهائياً، وتصنيفه كتعليق مفيد بمشاعر 'neutral' (محايد) حتى نتمكن من رصد الروابط!

نحن نريد فقط التعليقات ذات الفائدة والتأثير الفعلي (Actionable Comments) وهي:
1. الأسئلة البرمجية والاستفسارات عن الفهم.
2. الشكاوى وصعوبات التعلم (نقاط الألم - Pain points).
3. طلبات الشرح أو حل الأكواد أو رفع ملفات معينة.
4. تعليقات الشكر والتقييم المفصلة التي تذكر سبب التميز (مثل: "الشرح ده فادني جدا في فهم المصفوفات").
5. أي تعليق يحتوي على رابط (URL) لجروبات أو ملفات مشاركة.

لكل تعليق محتفظ به، صنّف مشاعره بدقة كالتالي:
- 'positive': لتعليقات الشكر والثناء المفصلة التي تعبر عن فهم كامل.
- 'negative': للأسئلة عن نقاط صعبة، أو عدم الفهم، أو الشكوى.
- 'neutral': للاستفسارات العامة، الطلبات المحايدة، والتعليقات التي تحتوي على روابط (URLs).

التعليقات المطلوب تصفيتها:
${JSON.stringify(commentsPayload, null, 2)}

أجب بصيغة JSON فقط كقائمة من التعليقات المفيدة المحتفظ بها فقط مع مشاعرها:
[
  {
    "id": "معرّف التعليق هنا",
    "sentiment": "positive" أو "negative" أو "neutral"
  }
]`;

  try {
    const results = await callGemini(prompt);
    if (results && Array.isArray(results)) {
      return results;
    }
    return [];
  } catch (err) {
    console.error('Error filtering comments with AI:', err);
    return [];
  }
}
