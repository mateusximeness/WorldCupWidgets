# WorldCupWidgets

FIFA World Cup 2026 live widgets for OBS Browser Source.
Supports 3 languages and 6 color themes via URL parameters — no setup, no server required.

**Data source:** ESPN API (free, no key needed, updates every 30s)
**Live URL:** `https://mateusximeness.github.io/WorldCupWidgets/`

---

## Widgets

### 1. Scoreboard (`scoreboard/`)

Horizontal bar at the top of the screen showing all active or scheduled matches.
Auto-scrolls when multiple games are happening simultaneously.

**OBS dimensions:** 1920 × 60

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚽ WORLD CUP   🔴 LIVE   [BRA] BRA  2 – 1  ARG [ARG]   45'             │
└──────────────────────────────────────────────────────────────────────────┘
```

**How to add in OBS:**
1. Sources → `+` → **Browser**
2. Check **Local File** → select `scoreboard/index.html`  
   _or_ use the live URL (recommended for mobile):  
   `https://mateusximeness.github.io/WorldCupWidgets/scoreboard/`
3. Width: `1920` · Height: `60`
4. Position at the top of the scene

---

### 2. Match Panel (`match-panel/`)

Centered panel focused on ONE match. Auto-detects Brazil's live game;
falls back to any live game, then the next scheduled match.

**OBS dimensions:** 520 × 280 (height adjusts based on number of events)

```
         ┌──────────────────────────────────────┐
         │ ⚽ WORLD CUP · FIFA 2026    🔴 LIVE  │
         │   [BRA]        2 – 1        [ARG]    │
         │    BRA          45'          ARG      │
         │ ────────────────────────────────────  │
         │ 🟥 23'  Militão                       │
         │ 🔄 67'  Vini Jr → Endrick             │
         └──────────────────────────────────────┘
```

**Displays:**
- Real team flags (ESPN logo, fallback to flagcdn.com via ISO code)
- Score + match clock
- 🟥 Red cards with player name
- 🔄 Substitutions with player in/out

**How to add in OBS:**
1. Sources → `+` → **Browser**
2. Check **Local File** → select `match-panel/index.html`  
   _or_ use the live URL:  
   `https://mateusximeness.github.io/WorldCupWidgets/match-panel/`
3. Width: `520` · Height: `280`
4. Position centered at the top of the scene

---

## Customization via URL

All widgets accept `?lang=` and `?theme=` parameters in the URL.

### Language (`?lang=`)

| Value | Language | Example text |
|---|---|---|
| `pt` (default) | Portuguese (BR) | AO VIVO · ENCERRADO · EM BREVE |
| `en` | English (US) | LIVE · FINAL · SOON |
| `es` | Spanish (MX) | EN VIVO · FINALIZADO · PRONTO |

### Color theme (`?theme=`)

| Value | Accent color |
|---|---|
| `gold` (default) | Gold `#FFD700` |
| `blue` | Blue `#4A9EFF` |
| `red` | Red `#E63946` |
| `green` | Green `#2DC653` |
| `purple` | Purple `#8B5CF6` |
| `white` | White `#FFFFFF` |

### URL examples

```
# Default (PT + gold)
https://mateusximeness.github.io/WorldCupWidgets/match-panel/

# English + blue
https://mateusximeness.github.io/WorldCupWidgets/match-panel/?lang=en&theme=blue

# Spanish + green
https://mateusximeness.github.io/WorldCupWidgets/scoreboard/?lang=es&theme=green

# Portuguese + purple
https://mateusximeness.github.io/WorldCupWidgets/match-panel/?theme=purple
```

---

## Project structure

```
WorldCupWidgets/
├── README.md
├── shared/
│   └── config.js       ← reads ?lang= and ?theme=, sets CSS vars, exposes window.WCW.T
├── scoreboard/
│   ├── index.html
│   ├── style.css
│   └── widget.js
└── match-panel/
    ├── index.html
    ├── style.css
    └── widget.js
```

---

## Technical notes

- **API:** ESPN unofficial (`site.api.espn.com`) — free, no key, no documented rate limit
- **Retry:** auto-retries in 10s on network failure
- **No flash:** previous score stays visible while new data is being fetched
- **Flags:** uses ESPN's official team logo; falls back to `flagcdn.com` via ISO 3166-1 alpha-2 code
- **GitHub Pages:** any `git push` updates the live site in ~1 minute
