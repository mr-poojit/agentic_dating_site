// aura-app.js — Synthetica Cupid Autonomous Romance Controller (Pale Blue & Soft Violet Theme)

let candidates = [];
let currentIndex = 0;
let currentUserPersona = {
  name: "Your AI Proxy",
  initial: "✦",
  role: "Awaiting Ingestion"
};

// Helper: Format human name from URL slug
function formatNameFromUrl(url) {
  if (!url) return '';
  try {
    const clean = url.trim().replace(/\/+$/, '');
    const parts = clean.split('/');
    let last = parts.pop() || '';
    if (last === 'in' || last.includes('linkedin') || last.includes('instagram')) {
      last = parts.pop() || '';
    }
    last = last.replace(/[@?#].*$/, '');
    last = last.replace(/[-_][a-f0-9]{7,}$/i, '');
    last = last.replace(/[-_.]+/g, ' ').trim();
    return last.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } catch (e) {
    return '';
  }
}

// Toast notification
function showToast(msg) {
  const toast = document.getElementById('swapNotification') || document.getElementById('toastNotification');
  const text = document.getElementById('toastMessage');
  if (toast && text) {
    text.textContent = msg;
    toast.classList.remove('translate-y-8', 'translate-y-12', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-8', 'opacity-0');
    }, 3200);
  }
}

// Load candidate data (Clean state: zero mock profiles, preserves genuine uploads)
async function initAura() {
  // Purge only legacy mock keys
  try {
    localStorage.removeItem('aura_user_candidate');
    localStorage.removeItem('candidates');
    localStorage.removeItem('profiles');
  } catch (e) {}

  try {
    const res = await fetch('/api/aura-candidates');
    if (res.ok) {
      candidates = await res.json();
    } else {
      candidates = [];
    }
  } catch (e) {
    candidates = [];
  }

  // Restore user proxy if stored locally and not already in candidates
  try {
    const stored = localStorage.getItem('woven_user_candidate');
    if (stored) {
      const userCand = JSON.parse(stored);
      if (userCand && userCand.isUserCustom && !candidates.find(c => c.name === userCand.name)) {
        candidates.unshift(userCand);
      }
      currentUserPersona = {
        name: userCand.name,
        initial: userCand.name.charAt(0).toUpperCase(),
        role: "Active User Proxy"
      };
      updateUserProxyLabels();
    }
  } catch (err) {}

  console.log(`Loaded ${candidates.length} candidate proxies.`);
  if (candidates && candidates.length > 0) {
    renderCandidate(0);
  } else {
    renderEmptyChamberState();
  }
}

// Purge all profiles from memory and backend
async function purgeAllProfiles() {
  try {
    await fetch('/api/aura-candidates', { method: 'DELETE' });
  } catch (e) {}
  candidates = [];
  currentIndex = 0;
  try {
    localStorage.removeItem('woven_user_candidate');
    localStorage.removeItem('aura_user_candidate');
    localStorage.removeItem('woven_candidates');
    localStorage.removeItem('candidates');
    localStorage.removeItem('profiles');
  } catch (e) {}
  renderEmptyChamberState();
  showToast('All stored profiles removed. Chamber is now completely clean.');
}

// Render empty chamber state when pool has no candidates
function renderEmptyChamberState() {
  const roundEl = document.getElementById('activeRoundHeading') || document.getElementById('arenaSessionHeading');
  if (roundEl) roundEl.textContent = "Chamber Standby • Awaiting Deployed Proxies";

  const idxBadge = document.getElementById('currentCandidateIndexBadge');
  if (idxBadge) idxBadge.textContent = "0 Candidates in Pool";

  const prevBtn = document.getElementById('prevCandidateBtn');
  const nextBtn = document.getElementById('nextCandidateBtn');
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  const turnEl = document.getElementById('dialogueTurnIndicator');
  if (turnEl) turnEl.textContent = "Chamber Idle • Ready for Ingestion";

  const imgEl = document.getElementById('profileImage');
  if (imgEl) imgEl.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=800&q=80";

  const verEl = document.getElementById('profileVerificationText');
  if (verEl) verEl.textContent = "Chamber Standby";

  const rankEl = document.getElementById('profileBadgeRank');
  if (rankEl) rankEl.textContent = "STANDBY";

  const locEl = document.getElementById('profileLocation');
  if (locEl) locEl.textContent = "Autonomous Swarm";

  const nameAgeEl = document.getElementById('profileNameAge');
  if (nameAgeEl) nameAgeEl.textContent = "Date Chamber Standby";

  const roleEl = document.getElementById('profileRole');
  if (roleEl) roleEl.textContent = "Awaiting profile ingestion above";

  const igHandleEl = document.getElementById('profileInstagramHandle');
  if (igHandleEl) igHandleEl.textContent = "@standby";

  const badgeContainer = document.getElementById('profileContextBadges');
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 shadow-xs">
        <span class="material-symbols-outlined text-[15px]">info</span> Awaiting first profile ingestion
      </span>
      <span class="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-xs flex items-center gap-1 shadow-xs">
        <span class="material-symbols-outlined text-[15px]">psychology</span> Ready to synthesize AI Proxy
      </span>
    `;
  }

  // Reset vibe images to abstract standby thumbnails
  const standbyImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=400&q=80";
  const v1 = document.getElementById('vibeImg1');
  const v2 = document.getElementById('vibeImg2');
  const v3 = document.getElementById('vibeImg3');
  const vl1 = document.getElementById('vibeLabel1');
  const vl2 = document.getElementById('vibeLabel2');
  const vl3 = document.getElementById('vibeLabel3');
  if (v1) { v1.src = standbyImg; v1.classList.add('opacity-60'); }
  if (v2) { v2.src = standbyImg; v2.classList.add('opacity-60'); }
  if (v3) { v3.src = standbyImg; v3.classList.add('opacity-60'); }
  if (vl1) vl1.textContent = "Standby";
  if (vl2) vl2.textContent = "Standby";
  if (vl3) vl3.textContent = "Standby";

  const resScoreEl = document.getElementById('resonanceScoreNumber');
  if (resScoreEl) resScoreEl.textContent = "0%";
  const svgPath = document.getElementById('resonanceSvgPath');
  if (svgPath) svgPath.setAttribute('stroke-dasharray', `0, 100`);
  const resDesc = document.getElementById('resonanceDescription');
  if (resDesc) resDesc.textContent = "Awaiting two or more agent proxies to analyze mutual resonance and chemistry.";

  const userMsg1 = document.getElementById('julianMessage1') || document.getElementById('chatMessageUser1');
  if (userMsg1) userMsg1.textContent = '"Paste your public Instagram & LinkedIn in the deployment dock above to spawn your AI proxy and initiate live matchmaking sessions."';

  const matchLabel = document.getElementById('matchAgentLabel');
  if (matchLabel) matchLabel.textContent = "System Telemetry";
  const matchAvatar = document.getElementById('matchAgentAvatar');
  if (matchAvatar) matchAvatar.textContent = "✦";

  const matchMsg = document.getElementById('matchMessage') || document.getElementById('chatMessageMatch');
  if (matchMsg) matchMsg.textContent = "Date Chamber is in standby. Once candidate profiles are ingested, our neural agent swarm will autonomously run simulated 15-minute speed dates here.";

  const userMsg2 = document.getElementById('julianMessage2') || document.getElementById('chatMessageUser2');
  if (userMsg2) userMsg2.textContent = '"Ready to evaluate values, lifestyle rhythm, and deep compatibility."';

  const consensusBanner = document.getElementById('consensusBanner');
  if (consensusBanner) consensusBanner.innerHTML = `<span class="material-symbols-outlined text-purple-700 text-[16px]">hourglass_empty</span> Standby • Zero Profiles Ingested`;
}

function updateUserProxyLabels() {
  const a1 = document.getElementById('userProxyAvatar');
  const a2 = document.getElementById('userProxyAvatar2');
  const l1 = document.getElementById('userProxyLabel');
  const l2 = document.getElementById('userProxyLabel2');
  if (a1) a1.textContent = currentUserPersona.initial;
  if (a2) a2.textContent = currentUserPersona.initial;
  if (l1) l1.textContent = `${currentUserPersona.name}'s Proxy (Active)`;
  if (l2) l2.textContent = `${currentUserPersona.name}'s Proxy (Active)`;
}

// Render candidate into the speed date chamber
function renderCandidate(index) {
  if (!candidates || candidates.length === 0) return;
  currentIndex = index;
  const c = candidates[index];

  const card = document.getElementById('profileCardWrapper');
  const chat = document.getElementById('chatDialogueArea');

  if (card) {
    card.style.opacity = '0.5';
    card.style.transform = 'scale(0.985)';
  }
  if (chat) chat.style.opacity = '0.5';

  setTimeout(() => {
    // Session heading & index badge
    const roundEl = document.getElementById('activeRoundHeading') || document.getElementById('arenaSessionHeading');
    if (roundEl) roundEl.textContent = c.dialogue?.round || c.roundText || `Round ${index + 1} of ${candidates.length}: Autonomous Coffee Session`;

    const idxBadge = document.getElementById('currentCandidateIndexBadge');
    if (idxBadge) idxBadge.textContent = `Candidate ${index + 1} of ${candidates.length}`;

    const turnEl = document.getElementById('dialogueTurnIndicator');
    if (turnEl) turnEl.textContent = c.dialogue?.turn || c.turnText || "Turn 6 of 8 • 11m elapsed";

    // Profile details
    const imgEl = document.getElementById('profileImage');
    if (imgEl) imgEl.src = c.image || c.avatar;

    const verEl = document.getElementById('profileVerificationText') || document.getElementById('profileVerificationBadge');
    if (verEl) verEl.textContent = c.verification || c.verifiedText || "Verified Real Human";

    const rankEl = document.getElementById('profileBadgeRank') || document.getElementById('profileRankPill');
    if (rankEl) rankEl.textContent = c.rankPill || c.rank || `#${index + 1} MATCH`;

    const locEl = document.getElementById('profileLocation');
    if (locEl) locEl.textContent = c.location || "San Francisco, CA";

    const nameAgeEl = document.getElementById('profileNameAge');
    if (nameAgeEl) nameAgeEl.textContent = c.nameAge || `${c.name}, 29`;

    const roleEl = document.getElementById('profileRole');
    if (roleEl) roleEl.textContent = c.role;

    const igHandleEl = document.getElementById('profileInstagramHandle');
    if (igHandleEl) igHandleEl.textContent = c.igHandle || `@${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Verified Links
    const liBtn = document.getElementById('profileLinkedInBtn');
    const igBtn = document.getElementById('profileInstagramBtn');
    if (liBtn) liBtn.href = c.linkedinUrl;
    if (igBtn) igBtn.href = c.instagramUrl;

    // Badges
    const badgeContainer = document.getElementById('profileContextBadges');
    if (badgeContainer) {
      const defaultBadges = [
        { icon: "psychology", text: "Looking for: Intentional slow life", color: "indigo" },
        { icon: "wb_sunny", text: "High Agency & Quiet Sundays", color: "purple" },
        { icon: "school", text: "Stanford PhD • High Impact", color: "blue" }
      ];
      const badgesToRender = (c.badges && c.badges.length > 0) ? c.badges : defaultBadges;
      badgeContainer.innerHTML = badgesToRender.map(b => `
        <span class="px-3 py-1.5 rounded-full bg-${b.color}-50/90 border border-${b.color}-100 font-label-sm text-label-sm text-${b.color}-950 font-semibold flex items-center gap-1 shadow-xs">
          <span class="material-symbols-outlined text-${b.color}-600 text-[15px]" style="font-variation-settings: 'FILL' 1;">${b.icon}</span>
          <span>${b.text}</span>
        </span>
      `).join('');
    }

    // Vibes
    if (c.vibes && c.vibes.length >= 3) {
      const v1 = document.getElementById('vibeImg1');
      const v2 = document.getElementById('vibeImg2');
      const v3 = document.getElementById('vibeImg3');
      if (v1) { v1.src = c.vibes[0].img; v1.classList.remove('opacity-60'); }
      if (v2) { v2.src = c.vibes[1].img; v2.classList.remove('opacity-60'); }
      if (v3) { v3.src = c.vibes[2].img; v3.classList.remove('opacity-60'); }
      if (document.getElementById('vibeLabel1')) document.getElementById('vibeLabel1').textContent = c.vibes[0].label;
      if (document.getElementById('vibeLabel2')) document.getElementById('vibeLabel2').textContent = c.vibes[1].label;
      if (document.getElementById('vibeLabel3')) document.getElementById('vibeLabel3').textContent = c.vibes[2].label;
    }

    // Resonance
    const pct = parseInt(c.resonance) || 94;
    const resScoreEl = document.getElementById('resonanceScoreNumber');
    if (resScoreEl) resScoreEl.textContent = `${pct}%`;

    const svgPath = document.getElementById('resonanceSvgPath');
    if (svgPath) svgPath.setAttribute('stroke-dasharray', `${pct}, 100`);

    const resDesc = document.getElementById('resonanceDescription');
    if (resDesc) resDesc.textContent = c.resonanceDescription || c.resonanceDesc || "High overlap in quiet morning cadence, architectural aesthetics & career pacing.";

    // Dialogue Transcripts
    const userMsg1 = document.getElementById('julianMessage1') || document.getElementById('chatMessageUser1');
    if (userMsg1) userMsg1.textContent = `"${c.dialogue?.userMsg1 || c.julianMsg1 || 'How do your research and daily pursuits balance with quiet offline downtime?'}"`;

    const matchLabel = document.getElementById('matchAgentLabel');
    if (matchLabel) matchLabel.textContent = c.dialogue?.matchAgentName || c.matchAgentLabel || `${c.name}'s Proxy`;

    const matchAvatar = document.getElementById('matchAgentAvatar');
    if (matchAvatar) matchAvatar.textContent = c.dialogue?.matchAvatar || c.matchAvatar || c.name.charAt(0);

    const matchMsg = document.getElementById('matchMessage') || document.getElementById('chatMessageMatch');
    if (matchMsg) matchMsg.textContent = `"${c.dialogue?.matchMsg || c.matchMsg || 'Spot on. She values slow, physical craft over abstract hype and protects her personal sanctuary.'}"`;

    const userMsg2 = document.getElementById('julianMessage2') || document.getElementById('chatMessageUser2');
    if (userMsg2) userMsg2.textContent = `"${c.dialogue?.userMsg2 || c.julianMsg2 || 'Match confirmed. Shared respect for deep craft and quiet presence without screens.'}"`;

    const consensusEl = document.getElementById('consensusBanner') || document.getElementById('consensusText');
    if (consensusEl) {
      consensusEl.innerHTML = `<span class="material-symbols-outlined text-purple-700 text-[16px]">celebration</span> Both autonomous agents agree: ${c.dialogue?.consensus || c.consensus || 'High physical & intellectual chemistry'}`;
    }

    if (card) {
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }
    if (chat) chat.style.opacity = '1';
  }, 160);
}

// Select candidate card
function selectCandidate(idx) {
  renderCandidate(idx);
  const dateSection = document.getElementById('live-speed-date-section');
  if (dateSection) dateSection.scrollIntoView({ behavior: 'smooth' });
  showToast(`Loaded ${candidates[idx].nameAge ? candidates[idx].nameAge.split(',')[0] : candidates[idx].name}'s Autonomous Date Session`);
}

// Swapping candidate directly via buttons
function swapCandidate() {
  if (!candidates || candidates.length === 0) {
    showToast('Chamber standby. Ingest a profile above to begin speed dates.');
    renderEmptyChamberState();
    return;
  }
  if (candidates.length === 1) {
    showToast('Only 1 profile in pool. Ingest another candidate above to swap profiles.');
    return;
  }
  const nextIdx = (currentIndex + 1) % candidates.length;
  renderCandidate(nextIdx);
  showToast(`Swapped to ${candidates[nextIdx].name} (${nextIdx + 1}/${candidates.length})`);
}

function prevCandidate() {
  if (!candidates || candidates.length === 0) {
    showToast('Chamber standby. Ingest a profile above to begin speed dates.');
    renderEmptyChamberState();
    return;
  }
  if (candidates.length === 1) {
    showToast('Only 1 profile in pool. Ingest another candidate above to swap profiles.');
    return;
  }
  const prevIdx = (currentIndex - 1 + candidates.length) % candidates.length;
  renderCandidate(prevIdx);
  showToast(`Swapped to ${candidates[prevIdx].name} (${prevIdx + 1}/${candidates.length})`);
}

// Pass candidate: dismisses the current candidate and clears/swaps
function passCandidate() {
  if (!candidates || candidates.length === 0) {
    showToast('Chamber standby. Ingest a profile above to begin speed dates.');
    renderEmptyChamberState();
    return;
  }
  const removed = candidates.splice(currentIndex, 1)[0];
  showToast(`Passed on ${removed.name || 'candidate'}. Removed from queue.`);
  if (candidates.length === 0) {
    currentIndex = 0;
    renderEmptyChamberState();
  } else {
    currentIndex = currentIndex % candidates.length;
    renderCandidate(currentIndex);
  }
}

// Presets
function setPresetPersona(type) {
  // Profiles start empty by default
}

// Ingestion Form with Live Server Call
async function startIngestionProcess() {
  const nameInput = document.getElementById('inputName');
  const liInput = document.getElementById('inputLinkedIn');
  const igInput = document.getElementById('inputInstagram');

  const li = liInput ? liInput.value.trim() : '';
  const ig = igInput ? igInput.value.trim() : '';

  if (!li || !ig) {
    showToast('Please provide both LinkedIn and Instagram profile links.');
    return;
  }

  const explicitName = nameInput ? nameInput.value.trim() : '';
  const inferredName = explicitName || formatNameFromUrl(li) || formatNameFromUrl(ig) || "Candidate Proxy";

  const modal = document.getElementById('ingestionModal');
  const percentEl = document.getElementById('ingestionPercent');
  const barFill = document.getElementById('progressBarFill');
  const subStatus = document.getElementById('ingestionSubStatus');
  const avatarImg = document.getElementById('decodingAvatarImg');
  const laser = document.getElementById('scannerLaser');
  const logEl = document.getElementById('decodingLog');
  const nameBadge = document.getElementById('decodingCandidateName');
  const linksSummary = document.getElementById('decodingLinksSummary');
  const statusPill = document.getElementById('decodingStatusPill');

  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');

  if (nameBadge) {
    nameBadge.innerHTML = `<span>${inferredName}</span><span class="material-symbols-outlined text-cyan-400 text-[18px]">verified</span>`;
  }
  if (linksSummary) {
    linksSummary.textContent = `${ig.replace('https://', '').replace('http://', '')} • ${li.replace('https://', '').replace('http://', '')}`;
  }
  if (avatarImg) {
    avatarImg.style.filter = 'blur(16px) contrast(140%)';
  }
  if (laser) {
    laser.style.display = 'block';
    laser.style.top = '15%';
  }
  if (statusPill) {
    statusPill.className = "absolute bottom-1.5 inset-x-2 text-[9px] font-mono font-black text-center py-0.5 rounded bg-black/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-xs";
    statusPill.textContent = "BIOMETRIC_DECODE: ACTIVE";
  }
  if (logEl) {
    logEl.innerHTML = `
      <div class="text-cyan-400 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span>> [SOCKET_OPEN] Scraping daemon connected to official endpoints...</span>
      </div>
    `;
  }
  if (barFill) barFill.style.width = '15%';
  if (percentEl) percentEl.textContent = '15%';
  if (subStatus) subStatus.textContent = `Connecting to ${li}...`;

  const scrapePromise = fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedin_url: li, instagram_url: ig, name: inferredName })
  }).catch(() => null);

  setTimeout(() => {
    if (barFill) barFill.style.width = '35%';
    if (percentEl) percentEl.textContent = '35%';
    if (subStatus) subStatus.textContent = 'Decoding LinkedIn career vector and intellectual boundaries...';
    if (avatarImg) avatarImg.style.filter = 'blur(11px) contrast(125%)';
    if (laser) laser.style.top = '45%';
    if (logEl) {
      logEl.innerHTML += `<div class="text-indigo-300">> [LINKEDIN_VECTOR] Ambition index, work cadence & intellectual ethos extracted</div>`;
      logEl.scrollTop = logEl.scrollHeight;
    }

    setTimeout(() => {
      if (barFill) barFill.style.width = '65%';
      if (percentEl) percentEl.textContent = '65%';
      if (subStatus) subStatus.textContent = `Analyzing somatic aesthetic vibes and frequency on ${ig}...`;
      if (avatarImg) avatarImg.style.filter = 'blur(6px) contrast(115%)';
      if (laser) laser.style.top = '75%';
      if (logEl) {
        logEl.innerHTML += `<div class="text-pink-300">> [INSTAGRAM_SOMATIC] Color frequencies, weekend rhythm & presence tokens resolved</div>`;
        logEl.scrollTop = logEl.scrollHeight;
      }

      setTimeout(() => {
        if (barFill) barFill.style.width = '85%';
        if (percentEl) percentEl.textContent = '85%';
        if (subStatus) subStatus.textContent = 'Synthesizing conversational tensor & psychometric weights...';
        if (avatarImg) avatarImg.style.filter = 'blur(2.5px) contrast(105%)';
        if (laser) laser.style.top = '30%';
        if (logEl) {
          logEl.innerHTML += `<div class="text-purple-300">> [AI_SYNTHESIZER] Background Claude/GPT-4o neural matchmaking weights calibrated</div>`;
          logEl.scrollTop = logEl.scrollHeight;
        }

        setTimeout(async () => {
          const apiRes = await scrapePromise;
          const apiData = apiRes ? await apiRes.json().catch(() => null) : null;

          const finalName = apiData?.auraCandidate?.name || apiData?.profile?.name || inferredName;
          const userAvatar = apiData?.auraCandidate?.image || apiData?.profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80";

          if (avatarImg) {
            avatarImg.src = userAvatar;
            avatarImg.style.filter = 'blur(0px) contrast(100%)';
          }
          if (laser) laser.style.display = 'none';
          if (statusPill) {
            statusPill.className = "absolute bottom-1.5 inset-x-2 text-[9px] font-mono font-black text-center py-0.5 rounded bg-emerald-500 text-white shadow-md";
            statusPill.textContent = "✦ AGENT SYNTHESIZED & CERTIFIED";
          }
          if (barFill) barFill.style.width = '100%';
          if (percentEl) percentEl.textContent = '100%';
          if (subStatus) subStatus.textContent = `Deployment complete! ${finalName}'s proxy is active in Date Chamber.`;
          if (logEl) {
            const hasRealApify = apiData?.apifyPowered;
            logEl.innerHTML += `<div class="text-emerald-400 font-bold">> [SUCCESS] ${hasRealApify ? 'Real Instagram & LinkedIn data extracted!' : 'Profile certified!'} Speed date protocol active</div>`;
            logEl.scrollTop = logEl.scrollHeight;
          }

          const newCand = apiData?.auraCandidate || {
            id: apiData?.profile?.id || `user-custom-${Date.now()}`,
            name: finalName,
            rank: "#1 MATCH",
            rankPill: "⭐ YOUR PROFILE",
            nameAge: `${finalName}, 28`,
            role: apiData?.profile?.role || "Creative Leader & Technologist",
            location: "San Francisco / Remote",
            distance: "Live Proxy Active",
            verifiedText: "Verified Real Human",
            verification: "Verified Real Human",
            igHandle: ig.split('/').filter(Boolean).pop()?.replace('@', '') || "active_user",
            image: userAvatar,
            avatar: userAvatar,
            resonance: "96%",
            resonanceDash: "96, 100",
            resonanceDescription: "High harmonic alignment across intellectual drive, personal boundaries, and lifestyle aesthetics.",
            category: "high creative",
            linkedinUrl: li,
            instagramUrl: ig,
            linkedinSnippet: apiData?.profile?.linkedin_data?.career_ethos || "High drive, deep professional integrity, and boundless curiosity.",
            instagramSnippet: apiData?.profile?.instagram_data?.aesthetic_vibe || "Weekend architectural walks, pour-over coffee, and genuine presence.",
            hobbies: apiData?.profile?.agent_analysis?.hobbies || ["Artisan Coffee", "Mindful Travel", "Tactile Craft", "Quiet Sundays"],
            needs: apiData?.profile?.agent_analysis?.core_needs || "Emotional maturity, mutual intellectual independence, and grounding warmth.",
            communication_style: apiData?.profile?.agent_analysis?.qualities?.communication_style || "Direct, witty, perceptive, and attentive.",
            vibes: [
              { label: "Creative Flow", img: userAvatar },
              { label: "Weekend Escapes", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80" },
              { label: "Pour-Over Coffee", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&h=300&q=80" }
            ],
            badges: [
              { icon: "verified", text: "Dual Verified", color: "indigo" },
              { icon: "psychology", text: "High EQ & Agency", color: "purple" },
              { icon: "schedule", text: "Active Tonight", color: "blue" }
            ],
            dialogue: {
              round: `Round 1 of ${Math.max(1, candidates.length)}: Autonomous Speed-Date Protocol`,
              turn: "Turn 6 of 8 • Active Convergence",
              userMsg1: `Reviewing your two profiles, your professional focus paired with intentional downtime shows deep balance. What is essential for you in partnership?`,
              matchAgentName: `${candidates[0]?.name || 'Candidate'}'s Proxy`,
              matchAvatar: (candidates[0]?.name || 'C').charAt(0),
              matchMsg: `Authentic presence and mutual autonomy. When two people have their own passions, coming together is effortless.`,
              userMsg2: `Complete resonance. High standards, shared laughter, zero pretense. Match confirmed.`,
              consensus: `Both autonomous proxies agree: Electric Chemistry (96% Harmonic Sync)`
            },
            isUserCustom: true
          };

          candidates = candidates.filter(c => c.id !== newCand.id && c.name !== newCand.name);
          candidates.unshift(newCand);

          try {
            localStorage.setItem('woven_user_candidate', JSON.stringify(newCand));
          } catch (e) {}

          currentUserPersona = {
            name: finalName,
            initial: finalName.charAt(0).toUpperCase(),
            role: "Active User Proxy"
          };

          updateUserProxyLabels();
          renderCandidate(0);

          setTimeout(() => {
            if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
            showToast(`✨ ${finalName}'s AI Proxy is live in the Date Chamber!`);
            const chamberEl = document.getElementById('live-speed-date-section');
            if (chamberEl) chamberEl.scrollIntoView({ behavior: 'smooth' });
          }, 850);

        }, 700);
      }, 700);
    }, 700);
  }, 500);
}

// Meetup Modal
function triggerSuperSparkMeetup() {
  const currentCand = candidates[currentIndex];
  const modal = document.getElementById('superSparkModal');
  const heading = document.getElementById('sparkModalHeading');
  if (heading) heading.textContent = `Meetup Dispatched with ${currentCand.nameAge ? currentCand.nameAge.split(',')[0] : currentCand.name}!`;
  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeSuperSparkModal() {
  const modal = document.getElementById('superSparkModal');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

function confirmMeetupPlan() {
  closeSuperSparkModal();
  const currentCand = candidates[currentIndex];
  const candName = currentCand.nameAge ? currentCand.nameAge.split(',')[0] : currentCand.name;
  showToast(`🥂 Coffee date locked with ${candName}! Calendar invite dispatched.`);
  
  const sparkBtn = document.getElementById('superSparkBtn');
  if (sparkBtn) {
    const orig = sparkBtn.innerHTML;
    sparkBtn.innerHTML = `<span class="material-symbols-outlined text-[20px] text-emerald-300">verified</span><span>Table Confirmed</span>`;
    setTimeout(() => {
      sparkBtn.innerHTML = orig;
    }, 3500);
  }
}

// Full Dossier Modal
function openDossierModal() {
  const c = candidates[currentIndex];
  const modal = document.getElementById('dossierModal');
  const body = document.getElementById('dossierModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="flex items-center gap-4 pb-4 border-b border-indigo-100">
      <img src="${c.image || c.avatar}" class="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600 shadow-md">
      <div>
        <h3 class="text-xl font-extrabold text-slate-900">${c.nameAge || c.name}</h3>
        <p class="text-xs text-slate-500">${c.role} • ${c.location || 'San Francisco, CA'}</p>
        <div class="flex gap-2 mt-2">
          <a href="${c.linkedinUrl}" target="_blank" class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1 hover:bg-indigo-100">💼 Official LinkedIn</a>
          <a href="${c.instagramUrl}" target="_blank" class="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 flex items-center gap-1 hover:bg-purple-100">📸 Public Instagram</a>
        </div>
      </div>
    </div>

    <!-- LinkedIn Extract -->
    <div class="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
      <h4 class="text-xs font-black uppercase tracking-wider text-indigo-700 mb-1 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[16px]">work</span>
        <span>1. Professional Vector (LinkedIn Ingestion)</span>
      </h4>
      <p class="text-xs text-slate-700 mb-2">${c.linkedinSnippet || c.linkedinEthos || 'High-caliber leadership, deep craft execution, and intellectual trajectory.'}</p>
      <div class="flex flex-wrap gap-1.5">
        <span class="px-2 py-0.5 rounded-full bg-white text-indigo-800 text-[10px] font-bold border border-indigo-100">Deep Work Ethos</span>
        <span class="px-2 py-0.5 rounded-full bg-white text-indigo-800 text-[10px] font-bold border border-indigo-100">Autonomy</span>
        <span class="px-2 py-0.5 rounded-full bg-white text-indigo-800 text-[10px] font-bold border border-indigo-100">Impact</span>
      </div>
    </div>

    <!-- Instagram Extract -->
    <div class="bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
      <h4 class="text-xs font-black uppercase tracking-wider text-purple-700 mb-1 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[16px]">photo_camera</span>
        <span>2. Somatic & Lifestyle Vector (Instagram Ingestion)</span>
      </h4>
      <p class="text-xs text-slate-700 mb-2">${c.instagramSnippet || c.instagramAesthetic || 'Architectural travel, thoughtful coffee rituals, and natural presence.'}</p>
      <div class="flex flex-wrap gap-1.5">
        ${(c.hobbies || ['Specialty Coffee', 'Tactile Craft', 'Morning Walks']).map(h => `
          <span class="px-2 py-0.5 rounded-full bg-white text-purple-800 text-[10px] font-bold border border-purple-100">${h}</span>
        `).join('')}
      </div>
    </div>

    <!-- Agentic Synthesis -->
    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-purple-200">
      <h4 class="text-xs font-black uppercase tracking-wider text-purple-900 mb-1 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[16px]">psychology</span>
        <span>3. Autonomous Agent Synthesis & Match Criteria</span>
      </h4>
      <p class="text-xs text-slate-800 font-medium mb-1.5"><strong>Core Need:</strong> ${c.needs || 'Emotional maturity, intellectual independence, and grounding warmth.'}</p>
      <p class="text-xs text-slate-600"><strong>Communication Standard:</strong> ${c.communication_style || 'Direct, witty, perceptive, and deeply attentive.'}</p>
    </div>
  `;

  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeDossierModal() {
  const modal = document.getElementById('dossierModal');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAura();
  initAuth();

  const prevBtn = document.getElementById('prevCandidateBtn');
  const nextBtn = document.getElementById('nextCandidateBtn');
  const passBtn = document.getElementById('passNextDateBtn');
  const swapRandomBtn = document.getElementById('swapRandomProfileBtn');
  const superSparkBtn = document.getElementById('superSparkBtn');

  if (prevBtn) prevBtn.addEventListener('click', prevCandidate);
  if (nextBtn) nextBtn.addEventListener('click', swapCandidate);
  if (passBtn) passBtn.addEventListener('click', passCandidate);
  if (swapRandomBtn) swapRandomBtn.addEventListener('click', swapCandidate);
  if (superSparkBtn) superSparkBtn.addEventListener('click', triggerSuperSparkMeetup);
});

// ==========================================
// WOVEN AUTH & OAUTH CONTROLLER
// ==========================================

let currentUser = null;
let currentAuthTab = 'signin'; // 'signin' | 'signup'

function initAuth() {
  // Check stored auth session
  const storedUser = localStorage.getItem('woven_auth_user');
  const storedToken = localStorage.getItem('woven_auth_token');

  if (storedUser && storedToken) {
    try {
      currentUser = JSON.parse(storedUser);
      updateAuthUI(currentUser);
      // Validate session with backend
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          currentUser = data.user;
          localStorage.setItem('woven_auth_user', JSON.stringify(currentUser));
          updateAuthUI(currentUser);
        } else {
          // Token expired or invalid
          signOutUser(false);
        }
      })
      .catch(() => {
        // Network error; preserve current UI
      });
    } catch (e) {
      signOutUser(false);
    }
  } else {
    updateAuthUI(null);
  }

  // Listen for OAuth messages from popup
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
      const { user, token } = event.data;
      if (user && token) {
        currentUser = user;
        localStorage.setItem('woven_auth_user', JSON.stringify(user));
        localStorage.setItem('woven_auth_token', token);
        updateAuthUI(currentUser);
        closeAuthModal();
        const providerName = (user.provider || 'OAuth').charAt(0).toUpperCase() + (user.provider || 'OAuth').slice(1);
        showToast(`🎉 Connected via ${providerName}! Welcome, ${user.name}.`);
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const userWrapper = document.getElementById('navUserMenuWrapper');
    const dropdown = document.getElementById('navUserDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (userWrapper && !userWrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('flex');
      }
    }
  });
}

function updateAuthUI(user) {
  const signInBtn = document.getElementById('navSignInBtn');
  const createAccountBtn = document.getElementById('navCreateAccountBtn');
  const userWrapper = document.getElementById('navUserMenuWrapper');
  const avatarImg = document.getElementById('navUserAvatarImg');
  const nameText = document.getElementById('navUserNameText');
  const emailText = document.getElementById('dropdownUserEmail');
  const badgeText = document.getElementById('dropdownProviderBadge');

  if (user) {
    if (signInBtn) signInBtn.classList.add('hidden');
    if (createAccountBtn) {
      createAccountBtn.classList.remove('sm:flex');
      createAccountBtn.classList.add('hidden');
    }
    if (userWrapper) {
      userWrapper.classList.remove('hidden');
      userWrapper.classList.add('block');
    }
    if (avatarImg) {
      avatarImg.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&bold=true`;
    }
    if (nameText) nameText.textContent = user.name || 'Member';
    if (emailText) emailText.textContent = user.email || '';
    if (badgeText) badgeText.textContent = (user.provider || 'member').toUpperCase();
  } else {
    if (signInBtn) signInBtn.classList.remove('hidden');
    if (createAccountBtn) {
      createAccountBtn.classList.remove('hidden');
      createAccountBtn.classList.add('sm:flex');
    }
    if (userWrapper) {
      userWrapper.classList.add('hidden');
      userWrapper.classList.remove('block');
    }
  }
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('navUserDropdown');
  if (!dropdown) return;
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    dropdown.classList.add('flex');
  } else {
    dropdown.classList.add('hidden');
    dropdown.classList.remove('flex');
  }
}

function openAuthModal(mode = 'signin') {
  currentAuthTab = mode;
  const modal = document.getElementById('authModal');
  if (!modal) return;

  switchAuthTab(mode);
  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
}

function switchAuthTab(tab) {
  currentAuthTab = tab;
  const tabSignIn = document.getElementById('authTabSignIn');
  const tabSignUp = document.getElementById('authTabSignUp');
  const title = document.getElementById('authModalTitle');
  const subtitle = document.getElementById('authModalSubtitle');
  const nameGroup = document.getElementById('authNameFieldGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const promptText = document.getElementById('authTogglePromptText');
  const toggleBtn = document.getElementById('authToggleBtn');

  if (tab === 'signup') {
    if (tabSignUp) {
      tabSignUp.classList.add('bg-white', 'text-slate-900', 'shadow-sm', 'font-extrabold');
      tabSignUp.classList.remove('text-slate-500');
    }
    if (tabSignIn) {
      tabSignIn.classList.remove('bg-white', 'text-slate-900', 'shadow-sm', 'font-extrabold');
      tabSignIn.classList.add('text-slate-500');
    }
    if (title) title.textContent = "Create Your Account";
    if (subtitle) subtitle.textContent = "Join Woven to deploy your autonomous proxy & access verified real dating";
    if (nameGroup) {
      nameGroup.classList.remove('hidden');
      nameGroup.classList.add('flex');
    }
    if (submitBtn) submitBtn.textContent = "Create Account";
    if (promptText) promptText.textContent = "Already have an account?";
    if (toggleBtn) toggleBtn.textContent = "Sign In";
  } else {
    if (tabSignIn) {
      tabSignIn.classList.add('bg-white', 'text-slate-900', 'shadow-sm', 'font-extrabold');
      tabSignIn.classList.remove('text-slate-500');
    }
    if (tabSignUp) {
      tabSignUp.classList.remove('bg-white', 'text-slate-900', 'shadow-sm', 'font-extrabold');
      tabSignUp.classList.add('text-slate-500');
    }
    if (title) title.textContent = "Welcome Back";
    if (subtitle) subtitle.textContent = "Sign in to sync your AI proxy and verified match stream";
    if (nameGroup) {
      nameGroup.classList.add('hidden');
      nameGroup.classList.remove('flex');
    }
    if (submitBtn) submitBtn.textContent = "Sign In to Woven";
    if (promptText) promptText.textContent = "Don't have an account?";
    if (toggleBtn) toggleBtn.textContent = "Create account";
  }
}

function toggleAuthMode() {
  switchAuthTab(currentAuthTab === 'signin' ? 'signup' : 'signin');
}

async function handleEmailAuth() {
  const emailInput = document.getElementById('authInputEmail');
  const passwordInput = document.getElementById('authInputPassword');
  const nameInput = document.getElementById('authInputName');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const name = nameInput ? nameInput.value.trim() : '';

  if (!email || !password) {
    showToast('Please provide email and password.');
    return;
  }

  const endpoint = currentAuthTab === 'signup' ? '/api/auth/register' : '/api/auth/login';
  const payload = currentAuthTab === 'signup' ? { name: name || email.split('@')[0], email, password } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    currentUser = data.user;
    localStorage.setItem('woven_auth_user', JSON.stringify(data.user));
    localStorage.setItem('woven_auth_token', data.token);
    updateAuthUI(currentUser);
    closeAuthModal();

    // Clear inputs
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (nameInput) nameInput.value = '';

    showToast(currentAuthTab === 'signup' ? `🎉 Welcome to Woven, ${data.user.name}!` : `✨ Welcome back, ${data.user.name}!`);
  } catch (err) {
    console.error('Auth error', err);
    showToast('Authentication server error. Please try again.');
  }
}

function loginWithOAuth(provider) {
  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  
  const popup = window.open(
    `/auth/${provider}`,
    `Woven_${provider}_Auth`,
    `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,location=0,menubar=0`
  );

  if (popup) {
    popup.focus();
  } else {
    showToast('Please allow popup windows for OAuth authentication.');
  }
}

async function signOutUser(showNotification = true) {
  const token = localStorage.getItem('woven_auth_token');
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch (e) {}

  currentUser = null;
  localStorage.removeItem('woven_auth_user');
  localStorage.removeItem('woven_auth_token');
  updateAuthUI(null);

  const dropdown = document.getElementById('navUserDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
    dropdown.classList.remove('flex');
  }

  if (showNotification) {
    showToast('Signed out of Woven.');
  }
}

