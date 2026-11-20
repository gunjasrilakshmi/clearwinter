import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AdvisorMessage, AirQualityReading } from './src/types/airQuality.ts';
import {
  sanitizePlainText,
  validateAdvisorQuestion,
  validateCityQuery,
  validateCoordinates,
  validateHouseholdProfile,
} from './src/utils/validation.ts';
import {
  CityNotFoundError,
  getAirQualityByCity,
  getAirQualityByCoords,
} from './server/airQualityService.ts';
import { askSmogAdvisor, generateSmogActionPlan } from './server/geminiService.ts';
import { SlidingWindowRateLimiter } from './server/rateLimiter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Rate limiters: generous for reads, bounded for GenAI endpoints
const airRateLimiter = new SlidingWindowRateLimiter(60_000, 45);
const aiRateLimiter = new SlidingWindowRateLimiter(60_000, 20);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

// Security headers (compatible with AI Studio preview iframe)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  next();
});

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function handleGeminiError(err: unknown, res: express.Response): void {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  if (message === 'GEMINI_API_KEY_MISSING') {
    res.status(503).json({
      error:
        'Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || message.includes('403')) {
    res.status(403).json({
      error:
        'Gemini API access denied. Please verify your API key in Settings > Secrets.',
    });
    return;
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    res.status(429).json({
      error:
        'AI request quota reached momentarily. Please wait a few seconds and try again.',
    });
    return;
  }
  console.error('[server] Gemini error:', message);
  res.status(502).json({
    error: 'Unable to generate tailored guidance right now. Please try again shortly.',
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/air-quality', async (req, res) => {
  const rate = airRateLimiter.check(getClientIp(req));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    res.status(429).json({ error: 'Too many air quality lookups. Please pause briefly.' });
    return;
  }

  const { city, lat, lon } = req.query;

  try {
    if (lat !== undefined && lon !== undefined) {
      const coordCheck = validateCoordinates(lat, lon);
      if (!coordCheck.valid) {
        res.status(400).json({ error: coordCheck.error });
        return;
      }
      const reading = await getAirQualityByCoords(coordCheck.lat, coordCheck.lon);
      res.json(reading);
      return;
    }

    const cityCheck = validateCityQuery(city);
    if (!cityCheck.valid) {
      res.status(400).json({ error: cityCheck.error });
      return;
    }

    const reading = await getAirQualityByCity(cityCheck.city);
    res.json(reading);
  } catch (err) {
    if (err instanceof CityNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    const msg = err instanceof Error ? err.message : 'Air quality lookup failed';
    console.error('[server] Air quality lookup error:', msg);
    res.status(502).json({
      error: 'Live air quality service is temporarily unavailable. Please try again shortly.',
    });
  }
});

app.post('/api/plan', async (req, res) => {
  const rate = aiRateLimiter.check(getClientIp(req));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    res.status(429).json({ error: 'Too many plan generation requests. Please wait a moment.' });
    return;
  }

  const body = req.body as { profile?: unknown; airQuality?: AirQualityReading } | undefined;
  const profileCheck = validateHouseholdProfile(body?.profile);
  if (!profileCheck.valid || !profileCheck.profile) {
    res.status(400).json({ error: profileCheck.error ?? 'Invalid household profile.' });
    return;
  }

  try {
    let airQuality = body?.airQuality;
    if (
      !airQuality ||
      typeof airQuality.usAqi !== 'number' ||
      typeof airQuality.pm25 !== 'number' ||
      !airQuality.city
    ) {
      airQuality = await getAirQualityByCity(profileCheck.profile.city);
    }
    const plan = await generateSmogActionPlan(profileCheck.profile, airQuality);
    res.json({ plan, airQuality });
  } catch (err) {
    if (err instanceof CityNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    handleGeminiError(err, res);
  }
});

app.post('/api/advisor', async (req, res) => {
  const rate = aiRateLimiter.check(getClientIp(req));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    res.status(429).json({ error: 'Too many advisor questions. Please wait a moment.' });
    return;
  }

  const body = req.body as {
    question?: unknown;
    profile?: unknown;
    airQuality?: AirQualityReading;
    history?: Array<{ role?: unknown; content?: unknown }>;
  };

  const qCheck = validateAdvisorQuestion(body?.question);
  if (!qCheck.valid) {
    res.status(400).json({ error: qCheck.error });
    return;
  }

  const profileCheck = validateHouseholdProfile(body?.profile);
  if (!profileCheck.valid || !profileCheck.profile) {
    res.status(400).json({ error: profileCheck.error ?? 'Invalid household profile.' });
    return;
  }

  const airQuality = body?.airQuality;
  if (
    !airQuality ||
    typeof airQuality.usAqi !== 'number' ||
    typeof airQuality.pm25 !== 'number'
  ) {
    res.status(400).json({ error: 'Current air quality context is required.' });
    return;
  }

  const sanitizedHistory: Array<Pick<AdvisorMessage, 'role' | 'content'>> = Array.isArray(
    body?.history,
  )
    ? body.history
        .slice(-6)
        .filter(
          (item) =>
            item &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string',
        )
        .map((item) => ({
          role: item.role as 'user' | 'assistant',
          content: sanitizePlainText(item.content, 300),
        }))
    : [];

  try {
    const reply = await askSmogAdvisor(
      qCheck.question,
      profileCheck.profile,
      airQuality,
      sanitizedHistory,
    );
    res.json(reply);
  } catch (err) {
    handleGeminiError(err, res);
  }
});

async function startServer(): Promise<void> {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClearWinter server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ClearWinter server:', err);
  process.exit(1);
});
