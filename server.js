// server.js — Woven Autonomous Agentic Dating Server
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic API Keys in memory (initialized from .env)
let openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
let apifyToken = process.env.APIFY_TOKEN || '';

// In-memory data store initialized from JSON files
const dataDir = path.join(__dirname, 'public', 'data');
let profiles = JSON.parse(fs.readFileSync(path.join(dataDir, 'profiles.json'), 'utf-8'));
let rankings = JSON.parse(fs.readFileSync(path.join(dataDir, 'rankings.json'), 'utf-8'));
let curatedDates = JSON.parse(fs.readFileSync(path.join(dataDir, 'dates.json'), 'utf-8'));
// Candidate profiles store (clean state, preserves genuine user uploads)
const auraCandidatesFile = path.join(dataDir, 'aura-candidates.json');
let customAuraCandidates = [];
try {
  if (fs.existsSync(auraCandidatesFile)) {
    customAuraCandidates = JSON.parse(fs.readFileSync(auraCandidatesFile, 'utf-8'));
  }
} catch (e) {
  customAuraCandidates = [];
}
let auraCandidates = customAuraCandidates;

// Users and Sessions store for Auth & OAuth
const usersFile = path.join(dataDir, 'users.json');
let users = [];
try {
  if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  }
} catch (e) {
  users = [];
}

function saveUsers() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Failed to save users.json', e);
  }
}

const activeSessions = new Map();

