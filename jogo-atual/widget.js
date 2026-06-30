const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const SUMMARY_URL    = id => `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${id}`;
const REFRESH_MS = 30_000;

/* ISO 3166-1 alpha-2 codes → flagcdn.com fallback quando a ESPN não tiver logo */
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

function flagImg(teamObj) {
  /* Prioridade: logo direto da ESPN → flagcdn.com via código ISO */
  const espnLogo = teamObj?.logo;
  if (espnLogo) return `<img class="team-flag-img" src="${espnLogo}" alt="" />`;
  const name = teamObj?.displayName || teamObj?.name || '';
  const code = ISO_CODES[name];
  if (code) return `<img class="team-flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${name}" />`;
  return `<span class="team-flag-placeholder">?</span>`;
}

function abbrev(name) {
  const overrides = {
    'United States': 'USA', 'South Korea': 'COR', 'Saudi Arabia': 'SAU',
    'Costa Rica': 'CRC', 'New Zealand': 'NZL', 'Ivory Coast': 'CIV',
    'Côte d\'Ivoire': 'CIV', 'Netherlands': 'HOL', 'Czech Republic': 'CZE',
    'United Arab Emirates': 'EAU',
  };
  return overrides[name] || name.toUpperCase().slice(0, 3);
}

function scheduledTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

/* Seleciona o melhor evento: prioriza Brasil ao vivo, depois qualquer ao vivo,
   depois o próximo agendado com Brasil, depois qualquer agendado */
function pickEvent(events) {
  const live      = events.filter(e => e.status?.type?.state === 'in');
  const scheduled = events.filter(e => e.status?.type?.state === 'pre');

  const hasBrazil = e => {
    const comps = e.competitions?.[0]?.competitors || [];
    return comps.some(c => c.team?.displayName === 'Brazil' || c.team?.name === 'Brazil');
  };

  return live.find(hasBrazil)
      || live[0]
      || scheduled.find(hasBrazil)
      || scheduled[0]
      || null;
}

/* Parseia os eventos relevantes do summary (gols, cartões vermelhos, substituições) */
function parseEvents(summaryData) {
  const plays = summaryData?.plays || [];
  const result = [];

  for (const play of plays) {
    const type = play.type?.text || '';
    const clock = play.clock?.displayValue || '';
    const team  = play.team?.displayName || '';
    const athletes = play.participants || [];

    const typeLC = type.toLowerCase();

    if (typeLC.includes('red card') || typeLC.includes('cartão vermelho')) {
      const player = athletes[0]?.athlete?.displayName || '';
      result.push({ icon: '🟥', time: clock, text: player, team });
    } else if (typeLC.includes('substitution') || typeLC.includes('substituição')) {
      const out = athletes.find(a => a.type === 'playerOff')?.athlete?.shortName
               || athletes[0]?.athlete?.shortName || '';
      const inn = athletes.find(a => a.type === 'playerOn')?.athlete?.shortName
               || athletes[1]?.athlete?.shortName || '';
      if (out || inn) {
        result.push({ icon: '🔄', time: clock, out, in: inn, team });
      }
    }
  }

  /* Mostra apenas os 5 eventos mais recentes */
  return result.slice(-5).reverse();
}

function renderEmpty(msg) {
  document.getElementById('widget').innerHTML = `
    <div class="empty-state">
      <strong>⚽ COPA DO MUNDO</strong>
      ${msg}
    </div>
  `;
}

function buildStatusBadge(state, clock, date) {
  if (state === 'in') {
    return `<div class="status-badge live"><span class="dot"></span>AO VIVO</div>`;
  }
  if (state === 'post') {
    return `<div class="status-badge finished">ENCERRADO</div>`;
  }
  return `<div class="status-badge scheduled">EM BREVE · ${scheduledTime(date)}</div>`;
}

function buildEventRows(events) {
  if (!events.length) {
    return `<p class="no-events">Sem eventos registrados</p>`;
  }
  return events.map(ev => {
    let text;
    if (ev.icon === '🔄') {
      text = `<span class="event-text">
                <span class="out">${ev.out}</span>
                <span class="arr"> → ${ev.in}</span>
              </span>`;
    } else {
      text = `<span class="event-text">${ev.text}</span>`;
    }
    return `
      <div class="event-row">
        <span class="event-icon">${ev.icon}</span>
        <span class="event-time">${ev.time}'</span>
        ${text}
      </div>`;
  }).join('');
}

async function refresh() {
  try {
    const sbRes = await fetch(SCOREBOARD_URL, { cache: 'no-store' });
    if (!sbRes.ok) throw new Error(`scoreboard HTTP ${sbRes.status}`);
    const sbData = await sbRes.json();

    const event = pickEvent(sbData.events || []);
    if (!event) {
      renderEmpty('Sem jogos no momento');
      return;
    }

    const comp       = event.competitions?.[0];
    const home       = comp?.competitors?.find(c => c.homeAway === 'home');
    const away       = comp?.competitors?.find(c => c.homeAway === 'away');
    const statusType = event.status?.type;
    const state      = statusType?.state || 'pre';
    const clock      = event.status?.displayClock || '';

    const homeTeam  = home?.team || {};
    const awayTeam  = away?.team || {};
    const homeName  = homeTeam.displayName || 'Time A';
    const awayName  = awayTeam.displayName || 'Time B';
    const homeScore = state !== 'pre' ? (home?.score ?? '0') : '–';
    const awayScore = state !== 'pre' ? (away?.score ?? '0') : '–';

    /* Busca eventos detalhados do jogo */
    let events = [];
    try {
      const smRes = await fetch(SUMMARY_URL(event.id), { cache: 'no-store' });
      if (smRes.ok) {
        const smData = await smRes.json();
        events = parseEvents(smData);
      }
    } catch (_) { /* ignora falha no summary */ }

    const clockDisplay = state === 'in'
      ? `<span class="match-clock">${clock}'</span>`
      : `<span class="match-clock neutral">${state === 'post' ? 'FIM' : ''}</span>`;

    document.getElementById('widget').innerHTML = `
      <div class="header">
        <span class="competition-label">⚽ COPA DO MUNDO · FIFA 2026</span>
        ${buildStatusBadge(state, clock, event.date)}
      </div>

      <div class="scoreline">
        <div class="team-block">
          ${flagImg(homeTeam)}
          <span class="team-name">${abbrev(homeName)}</span>
        </div>

        <div class="score-center">
          <div class="score-numbers">
            <span class="score-num">${homeScore}</span>
            <span class="score-sep">–</span>
            <span class="score-num">${awayScore}</span>
          </div>
          ${clockDisplay}
        </div>

        <div class="team-block">
          ${flagImg(awayTeam)}
          <span class="team-name">${abbrev(awayName)}</span>
        </div>
      </div>

      ${events.length > 0 ? `
        <div class="divider"></div>
        <div class="events-section">
          ${buildEventRows(events)}
        </div>
      ` : ''}
    `;

  } catch (err) {
    console.error('[Jogo Atual] Erro:', err);
    renderEmpty('Aguardando dados...');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refresh();
  setInterval(refresh, REFRESH_MS);
});
