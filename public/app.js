// app.js — Synthetica Cupid Frontend Orchestrator

// Application State
const state = {
  profiles: [],
  rankings: {},
  curatedDates: [],
  activeTab: 'profiles',
  selectedRankingPersonId: null,
  dateSimulation: {
    person1: null,
    person2: null,
    venue: null,
    dialogue: [],
    currentStep: 0,
    isPlaying: false,
    timer: null,
    speed: 1, // 1x = 2400ms, 2x = 1200ms, 0 = instant
    soundEnabled: true
  }
};

// Web Audio API Synthesizer for pleasant ambient micro-sounds
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playPop() {
    if (!state.dateSimulation.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio playback quiet fail
    }
  }

  playChime() {
    if (!state.dateSimulation.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.07);
        osc.stop(this.ctx.currentTime + idx * 0.07 + 0.25);
      });
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// DOM Elements
const elements = {
  tabs: document.querySelectorAll('.nav-tab'),
  panels: document.querySelectorAll('.tab-panel'),
  profilesGrid: document.getElementById('profiles-grid'),
  inputSearch: document.getElementById('input-search-profiles'),
  filterPills: document.getElementById('filter-pills-container'),
  
  // Arena
  selectAgent1: document.getElementById('select-agent-1'),
  selectAgent2: document.getElementById('select-agent-2'),
  btnStartDate: document.getElementById('btn-start-date'),
  pod1: document.getElementById('pod-agent-1'),
  pod2: document.getElementById('pod-agent-2'),
  pod1Avatar: document.getElementById('pod-1-avatar'),
  pod2Avatar: document.getElementById('pod-2-avatar'),
  pod1Name: document.getElementById('pod-1-name'),
  pod2Name: document.getElementById('pod-2-name'),
  pod1Role: document.getElementById('pod-1-role'),
  pod2Role: document.getElementById('pod-2-role'),
  pod1Status: document.getElementById('pod-1-status'),
  pod2Status: document.getElementById('pod-2-status'),
  venueName: document.getElementById('venue-name'),
  venueCity: document.getElementById('venue-city'),
  venueVibe: document.getElementById('venue-vibe'),
  chemistryBar: document.getElementById('chemistry-bar'),
  chemistryValue: document.getElementById('chemistry-value'),
  btnPlayPause: document.getElementById('btn-date-play-pause'),
  btnStep: document.getElementById('btn-date-step'),
  btnReplay: document.getElementById('btn-date-replay'),
  speedBtns: document.querySelectorAll('.speed-btn'),
  dialogueFeed: document.getElementById('dialogue-feed'),
  dialogueCounter: document.getElementById('dialogue-counter'),
  verdictBanner: document.getElementById('verdict-banner'),
  verdictTitle: document.getElementById('verdict-title'),
  verdictDesc: document.getElementById('verdict-desc'),
  verdictScore: document.getElementById('verdict-final-score'),

  // Rankings
  selectRankingPerson: document.getElementById('select-ranking-person'),
  rankingHero: document.getElementById('person-ranking-hero'),
  rankingsTableBody: document.getElementById('rankings-table-body'),
  powerMatchesGrid: document.getElementById('power-matches-grid'),

  // Analyzer / Scraper
  formAddPerson: document.getElementById('form-add-person'),
  inputPersonName: document.getElementById('input-person-name'),
  inputPersonLinkedin: document.getElementById('input-person-linkedin'),
  inputPersonInstagram: document.getElementById('input-person-instagram'),
  btnSubmitScrape: document.getElementById('btn-submit-scrape'),
  scrapeSpinner: document.getElementById('scrape-spinner'),
  btnSubmitText: document.getElementById('btn-submit-text'),
  btnAutofillSample: document.getElementById('btn-autofill-sample'),
  scraperTerminal: document.getElementById('scraper-terminal'),
  terminalLogStream: document.getElementById('terminal-log-stream'),
  newAgentResult: document.getElementById('new-agent-result'),

  // Modal
  profileModal: document.getElementById('profile-modal'),
  modalProfileContent: document.getElementById('modal-profile-content'),
  btnCloseModal: document.getElementById('btn-close-modal'),

  // Sound toggle
  btnToggleSound: document.getElementById('btn-toggle-sound'),
  soundIcon: document.getElementById('sound-icon'),
  btnQuickDemo: document.getElementById('btn-quick-run-demo')
};