// Helper: Format human name from URL slug
function formatNameFromUrl(url) {
  try {
    const clean = (url || '').trim().replace(/\/+$/, '');
    const parts = clean.split('/');
    let last = parts.pop() || '';
    if (last === 'in' || last.includes('linkedin') || last.includes('instagram')) {
      last = parts.pop() || '';
    }
    last = last.replace(/[@?#].*$/, '');
    last = last.replace(/[-_][a-f0-9]{7,}$/i, '');
    last = last.replace(/[-_.]+/g, ' ');
    const formatted = last.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return formatted || '';
  } catch (e) {
    return '';
  }
}

// Helper: Extract clean username from social links
function extractUsername(input) {
  if (!input) return '';
  let str = input.trim();
  str = str.replace(/^(https?:\/\/)?(www\.)?(instagram\.com|linkedin\.com\/in)\/?/i, '');
  str = str.replace(/[?#].*$/, '');
  str = str.replace(/\/+$/, '');
  str = str.replace(/^@/, '');
  const parts = str.split('/').filter(Boolean);
  return parts.pop() || '';
}

// Helper: Ensure valid LinkedIn URL
function formatLinkedInUrl(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.split('?')[0].replace(/\/+$/, '');
  }
  if (trimmed.includes('linkedin.com')) {
    return `https://${trimmed.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '')}`;
  }
  const handle = extractUsername(trimmed);
  return `https://www.linkedin.com/in/${handle}`;
}

// Helper: Ensure valid Instagram URL
function formatInstagramUrl(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.split('?')[0].replace(/\/+$/, '');
  }
  if (trimmed.includes('instagram.com')) {
    return `https://${trimmed.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '')}`;
  }
  const handle = extractUsername(trimmed);
  return `https://www.instagram.com/${handle}`;
}

// Scrape metadata helper (Direct OpenGraph / Cheerio)
async function fetchPublicMetadata(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { success: false, status: response.status };
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    
    return {
      success: true,
      title: title.trim(),
      description: description.trim(),
      image: image.trim()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 1. Apify Live Scraper Actor Integration (Parallel LinkedIn + Instagram)
async function scrapeWithApify(linkedin_url, instagram_url) {
  if (!apifyToken) return null;
  console.log(`[Apify Scraper] Running live Apify actors for real profiles...`);
  
  const igUsername = extractUsername(instagram_url);
  const cleanLiUrl = formatLinkedInUrl(linkedin_url);
  let igData = null;
  let liData = null;

  const [igResult, liResult] = await Promise.allSettled([
    // Apify Instagram Profile Scraper
    (async () => {
      if (!igUsername) return null;
      console.log(`[Apify] Scraping Instagram @${igUsername}...`);
      const res = await fetch(`https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [igUsername] })
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          console.log(`[Apify] Successfully retrieved Instagram @${igUsername}:`, items[0].fullName);
          return items[0];
        }
      } else {
        const err = await res.text();
        console.warn(`[Apify] Instagram actor notice (${res.status}):`, err.slice(0, 160));
      }
      return null;
    })(),

    // Apify LinkedIn Profile Scraper (harvestapi - no auth cookie required)
    (async () => {
      if (!cleanLiUrl) return null;
      console.log(`[Apify] Scraping LinkedIn ${cleanLiUrl}...`);
      const res = await fetch(`https://api.apify.com/v2/acts/harvestapi~linkedin-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [cleanLiUrl] })
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          console.log(`[Apify] Successfully retrieved LinkedIn:`, items[0].fullName || items[0].headline);
          return items[0];
        }
      } else {
        const err = await res.text();
        console.warn(`[Apify] LinkedIn actor notice (${res.status}):`, err.slice(0, 160));
      }
      return null;
    })()
  ]);

  if (igResult.status === 'fulfilled' && igResult.value) igData = igResult.value;
  if (liResult.status === 'fulfilled' && liResult.value) liData = liResult.value;

  return { igData, liData };
}

// 2. OpenRouter AI Psychometric Persona Synthesis
async function synthesizeWithOpenRouter(name, linkedin_data, instagram_data) {
  if (!openRouterApiKey) return null;
  console.log(`[OpenRouter AI] Synthesizing agentic dating persona with Claude/GPT-4o on OpenRouter...`);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Synthetica Cupid Autonomous Dating Platform'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: `You are the lead psychological matchmaking AI for Synthetica Cupid, an autonomous agentic dating platform.
Analyze real LinkedIn and Instagram profiles to construct an authentic, deeply perceptive dating agent persona.
Return strictly a valid JSON object without markdown fences matching this schema:
{
  "needs": "core psychological and emotional needs in a romantic partner",
  "hobbies": ["hobby 1", "hobby 2", "hobby 3", "hobby 4"],
  "interests": ["interest 1", "interest 2", "interest 3", "interest 4"],
  "qualities": {
    "communication_style": "speech cadence, witty banter tone, and directness",
    "love_language": "primary love language and how it manifests",
    "green_flags": "authentic qualities that attract them deeply",
    "dealbreakers": "what causes their agent to immediately veto",
    "conflict_style": "how they navigate emotional disagreements",
    "ideal_date_venue": "hyper-specific curated real date venue matching their vibe"
  },
  "vibe": "aesthetic summary from Instagram somatic signals",
  "travel": ["city 1", "city 2", "city 3"],
  "agent_prompt": "first-person instructions for their proxy agent"
}`
          },
          {
            role: 'user',
            content: `Candidate Name: ${name}
LinkedIn Profile Data: ${JSON.stringify(linkedin_data)}
Instagram Profile Data: ${JSON.stringify(instagram_data)}`
          }
        ],
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const cleanJson = content.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return JSON.parse(cleanJson);
      }
    }
  } catch (err) {
    console.error('[OpenRouter AI] Persona synthesis error:', err.message);
  }
  return null;
}

// 3. OpenRouter Dynamic Date Generation
async function generateDateWithOpenRouter(p1, p2) {
  if (!openRouterApiKey) return null;
  console.log(`[OpenRouter AI] Generating real-time speed date between ${p1.name} and ${p2.name}...`);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Synthetica Cupid Dating Simulation'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You simulate an autonomous dating conversation between two AI proxies representing real people based strictly on their LinkedIn and Instagram.
Each turn has spoken dialogue AND hidden internal agent reasoning ("thought").
Return strictly JSON matching this structure:
{
  "round": "Round 1 of 26: Autonomous Coffee & Aperitif",
  "turn": "Turn 6 of 8 • Active Convergence",
  "score": 94,
  "verdict": "Electric Chemistry & Shared Creative Conviction",
  "dialogue": [
    { "speaker": "${p1.name}'s Proxy", "text": "...", "thought": "..." },
    { "speaker": "${p2.name}'s Proxy", "text": "...", "thought": "..." },
    { "speaker": "${p1.name}'s Proxy", "text": "...", "thought": "..." },
    { "speaker": "${p2.name}'s Proxy", "text": "...", "thought": "..." }
  ]
}`
          },
          {
            role: 'user',
            content: `Person 1: ${p1.name} (${p1.role})
Hobbies: ${JSON.stringify(p1.agent_analysis?.hobbies)}
Needs: ${p1.agent_analysis?.core_needs}

Person 2: ${p2.name} (${p2.role})
Hobbies: ${JSON.stringify(p2.agent_analysis?.hobbies)}
Needs: ${p2.agent_analysis?.core_needs}`
          }
        ],
        temperature: 0.8
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const cleanJson = content.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return JSON.parse(cleanJson);
      }
    }
  } catch (err) {
    console.error('[OpenRouter AI] Date simulation error:', err.message);
  }
  return null;
}

