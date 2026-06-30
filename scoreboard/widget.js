const ESPN_URL   = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY_URL = id => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;
const REFRESH_MS  = 30_000;
const RETRY_MS    = 10_000;
const GOAL_DISPLAY_MS = 8_000;

/* config.js populates window.WCW before this script runs */
const T = window.WCW?.T || {
  live: 'AO VIVO', finished: 'ENCERRADO', soon: 'EM BREVE',
  noMatches: 'Sem jogos no momento', loading: 'Aguardando dados...',
  competition: '⚽ COPA DO MUNDO · FIFA 2026',
  locale: 'pt-BR', tz: 'America/Sao_Paulo',
};

const ISO_CODES = {
  'Argentina': 'ar', 'Australia': 'au', 'Belgium': 'be', 'Brazil': 'br',
  'Cameroon': 'cm', 'Canada': 'ca', 'Chile': 'cl', 'Colombia': 'co',
  'Costa Rica': 'cr', 'Croatia': 'hr', 'Denmark': 'dk', 'Ecuador': 'ec',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'IR Iran': 'ir', 'Iran': 'ir', 'Japan': 'jp', 'Mexico': 'mx',
  'Morocco': 'ma', 'Netherlands': 'nl', 'New Zealand': 'nz', 'Nigeria': 'ng',
  'Panama': 'pa', 'Peru': 'pe', 'Poland': 'pl', 'Portugal': 'pt',
  'Qatar': 'qa', 'Saudi Arabia': 'sa', 'Senegal': 'sn', 'Serbia': 'rs',
  'South Korea': 'kr', 'Spain': 'es', 'Switzerland': 'ch', 'Tunisia': 'tn',
  'United States': 'us', 'USA': 'us', 'Uruguay': 'uy', 'Wales': 'gb-wls',
  'Austria': 'at', 'Czech Republic': 'cz', 'Hungary': 'hu', 'Romania': 'ro',
  'Scotland': 'gb-sct', 'Slovakia': 'sk', 'Slovenia': 'si', 'Turkey': 'tr',
  'Ukraine': 'ua', 'Greece': 'gr', 'Egypt': 'eg', 'Algeria': 'dz',
  'Italy': 'it', 'Sweden': 'se', 'Norway': 'no', 'Finland': 'fi',
  'Iceland': 'is', 'Ivory Coast': 'ci', "Côte d'Ivoire": 'ci',
  'United Arab Emirates': 'ae', 'Paraguay': 'py', 'Bolivia': 'bo',
};

const ABBREV_OVERRIDES = {
  'United States': 'USA', 'South Korea': 'COR', 'Saudi Arabia': 'SAU',
  'Costa Rica': 'CRC', 'New Zealand': 'NZL', 'Ivory Coast': 'CIV',
  "Côte d'Ivoire": 'CIV', 'Netherlands': 'HOL', 'Czech Republic': 'CZE',
  'United Arab Emirates': 'EAU',
};

function teamAbbrev(name) {
  return ABBREV_OVERRIDES[name] || name.toUpperCase().slice(0, 3);
}

function flagImgSrc(teamObj) {
  if (teamObj?.logo) return teamObj.logo;
  const code = ISO_CODES[teamObj?.displayName || teamObj?.name || ''];
  return code ? `https://flagcdn.com/w40/${code}.png` : '';
}

function flagTag(src, name, extraClass = '') {
  return src
    ? `<img class="team-flag-img ${extraClass}" src="${src}" alt="${name}" />`
    : `<span class="team-flag-placeholder ${extraClass}">${name.slice(0, 2)}</span>`;
}

function formatTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString(T.locale, {
    hour: '2-digit', minute: '2-digit', timeZone: T.tz,
  });
}

/* ── Score tracking & goal detection ─────────────────── */
const prevScores  = {};   // { eventId: { home: n, away: n } }
const goalQueue   = [];   // pending goal notifications
let alertActive   = false;
let alertTimer    = null;
let lastMatches   = [];   // keep last good render to restore after alert

