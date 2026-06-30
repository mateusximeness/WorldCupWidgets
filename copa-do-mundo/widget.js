const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const REFRESH_MS = 30_000;

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

function flagImgSrc(teamObj) {
  if (teamObj?.logo) return teamObj.logo;
  const code = ISO_CODES[teamObj?.displayName || teamObj?.name || ''];
  return code ? `https://flagcdn.com/w40/${code}.png` : '';
}

function formatScheduledTime(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function parseMatches(data) {
  const events = data.events || [];
  return events.map(event => {
    const comp = event.competitions?.[0];
    if (!comp) return null;

    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    const status = event.status;
    const stateDetail = status?.type?.state || 'pre';
    const stateDesc = status?.type?.shortDetail || '';
    const displayClock = status?.displayClock || '';
    const period = status?.period || 0;

    let matchStatus;
    if (stateDetail === 'in') {
      matchStatus = 'live';
    } else if (stateDetail === 'post') {
      matchStatus = 'finished';
    } else {
      matchStatus = 'scheduled';
    }

    let timeDisplay = '';
    if (matchStatus === 'live') {
      timeDisplay = displayClock ? `${displayClock}'` : stateDesc;
      if (period === 2 && displayClock) timeDisplay = `45+${displayClock}'`.replace('45+45+', '45+');
    } else if (matchStatus === 'scheduled') {
      timeDisplay = formatScheduledTime(event.date);
    }

    return {
      id: event.id,
      homeTeam: home?.team?.displayName || home?.team?.name || 'Time A',
      awayTeam: away?.team?.displayName || away?.team?.name || 'Time B',
      homeFlagSrc: flagImgSrc(home?.team),
      awayFlagSrc: flagImgSrc(away?.team),
      homeScore: matchStatus !== 'scheduled' ? (home?.score ?? '0') : '-',
      awayScore: matchStatus !== 'scheduled' ? (away?.score ?? '0') : '-',
      status: matchStatus,
      timeDisplay,
    };
  }).filter(Boolean);
}

const ABBREV_OVERRIDES = {
  'United States': 'USA', 'South Korea': 'COR', 'Saudi Arabia': 'SAU',
  'Costa Rica': 'CRC', 'New Zealand': 'NZL', 'Ivory Coast': 'CIV',
  "Côte d'Ivoire": 'CIV', 'Netherlands': 'HOL', 'Czech Republic': 'CZE',
  'United Arab Emirates': 'EAU',
};

function teamAbbrev(name) {
  return ABBREV_OVERRIDES[name] || name.toUpperCase().slice(0, 3);
}

function flagTag(src, name) {
  return src
    ? `<img class="team-flag-img" src="${src}" alt="${name}" />`
    : `<span class="team-flag-placeholder">${name.slice(0,2)}</span>`;
}

function buildMatchCard(match) {
  let statusHTML;
  if (match.status === 'live') {
    statusHTML = `<div class="status-badge live"><span class="dot"></span>AO VIVO</div>`;
  } else if (match.status === 'finished') {
    statusHTML = `<div class="status-badge finished">ENCERRADO</div>`;
  } else {
    statusHTML = `<div class="status-badge scheduled">EM BREVE</div>`;
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
    </div>
  `;
}

function renderWidget(matches) {
  const board = document.getElementById('scoreboard');

  if (!matches || matches.length === 0) {
    board.innerHTML = `
      <div class="copa-logo">⚽ COPA DO MUNDO<span>FIFA 2026</span></div>
      <span class="no-matches">Sem jogos no momento</span>
    `;
    return;
  }

  const cards = matches.map(buildMatchCard).join('');
  const logoHTML = `<div class="copa-logo">⚽ COPA DO MUNDO<span>FIFA 2026</span></div>`;

  if (matches.length === 1) {
    board.innerHTML = `${logoHTML}<div class="matches-track no-scroll">${cards}</div>`;
    return;
  }

  /* Para múltiplos jogos: duplicar cards para scroll infinito */
  const totalWidth = matches.length * 400;
  const trackHTML = `<div class="matches-track" style="animation-duration:${matches.length * 8}s">${cards}${cards}</div>`;
  board.innerHTML = `${logoHTML}${trackHTML}`;
}

async function fetchMatches() {
  try {
    const res = await fetch(ESPN_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const matches = parseMatches(data);
    renderWidget(matches);
  } catch (err) {
    console.error('[Copa Widget] Erro ao buscar dados:', err);
    const board = document.getElementById('scoreboard');
    board.innerHTML = `
      <div class="copa-logo">⚽ COPA DO MUNDO<span>FIFA 2026</span></div>
      <span class="no-matches">Aguardando dados...</span>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchMatches();
  setInterval(fetchMatches, REFRESH_MS);
});