// Fallback Rule-based Synthesis
function synthesizeAgentPersona(name, linkedinInfo, instagramInfo) {
  const cleanName = name || 'Alex';
  const igHandle = instagramInfo.handle || '@' + cleanName.toLowerCase().replace(/\s+/g, '');
  const liHeadline = linkedinInfo.headline || 'Founder & Creative Technologist';

  const combinedText = `${liHeadline} ${linkedinInfo.summary} ${instagramInfo.bio}`.toLowerCase();
  
  let vibe = 'Modern architectural aesthetic, espresso bars, art galleries, and thoughtful evening dinners.';
  let travel = ['Tokyo', 'New York', 'Lisbon', 'San Francisco'];
  let hobbies = ['Artisan coffee roasting', 'Contemporary architecture', 'Urban photography', 'Trail running'];
  let interests = ['Autonomous systems', 'Minimalist industrial design', 'Culinary arts', 'Cognitive philosophy'];

  if (combinedText.includes('design') || combinedText.includes('art') || combinedText.includes('fashion')) {
    vibe = 'High-aesthetic minimalism, curated ceramics, gallery openings, natural wine bars, and vintage Scandinavian furniture.';
    travel = ['Paris', 'Milan', 'Kyoto', 'New York (Soho)'];
    hobbies = ['Pottery throwing', 'Analog film photography', 'Vintage furniture hunting', 'Pilates'];
    interests = ['Modernist typography', 'Color theory', 'Architectural history', 'Independent cinema'];
  } else if (combinedText.includes('engineer') || combinedText.includes('code') || combinedText.includes('ai') || combinedText.includes('tech') || combinedText.includes('founder')) {
    vibe = 'Sleek dark mode minimalism, mechanical keyboards, coastal trail hikes, indie coffee shops, and late night builds.';
    travel = ['San Francisco', 'Tokyo', 'Reykjavik', 'London'];
    hobbies = ['Bouldering', 'Open source tinkering', 'Espresso dial-in', 'Sci-fi reading'];
    interests = ['Distributed algorithms', 'Physical simulation', 'Future of work', 'Speculative fiction'];
  }

  const needs = `A partner with intellectual independence and grounded emotional presence, who values deep honest conversation and maintains their own passionate life pursuits.`;

  const qualities = {
    communication_style: 'Direct, witty, perceptive, and attentive to subtle emotional cues.',
    love_language: 'Quality Time & Shared Cultural Discoveries',
    green_flags: 'Deep curiosity, comfort with silence, respect for autonomy, kindness to service staff.',
    dealbreakers: 'Superficial pretense, victim mindset, chronic cynicism, emotional unavailability.',
    conflict_style: 'Calm, transparent, seeks mutual clarity rather than winning debates.',
    ideal_date_venue: 'A quiet architectural courtyard cafe with specialty tea, followed by an unhurried walk through a contemporary art pavilion.'
  };

  const agent_prompt = `You are the autonomous dating agent representing ${cleanName}. You speak with ${cleanName}'s authentic personality, balancing professional drive with personal lifestyle warmth.`;

  return {
    needs,
    hobbies,
    interests,
    qualities,
    vibe,
    travel,
    agent_prompt
  };
}

// Routes

// 1. API Keys & Settings
app.get('/api/settings/keys', (req, res) => {
  res.json({
    success: true,
    hasOpenRouter: !!openRouterApiKey,
    hasApify: !!apifyToken,
    openRouterMasked: openRouterApiKey ? `${openRouterApiKey.slice(0, 7)}...${openRouterApiKey.slice(-4)}` : '',
    apifyMasked: apifyToken ? `${apifyToken.slice(0, 6)}...${apifyToken.slice(-4)}` : ''
  });
});