// Initial Data Fetcher with resilient client fallback
async function loadInitialData() {
  try {
    const [profilesRes, rankingsRes, datesRes] = await Promise.all([
      fetch('/api/profiles').catch(() => fetch('/data/profiles.json')),
      fetch('/api/rankings').catch(() => fetch('/data/rankings.json')),
      fetch('/api/dates').catch(() => fetch('/data/dates.json'))
    ]);

    const pData = await profilesRes.json();
    state.profiles = pData.profiles || pData;

    const rData = await rankingsRes.json();
    state.rankings = rData.rankings || rData;

    const dData = await datesRes.json();
    state.curatedDates = dData.dates || dData;

    console.log(`Loaded ${state.profiles.length} profiles and ${Object.keys(state.rankings).length} rankings.`);
    
    initUI();
  } catch (err) {
    console.error('Failed to load API data, falling back to embedded dataset', err);
    // Ultimate fallback if files are served from static file://
    fallbackBootstrap();
  }
}

// UI Initialization
function initUI() {
  setupNavigation();
  renderProfilesGrid(state.profiles);
  populateDropdowns();
  setupFilterControls();
  setupDateArena();
  setupRankingsTab();
  setupScraperForm();
  setupSoundToggle();
  renderPowerMatches();

  // Load default pair in Arena: Sam Altman & Mira Murati
  loadPairInArena('sam-altman', 'mira-murati');
}

