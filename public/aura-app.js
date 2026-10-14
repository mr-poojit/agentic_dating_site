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

// Load candidate data
async function initAura() {
  try {
    const res = await fetch('/api/aura-candidates');
    if (res.ok) {
      candidates = await res.json();
    } else {
      const fallback = await fetch('/data/aura-candidates.json');
      candidates = await fallback.json();
    }
  } catch (e) {
    try {
      const fallback = await fetch('/data/aura-candidates.json');
      candidates = await fallback.json();
    } catch (err) {
      console.error('Failed to load candidate json', err);
    }
  }

  // Restore any user profile stored in localStorage
  try {
    const stored = localStorage.getItem('aura_user_candidate');
    if (stored) {
      const userCand = JSON.parse(stored);
      if (!candidates.find(c => c.id === userCand.id || c.name === userCand.name)) {
        candidates.unshift(userCand);
      }
      currentUserPersona = {
        name: userCand.name,
        initial: userCand.name.charAt(0).toUpperCase(),
        role: "Active User Proxy"
      };
      updateUserProxyLabels();
    }
  } catch (err) {
    console.error('Error restoring user profile', err);
  }

  console.log(`Loaded ${candidates.length} candidates.`);
  renderLeaderboard();
  renderCandidate(0);
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
      if (document.getElementById('vibeImg1')) document.getElementById('vibeImg1').src = c.vibes[0].img;
      if (document.getElementById('vibeLabel1')) document.getElementById('vibeLabel1').textContent = c.vibes[0].label;
      if (document.getElementById('vibeImg2')) document.getElementById('vibeImg2').src = c.vibes[1].img;
      if (document.getElementById('vibeLabel2')) document.getElementById('vibeLabel2').textContent = c.vibes[1].label;
      if (document.getElementById('vibeImg3')) document.getElementById('vibeImg3').src = c.vibes[2].img;
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

    // Update active highlight on candidate cards
    document.querySelectorAll('.candidate-card').forEach((el, i) => {
      const statusText = el.querySelector('.active-status-text');
      if (i === index) {
        el.classList.add('border-indigo-600', 'ring-2', 'ring-indigo-200', 'shadow-lg');
        el.classList.remove('border-slate-200/80');
        if (statusText) {
          statusText.className = "active-status-text font-label-sm text-label-sm text-indigo-600 font-bold flex items-center gap-0.5";
          statusText.innerHTML = '<span class="material-symbols-outlined text-[14px]">play_circle</span> Active In Date';
        }
      } else {
        el.classList.remove('border-indigo-600', 'ring-2', 'ring-indigo-200', 'shadow-lg');
        el.classList.add('border-slate-200/80');
        if (statusText) {
          statusText.className = "active-status-text font-label-sm text-label-sm text-slate-500 font-medium";
          statusText.textContent = 'Click to Swap';
        }
      }
    });

    if (card) {
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }
    if (chat) chat.style.opacity = '1';
  }, 160);
}

// Render candidate leaderboard
function renderLeaderboard() {
  const container = document.getElementById('candidateCardsContainer');
  if (!container) return;

  container.innerHTML = candidates.map((c, idx) => {
    const isCustom = c.isUserCustom || c.rankPill?.includes('YOUR PROFILE');
    const borderClass = isCustom 
      ? 'border-2 border-purple-600 ring-2 ring-purple-300 shadow-xl bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-pink-50/40'
      : (idx === currentIndex ? 'border-2 border-indigo-600 ring-2 ring-indigo-200 shadow-md' : 'border border-slate-200/80 hover:border-purple-300');
    
    const pillBadge = isCustom
      ? `<span class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-label-sm text-[11px] font-extrabold shadow-sm">⭐ YOUR PROFILE</span>`
      : `<span class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-purple-100 text-purple-900'} font-label-sm text-[11px] font-extrabold shadow-sm">${c.rankPill || c.rank || `#${idx + 1} MATCH`}</span>`;

    return `
    <div class="candidate-card bg-white rounded-2xl p-space-sm shadow-md ${borderClass} flex flex-col relative group hover:shadow-xl transition-all cursor-pointer" data-candidate-id="${idx}" onclick="selectCandidate(${idx})">
      <div class="relative h-44 rounded-xl overflow-hidden mb-space-xs">
        <img alt="${c.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${c.image || c.avatar}"/>
        ${pillBadge}
        <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-label-sm text-[11px] font-bold backdrop-blur-sm">${c.resonance || '94%'} Sync</span>
      </div>
      <div class="px-space-xs pb-space-xs flex flex-col flex-1 justify-between">
        <div>
          <div class="flex items-center justify-between">
            <h4 class="font-headline-sm text-headline-sm font-bold text-slate-900 leading-snug">${c.nameAge || c.name}</h4>
            ${isCustom ? '<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">YOU</span>' : ''}
          </div>
          <p class="font-body-sm text-body-sm text-slate-500 truncate mt-0.5">${c.role}</p>
        </div>
        <div class="mt-space-sm pt-space-xs flex items-center justify-between border-t border-slate-100">
          <span class="active-status-text font-label-sm text-label-sm ${idx === currentIndex ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'}">
            ${idx === currentIndex ? '<span class="material-symbols-outlined text-[14px]">play_circle</span> Active In Date' : 'Click to Swap'}
          </span>
          <span class="material-symbols-outlined text-slate-400 group-hover:text-purple-600 text-[18px]">swap_horiz</span>
        </div>
      </div>
    </div>
    `;
  }).join('');
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
  const nextIdx = (currentIndex + 1) % candidates.length;
  renderCandidate(nextIdx);
  showToast(`Swapped to ${candidates[nextIdx].name} (${nextIdx + 1}/${candidates.length})`);
}

