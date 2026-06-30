# WorldCupWidgets

Widgets de Copa do Mundo FIFA 2026 para usar como Browser Source no OBS.
Suporte a 3 idiomas e 6 temas de cor via parâmetros de URL — sem configuração, sem servidor.

**Fonte de dados:** ESPN API (gratuita, sem chave, atualiza a cada 30s)
**Acesso online:** `https://mateusximeness.github.io/WorldCupWidgets/`

---

## Widgets

### 1. Scoreboard (`scoreboard/`)

Barra horizontal no topo da tela com todos os jogos em andamento ou agendados.
Scroll automático quando há mais de um jogo simultâneo.

**Dimensões no OBS:** 1920 × 60

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚽ COPA DO MUNDO   🔴 AO VIVO   [BRA] BRA  2 – 1  ARG [ARG]   45'      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Como adicionar no OBS:**
1. Fontes → `+` → **Browser**
2. Marcar **Local File** → selecionar `scoreboard/index.html`  
   _ou_ usar a URL online (recomendado para celular):  
   `https://mateusximeness.github.io/WorldCupWidgets/scoreboard/`
3. Largura: `1920` · Altura: `60`
4. Posicionar no topo da cena

---

### 2. Match Panel (`jogo-atual/`)

Painel centralizado focado em UM jogo. Auto-detecta o jogo ao vivo do Brasil;
se não houver, mostra o primeiro jogo ao vivo disponível ou o próximo agendado.

**Dimensões no OBS:** 520 × 280 (altura se ajusta conforme número de eventos)

```
         ┌──────────────────────────────────────┐
         │ ⚽ COPA DO MUNDO · FIFA 2026  🔴 AO VIVO │
         │   [BRA]        2 – 1        [ARG]    │
         │    BRA          45'          ARG      │
         │ ────────────────────────────────────  │
         │ 🟥 23'  Militão                       │
         │ 🔄 67'  Vini Jr → Endrick             │
         └──────────────────────────────────────┘
```

**Exibe:**
- Bandeiras reais dos times (logo ESPN ou flagcdn.com como fallback)
- Placar em destaque + tempo de jogo
- 🟥 Cartões vermelhos com nome do jogador
- 🔄 Substituições com quem saiu e quem entrou

**Como adicionar no OBS:**
1. Fontes → `+` → **Browser**
2. Marcar **Local File** → selecionar `jogo-atual/index.html`  
   _ou_ usar a URL online:  
   `https://mateusximeness.github.io/WorldCupWidgets/jogo-atual/`
3. Largura: `520` · Altura: `280`
4. Posicionar no topo centralizado da cena

---

## Personalização via URL

Todos os widgets aceitam parâmetros `?lang=` e `?theme=` na URL.

### Idioma (`?lang=`)

| Valor | Idioma | Exemplo de texto |
|---|---|---|
| `pt` (padrão) | Português (BR) | AO VIVO · ENCERRADO · EM BREVE |
| `en` | Inglês (US) | LIVE · FINAL · SOON |
| `es` | Espanhol (MX) | EN VIVO · FINALIZADO · PRONTO |

### Tema de cor (`?theme=`)

| Valor | Cor de destaque |
|---|---|
| `gold` (padrão) | Dourado `#FFD700` |
| `blue` | Azul `#4A9EFF` |
| `red` | Vermelho `#E63946` |
| `green` | Verde `#2DC653` |
| `purple` | Roxo `#8B5CF6` |
| `white` | Branco `#FFFFFF` |

### Exemplos de URL

```
# Padrão (PT + dourado)
https://mateusximeness.github.io/WorldCupWidgets/jogo-atual/

# Inglês + azul
https://mateusximeness.github.io/WorldCupWidgets/jogo-atual/?lang=en&theme=blue

# Espanhol + verde
https://mateusximeness.github.io/WorldCupWidgets/scoreboard/?lang=es&theme=green

# Português + roxo
https://mateusximeness.github.io/WorldCupWidgets/jogo-atual/?theme=purple
```

---

## Estrutura do projeto

```
WorldCupWidgets/
├── README.md
├── shared/
│   └── config.js       ← lê ?lang= e ?theme=, aplica CSS vars e expõe window.WCW.T
├── scoreboard/
│   ├── index.html
│   ├── style.css
│   └── widget.js
└── jogo-atual/
    ├── index.html
    ├── style.css
    └── widget.js
```

---

## Notas técnicas

- **API:** ESPN unofficial (`site.api.espn.com`) — gratuita, sem chave, sem limite documentado
- **Retry:** em caso de falha de rede, retenta em 10s automaticamente
- **Sem flash:** o placar anterior permanece visível enquanto novos dados são buscados
- **Bandeiras:** usa o logo oficial da ESPN; fallback para `flagcdn.com` via código ISO
- **GitHub Pages:** qualquer `git push` atualiza o site online em ~1 minuto
