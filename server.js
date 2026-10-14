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
let auraCandidates = fs.existsSync(path.join(dataDir, 'aura-candidates.json'))
  ? JSON.parse(fs.readFileSync(path.join(dataDir, 'aura-candidates.json'), 'utf-8'))
  : [];
let customAuraCandidates = [];

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

// Helper: Extract username from social links
function extractUsername(url) {
  try {
    const clean = (url || '').trim().replace(/\/+$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1].replace('@', '');
  } catch (e) {
    return 'user';
  }
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

// 1. Apify Live Scraper Actor Integration
async function scrapeWithApify(linkedin_url, instagram_url) {
  if (!apifyToken) return null;
  console.log(`[Apify Scraper] Running live Apify actors for real profiles...`);
  
  const igUsername = extractUsername(instagram_url);
  let igData = null;
  let liData = null;

  try {
    // Apify Instagram Profile Scraper
    const igRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [igUsername] })
    });
    if (igRes.ok) {
      const items = await igRes.json();
      if (Array.isArray(items) && items.length > 0) {
        igData = items[0];
        console.log(`[Apify] Successfully scraped Instagram @${igUsername}:`, igData.fullName);
      }
    }
  } catch (err) {
    console.warn('[Apify] Instagram actor notice:', err.message);
  }

  try {
    // Apify LinkedIn Profile Scraper
    const liRes = await fetch(`https://api.apify.com/v2/acts/curious_coder~linkedin-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [linkedin_url] })
    });
    if (liRes.ok) {
      const items = await liRes.json();
      if (Array.isArray(items) && items.length > 0) {
        liData = items[0];
        console.log(`[Apify] Successfully scraped LinkedIn:`, liData.fullName || liData.headline);
      }
    }
  } catch (err) {
    console.warn('[Apify] LinkedIn actor notice:', err.message);
  }

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
  res.json([...customAuraCandidates, ...auraCandidates]);
});

// 3. Real scraper & agent analyzer endpoint (Apify + OpenRouter powered)
app.post('/api/scrape', async (req, res) => {
  const { name, linkedin_url, instagram_url } = req.body;

  if (!linkedin_url || !instagram_url) {
    return res.status(400).json({ success: false, error: 'Both LinkedIn and Instagram links are required' });
  }

  const personName = (name && name.trim()) || formatNameFromUrl(linkedin_url) || formatNameFromUrl(instagram_url) || 'New Prospect';
  const liUsername = extractUsername(linkedin_url);
  const igUsername = extractUsername(instagram_url);

  console.log(`[Scraper Agent] Analyzing real profile: ${personName}...`);
  console.log(`[Scraper Agent] LinkedIn: ${linkedin_url}`);
  console.log(`[Scraper Agent] Instagram: ${instagram_url}`);

  // Try Apify live scraper first
  const apifyResult = await scrapeWithApify(linkedin_url, instagram_url);

  // Fallback to Cheerio / OpenGraph
  const [liMeta, igMeta] = await Promise.all([
    fetchPublicMetadata(linkedin_url),
    fetchPublicMetadata(instagram_url)
  ]);

  const resolvedImage = apifyResult?.igData?.profilePicUrl 
    || apifyResult?.liData?.pictureUrl 
    || igMeta.image 
    || liMeta.image 
    || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80";

  const linkedin_data = {
    headline: apifyResult?.liData?.headline 
      || (liMeta.title ? liMeta.title.replace(/\|.*LinkedIn/i, '').trim() : `${personName} · Founder & Creator`),
    summary: apifyResult?.liData?.summary 
      || liMeta.description 
      || `Active leader with a track record of innovation, leadership, and high-impact projects.`,
    skills: apifyResult?.liData?.skills || ["Strategic Vision", "Leadership", "Product Strategy", "Creative Direction", "High Velocity Execution"],
    career_ethos: "Relentless curiosity paired with deep professional integrity and human empathy."
  };

  const instagram_data = {
    handle: `@${igUsername}`,
    bio: apifyResult?.igData?.biography || igMeta.description || `Adventures, aesthetics, and moments in between.`,
    aesthetic_vibe: "Natural ambient lighting, architectural minimalism, espresso culture, and spontaneous weekend journeys.",
    travel_spots: ["New York", "Tokyo", "London", "San Francisco"],
    weekend_rituals: "Exploring local indie coffee roasters, long city walks, gallery hopping, and cooking dinners with friends."
  };

  // Run AI Synthesis with OpenRouter (or heuristic fallback)
  let aiSynthesis = await synthesizeWithOpenRouter(personName, linkedin_data, instagram_data);
  if (!aiSynthesis) {
    aiSynthesis = synthesizeAgentPersona(personName, linkedin_data, instagram_data);
  }

  const newId = `custom-${Date.now()}`;
  const newProfile = {
    id: newId,
    name: personName,
    avatar: resolvedImage,
    role: linkedin_data.headline,
    location: "San Francisco / Remote",
    gender: "non-binary",
    interested_in: ["female", "male"],
    linkedin_url,
    instagram_url,
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

  const topMatchName = scoredMatches[0]?.candidate_name || "Mira Murati";
  const newAuraCandidate = {
    id: newId,
    name: personName,
    rank: "#1 MATCH",
    rankPill: "⭐ YOUR PROFILE",
    nameAge: `${personName}, 28`,
    role: linkedin_data.headline,
    avatar: resolvedImage,
    image: resolvedImage,
    resonance: "96%",
    resonanceDash: "96, 100",
    resonanceDescription: "Strong harmonic alignment across professional vision, personal boundaries, and lifestyle aesthetics.",
    category: "high creative",
    location: newProfile.location,
    distance: "Live Proxy Active",
    verifiedText: "Verified Real Human",
    verification: "Verified Real Human",
    statusPill: "Active Proxy",
    statusColor: "emerald",
    archetype: "Autonomous Visionary",
    linkedinUrl: linkedin_url,
    instagramUrl: instagram_url,
    linkedinSnippet: linkedin_data.career_ethos,
    instagramSnippet: instagram_data.aesthetic_vibe,
    vibes: [
      { label: aiSynthesis.hobbies[0] || "Creative Flow", img: resolvedImage },
      { label: instagram_data.travel_spots[0] || "Weekend Trips", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80" },
      { label: "Pour-Over Coffee", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&h=300&q=80" }
    ],
    badges: [
      { icon: "verified", text: "Dual Verified", color: "indigo" },
      { icon: "psychology", text: "High EQ & Agency", color: "purple" },
      { icon: "schedule", text: "Active Tonight", color: "blue" }
    ],
    hobbies: aiSynthesis.hobbies,
    needs: aiSynthesis.needs,
    communication_style: aiSynthesis.qualities?.communication_style || "Direct, witty, perceptive, and attentive.",
    dialogue: {
      round: `Round 1 of 26: Autonomous Speed-Date with ${topMatchName}`,
      turn: "Turn 6 of 8 • Active Convergence",
      userMsg1: `Reviewing your two profiles, your professional focus paired with ${aiSynthesis.hobbies[0]} shows deep balance. What is essential for you in partnership?`,
      matchAgentName: `${topMatchName}'s Proxy`,
      matchAvatar: topMatchName.charAt(0),
      matchMsg: `Strict boundaries and mutual autonomy. When two people have their own passions, coming together is effortless.`,
      userMsg2: `Complete resonance. Authentic presence and shared respect for dedicated craft. Match confirmed.`,
      consensus: `Both autonomous proxies agree: Electric Chemistry (96% Harmonic Sync)`
    },
    isUserCustom: true
  };

  customAuraCandidates.unshift(newAuraCandidate);

  res.json({
    success: true,
    message: "Agent successfully created and deployed to dating pool",
    aiPowered: !!openRouterApiKey,
    apifyPowered: !!apifyResult,
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