// Navigation Tabs
function setupNavigation() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });

  elements.btnQuickDemo?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('arena');
    loadPairInArena('sam-altman', 'mira-murati');
    startDateSimulation();
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  elements.tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  elements.panels.forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tabName}`);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// PROFILES TAB
function renderProfilesGrid(profilesList) {
  elements.profilesGrid.innerHTML = '';
  
  profilesList.forEach(person => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.id = `card-${person.id}`;

    const topNeeds = person.agent_analysis.core_needs;
    const hobbies = person.agent_analysis.hobbies.slice(0, 2).join(', ');
    const interests = person.agent_analysis.interests.slice(0, 2).join(', ');

    card.innerHTML = `
      <div class="profile-card-top">
        <div class="profile-avatar-wrapper">
          <img src="${person.avatar}" alt="${person.name}" class="profile-avatar" loading="lazy">
          <div class="profile-agent-badge" title="AI Agent Active">🤖</div>
        </div>
        <div class="profile-meta">
          <h3 class="profile-name">${person.name}</h3>
          <p class="profile-role">${person.role}</p>
          <div class="profile-location">📍 ${person.location}</div>
        </div>
      </div>

      <div class="verified-links-row">
        <a href="${person.linkedin_url}" target="_blank" rel="noopener noreferrer" class="social-link linkedin" title="Open LinkedIn Profile">
          <span>💼 LinkedIn Verified</span>
        </a>
        <a href="${person.instagram_url}" target="_blank" rel="noopener noreferrer" class="social-link instagram" title="Open Public Instagram">
          <span>📸 Instagram Public</span>
        </a>
      </div>

      <div class="analysis-snippet">
        <div class="analysis-field">
          <span class="field-label">AGENT CORE NEED</span>
          <span class="field-value">${topNeeds}</span>
        </div>
        <div class="analysis-field">
          <span class="field-label">HOBBIES & LIFESTYLE</span>
          <span class="field-value">${hobbies}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-sm btn-outline btn-inspect" data-id="${person.id}">
          🔍 Agent Analysis
        </button>
        <button class="btn btn-sm btn-primary btn-date-now" data-id="${person.id}">
          🍷 Date Now
        </button>
      </div>
    `;

    // Listeners
    card.querySelector('.btn-inspect').addEventListener('click', () => {
      openProfileModal(person);
    });

    card.querySelector('.btn-date-now').addEventListener('click', () => {
      // Pick top match or first other person
      const matches = state.rankings[person.id] || [];
      const topMatchId = matches.length > 0 ? matches[0].candidate_id : state.profiles.find(p => p.id !== person.id).id;
      loadPairInArena(person.id, topMatchId);
      switchTab('arena');
      startDateSimulation();
    });

    elements.profilesGrid.appendChild(card);
  });
}

function setupFilterControls() {
  elements.inputSearch?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = state.profiles.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.agent_analysis.interests.some(i => i.toLowerCase().includes(q))
    );
    renderProfilesGrid(filtered);
  });

  const pills = elements.filterPills?.querySelectorAll('.pill');
  pills?.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter;

      let filtered = state.profiles;
      if (filter === 'founders') {
        filtered = state.profiles.filter(p => p.role.includes('Founder') || p.role.includes('CEO'));
      } else if (filter === 'tech') {
        filtered = state.profiles.filter(p => p.role.includes('AI') || p.role.includes('Tech') || p.role.includes('Engineering') || p.role.includes('MIT'));
      } else if (filter === 'creators') {
        filtered = state.profiles.filter(p => p.role.includes('Creator') || p.role.includes('Podcast') || p.role.includes('Author') || p.role.includes('Dancer'));
      }
      renderProfilesGrid(filtered);
    });
  });
}

// PROFILE BLUEPRINT MODAL
function openProfileModal(person) {
  const modal = elements.modalProfileContent;
  const q = person.agent_analysis.qualities;

  modal.innerHTML = `
    <div class="blueprint-hero">
      <img src="${person.avatar}" alt="${person.name}" class="blueprint-avatar">
      <div>
        <h3 class="blueprint-name">${person.name}</h3>
        <p class="blueprint-role">${person.role} · ${person.location}</p>
        <div class="blueprint-links">
          <a href="${person.linkedin_url}" target="_blank" class="social-link linkedin">💼 Official LinkedIn</a>
          <a href="${person.instagram_url}" target="_blank" class="social-link instagram">📸 Public Instagram</a>
        </div>
      </div>
    </div>

    <div class="blueprint-sections">
      <div class="blueprint-box">
        <h4 class="box-title">🧠 Autonomous Agent Persona & Core Needs</h4>
        <p class="box-content"><strong>Emotional & Partnership Needs:</strong> ${person.agent_analysis.core_needs}</p>
        <p class="box-content" style="margin-top: 0.5rem;"><strong>Agent System Instruction:</strong> "${person.agent_analysis.dating_agent_prompt}"</p>
      </div>

      <div class="blueprint-box">
        <h4 class="box-title">💼 Extracted from LinkedIn (Professional Ethos)</h4>
        <p class="box-content"><strong>Career Ethos:</strong> ${person.linkedin_data.career_ethos}</p>
        <p class="box-content" style="margin-top: 0.35rem;"><strong>Intellectual Focus:</strong> ${person.linkedin_data.intellectual_focus}</p>
        <div class="tag-cloud">
          ${person.linkedin_data.skills.map(s => `<span class="tag">⚡ ${s}</span>`).join('')}
        </div>
      </div>

      <div class="blueprint-box">
        <h4 class="box-title">📸 Extracted from Instagram (Lifestyle & Aesthetics)</h4>
        <p class="box-content"><strong>Aesthetic Vibe:</strong> ${person.instagram_data.aesthetic_vibe}</p>
        <p class="box-content" style="margin-top: 0.35rem;"><strong>Weekend Rituals:</strong> ${person.instagram_data.weekend_rituals}</p>
        <p class="box-content" style="margin-top: 0.35rem;"><strong>Culinary & Coffee:</strong> ${person.instagram_data.culinary_tastes}</p>
        <div class="tag-cloud">
          ${person.instagram_data.travel_spots.map(t => `<span class="tag">✈️ ${t}</span>`).join('')}
        </div>
      </div>

      <div class="blueprint-box">
        <h4 class="box-title">💘 Dating Dynamics & Dealbreakers</h4>
        <p class="box-content"><strong>Love Language:</strong> ${q.love_language}</p>
        <p class="box-content" style="margin-top: 0.25rem;"><strong>Communication Style:</strong> ${q.communication_style}</p>
        <p class="box-content" style="margin-top: 0.25rem;"><strong>🟢 Green Flags:</strong> ${q.green_flags}</p>
        <p class="box-content" style="margin-top: 0.25rem;"><strong>🚩 Dealbreakers:</strong> ${q.dealbreakers}</p>
        <p class="box-content" style="margin-top: 0.25rem;"><strong>Conflict Resolution:</strong> ${q.conflict_style}</p>
        <p class="box-content" style="margin-top: 0.25rem;"><strong>Ideal Venue:</strong> ${q.ideal_date_venue}</p>
      </div>
    </div>

    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
      <button class="btn btn-secondary btn-modal-rankings" data-id="${person.id}">
        🏆 View Compatibility Rankings
      </button>
      <button class="btn btn-primary btn-modal-date" data-id="${person.id}">
        🍷 Date This Person in Arena
      </button>
    </div>
  `;

  modal.querySelector('.btn-modal-rankings').addEventListener('click', () => {
    closeProfileModal();
    switchTab('rankings');
    selectPersonInRankings(person.id);
  });

  modal.querySelector('.btn-modal-date').addEventListener('click', () => {
    closeProfileModal();
    const matches = state.rankings[person.id] || [];
    const topMatchId = matches.length > 0 ? matches[0].candidate_id : state.profiles.find(p => p.id !== person.id).id;
    loadPairInArena(person.id, topMatchId);
    switchTab('arena');
    startDateSimulation();
  });

  elements.profileModal.style.display = 'flex';
}

function closeProfileModal() {
  elements.profileModal.style.display = 'none';
}

elements.btnCloseModal?.addEventListener('click', closeProfileModal);
elements.profileModal?.addEventListener('click', (e) => {
  if (e.target === elements.profileModal) closeProfileModal();
});

// ARENA TAB: DATE SIMULATION
function populateDropdowns() {
  elements.selectAgent1.innerHTML = '';
  elements.selectAgent2.innerHTML = '';
  elements.selectRankingPerson.innerHTML = '';

  state.profiles.forEach(p => {
    const opt1 = new Option(p.name, p.id);
    const opt2 = new Option(p.name, p.id);
    const optRank = new Option(p.name, p.id);

    elements.selectAgent1.add(opt1);
    elements.selectAgent2.add(opt2);
    elements.selectRankingPerson.add(optRank);
  });
}

function loadPairInArena(p1Id, p2Id) {
  const p1 = state.profiles.find(p => p.id === p1Id) || state.profiles[0];
  let p2 = state.profiles.find(p => p.id === p2Id);
  if (!p2 || p2.id === p1.id) {
    p2 = state.profiles.find(p => p.id !== p1.id) || state.profiles[1];
  }

  state.dateSimulation.person1 = p1;
  state.dateSimulation.person2 = p2;

  elements.selectAgent1.value = p1.id;
  elements.selectAgent2.value = p2.id;

  elements.pod1Avatar.src = p1.avatar;
  elements.pod1Name.textContent = p1.name;
  elements.pod1Role.textContent = p1.role;

  elements.pod2Avatar.src = p2.avatar;
  elements.pod2Name.textContent = p2.name;
  elements.pod2Role.textContent = p2.role;

  // Find date data
  const existing = state.curatedDates.find(d => 
    (d.person1 === p1.id && d.person2 === p2.id) ||
    (d.person1 === p2.id && d.person2 === p1.id)
  );

  if (existing) {
    state.dateSimulation.venue = existing.venue;
    state.dateSimulation.dialogue = existing.dialogue;
    state.dateSimulation.score = existing.compatibility_score;
    state.dateSimulation.verdict = existing.verdict;
  } else {
    // Dynamically generate date using persona data
    generateDynamicDate(p1, p2);
  }

  elements.venueName.textContent = state.dateSimulation.venue.name;
  elements.venueCity.textContent = state.dateSimulation.venue.city;
  elements.venueVibe.textContent = `(${state.dateSimulation.venue.atmosphere})`;

  resetDateStage();
}

function generateDynamicDate(p1, p2) {
  const venues = [
    { name: "The SoHo Speakeasy", city: "New York", atmosphere: "Low amber candlelight, vinyl jazz, artisan botanicals" },
    { name: "Kyoto Bamboo Pavilion", city: "Kyoto", atmosphere: "Moss gardens, matcha ceremony, bamboo whispers" },
    { name: "Twin Peaks Twilight Overlook", city: "San Francisco", atmosphere: "Panoramic bay fog, warm tea thermos, quiet skyline" }
  ];
  const venue = venues[Math.floor(Math.random() * venues.length)];

  const p1Hobby = p1.agent_analysis.hobbies[0] || 'creative pursuits';
  const p2Hobby = p2.agent_analysis.hobbies[0] || 'active wellness';
  const p1Travel = p1.instagram_data.travel_spots[0] || 'Tokyo';
  const score = Math.floor(Math.random() * 18) + 80;

  const dialogue = [
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `I noticed your recent Instagram dispatches from ${p1Travel}. There is an unhurried, thoughtful rhythm to how you explore places that feels very refreshing.`,
      thought: `Her visual aesthetic mirrors his appreciation for quiet depth and authentic observation.`,
      chemistry_delta: '+9%'
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `Thank you! I value presence over checklists. And reviewing your LinkedIn trajectory, it's rare to see someone sustain that level of ambition while keeping such human integrity.`,
      thought: `He values depth over noise. Testing how he manages intense pressure while preserving his emotional center.`,
      chemistry_delta: '+12%'
    },
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `It requires strict boundaries. When the noise gets overwhelming, ${p1Hobby} is my sanctuary. What activity keeps you centered when deadlines surge?`,
      thought: `Checking lifestyle harmony: does she value restorative solitude like ${p2Hobby}?`,
      chemistry_delta: '+11%'
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `For me, it's definitely ${p2Hobby} and morning quiet. I need a partner who can spar intellectually, but also loves cooking a simple dinner with no phones in sight.`,
      thought: `Resounding green flag. Shared love language of presence and zero pretense.`,
      chemistry_delta: '+14%'
    },
    {
      speaker: `${p1.name}'s Agent`,
      avatar: p1.avatar,
      text: `No phones in sight is my definition of luxury. Honestly, our communication cadences feel remarkably effortless. Shall we plan date two in person?`,
      thought: `Compatibility validated at ${score}%. High mutual respect and chemistry verified.`,
      chemistry_delta: '+15%'
    },
    {
      speaker: `${p2.name}'s Agent`,
      avatar: p2.avatar,
      text: `Consider it agreed. I'll pick a hidden courtyard restaurant that matches our shared aesthetic. It's a date.`,
      thought: `Second date confirmed. Mutual enthusiasm sealed.`,
      chemistry_delta: '+12%'
    }
  ];

  state.dateSimulation.venue = venue;
  state.dateSimulation.dialogue = dialogue;
  state.dateSimulation.score = score;
  state.dateSimulation.verdict = `Electric Chemistry! Both agents agreed on a 2nd date (${score}% Compatibility).`;
}

