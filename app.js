import { CATEGORIES_CONFIG, ALBUMS_BY_CATEGORY, getAlbumsList, searchAlbumsByCategory, normalizeText } from './data-albums.js';

/* ==========================================================================
   DISCO DIÁRIO - Game Engine 5 Modos + Admin Mode + Calendário de Arquivo
   Com Lifecycle Seguro Anti-Flicker e Suporte Robusto a CDNs
   ========================================================================== */

// --- Audio Synthesizer (Web Audio API Procedural) ---
class VinylAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('albumtrivia_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('albumtrivia_muted', this.muted);
    return this.muted;
  }

  playClick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch(e) {}
  }

  playFlip(index = 0) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 440 + (index * 80);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch(e) {}
  }

  playWin() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + (idx * 0.1);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.8);
      });
    } catch(e) {}
  }

  playError() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch(e) {}
  }
}

const audio = new VinylAudio();

// --- Confetti Particle System ---
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#00FF66', '#FF5500', '#FFFFFF', '#F59E0B', '#1DB954'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      w: Math.random() * 8 + 4,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 18,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.4,
      opacity: 1
    });
  }

  let animationFrame;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive > 0) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }
  render();
}

// --- Funções Utilitárias de Data (Horário de Brasília UTC-3) ---
const START_DATE = new Date('2025-01-01T00:00:00-03:00');

function getBrasiliaDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [year, month, day] = formatter.format(date).split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function calculateDayNumber(targetDate = new Date()) {
  const localDate = getBrasiliaDate(targetDate);
  const startLocalDate = getBrasiliaDate(START_DATE);
  const diffTime = localDate.getTime() - startLocalDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function formatDateKey(date) {
  const bDate = getBrasiliaDate(date);
  const y = bDate.getFullYear();
  const m = String(bDate.getMonth() + 1).padStart(2, '0');
  const d = String(bDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

// --- Algoritmo Determinístico por Categoria e Data ---
function getAlbumForCategoryAndDate(category = "GERAL", targetDate = new Date()) {
  const localDate = getBrasiliaDate(targetDate);
  const dateKey = formatDateKey(localDate);
  
  const seedString = `${category}_${dateKey}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
    hash |= 0;
  }
  
  const list = getAlbumsList(category);
  const albumIndex = Math.abs(hash) % list.length;
  const dayNumber = calculateDayNumber(targetDate);

  return {
    album: list[albumIndex],
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    dayNumber,
    category
  };
}

// --- Game Engine Refatorada ---
class GameEngine {
  constructor() {
    this.maxAttempts = 6;
    this.currentCategory = localStorage.getItem('albumtrivia_active_category') || 'GERAL';
    this.todayDate = new Date();
    this.activeDate = new Date();
    this.adminMode = localStorage.getItem('disco_admin_mode') === 'true' || new URLSearchParams(window.location.search).get('admin') === 'true';

    this.initSession();
  }

  getSessionKey(category, dayNumber) {
    const cat = (category || 'GERAL').toLowerCase();
    const day = dayNumber || (this.targetInfo ? this.targetInfo.dayNumber : 1);
    return `${cat}-day-${day}`;
  }

  loadAllSessions() {
    try {
      const data = localStorage.getItem('albumtrivia_game_state');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveAllSessions(allSessions) {
    try {
      localStorage.setItem('albumtrivia_game_state', JSON.stringify(allSessions));
    } catch (e) {}
  }

  initSession() {
    localStorage.setItem('albumtrivia_active_category', this.currentCategory);
    this.targetInfo = getAlbumForCategoryAndDate(this.currentCategory, this.activeDate);
    this.targetAlbum = this.targetInfo.album;
    this.sessionKey = this.getSessionKey(this.currentCategory, this.targetInfo.dayNumber);

    const allSessions = this.loadAllSessions();
    const existingSession = allSessions[this.sessionKey];

    if (existingSession && Array.isArray(existingSession.guesses)) {
      this.state = {
        sessionKey: this.sessionKey,
        category: this.currentCategory,
        dateKey: this.targetInfo.dateKey,
        dayNumber: this.targetInfo.dayNumber,
        targetId: this.targetAlbum.id,
        guesses: existingSession.guesses || [],
        status: existingSession.status || 'IN_PROGRESS',
        completedAt: existingSession.completedAt || null
      };
    } else {
      this.state = {
        sessionKey: this.sessionKey,
        category: this.currentCategory,
        dateKey: this.targetInfo.dateKey,
        dayNumber: this.targetInfo.dayNumber,
        targetId: this.targetAlbum.id,
        guesses: [],
        status: 'IN_PROGRESS',
        completedAt: null
      };
      this.saveState();
    }

    this.stats = this.loadStats();
  }

  isToday() {
    return formatDateKey(getBrasiliaDate(this.todayDate)) === this.targetInfo.dateKey;
  }

  switchCategory(category) {
    if (this.currentCategory === category) return;
    this.currentCategory = category;
    this.initSession();
  }

  setDate(newDate) {
    this.activeDate = new Date(newDate);
    this.initSession();
  }

  resetToToday() {
    this.activeDate = new Date();
    this.initSession();
  }

  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch(e) {
      return null;
    }
  }

  saveState() {
    const allSessions = this.loadAllSessions();
    allSessions[this.sessionKey] = {
      category: this.currentCategory,
      dateKey: this.targetInfo.dateKey,
      dayNumber: this.targetInfo.dayNumber,
      targetId: this.targetAlbum.id,
      guesses: this.state.guesses,
      status: this.state.status,
      completedAt: this.state.completedAt
    };
    this.saveAllSessions(allSessions);
  }

  adminResetCurrentRound() {
    localStorage.removeItem(this.storageKey);
    this.state = {
      category: this.currentCategory,
      dateKey: this.targetInfo.dateKey,
      dayNumber: this.targetInfo.dayNumber,
      guesses: [],
      status: 'IN_PROGRESS',
      completedAt: null
    };
    this.saveState();
  }

  adminOffsetDays(offset) {
    const current = new Date(this.activeDate);
    current.setDate(current.getDate() + offset);
    this.setDate(current);
  }

  loadStats() {
    try {
      const data = localStorage.getItem(`albumtrivia_stats_${this.currentCategory}`);
      if (data) return JSON.parse(data);
    } catch(e) {}
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0]
    };
  }

  saveStats() {
    localStorage.setItem(`albumtrivia_stats_${this.currentCategory}`, JSON.stringify(this.stats));
  }

  recordGameResult(won) {
    if (this.isToday()) {
      this.stats.played += 1;
      if (won) {
        this.stats.wins += 1;
        this.stats.currentStreak += 1;
        if (this.stats.currentStreak > this.stats.maxStreak) {
          this.stats.maxStreak = this.stats.currentStreak;
        }
        const attemptIdx = this.state.guesses.length - 1;
        if (attemptIdx >= 0 && attemptIdx < 6) {
          this.stats.distribution[attemptIdx] += 1;
        }
      } else {
        this.stats.currentStreak = 0;
      }
      this.saveStats();
    }
  }

  evaluateGuess(guessedAlbum) {
    const target = this.targetAlbum;
    const titleMatch = normalizeText(guessedAlbum.titulo) === normalizeText(target.titulo);
    const artistMatch = normalizeText(guessedAlbum.artista) === normalizeText(target.artista);

    let yearStatus = 'wrong';
    let yearDirection = null;
    if (guessedAlbum.ano === target.ano) {
      yearStatus = 'correct';
    } else {
      yearDirection = guessedAlbum.ano < target.ano ? 'up' : 'down';
      if (Math.abs(guessedAlbum.ano - target.ano) <= 3) {
        yearStatus = 'near';
      }
    }

    let genreStatus = 'wrong';
    const guessGenreNorm = normalizeText(guessedAlbum.genero);
    const targetGenreNorm = normalizeText(target.genero);

    if (guessGenreNorm === targetGenreNorm) {
      genreStatus = 'correct';
    } else {
      const guessWords = guessGenreNorm.split(/[\/\s,]+/);
      const targetWords = targetGenreNorm.split(/[\/\s,]+/);
      const hasOverlap = guessWords.some(w => w.length > 2 && targetWords.includes(w));
      if (hasOverlap) genreStatus = 'near';
    }

    return {
      album: guessedAlbum,
      titleMatch,
      artistMatch,
      yearStatus,
      yearDirection,
      genreStatus
    };
  }

  makeGuess(album) {
    if (this.state.status !== 'IN_PROGRESS' && !this.adminMode) return null;
    if (this.state.guesses.length >= this.maxAttempts && !this.adminMode) return null;

    const alreadyGuessed = this.state.guesses.some(g => g.album.id === album.id);
    if (alreadyGuessed) return { error: 'Álbum já testado nesta rodada!' };

    const evaluation = this.evaluateGuess(album);
    this.state.guesses.push(evaluation);

    if (evaluation.titleMatch) {
      this.state.status = 'WON';
      this.state.completedAt = new Date().toISOString();
      this.recordGameResult(true);
    } else if (this.state.guesses.length >= this.maxAttempts) {
      this.state.status = 'LOST';
      this.state.completedAt = new Date().toISOString();
      this.recordGameResult(false);
    }

    this.saveState();
    return { evaluation, status: this.state.status };
  }

  getArchiveDaysList(daysCount = 30) {
    const list = [];
    const base = getBrasiliaDate(new Date());

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const dateKey = formatDateKey(d);
      const dayInfo = getAlbumForCategoryAndDate(this.currentCategory, d);
      
      const stored = localStorage.getItem(`albumtrivia_state_${this.currentCategory}_${dateKey}`);
      let status = 'UNPLAYED';
      let guessesCount = 0;

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          status = parsed.status;
          guessesCount = parsed.guesses.length;
        } catch(e) {}
      }

      list.push({
        date: d,
        dateKey,
        displayDate: formatDisplayDate(dateKey),
        dayNumber: dayInfo.dayNumber,
        isToday: i === 0,
        status,
        guessesCount,
        album: dayInfo.album
      });
    }
    return list;
  }

  generateShareText() {
    const catConfig = CATEGORIES_CONFIG[this.currentCategory] || CATEGORIES_CONFIG.GERAL;
    const day = this.targetInfo.dayNumber;
    const attempts = this.state.status === 'WON' ? this.state.guesses.length : 'X';
    const modeTag = this.isToday() ? '' : ' [ARQUIVO]';
    let text = `ALBUMTRIVIA (${catConfig.label.toUpperCase()}${modeTag}) #${day} ${catConfig.icon} ${attempts}/6\n\n`;

    this.state.guesses.forEach(g => {
      const t = g.titleMatch ? '🟩' : '⬛';
      const a = g.artistMatch ? '🟩' : '⬛';
      let y = '⬛';
      if (g.yearStatus === 'correct') y = '🟩';
      else if (g.yearDirection === 'up') y = '⬆️';
      else if (g.yearDirection === 'down') y = '⬇️';
      let gen = '⬛';
      if (g.genreStatus === 'correct') gen = '🟩';
      else if (g.genreStatus === 'near') gen = '🟨';

      text += `${t}${a}${y}${gen}\n`;
    });

    text += `\nJogue em: https://albumtrivia.com.br`;
    return text;
  }
}

// --- UI Controller ---
class UIController {
  constructor(engine) {
    this.engine = engine;
    this.selectedSuggestionIndex = -1;
    this.currentSuggestions = [];
    this.logoClickCount = 0;
    this.logoClickTimer = null;

    this.elements = {
      coverImg: document.getElementById('album-cover-img'),
      vinylContainer: document.getElementById('vinyl-container'),
      gridContainer: document.getElementById('guesses-grid'),
      searchInput: document.getElementById('album-search-input'),
      searchResults: document.getElementById('search-results-dropdown'),
      submitBtn: document.getElementById('submit-guess-btn'),
      dayBadge: document.getElementById('day-number-badge'),
      categoryBadge: document.getElementById('category-name-badge'),
      attemptsCountBadge: document.getElementById('attempts-count-badge'),
      audioToggleBtn: document.getElementById('btn-audio-toggle'),
      categoryTabs: document.querySelectorAll('.category-tab-btn'),
      
      statsModal: document.getElementById('modal-stats'),
      helpModal: document.getElementById('modal-help'),
      archiveModal: document.getElementById('modal-archive'),
      
      openStatsBtn: document.getElementById('btn-open-stats'),
      openHelpBtn: document.getElementById('btn-open-help'),
      openArchiveBtn: document.getElementById('btn-open-archive'),
      closeStatsBtn: document.getElementById('btn-close-stats'),
      closeHelpBtn: document.getElementById('btn-close-help'),
      closeArchiveBtn: document.getElementById('btn-close-archive'),
      
      archiveListContainer: document.getElementById('archive-days-list'),
      archiveNoticeBanner: document.getElementById('archive-notice-banner'),
      archiveNoticeText: document.getElementById('archive-notice-text'),
      btnReturnToday: document.getElementById('btn-return-today'),
      adminToolbar: document.getElementById('admin-toolbar'),
      adminCheatInfo: document.getElementById('admin-cheat-info'),
      logoHeader: document.getElementById('header-logo'),
      shareBtn: document.getElementById('btn-share-result'),
      toastContainer: document.getElementById('toast-container'),
      nextCountdown: document.getElementById('next-album-countdown')
    };

    this.init();
  }

  init() {
    this.updateCategoryTabsUI();
    this.updateHeaderBadges();
    this.updateArchiveNotice();
    this.updateAdminToolbar();
    this.renderInitialGrid();
    this.updateCoverBlur(false);
    this.setupEventListeners();
    this.setupCountdown();
    this.updateAudioButtonState();
    this.updateSearchPlaceholder();

    if (this.engine.state.status !== 'IN_PROGRESS') {
      setTimeout(() => {
        this.openStatsModal();
      }, 700);
    }
  }

  updateCategoryTabsUI() {
    this.elements.categoryTabs.forEach(tab => {
      const cat = tab.getAttribute('data-category');
      if (cat === this.engine.currentCategory) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  updateSearchPlaceholder() {
    const catConfig = CATEGORIES_CONFIG[this.engine.currentCategory] || CATEGORIES_CONFIG.GERAL;
    this.elements.searchInput.placeholder = `Buscar no acervo de ${catConfig.label} (${catConfig.icon})...`;
  }

  updateAudioButtonState() {
    if (this.elements.audioToggleBtn) {
      this.elements.audioToggleBtn.innerHTML = audio.muted 
        ? `<svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`
        : `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
    }
  }

  showToast(message, isSuccess = true) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="${isSuccess ? 'text-emerald-400' : 'text-amber-400'}">${isSuccess ? '●' : '▲'}</span>
      <span>${message}</span>
    `;
    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  updateHeaderBadges() {
    const catConfig = CATEGORIES_CONFIG[this.engine.currentCategory] || CATEGORIES_CONFIG.GERAL;
    this.elements.dayBadge.textContent = `#${this.engine.targetInfo.dayNumber}`;
    
    if (this.engine.isToday()) {
      this.elements.dayBadge.className = 'studio-badge active';
    } else {
      this.elements.dayBadge.className = 'studio-badge archive-badge';
    }

    if (this.elements.categoryBadge) {
      this.elements.categoryBadge.textContent = `${catConfig.icon} ${catConfig.label.toUpperCase()}`;
    }
    const count = this.engine.state.guesses.length;
    this.elements.attemptsCountBadge.textContent = `${count}/${this.engine.maxAttempts}`;
  }

  updateArchiveNotice() {
    if (!this.elements.archiveNoticeBanner) return;
    if (this.engine.isToday()) {
      this.elements.archiveNoticeBanner.classList.add('hidden');
    } else {
      this.elements.archiveNoticeBanner.classList.remove('hidden');
      if (this.elements.archiveNoticeText) {
        this.elements.archiveNoticeText.textContent = `📅 JOGANDO ARQUIVO: DIA #${this.engine.targetInfo.dayNumber} (${this.engine.targetInfo.displayDate})`;
      }
    }
  }

  updateAdminToolbar() {
    if (!this.elements.adminToolbar) return;
    if (this.engine.adminMode) {
      this.elements.adminToolbar.classList.remove('hidden');
      if (this.elements.adminCheatInfo) {
        const target = this.engine.targetAlbum;
        this.elements.adminCheatInfo.textContent = `SECRET: "${target.titulo}" — ${target.artista} (${target.ano} / ${target.genero})`;
      }
    } else {
      this.elements.adminToolbar.classList.add('hidden');
    }
  }

  toggleAdminMode() {
    this.engine.adminMode = !this.engine.adminMode;
    localStorage.setItem('disco_admin_mode', this.engine.adminMode);
    this.updateAdminToolbar();
    this.showToast(this.engine.adminMode ? '🔧 ADMIN MODE ATIVADO!' : 'Admin Mode desativado');
  }

  /**
   * Atualização Robusta da Capa com Carregamento Seguro e Prevenção de Spoiler
   */
  updateCoverBlur(withTransition = true) {
    const count = this.engine.state.guesses.length;
    const isFinished = this.engine.state.status !== 'IN_PROGRESS';
    const targetUrl = this.engine.targetAlbum.cover_url;
    const targetBlurClass = isFinished ? 'blur-stage-6' : `blur-stage-${count}`;

    // Aplicação das classes de desfoque
    for (let i = 0; i <= 6; i++) {
      this.elements.coverImg.classList.remove(`blur-stage-${i}`);
    }
    this.elements.coverImg.classList.add(targetBlurClass);

    if (isFinished) {
      this.elements.vinylContainer.classList.add('revealed');
    } else {
      this.elements.vinylContainer.classList.remove('revealed');
    }

    if (!withTransition) {
      this.elements.coverImg.src = targetUrl;
      this.elements.coverImg.classList.remove('is-hidden');
      return;
    }

    this.elements.coverImg.classList.add('is-hidden');

    const imgLoader = new Image();
    imgLoader.referrerPolicy = 'no-referrer';

    const revealCover = () => {
      this.elements.coverImg.src = targetUrl;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.elements.coverImg.classList.remove('is-hidden');
        });
      });
    };

    imgLoader.onload = revealCover;
    imgLoader.onerror = () => {
      // Em caso de falha de CDN, garante que a imagem não fique invisível
      this.elements.coverImg.src = targetUrl;
      this.elements.coverImg.classList.remove('is-hidden');
    };
    imgLoader.src = targetUrl;

    // Fallback de segurança de 300ms para nunca travar oculto
    setTimeout(() => {
      this.elements.coverImg.classList.remove('is-hidden');
    }, 350);
  }

  renderInitialGrid() {
    this.elements.gridContainer.innerHTML = '';
    for (let i = 0; i < this.engine.maxAttempts; i++) {
      const guess = this.engine.state.guesses[i];
      const row = document.createElement('div');
      row.className = 'guess-row grid grid-cols-4 gap-2 sm:gap-3 py-0.5';
      
      if (guess) row.innerHTML = this.getGuessRowHtml(guess);
      else row.innerHTML = this.getEmptyRowHtml(i + 1);
      this.elements.gridContainer.appendChild(row);
    }
  }

  getEmptyRowHtml(index) {
    return `
      <div class="guess-card-cell">
        <div class="cell-inner border-dashed border-zinc-800/80 bg-zinc-950/40 text-zinc-600 font-mono text-[11px]">
          <span>ÁLBUM ${index}</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner border-dashed border-zinc-800/80 bg-zinc-950/40 text-zinc-600 font-mono text-[11px]">
          <span>ARTISTA</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner border-dashed border-zinc-800/80 bg-zinc-950/40 text-zinc-600 font-mono text-[11px]">
          <span>ANO</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner border-dashed border-zinc-800/80 bg-zinc-950/40 text-zinc-600 font-mono text-[11px]">
          <span>GÊNERO</span>
        </div>
      </div>
    `;
  }

  getGuessRowHtml(guess) {
    const titleClass = guess.titleMatch ? 'cell-correct' : 'cell-wrong';
    const artistClass = guess.artistMatch ? 'cell-correct' : 'cell-wrong';
    
    let yearClass = 'cell-wrong';
    let yearIcon = '';
    if (guess.yearStatus === 'correct') yearClass = 'cell-correct';
    else if (guess.yearStatus === 'near') {
      yearClass = 'cell-near';
      yearIcon = guess.yearDirection === 'up' ? ' ⬆️' : ' ⬇️';
    } else {
      yearIcon = guess.yearDirection === 'up' ? ' ⬆️' : ' ⬇️';
    }

    let genreClass = 'cell-wrong';
    if (guess.genreStatus === 'correct') genreClass = 'cell-correct';
    else if (guess.genreStatus === 'near') genreClass = 'cell-near';

    return `
      <div class="guess-card-cell">
        <div class="cell-inner ${titleClass}">
          <span class="text-xs sm:text-sm font-bold truncate max-w-full leading-tight font-grotesk">${guess.album.titulo}</span>
          <span class="text-[9px] opacity-75 font-mono">ÁLBUM</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner ${artistClass}">
          <span class="text-xs sm:text-sm font-semibold truncate max-w-full leading-tight font-grotesk">${guess.album.artista}</span>
          <span class="text-[9px] opacity-75 font-mono">ARTISTA</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner ${yearClass}">
          <span class="text-xs sm:text-sm font-bold font-mono">${guess.album.ano}${yearIcon}</span>
          <span class="text-[9px] opacity-75 font-mono">${guess.yearDirection === 'up' ? 'MAIS NOVO' : guess.yearDirection === 'down' ? 'MAIS ANTIGO' : 'EXATO'}</span>
        </div>
      </div>
      <div class="guess-card-cell">
        <div class="cell-inner ${genreClass}">
          <span class="text-xs sm:text-sm font-medium truncate max-w-full leading-tight font-grotesk">${guess.album.genero}</span>
          <span class="text-[9px] opacity-75 font-mono">GÊNERO</span>
        </div>
      </div>
    `;
  }

  animateAndAppendGuess(guess, rowIndex) {
    const rows = this.elements.gridContainer.querySelectorAll('.guess-row');
    if (rows[rowIndex]) {
      const row = rows[rowIndex];
      row.className = 'guess-row grid grid-cols-4 gap-2 sm:gap-3 py-0.5 animate-reveal';
      row.innerHTML = this.getGuessRowHtml(guess);

      [0, 1, 2, 3].forEach(idx => {
        setTimeout(() => audio.playFlip(idx), idx * 150);
      });
    }
  }

  setupEventListeners() {
    this.elements.categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.getAttribute('data-category');
        if (cat === this.engine.currentCategory) return;
        
        audio.playClick();
        this.engine.switchCategory(cat);
        this.refreshFullView();
      });
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        this.toggleAdminMode();
      }
    });

    if (this.elements.logoHeader) {
      this.elements.logoHeader.addEventListener('click', () => {
        this.logoClickCount++;
        clearTimeout(this.logoClickTimer);
        this.logoClickTimer = setTimeout(() => { this.logoClickCount = 0; }, 1500);

        if (this.logoClickCount >= 5) {
          this.logoClickCount = 0;
          this.toggleAdminMode();
        }
      });
    }

    document.getElementById('admin-btn-reset')?.addEventListener('click', () => {
      this.engine.adminResetCurrentRound();
      this.refreshFullView();
      this.showToast('Progresso da rodada resetado! 🔄');
    });

    document.getElementById('admin-btn-prev-day')?.addEventListener('click', () => {
      this.engine.adminOffsetDays(-1);
      this.refreshFullView();
      this.showToast(`Dia anterior: #${this.engine.targetInfo.dayNumber}`);
    });

    document.getElementById('admin-btn-next-day')?.addEventListener('click', () => {
      this.engine.adminOffsetDays(1);
      this.refreshFullView();
      this.showToast(`Próximo dia: #${this.engine.targetInfo.dayNumber}`);
    });

    document.getElementById('admin-btn-win')?.addEventListener('click', () => {
      this.selectAlbum(this.engine.targetAlbum);
    });

    this.elements.btnReturnToday?.addEventListener('click', () => {
      audio.playClick();
      this.engine.resetToToday();
      this.refreshFullView();
      this.showToast('Você voltou para o desafio de hoje! 📅');
    });

    this.elements.audioToggleBtn.addEventListener('click', () => {
      audio.toggleMute();
      this.updateAudioButtonState();
      this.showToast(audio.muted ? 'Áudio desativado' : 'Áudio ativado');
    });

    this.elements.searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.trim().length === 0) {
        this.closeSuggestions();
        return;
      }
      this.currentSuggestions = searchAlbumsByCategory(query, this.engine.currentCategory);
      this.renderSuggestions();
    });

    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (this.currentSuggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.currentSuggestions.length;
        this.highlightSuggestion();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + this.currentSuggestions.length) % this.currentSuggestions.length;
        this.highlightSuggestion();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.currentSuggestions.length) {
          this.selectAlbum(this.currentSuggestions[this.selectedSuggestionIndex]);
        } else if (this.currentSuggestions.length > 0) {
          this.selectAlbum(this.currentSuggestions[0]);
        }
      } else if (e.key === 'Escape') {
        this.closeSuggestions();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.elements.searchInput.contains(e.target) && !this.elements.searchResults.contains(e.target)) {
        this.closeSuggestions();
      }
    });

    this.elements.submitBtn.addEventListener('click', () => {
      if (this.currentSuggestions.length > 0) {
        this.selectAlbum(this.currentSuggestions[0]);
      } else {
        this.showToast('Digite e selecione um álbum da lista!', false);
      }
    });

    this.elements.openStatsBtn.addEventListener('click', () => this.openStatsModal());
    this.elements.closeStatsBtn.addEventListener('click', () => this.closeStatsModal());
    this.elements.openHelpBtn.addEventListener('click', () => this.openHelpModal());
    this.elements.closeHelpBtn.addEventListener('click', () => this.closeHelpModal());
    this.elements.openArchiveBtn?.addEventListener('click', () => this.openArchiveModal());
    this.elements.closeArchiveBtn?.addEventListener('click', () => this.closeArchiveModal());

    this.elements.shareBtn.addEventListener('click', () => {
      audio.playClick();
      const shareText = this.engine.generateShareText();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          this.showToast('Resultado copiado para o clipboard! 📋');
        }).catch(() => this.fallbackShare(shareText));
      } else {
        this.fallbackShare(shareText);
      }
    });
  }

  refreshFullView() {
    this.updateCategoryTabsUI();
    this.updateHeaderBadges();
    this.updateArchiveNotice();
    this.updateAdminToolbar();
    this.renderInitialGrid();
    this.updateCoverBlur(true);
    this.updateSearchPlaceholder();
    this.closeSuggestions();
    this.elements.searchInput.value = '';

    if (this.engine.state.status !== 'IN_PROGRESS') {
      setTimeout(() => this.openStatsModal(), 500);
    }
  }

  fallbackShare(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    this.showToast('Copiado com sucesso! 📋');
  }

  renderSuggestions() {
    if (this.currentSuggestions.length === 0) {
      const catConfig = CATEGORIES_CONFIG[this.engine.currentCategory] || CATEGORIES_CONFIG.GERAL;
      this.elements.searchResults.innerHTML = `
        <div class="p-3 text-zinc-500 text-xs font-mono text-center">Nenhum álbum encontrado no acervo de ${catConfig.label}.</div>
      `;
      this.elements.searchResults.classList.remove('hidden');
      return;
    }

    this.selectedSuggestionIndex = -1;
    this.elements.searchResults.innerHTML = this.currentSuggestions.map((album, idx) => {
      const hit = album.faixa_famosa || album.titulo;
      return `
        <div class="suggestion-item search-result-item" data-index="${idx}">
          <div class="flex flex-col flex-1 min-w-0 pr-2">
            <span class="text-sm font-bold text-zinc-100 font-grotesk truncate">${album.titulo}</span>
            <span class="text-xs text-zinc-400 font-mono truncate">${album.artista} • ${album.ano}</span>
            <span class="text-[11px] text-blue-400 font-mono truncate flex items-center gap-1 mt-0.5">
              <span>🎵</span>
              <span class="truncate">Hit: "${hit}"</span>
            </span>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700 h-fit">${album.genero}</span>
        </div>
      `;
    }).join('');

    this.elements.searchResults.classList.remove('hidden');

    this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        this.selectAlbum(this.currentSuggestions[index]);
      });
    });
  }

  highlightSuggestion() {
    const items = this.elements.searchResults.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedSuggestionIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  closeSuggestions() {
    this.elements.searchResults.classList.add('hidden');
    this.currentSuggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  selectAlbum(album) {
    this.closeSuggestions();
    this.elements.searchInput.value = '';
    this.submitGuess(album);
  }

  submitGuess(album) {
    if (this.engine.state.status !== 'IN_PROGRESS' && !this.engine.adminMode) {
      this.showToast('Desafio já finalizado!', false);
      return;
    }

    const currentAttemptIdx = this.engine.state.guesses.length;
    const result = this.engine.makeGuess(album);

    if (!result) return;
    if (result.error) {
      audio.playError();
      this.showToast(result.error, false);
      return;
    }

    this.animateAndAppendGuess(result.evaluation, currentAttemptIdx);
    this.updateHeaderBadges();
    this.updateCoverBlur(false);

    if (result.status === 'WON') {
      setTimeout(() => {
        audio.playWin();
        triggerConfetti();
        this.showToast(`PARABÉNS! VOCÊ ACERTOU O DISCO! 🎉`);
        setTimeout(() => this.openStatsModal(), 1200);
      }, 700);
    } else if (result.status === 'LOST') {
      setTimeout(() => {
        audio.playError();
        this.showToast(`Fim de jogo! O disco era: ${this.engine.targetAlbum.titulo} (${this.engine.targetAlbum.artista})`, false);
        setTimeout(() => this.openStatsModal(), 1200);
      }, 700);
    }
  }

  openStatsModal() {
    audio.playClick();
    this.renderStatsContent();
    this.elements.statsModal.classList.add('active');
  }

  closeStatsModal() {
    audio.playClick();
    this.elements.statsModal.classList.remove('active');
  }

  openHelpModal() {
    audio.playClick();
    this.elements.helpModal.classList.add('active');
  }

  closeHelpModal() {
    audio.playClick();
    this.elements.helpModal.classList.remove('active');
  }

  openArchiveModal() {
    audio.playClick();
    this.renderArchiveList();
    this.elements.archiveModal.classList.add('active');
  }

  closeArchiveModal() {
    audio.playClick();
    this.elements.archiveModal.classList.remove('active');
  }

  renderArchiveList() {
    if (!this.elements.archiveListContainer) return;
    const days = this.engine.getArchiveDaysList(30);
    const catConfig = CATEGORIES_CONFIG[this.engine.currentCategory] || CATEGORIES_CONFIG.GERAL;

    this.elements.archiveListContainer.innerHTML = days.map(d => {
      const isCurrentlyPlaying = this.engine.targetInfo.dateKey === d.dateKey;
      let badgeHtml = '';

      if (d.status === 'WON') {
        badgeHtml = `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50">VENCEU (${d.guessesCount}/6)</span>`;
      } else if (d.status === 'LOST') {
        badgeHtml = `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-700">NÃO ACERTOU</span>`;
      } else if (d.guessesCount > 0) {
        badgeHtml = `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50">EM JOGO (${d.guessesCount}/6)</span>`;
      } else {
        badgeHtml = `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">JOGAR ➜</span>`;
      }

      return `
        <div class="archive-card ${isCurrentlyPlaying ? 'active-playing' : ''}" data-date="${d.date.toISOString()}">
          <div class="flex items-center gap-3">
            <span class="text-sm font-mono font-bold ${d.isToday ? 'text-emerald-400' : 'text-zinc-400'}">#${d.dayNumber}</span>
            <div class="flex flex-col">
              <span class="text-xs font-bold font-grotesk text-white">${d.displayDate} ${d.isToday ? '<span class="text-[10px] text-emerald-400 font-mono font-normal">(HOJE)</span>' : ''}</span>
              <span class="text-[10px] text-zinc-400 font-mono">${catConfig.icon} ${catConfig.label}</span>
            </div>
          </div>
          <div>${badgeHtml}</div>
        </div>
      `;
    }).join('');

    this.elements.archiveListContainer.querySelectorAll('.archive-card').forEach(card => {
      card.addEventListener('click', () => {
        const dateStr = card.getAttribute('data-date');
        this.engine.setDate(new Date(dateStr));
        this.closeArchiveModal();
        this.refreshFullView();
        this.showToast(`Carregado: Dia #${this.engine.targetInfo.dayNumber} (${this.engine.targetInfo.displayDate}) 📅`);
      });
    });
  }

  renderStatsContent() {
    const stats = this.engine.stats;
    const isWon = this.engine.state.status === 'WON';
    const isLost = this.engine.state.status === 'LOST';
    const isFinished = isWon || isLost;
    const catConfig = CATEGORIES_CONFIG[this.engine.currentCategory] || CATEGORIES_CONFIG.GERAL;

    document.getElementById('stat-played').textContent = stats.played;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-streak').textContent = stats.currentStreak;
    document.getElementById('stat-max-streak').textContent = stats.maxStreak;

    const bannerContainer = document.getElementById('modal-status-banner');
    if (isFinished) {
      const album = this.engine.targetAlbum;
      bannerContainer.innerHTML = `
        <div class="p-3 sm:p-4 rounded border ${isWon ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-zinc-700 bg-zinc-900/60'} flex items-center gap-3">
          <img src="${album.cover_url}" class="w-16 h-16 rounded object-cover border border-zinc-700 shadow-md" alt="${album.titulo}">
          <div class="flex flex-col">
            <span class="text-[11px] font-mono ${isWon ? 'text-emerald-400' : 'text-zinc-400'} uppercase font-bold flex items-center gap-1.5">
              <span>${catConfig.icon} ${catConfig.label}</span> • <span>${isWon ? 'Vitória!' : 'Disco Revelado'}</span>
            </span>
            <h3 class="text-base font-bold text-white font-grotesk leading-snug">${album.titulo}</h3>
            <p class="text-xs text-zinc-300 font-mono">${album.artista} • ${album.ano} • ${album.genero}</p>
          </div>
        </div>
      `;
      this.elements.shareBtn.classList.remove('hidden');
    } else {
      bannerContainer.innerHTML = '';
      this.elements.shareBtn.classList.add('hidden');
    }

    const maxVal = Math.max(...stats.distribution, 1);
    const barsContainer = document.getElementById('guess-distribution-bars');
    barsContainer.innerHTML = stats.distribution.map((val, idx) => {
      const pct = Math.max(8, (val / maxVal) * 100);
      const isCurrentGuess = isWon && (this.engine.state.guesses.length - 1 === idx);
      return `
        <div class="flex items-center gap-2 text-xs font-mono">
          <span class="w-3 text-right text-zinc-400 font-bold">${idx + 1}</span>
          <div class="flex-1 bg-zinc-900 h-5 rounded overflow-hidden p-0.5 border border-zinc-800">
            <div class="h-full rounded ${isCurrentGuess ? 'bg-emerald-400 text-black font-bold' : 'bg-zinc-700 text-zinc-200'} flex items-center justify-end px-1.5 transition-all duration-500" style="width: ${pct}%">
              <span class="text-[10px]">${val}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  setupCountdown() {
    const updateTimer = () => {
      const now = new Date();
      const localNow = getBrasiliaDate(now);
      
      const tomorrow = new Date(localNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow - localNow;
      const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

      if (this.elements.nextCountdown) {
        this.elements.nextCountdown.textContent = `${hours}:${minutes}:${seconds}`;
      }
    };

    updateTimer();
    setInterval(updateTimer, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine();
  new UIController(engine);
});
