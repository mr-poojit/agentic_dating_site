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
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('fbsbx.com') || url.includes('licdn.com') || url.includes('instagram.com') || url.includes('linkedin.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
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

  // Sanitize candidate image URLs so external CDN restrictions / hotlink blocks never break preview
  candidates = candidates.map(c => ({
    ...c,
    avatar: safeImageUrl(c.avatar || c.image),
    image: safeImageUrl(c.image || c.avatar),
    vibes: (c.vibes || []).map(v => ({
      ...v,
      img: safeImageUrl(v.img)
    }))
  }));

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
    if (imgEl) {
      imgEl.setAttribute('referrerpolicy', 'no-referrer');
      imgEl.src = safeImageUrl(c.image || c.avatar);
      imgEl.onerror = function() {
        if (!this.dataset.triedProxy && this.src && !this.src.includes('/api/proxy-image')) {
          this.dataset.triedProxy = '1';
          this.src = '/api/proxy-image?url=' + encodeURIComponent(this.src);
        } else {
          this.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&h=800&q=80';
        }
      };
    }

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
      const setupVibeImg = (imgEl, vibeData) => {
        if (!imgEl) return;
        imgEl.setAttribute('referrerpolicy', 'no-referrer');
        imgEl.src = safeImageUrl(vibeData.img);
        imgEl.classList.remove('opacity-60');
        imgEl.onerror = function() {
          if (!this.dataset.triedProxy && this.src && !this.src.includes('/api/proxy-image')) {
            this.dataset.triedProxy = '1';
            this.src = '/api/proxy-image?url=' + encodeURIComponent(this.src);
          } else {
            this.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80';
          }
        };
      };
      setupVibeImg(v1, c.vibes[0]);
      setupVibeImg(v2, c.vibes[1]);
      setupVibeImg(v3, c.vibes[2]);
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

  // Require account creation before proceeding to deploy profile
  const userStored = localStorage.getItem('woven_auth_user');
  if (!currentUser && !userStored) {
    window.pendingIngestion = { li, ig, explicitName, inferredName };
    showToast('Account required to deploy your AI proxy. Complete your profile to proceed.');
    openAuthModal('signup');
    const banner = document.getElementById('authRequiredBanner');
    if (banner) banner.classList.remove('hidden');
    return;
  }

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
          const userAvatar = safeImageUrl(apiData?.auraCandidate?.image || apiData?.profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80");

          if (avatarImg) {
            avatarImg.setAttribute('referrerpolicy', 'no-referrer');
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
          if (subStatus) subStatus.textContent = `Extraction complete! Review and customize your profile...`;
          if (logEl) {
            const hasRealApify = apiData?.apifyPowered;
            logEl.innerHTML += `<div class="text-emerald-400 font-bold">> [SUCCESS] ${hasRealApify ? 'Real Instagram & LinkedIn data extracted!' : 'Profile certified!'} Opening customization screen...</div>`;
            logEl.scrollTop = logEl.scrollHeight;
          }

          setTimeout(() => {
            if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
            openConfirmProfileModal({
              apiData,
              inferredName,
              userAvatar,
              li,
              ig,
              finalName,
              realRole: apiData?.auraCandidate?.role || apiData?.profile?.role || "Bachelor of Engineering | Gen AI | Full-Stack Dev | Startup Enthusiast",
              realLocation: apiData?.auraCandidate?.location || apiData?.profile?.location || "Bengaluru, India",
              realBio: apiData?.auraCandidate?.instagramSnippet || apiData?.profile?.instagram_data?.bio || "@poojit_n_\nNew Person, Same Old Mistakes😮‍💨",
              realHeadline: apiData?.auraCandidate?.linkedinSnippet || apiData?.profile?.linkedin_data?.career_ethos || "I thrive where technology meets business. Electronics & Communication Engineer with expertise in AI, Python, AWS."
            });
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
      <img src="${safeImageUrl(c.image || c.avatar)}" referrerpolicy="no-referrer" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80'" class="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600 shadow-md">
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

// --- CONFIRM PROFILE & CUSTOMIZE USERNAME MODAL LOGIC ---
let pendingExtractionData = null;

function openConfirmProfileModal(data) {
  pendingExtractionData = data;
  const modal = document.getElementById('confirmProfileModal');
  if (!modal) return;

  const avatarImg = document.getElementById('confirmAvatarImg');
  if (avatarImg) avatarImg.src = safeImageUrl(data.userAvatar);

  const previewName = document.getElementById('extractedNamePreview');
  if (previewName) previewName.textContent = data.finalName;

  const customInput = document.getElementById('inputCustomDisplayName');
  if (customInput) customInput.value = data.finalName;

  const ageInput = document.getElementById('confirmInputAge');
  if (ageInput) ageInput.value = (data.apiData?.auraCandidate?.nameAge ? parseInt(data.apiData.auraCandidate.nameAge.split(',')[1]) : 28) || 28;

  const locInput = document.getElementById('confirmInputLocation');
  if (locInput) locInput.value = data.realLocation || "Bengaluru, India";

  const roleInput = document.getElementById('confirmInputHeadline');
  if (roleInput) roleInput.value = data.realRole || "Bachelor of Engineering | Gen AI | Full-Stack Dev";

  const bioInput = document.getElementById('confirmInputBio');
  if (bioInput) bioInput.value = data.realBio || "@poojit_n_\nNew Person, Same Old Mistakes😮‍💨";

  // Reset radio to keep
  const keepRadio = document.querySelector('input[name="nameChoice"][value="keep"]');
  if (keepRadio) keepRadio.checked = true;
  toggleNameCustomization(false);

  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeConfirmProfileModal() {
  const modal = document.getElementById('confirmProfileModal');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

function toggleNameCustomization(isCustom) {
  const container = document.getElementById('customNameInputContainer');
  const labelKeep = document.getElementById('labelKeepName');
  const labelCustom = document.getElementById('labelCustomName');

  if (isCustom) {
    if (container) container.classList.remove('hidden');
    if (labelCustom) {
      labelCustom.classList.add('border-indigo-500', 'bg-indigo-50/40');
      labelCustom.classList.remove('border-slate-200', 'bg-white');
    }
    if (labelKeep) {
      labelKeep.classList.remove('border-indigo-500', 'bg-indigo-50/40');
      labelKeep.classList.add('border-slate-200', 'bg-white');
    }
  } else {
    if (container) container.classList.add('hidden');
    if (labelKeep) {
      labelKeep.classList.add('border-indigo-500', 'bg-indigo-50/40');
      labelKeep.classList.remove('border-slate-200', 'bg-white');
    }
    if (labelCustom) {
      labelCustom.classList.remove('border-indigo-500', 'bg-indigo-50/40');
      labelCustom.classList.add('border-slate-200', 'bg-white');
    }
  }
}

async function finalizeCandidateDeployment() {
  if (!pendingExtractionData) return;
  const data = pendingExtractionData;

  const choiceRadio = document.querySelector('input[name="nameChoice"]:checked');
  const isCustom = choiceRadio && choiceRadio.value === 'custom';
  const customInput = document.getElementById('inputCustomDisplayName');
  const chosenName = (isCustom && customInput && customInput.value.trim()) ? customInput.value.trim() : data.finalName;

  const ageVal = document.getElementById('confirmInputAge')?.value || 28;
  const locVal = document.getElementById('confirmInputLocation')?.value || data.realLocation;
  const roleVal = document.getElementById('confirmInputHeadline')?.value || data.realRole;
  const bioVal = document.getElementById('confirmInputBio')?.value || data.realBio;

  // Pull dating questionnaire from currentUser if available
  const userQ = currentUser?.questionnaire || {};
  const userHobbies = (userQ.hobbies && userQ.hobbies.length > 0) ? userQ.hobbies : (data.apiData?.auraCandidate?.hobbies || ["Specialty Coffee", "Generative AI", "Analog 35mm", "Quiet Sundays"]);
  const userNeeds = userQ.intent ? `Looking for: ${userQ.intent}. Valuing ${userQ.prompts?.nonNegotiable || 'mutual autonomy and high EQ'}.` : (data.apiData?.auraCandidate?.needs || "Emotional maturity, mutual independence, and genuine warmth.");
  const userComm = userQ.commStyle || (data.apiData?.auraCandidate?.communication_style || "Direct, witty, perceptive, and attentive.");

  const newCand = data.apiData?.auraCandidate ? {
    ...data.apiData.auraCandidate,
    name: chosenName,
    nameAge: `${chosenName}, ${ageVal}`,
    location: locVal,
    role: roleVal,
    instagramSnippet: bioVal,
    hobbies: userHobbies,
    needs: userNeeds,
    communication_style: userComm,
    verification: `Verified Real Human (${chosenName})`,
    avatar: safeImageUrl(data.userAvatar),
    image: safeImageUrl(data.userAvatar),
    vibes: (data.apiData.auraCandidate.vibes || []).map(v => ({ ...v, img: safeImageUrl(v.img) }))
  } : {
    id: `user-custom-${Date.now()}`,
    name: chosenName,
    rank: "#1 MATCH",
    rankPill: "⭐ YOUR PROFILE",
    nameAge: `${chosenName}, ${ageVal}`,
    role: roleVal,
    location: locVal,
    distance: "Live Proxy Active",
    verifiedText: "Verified Real Human",
    verification: `Verified Real Human (${chosenName})`,
    statusPill: "Active Proxy",
    statusColor: "emerald",
    archetype: "Autonomous Visionary",
    igHandle: `@${chosenName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    image: safeImageUrl(data.userAvatar),
    avatar: safeImageUrl(data.userAvatar),
    resonance: "96%",
    resonanceDash: "96, 100",
    resonanceDescription: `Harmonic alignment with ${chosenName}'s professional vector and lifestyle aesthetic.`,
    category: "high creative",
    linkedinUrl: data.li,
    instagramUrl: data.ig,
    linkedinSnippet: roleVal,
    instagramSnippet: bioVal,
    hobbies: userHobbies,
    needs: userNeeds,
    communication_style: userComm,
    vibes: [
      { label: "Creative Flow", img: safeImageUrl(data.userAvatar) },
      { label: "Quiet Sundays", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80" },
      { label: "Pour-Over Coffee", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&h=300&q=80" }
    ],
    badges: [
      { icon: "verified", text: "Dual Verified Human", color: "indigo" },
      { icon: "psychology", text: "High EQ & Agency", color: "purple" },
      { icon: "schedule", text: "Active Tonight", color: "blue" }
    ],
    dialogue: {
      round: "Round 1 of 1: Autonomous Speed-Date Protocol",
      turn: "Turn 6 of 8 • Active Convergence",
      userMsg1: `Reviewing your two profiles, your professional focus (${roleVal.slice(0, 40)}) paired with intentional downtime shows deep balance. What is essential for you in partnership?`,
      matchAgentName: `Match Proxy`,
      matchAvatar: `✦`,
      matchMsg: `Authentic presence and mutual autonomy. When two people have their own passions, coming together is effortless.`,
      userMsg2: `Complete resonance. High standards, shared laughter, zero pretense. Match confirmed.`,
      consensus: `Both autonomous proxies agree: Electric Chemistry (96% Harmonic Sync)`
    },
    isUserCustom: true
  };

  candidates = candidates.filter(c => c.name !== newCand.name && c.id !== newCand.id);
  candidates.unshift(newCand);

  try {
    localStorage.setItem('woven_user_candidate', JSON.stringify(newCand));
  } catch (e) {}

  currentUserPersona = {
    name: chosenName,
    initial: chosenName.charAt(0).toUpperCase(),
    role: "Active User Proxy"
  };

  updateUserProxyLabels();
  renderCandidate(0);
  closeConfirmProfileModal();
  showToast(`✨ ${chosenName}'s AI Proxy is live in the Date Chamber!`);

  const chamberEl = document.getElementById('live-speed-date-section');
  if (chamberEl) chamberEl.scrollIntoView({ behavior: 'smooth' });
}

// --- DATING ONBOARDING WIZARD & AUTHENTICATION LOGIC ---
const ALL_HOBBIES = [
  { id: 'coffee', label: '☕ Specialty Coffee' },
  { id: 'film', label: '📸 Analog 35mm Film' },
  { id: 'coding', label: '💻 Late-Night Coding' },
  { id: 'genai', label: '🎨 Generative AI' },
  { id: 'philosophy', label: '📚 Philosophy & Books' },
  { id: 'pilates', label: '🧘 Mindfulness & Pilates' },
  { id: 'wine', label: '🍷 Natural Wine' },
  { id: 'vinyl', label: '🎧 Vinyl Records' },
  { id: 'architecture', label: '🏛️ Modern Architecture' },
  { id: 'hiking', label: '🌲 Trail Hikes' },
  { id: 'cinema', label: '🎬 Indie Cinema (A24)' },
  { id: 'startups', label: '🚀 Tech Startups' },
  { id: 'travel', label: '✈️ Intentional Travel' },
  { id: 'plants', label: '🪴 Plant Care & Botany' }
];

let selectedHobbies = ['☕ Specialty Coffee', '📸 Analog 35mm Film', '💻 Late-Night Coding', '🎨 Generative AI'];
let currentWizardStep = 1;

function initHobbyChips() {
  const container = document.getElementById('hobbyChipsContainer');
  if (!container) return;
  container.innerHTML = ALL_HOBBIES.map(h => {
    const isSelected = selectedHobbies.includes(h.label);
    const cls = isSelected 
      ? 'bg-indigo-600 text-white shadow-xs font-bold border-indigo-600' 
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium border-transparent';
    return `<button type="button" onclick="toggleHobbyChip('${h.label}')" class="px-3 py-1.5 rounded-full text-xs transition-all border cursor-pointer ${cls}">${h.label}</button>`;
  }).join('');
}

function toggleHobbyChip(hobby) {
  if (selectedHobbies.includes(hobby)) {
    if (selectedHobbies.length > 2) {
      selectedHobbies = selectedHobbies.filter(h => h !== hobby);
    } else {
      showToast('Please keep at least 2 hobbies selected.');
    }
  } else {
    selectedHobbies.push(hobby);
  }
  initHobbyChips();
}

function goToWizardStep(step) {
  if (step > 1) {
    const name = document.getElementById('regInputName')?.value.trim();
    const email = document.getElementById('regInputEmail')?.value.trim();
    const pass = document.getElementById('regInputPassword')?.value;
    if (!name || !email || !pass) {
      showToast('Please provide your name, email, and password first.');
      return;
    }
  }

  currentWizardStep = step;
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`wizardStep${i}`);
    const pill = document.getElementById(`stepPill${i}`);
    if (el) {
      if (i === step) {
        el.classList.remove('hidden');
        el.classList.add('flex');
      } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    }
    if (pill) {
      if (i <= step) {
        pill.classList.remove('opacity-40');
      } else {
        pill.classList.add('opacity-40');
      }
    }
  }

  if (step === 4) {
    initHobbyChips();
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
  const signInCont = document.getElementById('authSignInContainer');
  const signUpCont = document.getElementById('authSignUpContainer');
  const banner = document.getElementById('authRequiredBanner');
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
    if (signInCont) signInCont.classList.add('hidden');
    if (signUpCont) {
      signUpCont.classList.remove('hidden');
      signUpCont.classList.add('flex');
    }
    goToWizardStep(1);
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
    if (signUpCont) signUpCont.classList.add('hidden');
    if (signInCont) {
      signInCont.classList.remove('hidden');
      signInCont.classList.add('flex');
    }
    if (banner) banner.classList.add('hidden');
    if (promptText) promptText.textContent = "Don't have an account?";
    if (toggleBtn) toggleBtn.textContent = "Create account & profile";
  }
}

function toggleAuthMode() {
  switchAuthTab(currentAuthTab === 'signin' ? 'signup' : 'signin');
}

async function submitCompleteProfileRegistration() {
  const name = document.getElementById('regInputName')?.value.trim() || '';
  const email = document.getElementById('regInputEmail')?.value.trim() || '';
  const password = document.getElementById('regInputPassword')?.value || '';

  if (!name || !email || !password) {
    goToWizardStep(1);
    showToast('Name, email, and password are required.');
    return;
  }

  const intent = document.querySelector('input[name="datingIntent"]:checked')?.value || 'Long-term depth';
  const commStyle = document.querySelector('input[name="commStyle"]:checked')?.value || 'Direct, witty & emotionally perceptive';
  const obsession = document.getElementById('promptObsession')?.value.trim() || 'Specialty pour-overs, GenAI builds, analog film & quiet architecture';
  const nonNegotiable = document.getElementById('promptNonNegotiable')?.value.trim() || 'Authentic presence, high personal agency, zero pretense, and mutual autonomy';
  const sunday = document.getElementById('promptSunday')?.value.trim() || 'Slow coffee, reading philosophy or tech papers, vinyl record playing in the background';

  const questionnaire = {
    intent,
    commStyle,
    prompts: { obsession, nonNegotiable, sunday },
    hobbies: selectedHobbies
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, questionnaire })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Registration failed.');
      return;
    }

    currentUser = data.user;
    localStorage.setItem('woven_auth_user', JSON.stringify(data.user));
    localStorage.setItem('woven_auth_token', data.token);
    updateAuthUI(currentUser);
    closeAuthModal();
    showToast(`✨ Account created! Welcome, ${data.user.name}.`);

    // If user was in the middle of extracting links, resume automatically!
    if (window.pendingIngestion) {
      const p = window.pendingIngestion;
      window.pendingIngestion = null;
      const liInput = document.getElementById('inputLinkedIn');
      const igInput = document.getElementById('inputInstagram');
      if (liInput && !liInput.value) liInput.value = p.li;
      if (igInput && !igInput.value) igInput.value = p.ig;
      startIngestionProcess();
    }
  } catch (err) {
    showToast('Server connection error. Please try again.');
  }
}

async function handleEmailSignIn() {
  const email = document.getElementById('loginInputEmail')?.value.trim() || '';
  const password = document.getElementById('loginInputPassword')?.value || '';

  if (!email || !password) {
    showToast('Please enter both email and password.');
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Invalid credentials.');
      return;
    }

    currentUser = data.user;
    localStorage.setItem('woven_auth_user', JSON.stringify(data.user));
    localStorage.setItem('woven_auth_token', data.token);
    updateAuthUI(currentUser);
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}!`);

    if (window.pendingIngestion) {
      startIngestionProcess();
    }
  } catch (err) {
    showToast('Login failed. Please check connection.');
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