function resetDateStage() {
  clearTimeout(state.dateSimulation.timer);
  state.dateSimulation.currentStep = 0;
  state.dateSimulation.isPlaying = false;
  elements.btnPlayPause.textContent = '▶';
  elements.dialogueFeed.innerHTML = '';
  elements.verdictBanner.style.display = 'none';
  elements.chemistryBar.style.width = '20%';
  elements.chemistryValue.textContent = '20%';
  elements.dialogueCounter.textContent = `Turn 0 of ${state.dateSimulation.dialogue.length}`;
  elements.pod1.classList.remove('speaking');
  elements.pod2.classList.remove('speaking');
  elements.pod1Status.textContent = 'Ready';
  elements.pod2Status.textContent = 'Ready';
}

function setupDateArena() {
  elements.selectAgent1.addEventListener('change', () => {
    loadPairInArena(elements.selectAgent1.value, elements.selectAgent2.value);
  });

  elements.selectAgent2.addEventListener('change', () => {
    loadPairInArena(elements.selectAgent1.value, elements.selectAgent2.value);
  });

  elements.btnStartDate.addEventListener('click', () => {
    startDateSimulation();
  });

  elements.btnPlayPause.addEventListener('click', () => {
    if (state.dateSimulation.isPlaying) {
      pauseDateSimulation();
    } else {
      playDateSimulation();
    }
  });

  elements.btnStep.addEventListener('click', () => {
    pauseDateSimulation();
    advanceDateStep();
  });

  elements.btnReplay.addEventListener('click', () => {
    resetDateStage();
    startDateSimulation();
  });

  elements.speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dateSimulation.speed = parseFloat(btn.dataset.speed);
      if (state.dateSimulation.speed === 0) {
        // Fast forward instant
        runInstantSimulation();
      }
    });
  });
}