function detectGoals(matches, rawEvents) {
  const goals = [];

  for (const match of matches) {
    if (match.status !== 'live') continue;

    const prev = prevScores[match.id];
    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);

    if (prev !== undefined) {
      if (homeScore > prev.home) goals.push({ match, side: 'home', eventId: match.id });
      if (awayScore > prev.away) goals.push({ match, side: 'away', eventId: match.id });
    }

    prevScores[match.id] = { home: homeScore, away: awayScore };
  }

  for (const goal of goals) {
    goalQueue.push(goal);
  }

  if (!alertActive && goalQueue.length > 0) processGoalQueue();
}

async function processGoalQueue() {
  if (goalQueue.length === 0) { alertActive = false; return; }

  alertActive = true;
  const { match, side } = goalQueue.shift();

  const scoringTeam = side === 'home'
    ? { name: match.homeTeam, flagSrc: match.homeFlagSrc, score: match.homeScore, oppScore: match.awayScore }
    : { name: match.awayTeam, flagSrc: match.awayFlagSrc, score: match.awayScore, oppScore: match.homeScore };

  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  let scorer = '';
  try {
    const res = await fetch(SUMMARY_URL(match.id), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      scorer = findLatestGoalScorer(data, match, side);
    }
  } catch (_) {}

  renderGoalAlert(scoringTeam, scorer, homeScore, awayScore, match);

  alertTimer = setTimeout(() => {
    renderWidget(lastMatches);
    alertActive = false;
    processGoalQueue();
  }, GOAL_DISPLAY_MS);
}

function findLatestGoalScorer(summaryData, match, side) {
  const plays = summaryData?.plays || [];
  const teamName = side === 'home' ? match.homeTeam : match.awayTeam;

  /* Walk backwards to find the most recent goal for this team */
  for (let i = plays.length - 1; i >= 0; i--) {
    const play = plays[i];
    const typeText = (play.type?.text || '').toLowerCase();
    if (!typeText.includes('goal')) continue;
    if (play.team?.displayName !== teamName && play.team?.name !== teamName) continue;
    return play.participants?.[0]?.athlete?.displayName || '';
  }
  return '';
}

/* ── Goal alert renderer ──────────────────────────────── */
function renderGoalAlert(team, scorer, homeScore, awayScore, match) {
  const board = document.getElementById('scoreboard');
  const flagHTML = flagTag(team.flagSrc, team.name);

  board.innerHTML = `
    <div class="goal-notification">
      <span class="goal-ball">⚽</span>
      <span class="goal-label">GOAL!</span>
      <div class="goal-divider"></div>
      <div class="goal-team">
        ${flagHTML}
        <span class="goal-team-name">${teamAbbrev(team.name)}</span>
      </div>
      ${scorer ? `<span class="goal-scorer">${scorer}</span>` : ''}
      <div class="goal-divider"></div>
      <span class="goal-score">
        ${homeScore}<span class="score-sep">–</span>${awayScore}
      </span>
    </div>
  `;
}

/* ── Normal render ────────────────────────────────────── */
function buildMatchCard(match) {
  let statusHTML;
  if (match.status === 'live') {
    statusHTML = `<div class="status-badge live"><span class="dot"></span>${T.live}</div>`;
  } else if (match.status === 'finished') {
    statusHTML = `<div class="status-badge finished">${T.finished}</div>`;
  } else {
    statusHTML = `<div class="status-badge scheduled">${T.soon}</div>`;
  }

  const timeClass = match.status === 'live' ? 'match-time live-time' : 'match-time';

  return `
    <div class="match-card">
      ${statusHTML}
      <div class="team">
        ${flagTag(match.homeFlagSrc, match.homeTeam)}
        <span class="team-name home">${teamAbbrev(match.homeTeam)}</span>
      </div>
      <div class="score-block">
        <span class="score">${match.homeScore}</span>
        <span class="score-sep">–</span>
        <span class="score">${match.awayScore}</span>
      </div>
      <div class="team">
        <span class="team-name away">${teamAbbrev(match.awayTeam)}</span>
        ${flagTag(match.awayFlagSrc, match.awayTeam)}
      </div>
      <span class="${timeClass}">${match.timeDisplay}</span>
    </div>`;
}

