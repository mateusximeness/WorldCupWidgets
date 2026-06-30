(function () {
  const params = new URLSearchParams(location.search);

  const LANG       = params.get('lang')  || 'pt';
  const THEME_NAME = params.get('theme') || 'gold';

  const THEMES = {
    gold:   { accent: '#FFD700', dim: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.25)',   text: 'rgba(255,215,0,0.7)'   },
    blue:   { accent: '#4A9EFF', dim: 'rgba(74,158,255,0.12)',  border: 'rgba(74,158,255,0.25)',  text: 'rgba(74,158,255,0.7)'  },
    red:    { accent: '#E63946', dim: 'rgba(230,57,70,0.12)',   border: 'rgba(230,57,70,0.25)',   text: 'rgba(230,57,70,0.7)'   },
    green:  { accent: '#2DC653', dim: 'rgba(45,198,83,0.12)',   border: 'rgba(45,198,83,0.25)',   text: 'rgba(45,198,83,0.7)'   },
    purple: { accent: '#8B5CF6', dim: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  text: 'rgba(139,92,246,0.7)'  },
    white:  { accent: '#FFFFFF', dim: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.6)' },
  };

  const TRANSLATIONS = {
    pt: {
      live: 'AO VIVO', finished: 'ENCERRADO', soon: 'EM BREVE',
      final: 'FIM', noMatches: 'Sem jogos no momento',
      loading: 'Aguardando dados...', noEvents: 'Sem eventos registrados',
      sub: '→', competition: '⚽ COPA DO MUNDO · FIFA 2026',
      locale: 'pt-BR', tz: 'America/Sao_Paulo',
    },
    en: {
      live: 'LIVE', finished: 'FINAL', soon: 'SOON',
      final: 'FT', noMatches: 'No matches right now',
      loading: 'Loading...', noEvents: 'No events recorded',
      sub: '→', competition: '⚽ WORLD CUP · FIFA 2026',
      locale: 'en-US', tz: 'America/New_York',
    },
    es: {
      live: 'EN VIVO', finished: 'FINALIZADO', soon: 'PRONTO',
      final: 'FIN', noMatches: 'Sin partidos ahora',
      loading: 'Cargando...', noEvents: 'Sin eventos registrados',
      sub: '→', competition: '⚽ COPA DEL MUNDO · FIFA 2026',
      locale: 'es-MX', tz: 'America/Mexico_City',
    },
  };

  const theme = THEMES[THEME_NAME] || THEMES.gold;
  const T     = TRANSLATIONS[LANG]  || TRANSLATIONS.pt;

  /* Aplica o tema como CSS custom properties */
  const root = document.documentElement;
  root.style.setProperty('--accent',        theme.accent);
  root.style.setProperty('--accent-dim',    theme.dim);
  root.style.setProperty('--accent-border', theme.border);
  root.style.setProperty('--accent-text',   theme.text);

  /* Expõe globalmente para os widgets */
  window.WCW = { T, LANG, THEME_NAME };
})();
