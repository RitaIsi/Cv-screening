import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class RateLimitError extends Error {
  code = 'RATE_LIMIT_EXCEEDED';
  constructor(message = 'The AI is busy, please try again in a minute.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

class TimeoutError extends Error {
  code = 'AI_TIMEOUT';
  constructor(message = 'AI request timed out after 20 seconds') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Executes a fetch to Gemini with an AbortController timeout of 20 seconds per call.
 * Retries are limited to at most 2 attempts with waits of at most 2 seconds.
 */
async function fetchGeminiWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let attempt = 0;
  let delay = 1000;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort(new TimeoutError());
    }, 20000); // 20-second timeout per call

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutTimer);

      if (res.status === 429) {
        if (attempt < maxRetries) {
          attempt++;
          const waitTime = Math.min(2000, delay);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          delay = Math.min(2000, delay * 2);
          continue;
        }
        throw new RateLimitError();
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      if (controller.signal.aborted || err?.name === 'AbortError' || err?.code === 'AI_TIMEOUT' || err instanceof TimeoutError) {
        throw new TimeoutError();
      }

      if (attempt < maxRetries) {
        attempt++;
        const waitTime = Math.min(2000, delay);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        delay = Math.min(2000, delay * 2);
        continue;
      }

      throw err;
    }
  }

  throw new RateLimitError();
}

/**
 * Generates a 768-dimensional embedding vector using Google Gemini Embedding Model.
 */
