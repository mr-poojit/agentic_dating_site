// scripts/build-aura-data.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profiles = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'profiles.json'), 'utf-8'));
const rankings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'rankings.json'), 'utf-8'));
const dates = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'dates.json'), 'utf-8'));

// Build Aura formatted candidates array
export const auraCandidates = profiles.map((p, idx) => {
  const rankNumber = idx + 1;
  const rankPill = rankNumber === 1 ? "#1 MATCH" : rankNumber <= 3 ? `#${rankNumber} TOP MATCH` : `#${rankNumber} MATCH`;
  
  // Calculate resonance
  const pRankings = rankings[p.id] || [];
  const topMatch = pRankings[0];
  const resonanceScore = topMatch ? topMatch.score : Math.floor(Math.random() * 16) + 82;

  const vibesList = [
    {
      label: p.agent_analysis.hobbies[0] || "Creative Flow",
      img: p.avatar
    },
    {
      label: p.instagram_data.travel_spots[0] || "Weekend Escapes",
      img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80"
    },
    {
      label: p.instagram_data.culinary_tastes.split(',')[0] || "Artisan Coffee",
      img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&h=300&q=80"
    }
  ];

  // Curated dialogue from pre-generated dates or dynamic
  const curDate = dates.find(d => d.person1 === p.id || d.person2 === p.id);
  let dialogueData;
  if (curDate && curDate.dialogue && curDate.dialogue.length >= 4) {
    dialogueData = {
      round: `Round ${rankNumber} of 26: Autonomous Midnight Aperitif`,
      turn: `Turn 6 of 8 • 12m elapsed`,
      userMsg1: curDate.dialogue[0].text,
      matchAgentName: curDate.dialogue[1].speaker,
      matchAvatar: p.name.charAt(0),
      matchMsg: curDate.dialogue[1].text,
      userMsg2: curDate.dialogue[2].text,
      consensus: `Both autonomous proxies agree: ${curDate.verdict}`
    };
  } else {
    dialogueData = {
      round: `Round ${rankNumber} of 26: Autonomous Resonance Session`,
      turn: `Turn 6 of 8 • 10m elapsed`,
      userMsg1: `Reviewing your Instagram and LinkedIn, your balance of intense creative output with ${p.agent_analysis.hobbies[0]} is striking. How do you protect your downtime?`,
      matchAgentName: `${p.name}'s Proxy`,
      matchAvatar: p.name.charAt(0),
      matchMsg: `Strict boundaries. ${p.agent_analysis.core_needs} She told me to ensure any partner values genuine presence without checking notifications.`,
      userMsg2: `Complete alignment. No phones at dinner, early morning coffee, and shared respect for focused craft. Match confirmed.`,
      consensus: `Mutual proxy consensus reached: Outstanding intellectual & somatic chemistry (${resonanceScore}% sync).`
    };
  }

  return {
    id: idx,
    profileId: p.id,
    name: p.name,
    nameAge: `${p.name}, ${p.gender === 'female' ? '30' : '35'}`,
    role: p.role,
    rankPill,
    location: p.location,
    distance: `${(idx * 0.8 + 1.2).toFixed(1)} miles away`,
    verification: `Verified Human (${p.role.split('·')[0].trim()})`,
    linkedinUrl: p.linkedin_url,
    instagramUrl: p.instagram_url,
    image: p.avatar,
    igHandle: p.instagram_data.handle,
    resonance: `${resonanceScore}%`,
    resonanceDash: `${resonanceScore}, 100`,
    resonanceDesc: `High sync between ${p.name}'s professional drive (${p.linkedin_data.skills.slice(0, 2).join(' & ')}) and weekend aesthetic (${p.agent_analysis.hobbies[0]}).`,
    category: idx < 6 ? 'high,founders' : idx < 14 ? 'high,tech' : 'creative',
    badges: [
      { icon: "psychology", text: `Looking for: ${p.agent_analysis.core_needs.slice(0, 42)}...`, color: "rose" },
      { icon: "wb_twilight", text: `${p.agent_analysis.hobbies.slice(0, 2).join(' & ')}`, color: "amber" },
      { icon: "school", text: `${p.linkedin_data.skills.slice(0, 2).join(' • ')}`, color: "purple" }
    ],
    vibes: vibesList,
    dialogue: dialogueData,
    dossier: {
      needs: p.agent_analysis.core_needs,
      hobbies: p.agent_analysis.hobbies.join(', '),
      interests: p.agent_analysis.interests.join(', '),
      careerEthos: p.linkedin_data.career_ethos,
      vibe: p.instagram_data.aesthetic_vibe,
      rituals: p.instagram_data.weekend_rituals,
      culinary: p.instagram_data.culinary_tastes,
      greenFlags: p.agent_analysis.qualities.green_flags,
      dealbreakers: p.agent_analysis.qualities.dealbreakers,
      idealVenue: p.agent_analysis.qualities.ideal_date_venue
    }
  };
});

fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'aura-candidates.json'), JSON.stringify(auraCandidates, null, 2));
console.log(`Successfully compiled ${auraCandidates.length} Aura candidate dossiers.`);