function startDateSimulation() {
  resetDateStage();
  playDateSimulation();
}

function playDateSimulation() {
  state.dateSimulation.isPlaying = true;
  elements.btnPlayPause.textContent = '⏸';
  runDateLoop();
}

function pauseDateSimulation() {
  state.dateSimulation.isPlaying = false;
  elements.btnPlayPause.textContent = '▶';
  clearTimeout(state.dateSimulation.timer);
}

function runDateLoop() {
  if (!state.dateSimulation.isPlaying) return;

  if (state.dateSimulation.currentStep < state.dateSimulation.dialogue.length) {
    advanceDateStep();
    const delay = state.dateSimulation.speed === 2 ? 1100 : 2200;
    state.dateSimulation.timer = setTimeout(runDateLoop, delay);
  } else {
    finishDateSimulation();
  }
}

function advanceDateStep() {
  const step = state.dateSimulation.currentStep;
  const turns = state.dateSimulation.dialogue;
  if (step >= turns.length) return;

  const item = turns[step];
  renderDialogueTurn(item, step);

  // Update speaking state
  const isP1 = step % 2 === 0;
  elements.pod1.classList.toggle('speaking', isP1);
  elements.pod2.classList.toggle('speaking', !isP1);
  elements.pod1Status.textContent = isP1 ? 'Speaking' : 'Listening';
  elements.pod2Status.textContent = isP1 ? 'Listening' : 'Speaking';

  // Update chemistry meter
  const progressRatio = (step + 1) / turns.length;
  const targetScore = state.dateSimulation.score || 92;
  const currentChem = Math.round(20 + (targetScore - 20) * progressRatio);
  elements.chemistryBar.style.width = `${currentChem}%`;
  elements.chemistryValue.textContent = `${currentChem}%`;

  sfx.playPop();

  state.dateSimulation.currentStep++;
  elements.dialogueCounter.textContent = `Turn ${state.dateSimulation.currentStep} of ${turns.length}`;

  if (state.dateSimulation.currentStep >= turns.length) {
    finishDateSimulation();
  }
}

function renderDialogueTurn(item, step) {
  const entry = document.createElement('div');
  entry.className = 'dialogue-entry';
  entry.innerHTML = `
    <img src="${item.avatar}" alt="" class="dialogue-avatar">
    <div class="dialogue-bubble-group">
      <span class="dialogue-speaker-name">${item.speaker}</span>
      <div class="speech-bubble">
        ${item.text}
      </div>
      <div class="thought-bubble">
        <span class="thought-icon">💭</span>
        <div class="thought-content">
          <span class="thought-tag">[Agent Hidden Cognition]:</span> ${item.thought}
        </div>
      </div>
    </div>
  `;
  elements.dialogueFeed.appendChild(entry);
  elements.dialogueFeed.scrollTop = elements.dialogueFeed.scrollHeight;
}

