const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY_URL    = id => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;
const REFRESH_MS = 30_000;
const RETRY_MS   = 10_000;

/* config.js populates window.WCW before this script runs */
const T = window.WCW?.T || {
  live: 'AO VIVO', finished: 'ENCERRADO', soon: 'EM BREVE',
  final: 'FIM', noMatches: 'Sem jogos no momento',
  loading: 'Aguardando dados...', noEvents: 'Sem eventos registrados',
  sub: '→', competition: '⚽ COPA DO MUNDO · FIFA 2026',
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
  'Venezuela': 've', 'Honduras': 'hn', 'El Salvador': 'sv', 'Jamaica': 'jm',
};

const ABBREV_OVERRIDES = {
  'United States': 'USA', 'South Korea': 'COR', 'Saudi Arabia': 'SAU',
  'Costa Rica': 'CRC', 'New Zealand': 'NZL', 'Ivory Coast': 'CIV',
  "Côte d'Ivoire": 'CIV', 'Netherlands': 'HOL', 'Czech Republic': 'CZE',
  'United Arab Emirates': 'EAU',
};

function abbrev(name) {
  return ABBREV_OVERRIDES[name] || name.toUpperCase().slice(0, 3);
}

function flagImg(teamObj) {
  const espnLogo = teamObj?.logo;
  if (espnLogo) return `<img class="team-flag-img" src="${espnLogo}" alt="" />`;
  const name = teamObj?.displayName || teamObj?.name || '';
  const code = ISO_CODES[name];
  if (code) return `<img class="team-flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${name}" />`;
  return `<span class="team-flag-placeholder">?</span>`;
}

function scheduledTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString(T.locale, {
    hour: '2-digit', minute: '2-digit', timeZone: T.tz,
  });
}

function pickEvent(events) {
  const live      = events.filter(e => e.status?.type?.state === 'in');
  const scheduled = events.filter(e => e.status?.type?.state === 'pre');
  const hasBrazil = e => {
    const comps = e.competitions?.[0]?.competitors || [];
    return comps.some(c => c.team?.displayName === 'Brazil' || c.team?.name === 'Brazil');
  };
  return live.find(hasBrazil) || live[0] || scheduled.find(hasBrazil) || scheduled[0] || null;
}

function parseEvents(summaryData) {
  const plays = summaryData?.plays || [];
  const result = [];
  for (const play of plays) {
    const type     = (play.type?.text || '').toLowerCase();
    const clock    = play.clock?.displayValue || '';
    const athletes = play.participants || [];
    if (type.includes('red card')) {
      const player = athletes[0]?.athlete?.displayName || '';
      result.push({ icon: '🟥', time: clock, text: player });
    } else if (type.includes('substitution')) {
      const out = athletes.find(a => a.type === 'playerOff')?.athlete?.shortName || athletes[0]?.athlete?.shortName || '';
      const inn = athletes.find(a => a.type === 'playerOn')?.athlete?.shortName  || athletes[1]?.athlete?.shortName || '';
      if (out || inn) result.push({ icon: '🔄', time: clock, out, in: inn });
    }
  }
  return result.slice(-5).reverse();
}

function buildStatusBadge(state, date) {
  if (state === 'in')   return `<div class="status-badge live"><span class="dot"></span>${T.live}</div>`;
  if (state === 'post') return `<div class="status-badge finished">${T.finished}</div>`;
  return `<div class="status-badge scheduled">${T.soon} · ${scheduledTime(date)}</div>`;
}

function buildEventRows(events) {
  if (!events.length) return `<p class="no-events">${T.noEvents}</p>`;
  return events.map(ev => {
    const text = ev.icon === '🔄'
      ? `<span class="event-text"><span class="out">${ev.out}</span><span class="arr"> ${T.sub} ${ev.in}</span></span>`
      : `<span class="event-text">${ev.text}</span>`;
    return `<div class="event-row"><span class="event-icon">${ev.icon}</span><span class="event-time">${ev.time}'</span>${text}</div>`;
  }).join('');
}

let retryTimer = null;

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(refresh, RETRY_MS);
}

function renderEmpty(msg) {
  document.getElementById('widget').innerHTML =
    `<div class="empty-state"><strong>${T.competition}</strong>${msg}</div>`;
}

async function refresh() {
  try {
    const sbRes = await fetch(SCOREBOARD_URL, { cache: 'no-store' });
    if (!sbRes.ok) throw new Error(`HTTP ${sbRes.status}`);
    const sbData = await sbRes.json();

    const event = pickEvent(sbData.events || []);
    if (!event) { renderEmpty(T.noMatches); return; }

    const comp      = event.competitions?.[0];
    const home      = comp?.competitors?.find(c => c.homeAway === 'home');
    const away      = comp?.competitors?.find(c => c.homeAway === 'away');
    const state     = event.status?.type?.state || 'pre';
    const clock     = event.status?.displayClock || '';
    const homeTeam  = home?.team || {};
    const awayTeam  = away?.team || {};
    const homeName  = homeTeam.displayName || 'Team A';
    const awayName  = awayTeam.displayName || 'Team B';
    const homeScore = state !== 'pre' ? (home?.score ?? '0') : '–';
    const awayScore = state !== 'pre' ? (away?.score ?? '0') : '–';

    let events = [];
    try {
      const smRes = await fetch(SUMMARY_URL(event.id), { cache: 'no-store' });
      if (smRes.ok) events = parseEvents(await smRes.json());
    } catch (_) {}

    const clockDisplay = state === 'in'
      ? `<span class="match-clock">${clock}'</span>`
      : `<span class="match-clock neutral">${state === 'post' ? T.final : ''}</span>`;

    document.getElementById('widget').innerHTML = `
      <div class="header">
        <span class="competition-label">${T.competition}</span>
        ${buildStatusBadge(state, event.date)}
      </div>
      <div class="scoreline">
        <div class="team-block">${flagImg(homeTeam)}<span class="team-name">${abbrev(homeName)}</span></div>
        <div class="score-center">
          <div class="score-numbers">
            <span class="score-num">${homeScore}</span>
            <span class="score-sep">–</span>
            <span class="score-num">${awayScore}</span>
          </div>
          ${clockDisplay}
        </div>
        <div class="team-block">${flagImg(awayTeam)}<span class="team-name">${abbrev(awayName)}</span></div>
      </div>
      ${events.length > 0 ? `<div class="divider"></div><div class="events-section">${buildEventRows(events)}</div>` : ''}
    `;
  } catch (err) {
    console.error('[Match Panel] Fetch error:', err);
    if (!document.getElementById('widget').querySelector('.scoreline')) {
      renderEmpty(T.loading);
    }
    scheduleRetry();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refresh();
  setInterval(refresh, REFRESH_MS);
});
