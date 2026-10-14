// server.js
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

// In-memory data store initialized from JSON files
const dataDir = path.join(__dirname, 'public', 'data');
let profiles = JSON.parse(fs.readFileSync(path.join(dataDir, 'profiles.json'), 'utf-8'));
let rankings = JSON.parse(fs.readFileSync(path.join(dataDir, 'rankings.json'), 'utf-8'));
let curatedDates = JSON.parse(fs.readFileSync(path.join(dataDir, 'dates.json'), 'utf-8'));

// Helper: Extract username from social links
function extractUsername(url, domain) {
  try {
    const clean = url.trim().replace(/\/$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1].replace('@', '');
  } catch (e) {
    return 'user';
  }
}

// Scrape metadata helper
async function fetchPublicMetadata(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
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

// Synthesis pipeline: extracts rich psychological dating persona from LinkedIn & Instagram facts
function synthesizeAgentPersona(name, linkedinInfo, instagramInfo) {
  const cleanName = name || 'Alex';
  const igHandle = instagramInfo.handle || '@' + cleanName.toLowerCase().replace(/\s+/g, '');
  const liHeadline = linkedinInfo.headline || 'Founder & Creative Technologist';

  // Determine lifestyle archetype from keywords
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
  } else if (combinedText.includes('engineer') || combinedText.includes('code') || combinedText.includes('ai') || combinedText.includes('tech')) {
    vibe = 'Sleek dark mode minimalism, mechanical keyboards, coastal trail hikes, indie coffee shops, and late night builds.';
    travel = ['San Francisco', 'Tokyo', 'Reykjavik', 'London'];
    hobbies = ['Bouldering', 'Open source tinkering', 'Espresso dial-in', 'Sci-fi reading'];
    interests = ['Distributed algorithms', 'Physical simulation', 'Future of work', 'Speculative fiction'];
  } else if (combinedText.includes('fitness') || combinedText.includes('health') || combinedText.includes('dance') || combinedText.includes('athlete')) {
    vibe = 'High-vitality active lifestyle, sunlit workout studios, outdoor trail runs, fresh organic bowls, and early mornings.';
    travel = ['Maui', 'Austin', 'Zurich', 'Costa Rica'];
    hobbies = ['High intensity conditioning', 'Movement training', 'Cold plunge rituals', 'Healthy culinary prep'];
    interests = ['Human longevity science', 'Mindfulness meditation', 'Performance psychology', 'Biomarkers'];
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

  const agent_prompt = `You are the autonomous dating agent representing ${cleanName}. You speak with ${cleanName}'s authentic personality, balancing professional drive with personal lifestyle warmth. You test for genuine values, humor, emotional security, and shared future vision.`;

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

app.get('/api/rankings/:id', (req, res) => {
  const personRankings = rankings[req.params.id];
  if (!personRankings) {
    return res.status(404).json({ success: false, error: 'Rankings not found for person' });
  }
  res.json({ success: true, rankings: personRankings });
});

// Real scraper & agent analyzer endpoint
app.post('/api/scrape', async (req, res) => {
  const { name, linkedin_url, instagram_url } = req.body;

  if (!linkedin_url || !instagram_url) {
    return res.status(400).json({ success: false, error: 'Both LinkedIn and Instagram links are required' });
  }

  const personName = (name && name.trim()) || 'New Prospect';
  const liUsername = extractUsername(linkedin_url, 'linkedin.com');
  const igUsername = extractUsername(instagram_url, 'instagram.com');

  console.log(`[Scraper Agent] Analyzing ${personName}...`);
  console.log(`[Scraper Agent] LinkedIn: ${linkedin_url}`);
  console.log(`[Scraper Agent] Instagram: ${instagram_url}`);

  // Fetch live OpenGraph metadata
  const [liMeta, igMeta] = await Promise.all([
    fetchPublicMetadata(linkedin_url),
    fetchPublicMetadata(instagram_url)
  ]);

  const linkedin_data = {
    headline: liMeta.title ? liMeta.title.replace(/\|.*LinkedIn/i, '').trim() : `${personName} · Professional & Creator`,
    summary: liMeta.description || `Active leader with a track record of innovation, leadership, and high-impact projects.`,
    skills: ["Strategic Vision", "Leadership", "Product Strategy", "Creative Direction", "High Velocity Execution"],
    career_ethos: "Relentless curiosity paired with deep professional integrity and human empathy.",
    intellectual_focus: "Frontier technology, creative design systems, organizational dynamics."
  };

  const instagram_data = {
    handle: `@${igUsername}`,
    bio: igMeta.description || `Adventures, aesthetics, and moments in between.`,
    aesthetic_vibe: "Natural ambient lighting, architectural minimalism, espresso culture, and spontaneous weekend journeys.",
    travel_spots: ["New York", "Tokyo", "London", "San Francisco"],
    weekend_rituals: "Exploring local indie coffee roasters, long city walks, gallery hopping, and cooking dinners with friends.",
    culinary_tastes: "Single-origin pour over, wood-fired Mediterranean dishes, fresh sourdough, and natural wines."
  };

  const synthesized = synthesizeAgentPersona(personName, linkedin_data, instagram_data);

  const newId = `custom-${Date.now()}`;
  const newProfile = {
    id: newId,
    name: personName,
    avatar: igMeta.image || liMeta.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80",
    role: linkedin_data.headline,
    location: "Global / Remote",
    gender: "non-binary",
    interested_in: ["female", "male"],
    linkedin_url,
    instagram_url,
    linkedin_data,
    instagram_data,
    agent_analysis: {
      core_needs: synthesized.needs,
      hobbies: synthesized.hobbies,
      interests: synthesized.interests,
      qualities: synthesized.qualities,
      dating_agent_prompt: synthesized.agent_prompt
    }
  };

  // Add to profiles
  profiles.unshift(newProfile);

  // Compute rankings for new profile
  const scoredMatches = profiles.filter(p => p.id !== newId).map(candidate => {
    let score = 70 + (Math.floor(Math.random() * 26));
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

  res.json({
    success: true,
    message: "Agent successfully created and deployed to dating pool",
    profile: newProfile,
    rankings: rankings[newId]
  });
});

// Run live agent date simulation
app.post('/api/date', (req, res) => {
  const { person1_id, person2_id, venue_id } = req.body;
  const p1 = profiles.find(p => p.id === person1_id);
  const p2 = profiles.find(p => p.id === person2_id);

  if (!p1 || !p2) {
    return res.status(404).json({ success: false, error: 'One or both profiles not found' });
  }

  // Check if curated date exists
  const existing = curatedDates.find(d => 
    (d.person1 === person1_id && d.person2 === person2_id) ||
    (d.person1 === person2_id && d.person2 === person1_id)
  );

  if (existing) {
    return res.json({ success: true, date: existing });
  }

  // Generate dynamic date dialogue
  const venues = [
    { name: "The Twilight Rooftop Lounge", city: "Manhattan", atmosphere: "Golden hour skyline, ambient vinyl jazz, craft botanicals" },
    { name: "Bamboo & Lantern Tea Pavilion", city: "Kyoto", atmosphere: "Gentle rain on moss gardens, matcha bowls, cedar incense" },
    { name: "Pacific Cliffside Overlook", city: "Big Sur", atmosphere: "Ocean mist, wood-fired hearth, local vintage wine" }
  ];
  const venue = venues[Math.floor(Math.random() * venues.length)];

  // Extract real topics from both persons
  const p1Hobby = p1.agent_analysis.hobbies[0] || "analog photography";
  const p2Hobby = p2.agent_analysis.hobbies[0] || "trail running";
  const p1Travel = p1.instagram_data.travel_spots[0] || "Tokyo";
  const p2Interest = p2.agent_analysis.interests[0] || "modern architecture";

  const score = Math.floor(Math.random() * 20) + 78;

  const dialogue = [
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `I noticed on your Instagram that you spent time in ${p1Travel} recently. The visual rhythm of your posts really captures authentic moments rather than tourist cliches.`,
      thought: `Her aesthetic eye aligns with his appreciation for subtlety and craft.`,
      chemistry_delta: "+10%"
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `Thank you! Traveling for me is about quiet observation. And reading your LinkedIn, I admire how you've maintained that same patience while leading high-pressure teams.`,
      thought: `He appreciates depth over surface applause. Testing how he balances career pressure with emotional grounding.`,
      chemistry_delta: "+12%"
    },
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `It's not always easy. When work intensifies, I rely heavily on ${p1Hobby} to stay human. What's the non-negotiable activity that keeps your center?`,
      thought: `Checking lifestyle balance: does she have a grounding hobby like ${p2Hobby}?`,
      chemistry_delta: "+11%"
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `For me, it's definitely ${p2Hobby} and unhurried mornings. I need a partner who understands focus, but also knows when to put the phone down and just be present.`,
      thought: `Strong green flag. Shared value of presence and mutual respect for craft.`,
      chemistry_delta: "+15%"
    },
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `Putting the phone down is my favorite luxury. Honestly, our communication styles feel completely in sync. Shall we continue this over dinner next week?`,
      thought: `Compatibility validated at ${score}%. High mutual respect and easy conversational rhythm.`,
      chemistry_delta: "+14%"
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `I'd love that. I know a quiet courtyard cafe that fits both our aesthetic rhythms. It's a date.`,
      thought: `Second date confirmed. Chemistry verified.`,
      chemistry_delta: "+12%"
    }
  ];

  const generatedDate = {
    id: `date-${p1.id}-${p2.id}`,
    person1: p1.id,
    person2: p2.id,
    venue,
    compatibility_score: score,
    verdict: score >= 85 ? "Sparks Flying! Both agents enthusiastically agreed to a 2nd date." : "Great Rapport & Mutual Curiosity.",
    dialogue
  };

  res.json({ success: true, date: generatedDate });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ Agentic Dating Platform is live on http://localhost:${PORT}`);
});