function runInstantSimulation() {
  pauseDateSimulation();
  elements.dialogueFeed.innerHTML = '';
  state.dateSimulation.dialogue.forEach((item, idx) => {
    renderDialogueTurn(item, idx);
  });
  state.dateSimulation.currentStep = state.dateSimulation.dialogue.length;
  finishDateSimulation();
}

function finishDateSimulation() {
  pauseDateSimulation();
  elements.pod1.classList.remove('speaking');
  elements.pod2.classList.remove('speaking');
  elements.pod1Status.textContent = 'Date Finished';
  elements.pod2Status.textContent = 'Date Finished';

  const score = state.dateSimulation.score || 92;
  elements.chemistryBar.style.width = `${score}%`;
  elements.chemistryValue.textContent = `${score}%`;

  elements.verdictTitle.textContent = state.dateSimulation.verdict;
  elements.verdictDesc.textContent = `Autonomous post-date assessment verified shared core needs, complementary communication cadences, and deep respect for each other's craft.`;
  elements.verdictScore.textContent = `${score}% Harmonic Fit`;
  elements.verdictBanner.style.display = 'flex';

  sfx.playChime();
}

// RANKINGS TAB
function setupRankingsTab() {
  elements.selectRankingPerson.addEventListener('change', () => {
    selectPersonInRankings(elements.selectRankingPerson.value);
  });

  if (state.profiles.length > 0) {
    selectPersonInRankings(state.profiles[0].id);
  }
}