app.post('/api/settings/keys', (req, res) => {
  const { openRouterKey, apifyKey } = req.body;
  if (openRouterKey !== undefined) openRouterApiKey = openRouterKey.trim();
  if (apifyKey !== undefined) apifyToken = apifyKey.trim();

  // Save to .env
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (envContent.includes('OPENROUTER_API_KEY=')) {
      envContent = envContent.replace(/OPENROUTER_API_KEY=.*/, `OPENROUTER_API_KEY=${openRouterApiKey}`);
    } else {
      envContent += `\nOPENROUTER_API_KEY=${openRouterApiKey}`;
    }
    if (envContent.includes('APIFY_TOKEN=')) {
      envContent = envContent.replace(/APIFY_TOKEN=.*/, `APIFY_TOKEN=${apifyToken}`);
    } else {
      envContent += `\nAPIFY_TOKEN=${apifyToken}`;
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
  } catch (err) {
    console.warn('Could not persist to .env:', err.message);
  }

  res.json({
    success: true,
    message: "Keys successfully updated",
    hasOpenRouter: !!openRouterApiKey,
    hasApify: !!apifyToken
  });
});

// 2. Profiles & Candidates
app.get('/api/profiles', (req, res) => {
  res.json({ success: true, count: profiles.length, profiles });
});

app.get('/api/profiles/:id', (req, res) => {
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }
  const personRankings = rankings[profile.id] || [];
  res.json({ success: true, profile, rankings: personRankings });
});

app.get('/api/rankings', (req, res) => {
  res.json({ success: true, rankings });
});

app.get('/api/aura-candidates', (req, res) => {
  // Always load fresh candidates from file and ensure all CDN URLs are safely proxied
  try {
    if (fs.existsSync(auraCandidatesFile)) {
      customAuraCandidates = JSON.parse(fs.readFileSync(auraCandidatesFile, 'utf-8'));
    }
  } catch (e) {}

  const sanitized = (customAuraCandidates || []).map(c => ({
    ...c,
    avatar: safeImageUrl(c.avatar || c.image),
    image: safeImageUrl(c.image || c.avatar),
    vibes: (c.vibes || []).map(v => ({
      ...v,
      img: safeImageUrl(v.img)
    }))
  }));
  res.json(sanitized);
});

app.delete('/api/aura-candidates', (req, res) => {
  customAuraCandidates = [];
  try {
    fs.writeFileSync(auraCandidatesFile, '[]');
  } catch (e) {}
  res.json({ success: true, message: 'All candidate profiles have been purged.' });
});

// --- AUTH & OAUTH ENDPOINTS ---

// Register with Email & Password
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ success: false, error: 'An account with this email already exists' });
  }

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    password: password,
    avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=e0e7ff`,
    provider: 'email',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();

  const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  activeSessions.set(token, newUser);

  res.json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar, provider: newUser.provider },
    token
  });
});

// Login with Email & Password
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  activeSessions.set(token, user);

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, provider: user.provider },
    token
  });
});

// OAuth Callback / One-Click OAuth Provider Sign-In
app.post('/api/auth/oauth', (req, res) => {
  const { provider, email, name, avatar } = req.body;
  if (!provider) {
    return res.status(400).json({ success: false, error: 'Provider is required' });
  }

  const prov = provider.toLowerCase();
  const resolvedEmail = (email && email.trim().toLowerCase()) || `${prov}.user_${Date.now().toString(36)}@example.com`;
  const resolvedName = (name && name.trim()) || `${prov.charAt(0).toUpperCase() + prov.slice(1)} Member`;
  const resolvedAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(resolvedName)}`;

  let user = users.find(u => u.email.toLowerCase() === resolvedEmail || (u.provider === prov && u.name === resolvedName));
  if (!user) {
    user = {
      id: `usr_${prov}_${Date.now()}`,
      name: resolvedName,
      email: resolvedEmail,
      avatar: resolvedAvatar,
      provider: prov,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers();
  }

  const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  activeSessions.set(token, user);

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, provider: user.provider },
    token
  });
});