function renderWidget(matches) {
  if (alertActive) return; // don't overwrite an active goal alert

  const board = document.getElementById('scoreboard');
  const logoHTML = `<div class="copa-logo">${T.competition.split('·')[0].trim()}<span>${T.competition.split('·')[1]?.trim() || 'FIFA 2026'}</span></div>`;

  if (!matches || matches.length === 0) {
    board.innerHTML = `${logoHTML}<span class="no-matches">${T.noMatches}</span>`;
    return;
  }

  const cards = matches.map(buildMatchCard).join('');

  if (matches.length === 1) {
    board.innerHTML = `${logoHTML}<div class="matches-track no-scroll">${cards}</div>`;
    return;
  }

  board.innerHTML = `${logoHTML}<div class="matches-track" style="animation-duration:${matches.length * 8}s">${cards}${cards}</div>`;
}

/* ── Data parsing ─────────────────────────────────────── */
function parseMatches(data) {
  return (data.events || []).map(event => {
    const comp = event.competitions?.[0];
    if (!comp) return null;

    const home         = comp.competitors?.find(c => c.homeAway === 'home');
    const away         = comp.competitors?.find(c => c.homeAway === 'away');
    const stateDetail  = event.status?.type?.state || 'pre';
    const displayClock = event.status?.displayClock || '';
    const period       = event.status?.period || 0;

    let matchStatus;
    if (stateDetail === 'in')        matchStatus = 'live';
    else if (stateDetail === 'post') matchStatus = 'finished';
    else                             matchStatus = 'scheduled';

    let timeDisplay = '';
    if (matchStatus === 'live') {
      timeDisplay = displayClock ? `${displayClock}'` : '';
      if (period === 2 && displayClock) timeDisplay = `45+${displayClock}'`.replace('45+45+', '45+');
    } else if (matchStatus === 'scheduled') {
      timeDisplay = formatTime(event.date);
    }

    return {
      id: event.id,
      homeTeam:    home?.team?.displayName || 'Team A',
      awayTeam:    away?.team?.displayName || 'Team B',
      homeFlagSrc: flagImgSrc(home?.team),
      awayFlagSrc: flagImgSrc(away?.team),
      homeScore:   matchStatus !== 'scheduled' ? (home?.score ?? '0') : '-',
      awayScore:   matchStatus !== 'scheduled' ? (away?.score ?? '0') : '-',
      status:      matchStatus,
      timeDisplay,
    };
  }).filter(Boolean);
}

/* ── Fetch & refresh cycle ────────────────────────────── */
let retryTimer = null;

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(fetchMatches, RETRY_MS);
}

async function fetchMatches() {
  try {
    const res = await fetch(ESPN_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const matches = parseMatches(data);

    detectGoals(matches, data.events);

    lastMatches = matches;
    renderWidget(matches);
  } catch (err) {
    console.error('[Scoreboard] Fetch error:', err);
    /* Only show error message if the board has no content yet */
    const board = document.getElementById('scoreboard');
    if (!board.querySelector('.match-card') && !board.querySelector('.goal-notification')) {
      const logoHTML = `<div class="copa-logo">${T.competition.split('·')[0].trim()}<span>${T.competition.split('·')[1]?.trim() || 'FIFA 2026'}</span></div>`;
      board.innerHTML = `${logoHTML}<span class="no-matches">${T.loading}</span>`;
    }
    scheduleRetry();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchMatches();
  setInterval(fetchMatches, REFRESH_MS);
});
