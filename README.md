# Live Widgets

Coleção de widgets para usar como Browser Source no OBS durante lives.

---

## Widgets disponíveis

### ⚽ Copa do Mundo (`copa-do-mundo/`)

Barra no topo da tela com placar em tempo real da Copa do Mundo FIFA 2026.

**Fonte de dados:** ESPN API (gratuita, sem chave, atualiza a cada 30 segundos)

**Como adicionar no OBS:**

1. No OBS, clique em `+` na lista de Fontes
2. Escolha **Browser** (Navegador)
3. Marque **Local File** e selecione:
   ```
   C:\dev\projects\live-widgets\copa-do-mundo\index.html
   ```
4. Defina as dimensões:
   - **Largura:** 1920
   - **Altura:** 60
5. Marque **"Shutdown source when not visible"**
6. Clique em OK e posicione a fonte no topo da cena

**Resultado:**
```
┌────────────────────────────────────────────────────────────────────┐
│ ⚽ COPA      🔴 AO VIVO   🇧🇷 BRA  2 – 1  ARG 🇦🇷   45'    │
│  DO MUNDO                                                          │
└────────────────────────────────────────────────────────────────────┘
```

**Estados exibidos:**
- `🔴 AO VIVO` com ponto pulsante — jogo em andamento
- `ENCERRADO` — jogo finalizado (placar final)
- `EM BREVE + horário` — jogo agendado (horário de Brasília)

Se houver mais de um jogo simultâneo, os placares fazem scroll automático.

---

## Estrutura do projeto

```
live-widgets/
├── README.md
├── copa-do-mundo/
│   ├── index.html    ← aponte o OBS aqui
│   ├── style.css
│   └── widget.js
└── assets/           ← reservado para futuros widgets
```
