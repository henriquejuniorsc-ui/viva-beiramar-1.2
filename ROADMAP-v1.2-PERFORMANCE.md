# ImobiPro v1.2 "Performance" — Roadmap completo

Tudo abaixo transforma o ImobiPro de CRM genérico em Motor de Fechamento.
Zero tabelas novas. Tudo é reposicionamento do que já existe.

---

## FASE 1 — O COCKPIT (o corretor abre e sente o impacto)

### T7 — Motor de Previsão de Comissão ⏳ em andamento
- 3 cenários: conservador / provável / otimista
- "Se agir hoje" com ganho por ação
- Lista de deals ordenada por impacto no bolso
- Barra de meta mensal
- Indicador de dinheiro em risco

### T8 — Celebration Screen (deal fechado)
- Tela fullscreen com confetti ao mover lead pra "Fechado"
- Valor da comissão gigante no centro
- Botão "Compartilhar no WhatsApp"
- Vibração haptic no celular
- Registra no histórico de conquistas

### T9 — Streak diário
- Contador de dias consecutivos com ação de venda
- Ação = enviar follow-up, registrar visita, agendar, enviar proposta
- Push notification às 18h se streak em risco
- Recorde pessoal salvo
- Visual: 🔥 12 dias — no topo do dashboard

### T10 — Linguagem de performance
- Renomear seções e labels em todo o app:
  - "Follow-ups Pendentes" → "Oportunidades em Risco"
  - "Pipeline" → "Dinheiro em Jogo"
  - "Leads" → "Oportunidades"
  - Cards do CRM mostram "último contato: 3 dias" com cor de urgência
- Frases motivacionais contextuais no dashboard:
  - Manhã vazia: "Bora caçar! 3 oportunidades esperando"
  - Meta quase: "Faltam R$ 5k. Um fechamento!"
  - Dia parado: "Dia parado = dinheiro perdido"

---

## FASE 2 — O MOTOR DE AÇÃO (o app diz o que fazer)

### T11 — Ações priorizadas por dinheiro
- Substituir KPIs estáticos por lista de ações ordenadas
- Cada ação mostra R$ em jogo
- Botão principal sempre "Agir agora" (não "Ver detalhes")
- Categorias: 🔴 URGENTE / 🟡 HOJE / 🟢 OPORTUNIDADE

### T12 — Cards do CRM com urgência visual
- Borda vermelha pulsando se último contato > 3 dias
- Mostrar "último contato: X dias" em cada card
- Valor em R$ sempre visível (comissão, não preço do imóvel)
- Ordenar por urgência: quem precisa de ação primeiro

### T13 — Follow-ups como "dinheiro esfriando"
- Header: "⚠️ R$ 935k em risco — 8 leads sem contato"
- Ordenar por valor em jogo (não por data)
- Botão principal: "Mandar WhatsApp agora" (não "Ver")
- Counter diário: "4/5 follow-ups hoje 🔥"

### T14 — Micro-interações de dopamina
- Enviar follow-up → "✅ Enviado!" + counter incrementa
- 5º follow-up do dia → mini celebration
- Mover lead no kanban → flash verde "R$ +271k no pipeline!"
- Mover pra Perdido → "😤 Próximo!" (motivacional)
- Pull-to-refresh → highlight no que mudou

---

## FASE 3 — O MOTOR DE ENTRADA (leads entram sozinhos)

### T15 — Bia cria lead no CRM automaticamente
- N8N: quando lead novo manda WhatsApp, INSERT em crm_leads
- Preenche: name, phone, source='WhatsApp', stage='Novo Lead'
- Se mencionar imóvel → vincula property_id
- Push notification pro corretor: "Novo lead! [nome] — [imóvel]"

### T16 — Bia qualifica e passa pro corretor
- Gatilhos de passagem: pediu visita, 3+ perguntas sobre preço, score > 70
- Ao passar, monta dossiê: nome, interesse, orçamento, prazo, resumo
- Push: "⚡ Lead qualificado pela Bia! [nome] — QUENTE"
- No painel Conversas: badge "Qualificado pela IA" no chat