async function getEmbedding(text: string, apiKey: string, model: string): Promise<number[]> {
  const cleanModel = model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:embedContent?key=${apiKey}`;

  const payload = {
    model: `models/${cleanModel}`,
    content: {
      parts: [{ text: text.slice(0, 8000) }],
    },
    taskType: 'SEMANTIC_SIMILARITY',
    outputDimensionality: 768,
  };

  const response = await fetchGeminiWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini embedding error (${response.status}):`, errorText);
    throw new Error(`Embedding call failed with status ${response.status}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Invalid embedding vector returned from Gemini');
  }
  return values;
}

/**
 * Extracts structured qualifications from CV text using Google Gemini Flash model.
 * Enforces maxOutputTokens: 1000 and attempts to disable thinking tokens (thinkingBudget: 0).
 */
async function analyzeCvWithGemini(cvText: string, apiKey: string, model: string) {
  const cleanModel = model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const prompt = `You are an expert HR and recruitment analyst. Analyze the following CV/resume text and extract the candidate's structured qualifications in strict JSON format.

JSON Schema:
{
  "skills": ["string (key technical, domain, or professional skills)"],
  "experience_years": number (total estimated years of professional experience as an integer >= 0),
  "education": "string (highest degree, field of study, or institution, e.g. B.Sc. Computer Science)",
  "summary": "string (2 to 3 plain concise sentences summarizing the candidate's core background, primary strengths, and profile for a recruiter to scan quickly)"
}

Do not include Markdown formatting or code fences. Output valid JSON only.

CV TEXT:
${cvText}`;

  const payload: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 1000,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  let response = await fetchGeminiWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // If the model does not support thinkingConfig, gracefully retry without it
  if (!response.ok && response.status === 400 && payload.generationConfig?.thinkingConfig) {
    const errorText = await response.text();
    if (errorText.toLowerCase().includes('thinking')) {
      console.warn('Model does not support thinkingConfig, retrying without thinkingConfig...');
      delete payload.generationConfig.thinkingConfig;
      response = await fetchGeminiWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      console.error(`Gemini generateContent error (${response.status}):`, errorText);
      throw new Error(`Gemini CV extraction failed with status ${response.status}`);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini generateContent error (${response.status}):`, errorText);
    throw new Error(`Gemini CV extraction failed with status ${response.status}`);
  }

  const data = await response.json();
  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';

  // Sanitize potential code fences
  if (rawText.startsWith('```json')) {
    rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error('Failed to parse Gemini text response as JSON:', err);
    throw new Error('Could not parse AI response');
  }

  return {
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.map((s: any) => String(s).trim()).filter(Boolean)
      : [],
    experience_years:
      typeof parsed.experience_years === 'number'
        ? Math.max(0, Math.round(parsed.experience_years))
        : 0,
    education: typeof parsed.education === 'string' ? parsed.education.trim() : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Enforce payload size limit (500KB maximum)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 500 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large. Maximum size is 500KB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Enforce user authentication via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Valid user login required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify Gemini secret configuration
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured in Supabase Edge Functions.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Current recommended models from ai.google.dev:
    // Text: Gemini 3.1 Flash-Lite (free tier ultra-fast model)
    // Embeddings: gemini-embedding-001 (768 dimensions with taskType: SEMANTIC_SIMILARITY)
    const textModel = Deno.env.get('GEMINI_TEXT_MODEL') || 'gemini-3.1-flash-lite';
    const embedModel = Deno.env.get('GEMINI_EMBED_MODEL') || 'gemini-embedding-001';

    // 4. Parse JSON request body
    const body = await req.json();
    const action = body.action;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter. Valid actions: analyze_cv, embed_job, backfill_jobs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 1: analyze_cv
    if (action === 'analyze_cv') {
      const rawCvText = body.cv_text || body.text || '';
      if (typeof rawCvText !== 'string' || rawCvText.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid cv_text in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Truncate CV text to 8,000 characters and NEVER log CV text
      const truncatedCv = rawCvText.slice(0, 8000);
      console.log(`[ai-screen] analyze_cv called by user ${user.id}, text length: ${truncatedCv.length}`);

      // Run CV analysis and CV embedding in parallel, each timing out separately with its own AbortController
      const [analysis, embedding] = await Promise.all([
        analyzeCvWithGemini(truncatedCv, geminiApiKey, textModel),
        getEmbedding(truncatedCv, geminiApiKey, embedModel),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          analysis,
          embedding,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 2: embed_job
    if (action === 'embed_job') {
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      const requiredSkills = Array.isArray(body.required_skills)
        ? body.required_skills.join(', ')
        : String(body.required_skills || '');

      const jobContent = `Title: ${title}\nRequired Skills: ${requiredSkills}\nDescription: ${description}`.trim();
      if (!jobContent) {
        return new Response(
          JSON.stringify({ error: 'Job title, required skills or description required to generate embedding' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ai-screen] embed_job called by user ${user.id} for job title: "${title}"`);
      const embedding = await getEmbedding(jobContent, geminiApiKey, embedModel);

      return new Response(
        JSON.stringify({
          success: true,
          embedding,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 3: backfill_jobs (Recruiters only)
    if (action === 'backfill_jobs') {
      const { data: callerProfile, error: profileError } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || callerProfile?.role !== 'recruiter') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Only authenticated recruiters can run the job backfill process' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ai-screen] backfill_jobs initiated by recruiter ${user.id}`);

      // Use service role client to update jobs table with embeddings
      const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data: jobsToBackfill, error: fetchError } = await adminClient
        .from('jobs')
        .select('id, title, description, required_skills')
        .is('embedding', null);

      if (fetchError) {
        console.error('[ai-screen] Error fetching jobs for backfill:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to query jobs needing backfill' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const totalFound = (jobsToBackfill || []).length;
      let updatedCount = 0;

      for (const job of jobsToBackfill || []) {
        try {
          const requiredSkills = Array.isArray(job.required_skills)
            ? job.required_skills.join(', ')
            : String(job.required_skills || '');
          const jobText = `Title: ${job.title || ''}\nRequired Skills: ${requiredSkills}\nDescription: ${job.description || ''}`.trim();

          const embedding = await getEmbedding(jobText, geminiApiKey, embedModel);

          const { error: updateError } = await adminClient
            .from('jobs')
            .update({ embedding })
            .eq('id', job.id);

          if (!updateError) {
            updatedCount++;
          } else {
            console.error(`[ai-screen] Error updating job ${job.id}:`, updateError);
          }
        } catch (jobErr) {
          console.error(`[ai-screen] Failed embedding job ${job.id}:`, jobErr);
        }
      }

      console.log(`[ai-screen] backfill completed: updated ${updatedCount} of ${totalFound} jobs`);

      return new Response(
        JSON.stringify({
          success: true,
          count: updatedCount,
          total: totalFound,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: "${action}". Valid actions: analyze_cv, embed_job, backfill_jobs` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    // Specific timeout / abort error handling
    if (
      err?.code === 'AI_TIMEOUT' ||
      err?.name === 'TimeoutError' ||
      err?.name === 'AbortError' ||
      err?.message?.includes('timed out') ||
      err instanceof TimeoutError
    ) {
      return new Response(
        JSON.stringify({
          error: 'AI request timed out. Please try again.',
          code: 'AI_TIMEOUT',
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (err?.code === 'RATE_LIMIT_EXCEEDED' || err?.statusCode === 429) {
      return new Response(
        JSON.stringify({
          error: 'The AI is busy, please try again in a minute.',
          code: 'RATE_LIMIT_EXCEEDED',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('[ai-screen] Unhandled function error:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'An unexpected error occurred in AI processing',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