function prevCandidate() {
  const prevIdx = (currentIndex - 1 + candidates.length) % candidates.length;
  renderCandidate(prevIdx);
  showToast(`Swapped to ${candidates[prevIdx].name} (${prevIdx + 1}/${candidates.length})`);
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

  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');

  [1, 2, 3, 4].forEach(i => {
    const step = document.getElementById(`stepItem${i}`);
    if (step) {
      step.classList.add('opacity-40');
      step.querySelector('.step-check')?.classList.add('hidden');
    }
  });

  const step1 = document.getElementById('stepItem1');
  if (step1) step1.classList.remove('opacity-40');
  if (barFill) barFill.style.width = '25%';
  if (percentEl) percentEl.textContent = '25%';
  if (subStatus) subStatus.textContent = `Connecting to LinkedIn: ${li}...`;

  const scrapePromise = fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedin_url: li, instagram_url: ig, name: inferredName })
  }).catch(() => null);

  setTimeout(() => {
    document.getElementById('stepItem1')?.querySelector('.step-check')?.classList.remove('hidden');
    document.getElementById('stepItem2')?.classList.remove('opacity-40');
    if (barFill) barFill.style.width = '55%';
    if (percentEl) percentEl.textContent = '55%';
    if (subStatus) subStatus.textContent = `Analyzing somatic aesthetic rhythms on ${ig}...`;

    setTimeout(() => {
      document.getElementById('stepItem2')?.querySelector('.step-check')?.classList.remove('hidden');
      document.getElementById('stepItem3')?.classList.remove('opacity-40');
      if (barFill) barFill.style.width = '80%';
      if (percentEl) percentEl.textContent = '80%';
      if (subStatus) subStatus.textContent = 'Synthesizing emotional tensor, core needs, and conversation cadence...';

      setTimeout(async () => {
        document.getElementById('stepItem3')?.querySelector('.step-check')?.classList.remove('hidden');
        document.getElementById('stepItem4')?.classList.remove('opacity-40');
        if (barFill) barFill.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (subStatus) subStatus.textContent = `Deploying ${inferredName}'s proxy into Cohort #142! Running 25 speed dates...`;

        const apiRes = await scrapePromise;
        const apiData = apiRes ? await apiRes.json().catch(() => null) : null;

        setTimeout(() => {
          document.getElementById('stepItem4')?.querySelector('.step-check')?.classList.remove('hidden');

          const finalName = apiData?.profile?.name || inferredName;
          const userAvatar = apiData?.profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80";

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
              round: `Round 1 of 26: Autonomous Speed-Date with Top Match`,
              turn: "Turn 6 of 8 • Active Convergence",
              userMsg1: `Reviewing your two profiles, your professional focus paired with intentional downtime shows deep balance. What is essential for you in partnership?`,
              matchAgentName: `${candidates[0]?.name || 'Maya'}'s Proxy`,
              matchAvatar: (candidates[0]?.name || 'M').charAt(0),
              matchMsg: `Authentic presence and mutual autonomy. When two people have their own passions, coming together is effortless.`,
              userMsg2: `Complete resonance. High standards, shared laughter, zero pretense. Match confirmed.`,
              consensus: `Both autonomous proxies agree: Electric Chemistry (96% Harmonic Sync)`
            },
            isUserCustom: true
          };

          candidates = candidates.filter(c => c.id !== newCand.id && c.name !== newCand.name);
          candidates.unshift(newCand);

          try {
            localStorage.setItem('aura_user_candidate', JSON.stringify(newCand));
          } catch (e) {}

          currentUserPersona = {
            name: finalName,
            initial: finalName.charAt(0).toUpperCase(),
            role: "Active User Proxy"
          };

          updateUserProxyLabels();
          renderLeaderboard();
          renderCandidate(0);

          setTimeout(() => {
            if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
            showToast(`✨ ${finalName}'s profile added to Verified Roster & Proxy deployed!`);
            const rosterEl = document.getElementById('cohort-roster');
            if (rosterEl) rosterEl.scrollIntoView({ behavior: 'smooth' });
          }, 650);

        }, 600);
      }, 600);
    }, 600);
  }, 600);
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

  const prevBtn = document.getElementById('prevCandidateBtn');
  const nextBtn = document.getElementById('nextCandidateBtn');
  const passBtn = document.getElementById('passNextDateBtn');
  const swapRandomBtn = document.getElementById('swapRandomProfileBtn');
  const superSparkBtn = document.getElementById('superSparkBtn');

  if (prevBtn) prevBtn.addEventListener('click', prevCandidate);
  if (nextBtn) nextBtn.addEventListener('click', swapCandidate);
  if (passBtn) passBtn.addEventListener('click', swapCandidate);
  if (swapRandomBtn) swapRandomBtn.addEventListener('click', swapCandidate);
  if (superSparkBtn) superSparkBtn.addEventListener('click', triggerSuperSparkMeetup);
});