### T17 — Webhook de portais → lead automático
- Endpoint /api/webhook/lead que recebe POST de portais (ZAP, VivaReal)
- Cria lead com source='ZAP' ou source='VivaReal'
- Vincula property_id se o portal enviar referência
- Push notification imediata

### T18 — Registro pós-visita
- Ao concluir agendamento de visita no app → modal:
  - Lead gostou? (sim/não/parcial)
  - Objeção principal? (preço/localização/tamanho/outro)
  - Próximo passo? (proposta/outra visita/desistiu)
  - Notas livres
- Resultado salvo na agenda_appointments
- Automático: cria follow-up pós-visita em 2h

---

## FASE 4 — PÓS-VENDA E VIRALIDADE

### T19 — Cadência pós-venda automática
- Deal fechado → sistema cria 3 follow-ups:
  - Dia 30: "Como está no novo lar?"
  - Dia 90: "Conhece alguém procurando imóvel? Me indica!"
  - Dia 365: "1 ano no seu lar! 🏠"

### T20 — Lead por indicação
- Botão "Pedir indicação" na ficha do cliente fechado
- Se indicar: cria lead com source='Indicação - [nome do cliente]'
- Lead de indicação entra como QUENTE (score alto)

### T21 — Badges e conquistas
- Sistema de badges salvo no banco (nova tabela simples)
- Badges: Primeiro Fechamento, Raio (<5min resposta), Máquina (30 dias streak), Diamante (R$100k/mês), Incansável (50 fups/mês), Sniper (3 fechamentos/mês)
- Tela de perfil com badges desbloqueadas
- Push ao desbloquear

### T22 — Pulso semanal (push segunda de manhã)
- Resumo da semana: follow-ups, visitas, propostas, fechamentos
- Ranking fictício: "Top 10% dos corretores ImobiPro"
- Previsão da semana: "R$ X se agir nos 3 leads mais quentes"

---

## FASE 5 — ESCALA (preparar pra multi-corretor)

### T23 — Multi-usuário (login por corretor)
- Supabase Auth com email/senha
- Cada corretor vê só seus leads, deals, follow-ups
- RLS (Row Level Security) por user_id

### T24 — Dashboard do gerente
- Visão agregada de todos os corretores
- Ranking: dinheiro previsto por corretor
- "Dinheiro desperdiçado": leads sem contato × valor
- Métricas de equipe

### T25 — Onboarding guiado
- Primeiro acesso: tutorial interativo
- "Cadastre seu primeiro imóvel" → "Adicione um lead" → "Envie um follow-up"
- Completar onboarding desbloqueia badge "Pronto pra vender"

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
AGORA (v1.2.0)
├── T7  Motor de Previsão ⏳ em andamento
├── T8  Celebration Screen
├── T9  Streak diário
└── T10 Linguagem de performance

SEMANA QUE VEM (v1.2.1)
├── T11 Ações priorizadas por dinheiro
├── T12 Cards CRM com urgência
├── T13 Follow-ups "dinheiro esfriando"
└── T14 Micro-interações

DEPOIS (v1.3)
├── T15 Bia → CRM automático
├── T16 Bia qualifica e passa
├── T17 Webhook portais
└── T18 Registro pós-visita

FUTURO (v1.4)
├── T19 Pós-venda automática
├── T20 Lead por indicação
├── T21 Badges
└── T22 Pulso semanal

ESCALA (v2.0)
├── T23 Multi-usuário
├── T24 Dashboard gerente
└── T25 Onboarding
```

---

## REGRA DE OURO

Cada tarefa deve poder ser feita em 1 sessão do Claude Code.
Se tá grande demais, quebrar em 2.
Sempre testar no mobile antes de seguir pra próxima.