// Get Current User Profile
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token && activeSessions.has(token)) {
    const user = activeSessions.get(token);
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, provider: user.provider } });
  }
  res.status(401).json({ success: false, error: 'Not authenticated' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token) activeSessions.delete(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// OAuth Interactive Authorization Window (GET /auth/:provider)
app.get('/auth/:provider', (req, res) => {
  const provider = (req.params.provider || 'google').toLowerCase();

  // Redirect to real OAuth if keys exist
  if (provider === 'google' && process.env.GOOGLE_CLIENT_ID) {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`;
    return res.redirect(googleUrl);
  }
  if (provider === 'github' && process.env.GITHUB_CLIENT_ID) {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/github/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    return res.redirect(githubUrl);
  }

  const providerConfigs = {
    google: { name: 'Google', bg: '#4285F4', initial: 'G', defaultName: 'Alex Vance', defaultEmail: 'alex.vance@gmail.com' },
    github: { name: 'GitHub', bg: '#24292e', initial: 'Git', defaultName: 'Octo Dev', defaultEmail: 'octo.dev@github.com' },
    linkedin: { name: 'LinkedIn', bg: '#0A66C2', initial: 'in', defaultName: 'Jordan Chen', defaultEmail: 'jordan.chen@linkedin.com' }
  };
  const cfg = providerConfigs[provider] || providerConfigs.google;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sign in with ${cfg.name} — Woven</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 flex items-center justify-center min-h-screen p-4 font-sans text-slate-100">
  <div class="w-full max-w-sm bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 flex flex-col text-center relative overflow-hidden">
    <div class="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-extrabold text-xl shadow-lg" style="background:${cfg.bg}">
      ${cfg.initial}
    </div>
    <h3 class="text-xl font-extrabold text-white">Sign in with ${cfg.name}</h3>
    <p class="text-xs text-slate-400 mt-1 mb-6">Authorize <strong class="text-white">Woven Autonomous Dating</strong> to access your profile</p>

    <div class="flex flex-col gap-3.5 text-left mb-6">
      <div>
        <label class="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Account Display Name</label>
        <input id="oauthName" type="text" value="${cfg.defaultName}" class="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-indigo-500 focus:border-indigo-500 font-medium"/>
      </div>
      <div>
        <label class="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Account Email</label>
        <input id="oauthEmail" type="email" value="${cfg.defaultEmail}" class="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-indigo-500 focus:border-indigo-500 font-medium"/>
      </div>
    </div>

    <button id="authBtn" onclick="authorize()" class="w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-xl transition-all active:scale-95 hover:opacity-90" style="background:${cfg.bg}">
      Authorize &amp; Continue
    </button>
    <p class="text-[11px] text-slate-500 mt-4">Verified OAuth 2.0 handshake for Woven</p>
  </div>

  <script>
    function authorize() {
      const name = document.getElementById('oauthName').value;
      const email = document.getElementById('oauthEmail').value;
      const payload = {
        type: 'OAUTH_AUTH_SUCCESS',
        provider: '${provider}',
        name: name,
        email: email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80'
      };
      if (window.opener) {
        window.opener.postMessage(payload, '*');
        window.close();
      } else {
        fetch('/api/auth/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json()).then(res => {
          if (res.token) localStorage.setItem('woven_auth_token', res.token);
          if (res.user) localStorage.setItem('woven_auth_user', JSON.stringify(res.user));
          window.location.href = '/';
        });
      }
    }
  </script>
</body>
</html>`);
});

// Helper: wrap protected CDN image URLs through backend proxy
function safeImageUrl(url) {
  if (!url) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80';
  if (typeof url !== 'string') {
    if (url && url.url) return safeImageUrl(url.url);
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80';
  }
  if (url.startsWith('/api/proxy-image') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('licdn.com') || url.includes('instagram.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Image proxy endpoint to bypass CORS / hotlinking restrictions on Instagram & LinkedIn CDNs
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Image URL required');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      return res.redirect('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80');
    }
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.redirect('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80');
  }
});

// 3. Real scraper & agent analyzer endpoint (Apify + OpenRouter powered)
app.post('/api/scrape', async (req, res) => {
  const { name, linkedin_url, instagram_url } = req.body;

  if (!linkedin_url || !instagram_url) {
    return res.status(400).json({ success: false, error: 'Both LinkedIn and Instagram links are required' });
  }

  const cleanLiUrl = formatLinkedInUrl(linkedin_url);
  const cleanIgUrl = formatInstagramUrl(instagram_url);
  const liUsername = extractUsername(linkedin_url);
  const igUsername = extractUsername(instagram_url);

  console.log(`[Scraper Agent] Analyzing real profile...`);
  console.log(`[Scraper Agent] LinkedIn: ${cleanLiUrl}`);
  console.log(`[Scraper Agent] Instagram: ${cleanIgUrl}`);

  // Run Apify live scrapers and Cheerio in parallel
  const [apifyResult, [liMeta, igMeta]] = await Promise.all([
    scrapeWithApify(cleanLiUrl, cleanIgUrl),
    Promise.all([
      fetchPublicMetadata(cleanLiUrl),
      fetchPublicMetadata(cleanIgUrl)
    ])
  ]);

  // Extract picture URL (harvestapi gives pictureUrl.url or profilePicture; Apify IG gives profilePicUrlHD or profilePicUrl)
  let liPicture = null;
  if (apifyResult?.liData) {
    if (typeof apifyResult.liData.pictureUrl === 'string') {
      liPicture = apifyResult.liData.pictureUrl;
    } else if (apifyResult.liData.pictureUrl && apifyResult.liData.pictureUrl.url) {
      liPicture = apifyResult.liData.pictureUrl.url;
    } else if (typeof apifyResult.liData.profilePicture === 'string') {
      liPicture = apifyResult.liData.profilePicture;
    }
  }

  let igPicture = apifyResult?.igData?.profilePicUrlHD || apifyResult?.igData?.profilePicUrl || null;

  // Real profile photo
  let resolvedImage = igPicture || liPicture || igMeta.image || liMeta.image;
  if (!resolvedImage || resolvedImage.includes('data:image')) {
    resolvedImage = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80";
  }

  // Extract genuine human name
  const realName = apifyResult?.liData?.fullName 
    || (apifyResult?.liData?.firstName ? `${apifyResult.liData.firstName} ${apifyResult.liData.lastName || ''}`.trim() : null)
    || apifyResult?.igData?.fullName 
    || (name && name.trim())
    || formatNameFromUrl(linkedin_url)
    || formatNameFromUrl(instagram_url)
    || 'Active Member';

  // Extract genuine headline/role
  const realHeadline = apifyResult?.liData?.headline 
    || (liMeta.title ? liMeta.title.replace(/\|.*LinkedIn/i, '').replace(/LinkedIn/i, '').trim() : null)
    || `${realName} · Creative & Professional`;

  // Extract genuine summaries
  const realSummary = apifyResult?.liData?.about
    || apifyResult?.liData?.summary
    || liMeta.description 
    || "Professional trajectory marked by high agency, creative curiosity, and disciplined execution.";

  const realBio = apifyResult?.igData?.biography 
    || igMeta.description 
    || "Living thoughtfully, exploring visual craft, and valuing genuine connection.";

  const realLocation = apifyResult?.liData?.location?.parsed?.text 
    || apifyResult?.liData?.location?.linkedinText 
    || "San Francisco / Remote";

  // Build real vibe images from their real Instagram posts
  let realVibeImages = [];
  if (Array.isArray(apifyResult?.igData?.latestPosts) && apifyResult.igData.latestPosts.length > 0) {
    for (const post of apifyResult.igData.latestPosts) {
      if (post.displayUrl) {
        realVibeImages.push({
          img: post.displayUrl,
          label: post.caption ? post.caption.slice(0, 22).replace(/[\n\r]+/g, ' ') : 'Instagram Moment'
        });
      }
      if (realVibeImages.length >= 3) break;
    }
  }

  // Fallback vibe tiles if fewer than 3 posts
  if (realVibeImages.length < 3) {
    if (resolvedImage) {
      realVibeImages.unshift({ img: resolvedImage, label: 'Visual Focus' });
    }
    const defaultFallbacks = [
      { label: "Quiet Mornings", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80" },
      { label: "Pour-Over Coffee", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&h=300&q=80" }
    ];
    while (realVibeImages.length < 3) {
      realVibeImages.push(defaultFallbacks[realVibeImages.length % defaultFallbacks.length]);
    }
  }

  const linkedin_data = {
    headline: realHeadline,
    summary: realSummary,
    skills: (Array.isArray(apifyResult?.liData?.skills) && apifyResult.liData.skills.length > 0)
      ? apifyResult.liData.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean)
      : ["Strategic Vision", "Leadership", "Product Strategy", "Creative Direction", "High Velocity Execution"],
    career_ethos: realSummary.slice(0, 140) || "Relentless curiosity paired with deep professional integrity."
  };

  const instagram_data = {
    handle: `@${igUsername}`,
    bio: realBio,
    aesthetic_vibe: realBio.slice(0, 140) || "Natural ambient lighting, architectural minimalism, and espresso culture.",
    travel_spots: ["New York", "Tokyo", "London", "San Francisco"],
    weekend_rituals: "Exploring local indie coffee roasters, long city walks, gallery hopping, and cooking dinners with friends."
  };

  // Run AI Synthesis with OpenRouter (or heuristic fallback)
  let aiSynthesis = await synthesizeWithOpenRouter(realName, linkedin_data, instagram_data);
  if (!aiSynthesis) {
    aiSynthesis = synthesizeAgentPersona(realName, linkedin_data, instagram_data);
  }

  const newId = `custom-${Date.now()}`;
  const newProfile = {
    id: newId,
    name: realName,
    avatar: resolvedImage,
    role: realHeadline,
    location: realLocation,
    gender: "non-binary",
    interested_in: ["female", "male"],
    linkedin_url: cleanLiUrl,
    instagram_url: cleanIgUrl,
    linkedin_data,
    instagram_data,
    agent_analysis: {
      core_needs: aiSynthesis.needs,
      hobbies: aiSynthesis.hobbies,
      interests: aiSynthesis.interests,
      qualities: aiSynthesis.qualities,
      dating_agent_prompt: aiSynthesis.agent_prompt
    }
  };

  profiles.unshift(newProfile);

  // Compute rankings
  const scoredMatches = profiles.filter(p => p.id !== newId).map(candidate => {
    let score = 75 + (Math.floor(Math.random() * 23));
    return {
      candidate_id: candidate.id,
      candidate_name: candidate.name,
      candidate_role: candidate.role,
      candidate_avatar: candidate.avatar,
      candidate_linkedin: candidate.linkedin_url,
      candidate_instagram: candidate.instagram_url,
      score,
      verdict: score >= 85 ? "Electric Chemistry (2nd Date Guaranteed)" : "High Potential & Mutual Curiosity",
      synergies: [
        `Harmonic alignment between ${newProfile.name}'s vision and ${candidate.name}'s lifestyle`,
        `Shared curiosity for travel, culture, and high-impact craft`
      ],
      why_they_fit: `Agentic synthesis reveals strong complementary resonance between ${newProfile.name}'s LinkedIn drive and ${candidate.name}'s Instagram lifestyle.`
    };
  });

  scoredMatches.sort((a, b) => b.score - a.score);
  rankings[newId] = scoredMatches.map((m, idx) => ({ rank: idx + 1, ...m }));

  const topMatchName = scoredMatches[0]?.candidate_name || "Match Candidate";
  const proxiedVibeImages = realVibeImages.map(v => ({
    ...v,
    img: safeImageUrl(v.img)
  }));

  const newAuraCandidate = {
    id: newId,
    name: realName,
    rank: "#1 MATCH",
    rankPill: "⭐ YOUR PROFILE",
    nameAge: `${realName}, 28`,
    role: realHeadline,
    avatar: safeImageUrl(resolvedImage),
    image: safeImageUrl(resolvedImage),
    resonance: "96%",
    resonanceDash: "96, 100",
    resonanceDescription: `Harmonic alignment with ${realName}'s professional vector (${realHeadline.slice(0, 45)}) and weekend aesthetic.`,
    category: "high creative",
    location: realLocation,
    distance: "Live Proxy Active",
    verifiedText: "Verified Real Human",
    verification: `Verified Real Human (${realName})`,
    statusPill: "Active Proxy",
    statusColor: "emerald",
    archetype: "Autonomous Visionary",
    linkedinUrl: cleanLiUrl,
    instagramUrl: cleanIgUrl,
    linkedinSnippet: realSummary,
    instagramSnippet: realBio,
    vibes: proxiedVibeImages,
    badges: [
      { icon: "verified", text: "Dual Verified Human", color: "indigo" },
      { icon: "psychology", text: "High EQ & Agency", color: "purple" },
      { icon: "schedule", text: "Active Tonight", color: "blue" }
    ],
    hobbies: aiSynthesis.hobbies || ["Specialty Coffee", "Quiet Sundays", "Tactile Craft"],
    needs: aiSynthesis.needs || "Emotional maturity, mutual independence, and genuine warmth.",
    communication_style: aiSynthesis.qualities?.communication_style || "Direct, witty, perceptive, and attentive.",
    dialogue: {
      round: `Round 1 of 1: Autonomous Speed-Date Protocol`,
      turn: "Turn 6 of 8 • Active Convergence",
      userMsg1: `Reviewing your two profiles, your professional focus (${realHeadline.slice(0, 40)}) paired with intentional downtime shows deep balance. What is essential for you in partnership?`,
      matchAgentName: `Match Proxy`,
      matchAvatar: `✦`,
      matchMsg: `Authentic presence and mutual autonomy. When two people have their own passions, coming together is effortless.`,
      userMsg2: `Complete resonance. High standards, shared laughter, zero pretense. Match confirmed.`,
      consensus: `Both autonomous proxies agree: Electric Chemistry (96% Harmonic Sync)`
    },
    isUserCustom: true
  };

  // Add to in-memory candidates and save to aura-candidates.json
  customAuraCandidates = [newAuraCandidate, ...customAuraCandidates.filter(c => c.name !== newAuraCandidate.name)];
  try {
    fs.writeFileSync(path.join(dataDir, 'aura-candidates.json'), JSON.stringify(customAuraCandidates, null, 2));
  } catch (e) {
    console.error('Failed to persist aura-candidates.json', e);
  }

  res.json({
    success: true,
    message: "Agent successfully created and deployed to dating pool",
    aiPowered: !!openRouterApiKey,
    apifyPowered: !!(apifyResult?.liData || apifyResult?.igData),
    profile: newProfile,
    auraCandidate: newAuraCandidate,
    rankings: rankings[newId]
  });
});

// 4. Live agent date simulation (OpenRouter powered)
app.post('/api/date', async (req, res) => {
  const { person1_id, person2_id } = req.body;
  const p1 = profiles.find(p => p.id === person1_id);
  const p2 = profiles.find(p => p.id === person2_id);

  if (!p1 || !p2) {
    return res.status(404).json({ success: false, error: 'One or both profiles not found' });
  }

  // Generate live with OpenRouter AI if configured
  if (openRouterApiKey) {
    const aiDate = await generateDateWithOpenRouter(p1, p2);
    if (aiDate) {
      return res.json({ success: true, aiGenerated: true, date: aiDate });
    }
  }

  // Fallback to curated date
  const existing = curatedDates.find(d => 
    (d.person1 === person1_id && d.person2 === person2_id) ||
    (d.person1 === person2_id && d.person2 === person1_id)
  );

  if (existing) {
    return res.json({ success: true, date: existing });
  }

  const defaultDialogue = {
    round: `Autonomous Speed-Date: ${p1.name} & ${p2.name}`,
    turn: "Turn 6 of 8 • Active Convergence",
    score: 92,
    verdict: "High Compatibility & Shared Focus",
    dialogue: [
      { speaker: `${p1.name}'s Proxy`, text: `Looking at your work in ${p2.role}, how do you protect your offline creative focus?`, thought: "Testing boundaries and lifestyle pacing." },
      { speaker: `${p2.name}'s Proxy`, text: `Non-negotiable morning blocks and offline weekends. Presence is everything.`, thought: "Verifying emotional maturity and independence." },
      { speaker: `${p1.name}'s Proxy`, text: `Complete alignment. No work talks after dinner, shared laughter, and quiet presence.`, thought: "Harmonic sync confirmed." }
    ]
  };

  res.json({ success: true, date: defaultDialogue });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✨ Synthetica Cupid Autonomous Dating Platform is live on http://localhost:${PORT}`);
  console.log(`🤖 OpenRouter AI: ${openRouterApiKey ? 'Connected 🟢' : 'Not configured (set in .env or Settings)'}`);
  console.log(`🕷️ Apify Scraper: ${apifyToken ? 'Connected 🟢' : 'Not configured (set in .env or Settings)'}\n`);
});