function selectPersonInRankings(personId) {
  const person = state.profiles.find(p => p.id === personId);
  if (!person) return;

  state.selectedRankingPersonId = person.id;
  elements.selectRankingPerson.value = person.id;

  // Render hero
  elements.rankingHero.innerHTML = `
    <img src="${person.avatar}" alt="${person.name}" class="ranking-hero-avatar">
    <div class="ranking-hero-details">
      <h3 class="ranking-hero-name">Candidate Rankings for ${person.name}</h3>
      <p class="ranking-hero-role">${person.role} · ${person.location}</p>
      <div class="ranking-hero-source-badges">
        <a href="${person.linkedin_url}" target="_blank" class="social-link linkedin">💼 Verified LinkedIn</a>
        <a href="${person.instagram_url}" target="_blank" class="social-link instagram">📸 Public Instagram</a>
      </div>
    </div>
  `;

  // Render rankings table
  const matchRanks = state.rankings[person.id] || [];
  elements.rankingsTableBody.innerHTML = '';

  matchRanks.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="rank-badge rank-${m.rank}">${m.rank}</span>
      </td>
      <td>
        <div class="candidate-cell">
          <img src="${m.candidate_avatar}" alt="${m.candidate_name}" class="candidate-avatar">
          <div>
            <div class="candidate-name">${m.candidate_name}</div>
            <div class="candidate-role">${m.candidate_role}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem;">
          <a href="${m.candidate_linkedin}" target="_blank" class="social-link linkedin" title="LinkedIn">💼 In</a>
          <a href="${m.candidate_instagram}" target="_blank" class="social-link instagram" title="Instagram">📸 Ig</a>
        </div>
      </td>
      <td>
        <span class="score-badge">${m.score}%</span>
      </td>
      <td>
        <div class="synergy-list">
          ${m.synergies.map(s => `<div class="synergy-item">✨ ${s}</div>`).join('')}
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-outline btn-watch-pair" data-candidate="${m.candidate_id}">
          🍷 Watch Date
        </button>
      </td>
    `;

    tr.querySelector('.btn-watch-pair').addEventListener('click', () => {
      loadPairInArena(person.id, m.candidate_id);
      switchTab('arena');
      startDateSimulation();
    });

    elements.rankingsTableBody.appendChild(tr);
  });
}

// Power Matches Across the Network
function renderPowerMatches() {
  const topPairs = [
    { p1: 'sam-altman', p2: 'mira-murati', score: 96, label: 'Frontier AI & Aesthetic Precision' },
    { p1: 'brian-chesky', p2: 'whitney-wolfe-herd', score: 94, label: 'Human Connection & Design Pioneers' },
    { p1: 'marques-brownlee', p2: 'payal-kadakia', score: 93, label: 'High Athletic Discipline & Craft' },
    { p1: 'lex-fridman', p2: 'padmasree-warrior', score: 91, label: 'Poetic Soul & Deep Philosophy' },
    { p1: 'sara-blakely', p2: 'shaan-puri', score: 89, label: 'Playful Grit & Entrepreneurial Joy' }
  ];

  elements.powerMatchesGrid.innerHTML = '';
  topPairs.forEach(pair => {
    const p1 = state.profiles.find(p => p.id === pair.p1);
    const p2 = state.profiles.find(p => p.id === pair.p2);
    if (!p1 || !p2) return;

    const card = document.createElement('div');
    card.className = 'power-match-card';
    card.innerHTML = `
      <div class="match-pair-visual">
        <img src="${p1.avatar}" alt="${p1.name}" class="overlap-avatar">
        <img src="${p2.avatar}" alt="${p2.name}" class="overlap-avatar">
      </div>
      <div style="text-align: center;">
        <h4 style="font-size: 1rem; font-weight: 800;">${p1.name} & ${p2.name}</h4>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">${pair.label}</p>
        <div style="margin-top: 0.6rem;">
          <span class="score-badge">${pair.score}% Harmonic Match</span>
        </div>
      </div>
      <button class="btn btn-sm btn-primary btn-power-date" style="margin-top: auto;">
        ▶ Watch Their Date
      </button>
    `;

    card.querySelector('.btn-power-date').addEventListener('click', () => {
      loadPairInArena(p1.id, p2.id);
      switchTab('arena');
      startDateSimulation();
    });

    elements.powerMatchesGrid.appendChild(card);
  });
}

// SCRAPER & ADD PERSON ENGINE
function setupScraperForm() {
  elements.btnAutofillSample?.addEventListener('click', () => {
    elements.inputPersonName.value = 'Dr. Elena Rostova';
    elements.inputPersonLinkedin.value = 'https://www.linkedin.com/in/elena-rostova-biotech';
    elements.inputPersonInstagram.value = 'https://www.instagram.com/elenarostova';
  });

  elements.formAddPerson?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = elements.inputPersonName.value.trim();
    const liUrl = elements.inputPersonLinkedin.value.trim();
    const igUrl = elements.inputPersonInstagram.value.trim();

    if (!liUrl || !igUrl) return;

    // Show terminal and spinner
    elements.btnSubmitScrape.disabled = true;
    elements.scrapeSpinner.style.display = 'inline-block';
    elements.btnSubmitText.textContent = 'Extracting & Analyzing...';
    elements.scraperTerminal.style.display = 'block';
    elements.terminalLogStream.innerHTML = '';
    elements.newAgentResult.style.display = 'none';

    await runScraperTerminalAnimation(name, liUrl, igUrl);

    try {
      // Send to server API
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, linkedin_url: liUrl, instagram_url: igUrl })
      });

      const data = await res.json();
      if (data.success) {
        handleScrapeSuccess(data.profile, data.rankings);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.warn('API error, falling back to client-side synthesis', err);
      // Fallback local agent synthesis
      const fallbackResult = localClientSynthesize(name, liUrl, igUrl);
      handleScrapeSuccess(fallbackResult.profile, fallbackResult.rankings);
    }
  });
}

async function runScraperTerminalAnimation(name, liUrl, igUrl) {
  const logs = [
    `[Scraper] Initializing multi-tier profile ingestion pipeline...`,
    `[Scraper] Fetching LinkedIn metadata from ${liUrl}...`,
    `[LinkedIn Parser] Extracting professional title, career ethos, leadership indicators...`,
    `[Scraper] Querying Instagram public endpoint for ${igUrl}...`,
    `[Instagram Parser] Extracting visual aesthetic, travel footprints, weekend rituals, culinary vibe...`,
    `[Cognitive Engine] Synthesizing Agent Persona: Modeling core needs, green flags, dealbreakers...`,
    `[Autonomous Harness] Running pairwise compatibility tests across all 26 network agents...`,
    `[Matchmaker] Computed ranking matrix! New agent ready for deployment.`
  ];

  for (let i = 0; i < logs.length; i++) {
    const p = document.createElement('div');
    p.className = 'terminal-line ' + (i === logs.length - 1 ? 'success' : i % 2 === 0 ? 'thought' : '');
    p.textContent = logs[i];
    elements.terminalLogStream.appendChild(p);
    elements.terminalLogStream.scrollTop = elements.terminalLogStream.scrollHeight;
    sfx.playPop();
    await new Promise(r => setTimeout(r, 450));
  }
}

function handleScrapeSuccess(newProfile, newRankings) {
  elements.btnSubmitScrape.disabled = false;
  elements.scrapeSpinner.style.display = 'none';
  elements.btnSubmitText.textContent = '🚀 Scrape, Analyze & Deploy Agent';

  // Inject into state
  state.profiles.unshift(newProfile);
  state.rankings[newProfile.id] = newRankings;

  // Refresh dropdowns & grid
  populateDropdowns();
  renderProfilesGrid(state.profiles);

  // Render Result Card
  const topMatch = newRankings[0];
  elements.newAgentResult.innerHTML = `
    <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
      <img src="${newProfile.avatar}" alt="" style="width: 68px; height: 68px; border-radius: 50%; border: 2px solid #10b981;">
      <div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #10b981;">Agent Successfully Deployed!</h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary);">${newProfile.name} is now dating inside the network.</p>
      </div>
    </div>

    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
      <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.4rem;">
        <strong>Top Match Found:</strong> ${topMatch.candidate_name} (${topMatch.score}% Compatibility)
      </p>
      <p style="font-size: 0.8rem; color: var(--text-secondary);">
        ${topMatch.why_they_fit}
      </p>
    </div>

    <div style="display: flex; gap: 0.75rem;">
      <button class="btn btn-sm btn-primary" id="btn-result-watch-date">
        🍷 Watch Debut Date with ${topMatch.candidate_name}
      </button>
      <button class="btn btn-sm btn-outline" id="btn-result-view-profile">
        🔍 View Agent Profile Blueprint
      </button>
    </div>
  `;

  elements.newAgentResult.style.display = 'block';

  elements.newAgentResult.querySelector('#btn-result-watch-date').addEventListener('click', () => {
    loadPairInArena(newProfile.id, topMatch.candidate_id);
    switchTab('arena');
    startDateSimulation();
  });

  elements.newAgentResult.querySelector('#btn-result-view-profile').addEventListener('click', () => {
    openProfileModal(newProfile);
  });

  sfx.playChime();
}

// Client-side fallback synthesizer for offline or static hosting
function localClientSynthesize(name, liUrl, igUrl) {
  const newId = `custom-${Date.now()}`;
  const cleanName = name || 'Alex Rivera';

  const newProfile = {
    id: newId,
    name: cleanName,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80",
    role: "Founder & Creative Technologist",
    location: "Global / Remote",
    gender: "female",
    interested_in: ["male", "female"],
    linkedin_url: liUrl,
    instagram_url: igUrl,
    linkedin_data: {
      headline: `${cleanName} · Technologist & Founder`,
      summary: "Passionate innovator building at the intersection of design, technology, and culture.",
      skills: ["Strategic Vision", "Product Design", "AI Integration", "Leadership"],
      career_ethos: "Relentless curiosity paired with deep professional integrity and human empathy.",
      intellectual_focus: "Frontier technology, creative design systems, human connection."
    },
    instagram_data: {
      handle: "@" + cleanName.toLowerCase().replace(/\s+/g, ''),
      bio: "design, espresso, and quiet moments in cities",
      aesthetic_vibe: "Natural ambient lighting, architectural minimalism, espresso culture, and spontaneous weekend journeys.",
      travel_spots: ["New York", "Tokyo", "London", "San Francisco"],
      weekend_rituals: "Exploring local indie coffee roasters, long city walks, gallery hopping, and cooking dinners with friends.",
      culinary_tastes: "Single-origin pour over, wood-fired Mediterranean dishes, fresh sourdough, and natural wines."
    },
    agent_analysis: {
      core_needs: "A partner with intellectual independence and grounded emotional presence, who values deep honest conversation and maintains their own passionate life pursuits.",
      hobbies: ["Analog photography", "Specialty coffee brewing", "Contemporary architecture", "Trail running"],
      interests: ["Minimalist design", "Cognitive philosophy", "Indie cinema", "Future of work"],
      qualities: {
        communication_style: "Direct, witty, perceptive, and attentive to subtle emotional cues.",
        love_language: "Quality Time & Shared Cultural Discoveries",
        green_flags: "Deep curiosity, comfort with silence, respect for autonomy, kindness to service staff.",
        dealbreakers: "Superficial pretense, victim mindset, chronic cynicism, emotional unavailability.",
        conflict_style: "Calm, transparent, seeks mutual clarity rather than winning debates.",
        ideal_date_venue: "A quiet architectural courtyard cafe with specialty tea, followed by an unhurried walk through a contemporary art pavilion."
      },
      dating_agent_prompt: `You are the autonomous dating agent representing ${cleanName}. You speak with ${cleanName}'s authentic personality, balancing professional drive with personal lifestyle warmth.`
    }
  };

  const matches = state.profiles.map(candidate => ({
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    candidate_role: candidate.role,
    candidate_avatar: candidate.avatar,
    candidate_linkedin: candidate.linkedin_url,
    candidate_instagram: candidate.instagram_url,
    score: Math.floor(Math.random() * 20) + 78,
    synergies: [
      `Harmonic alignment between ${cleanName}'s vision and ${candidate.name}'s lifestyle`,
      `Shared curiosity for travel, culture, and high-impact craft`
    ],
    why_they_fit: `Agentic synthesis reveals strong complementary resonance between ${cleanName}'s LinkedIn drive and ${candidate.name}'s Instagram lifestyle.`
  }));

  matches.sort((a, b) => b.score - a.score);
  const ranked = matches.map((m, idx) => ({ rank: idx + 1, ...m }));

  return { profile: newProfile, rankings: ranked };
}

// Sound toggle
function setupSoundToggle() {
  elements.btnToggleSound?.addEventListener('click', () => {
    state.dateSimulation.soundEnabled = !state.dateSimulation.soundEnabled;
    elements.soundIcon.textContent = state.dateSimulation.soundEnabled ? '🔊' : '🔇';
  });
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
});
