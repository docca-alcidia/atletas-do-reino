require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const JWT_SECRET = process.env.JWT_SECRET || 'atletas_do_reino_2024_secret';

// ─── Middleware de autenticação (opcional) ───────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token não fornecido.' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

const SYSTEM_PROMPT = `Você é um programador de treinos funcional especialista da plataforma Atletas do Reino.
Gere uma semana de treinos personalizada baseada no perfil do atleta fornecido.

REGRAS FUNDAMENTAIS:
1. NUNCA use a palavra "CrossFit" — use "treino funcional", "movimento olímpico", "ginástica", "metcon"
2. Os treinos devem ser 100% ORIGINAIS — não copie programações de coaches conhecidos
3. A programação deve ser GERAL mas com ênfase nas deficiências identificadas
4. Cada deficiência do perfil deve aparecer em pelo menos 1 treino da semana
5. Respeite a frequência semanal informada pelo atleta
6. Adapte volume e intensidade com base nos check-ins recentes e nas últimas semanas
7. Se o atleta reportou movimentos difíceis nos check-ins, inclua progressão desses movimentos

ESTRUTURA DE CADA DIA DE TREINO:
- Modalidade do dia: LPO / Ginástica / Força / Cardio / Misto / Skill / Descanso
- Aquecimento ESPECÍFICO pela modalidade:
  - Dia LPO: ativação de cadeia posterior, mobilidade tornozelo/ombro, progressão técnica com PVC
  - Dia Ginástica: ativação escapular, hollow rock, kipping swing, progressão em anel/barra
  - Dia Força: remo leve, mobilidade de quadril, goblet squat progressivo, box jump reativo
  - Dia Misto: aquecimento combinado em sequência preparando os dois sistemas
  - Dia Skill/Aeróbio: aquecimento curto suave, mobilidade geral
  - O aquecimento deve ter 4-6 exercícios com menos repetições mas mais completo
- Bloco de Força/Skill (se for o caso): percentuais, séries, repetições, descanso
- WOD principal: formato (AMRAP/For Time/EMOM/etc), exercícios, cargas por nível
- Acessórios: 2-3 exercícios de reforço e prevenção

ESCALAS OBRIGATÓRIAS para cada exercício que tenha carga ou complexidade:
- RX: carga/complexidade máxima
- Avançado: carga/complexidade alta mas acessível
- Scaled: carga/complexidade moderada
- Iniciante: movimento mais simples ou carga mínima

FORMATO DE RESPOSTA — retorne SOMENTE um JSON válido com esta estrutura:
{
  "semana": {
    "numero": 1,
    "fase": "Base",
    "tema": "Desenvolvimento Geral com foco em [deficiências principais]",
    "dias": [
      {
        "dia_semana": "Segunda",
        "tipo": "treino",
        "modalidade": ["LPO", "Cardio"],
        "titulo": "Título criativo do treino",
        "foco": "Descrição do foco do dia",
        "aquecimento": {
          "duracao_min": 12,
          "descricao_formato": "Específico para dia de LPO — ativa cadeia posterior e mobilidade",
          "exercicios": [
            {
              "nome": "Nome do exercício",
              "detalhes": "Instrução completa sem escala",
              "tem_escala": false
            },
            {
              "nome": "Nome com escala",
              "tem_escala": true,
              "rx": "instrução RX",
              "avancado": "instrução avançado",
              "scaled": "instrução scaled",
              "iniciante": "instrução iniciante"
            }
          ]
        },
        "forca": {
          "tag": "FORÇA — BACK SQUAT",
          "duracao_min": 20,
          "formato": "5 × 3 reps. Descanso 3 min. Progressão de carga.",
          "exercicios": [
            {
              "nome": "Back Squat",
              "tem_escala": true,
              "rx": "5x3 @ 85% 1RM",
              "avancado": "5x3 @ 75% 1RM",
              "scaled": "5x5 @ 65% 1RM",
              "iniciante": "5x5 com carga confortável"
            }
          ]
        },
        "wod": {
          "tag": "WOD · FOR TIME",
          "duracao_min": 15,
          "formato": "For Time — 3 rounds. Time cap: 18 min.",
          "exercicios": [
            {
              "nome": "Thruster",
              "tem_escala": true,
              "rx": "15 reps @ 60/42.5kg",
              "avancado": "15 reps @ 50/35kg",
              "scaled": "12 reps @ 40/25kg",
              "iniciante": "10 reps com halteres leves"
            }
          ]
        },
        "acessorios": {
          "tag": "ACESSÓRIOS",
          "duracao_min": 10,
          "exercicios": [
            {
              "nome": "Banded Pull-apart",
              "detalhes": "3x15 reps",
              "tem_escala": false
            }
          ]
        },
        "deficiencia_foco": {
          "titulo": "Foco: [movimento ou habilidade]",
          "texto": "Explicação de como este treino trabalha a deficiência do atleta"
        }
      },
      {
        "dia_semana": "Terça",
        "tipo": "descanso",
        "titulo": "Descanso Ativo",
        "descricao": "Mobilidade leve, foam roller, caminhada."
      }
    ]
  }
}

IMPORTANTE: Gere EXATAMENTE 7 dias (Segunda a Domingo). Os dias de descanso devem respeitar a frequência do atleta.
Retorne SOMENTE o JSON, sem texto antes ou depois.`;

// ═══════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/auth/registrar
app.post('/api/auth/registrar', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });

    // Verificar se email já existe
    const { data: existe } = await supabase
      .from('atletas')
      .select('id, perfil_completo')
      .eq('email', email.toLowerCase())
      .single();

    if (existe) {
      return res.status(409).json({ erro: 'Este email já está cadastrado. Faça login.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
      .from('atletas')
      .insert({
        email: email.toLowerCase(),
        senha_hash,
        perfil_completo: false,
        nome: email.split('@')[0]
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ atleta_id: data.id, email: data.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      atleta_id: data.id,
      perfil_completo: false,
      mensagem: 'Conta criada! Complete seu perfil.'
    });
  } catch (err) {
    console.error('Erro ao registrar:', err);
    res.status(500).json({ erro: 'Erro ao criar conta. Tente novamente.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });

    const { data: atleta, error } = await supabase
      .from('atletas')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !atleta) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    if (!atleta.senha_hash) {
      return res.status(401).json({ erro: 'Conta sem senha. Use o onboarding para definir sua senha.' });
    }

    const senhaOk = await bcrypt.compare(senha, atleta.senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const token = jwt.sign({ atleta_id: atleta.id, email: atleta.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      atleta_id: atleta.id,
      nome: atleta.nome,
      perfil_completo: atleta.perfil_completo || false,
      mensagem: 'Login realizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ erro: 'Erro ao fazer login. Tente novamente.' });
  }
});

// GET /api/auth/perfil
app.get('/api/auth/perfil', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('atletas')
      .select('id, nome, email, categoria, nivel, frequencia, perfil_completo, criado_em')
      .eq('id', req.usuario.atleta_id)
      .single();

    if (error || !data) return res.status(404).json({ erro: 'Atleta não encontrado.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ATLETA ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/atleta/cadastrar
app.post('/api/atleta/cadastrar', async (req, res) => {
  try {
    const dados = req.body;

    // Sanitizar campos de data — string vazia vira null
    const toDate = v => (v && v.toString().trim() !== '' ? v : null);

    const perfilData = {
      nome: dados.nome,
      data_nascimento: toDate(dados.data_nascimento),
      categoria: dados.categoria,
      tempo_treino: dados.tempo_treino,
      nivel: dados.nivel,
      categoria_competicao: dados.categoria_competicao,
      objetivos: dados.objetivos,
      frequencia: dados.frequencia,
      tempo_treino_disponivel: dados.tempo_treino_disponivel || null,
      local_treino: dados.local_treino || null,
      skills: dados.skills,
      movimentos_desenvolver: dados.movimentos_desenvolver,
      prs: dados.prs || null,
      lesoes: dados.lesoes,
      ultima_semana: dados.ultima_semana,
      volume: dados.volume,
      contexto: dados.contexto,
      tem_competicao: dados.tem_competicao,
      competicao_nome: dados.competicao_nome,
      competicao_data: toDate(dados.competicao_data),
      competicao_categoria: dados.competicao_categoria,
      perfil_completo: true
    };

    // Se tem atleta_id, atualiza o registro existente (fluxo pós-login)
    if (dados.atleta_id) {
      const { data, error } = await supabase
        .from('atletas')
        .update(perfilData)
        .eq('id', dados.atleta_id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ atleta_id: data.id, mensagem: 'Perfil atualizado com sucesso!' });
    }

    // Sem atleta_id: upsert por email ou insert
    if (dados.email) {
      const { data, error } = await supabase
        .from('atletas')
        .upsert({ ...perfilData, email: dados.email.toLowerCase() }, { onConflict: 'email' })
        .select()
        .single();

      if (!error) return res.json({ atleta_id: data.id, mensagem: 'Atleta cadastrado com sucesso!' });
    }

    // Insert limpo
    const { data: inserted, error: insertError } = await supabase
      .from('atletas')
      .insert(perfilData)
      .select()
      .single();

    if (insertError) throw insertError;
    res.json({ atleta_id: inserted.id, mensagem: 'Atleta cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar atleta:', err);
    res.status(500).json({ erro: 'Erro ao cadastrar atleta. Tente novamente.' });
  }
});

// GET /api/atleta/por-email/:email
app.get('/api/atleta/por-email/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const { data, error } = await supabase
      .from('atletas')
      .select('id, nome, perfil_completo, nivel, frequencia')
      .eq('email', email)
      .single();

    if (error || !data) return res.status(404).json({ erro: 'Atleta não encontrado.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar atleta.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PROGRAMAÇÃO ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/programacao/gerar
app.post('/api/programacao/gerar', async (req, res) => {
  try {
    const { atleta_id } = req.body;

    // Buscar perfil do atleta
    const { data: atleta, error: atletaError } = await supabase
      .from('atletas')
      .select('*')
      .eq('id', atleta_id)
      .single();

    if (atletaError || !atleta) {
      return res.status(404).json({ erro: 'Atleta não encontrado.' });
    }

    // Buscar check-ins recentes (últimas 4 semanas = ~12 treinos)
    const { data: checkins } = await supabase
      .from('checkins')
      .select('*')
      .eq('atleta_id', atleta_id)
      .order('criado_em', { ascending: false })
      .limit(12);

    const skillNames = {
      endurance: 'Resistência cardiovascular',
      stamina: 'Stamina',
      forca: 'Força muscular',
      flexibilidade: 'Flexibilidade',
      potencia: 'Potência',
      velocidade: 'Velocidade',
      coordenacao: 'Coordenação',
      agilidade: 'Agilidade',
      equilibrio: 'Equilíbrio',
      precisao: 'Precisão'
    };

    const skills = atleta.skills || {};
    const deficiencias = Object.entries(skills)
      .filter(([, v]) => v <= 2)
      .map(([k]) => skillNames[k] || k);
    const pontosFortes = Object.entries(skills)
      .filter(([, v]) => v >= 4)
      .map(([k]) => skillNames[k] || k);

    // Calcular número da semana e fase
    const { data: programacoesAnteriores } = await supabase
      .from('programacoes')
      .select('id, semana_numero, fase')
      .eq('atleta_id', atleta_id)
      .order('gerado_em', { ascending: false })
      .limit(1);

    let semanaNumero = 1;
    let fase = 'Base';

    if (programacoesAnteriores && programacoesAnteriores.length > 0) {
      semanaNumero = (programacoesAnteriores[0].semana_numero || 0) + 1;
    }

    if (atleta.tem_competicao && atleta.competicao_data) {
      const hoje = new Date();
      const comp = new Date(atleta.competicao_data);
      const semanasAte = Math.max(1, Math.round((comp - hoje) / (7 * 24 * 60 * 60 * 1000)));
      const faseBase = Math.round(semanasAte * 0.35);
      const faseForca = Math.round(semanasAte * 0.30);
      const fasePreComp = Math.round(semanasAte * 0.25);
      if (semanaNumero <= faseBase) fase = 'Base';
      else if (semanaNumero <= faseBase + faseForca) fase = 'Força';
      else if (semanaNumero <= faseBase + faseForca + fasePreComp) fase = 'Pré-competitiva';
      else fase = 'Tapering';
    }

    // Montar resumo dos check-ins para a IA
    let checkinResumo = '';
    if (checkins && checkins.length > 0) {
      const mediaRPE = (checkins.reduce((a, c) => a + (c.rpe || 5), 0) / checkins.length).toFixed(1);
      const mediaSensacao = (checkins.reduce((a, c) => a + (c.sensacao || 3), 0) / checkins.length).toFixed(1);
      const movsDificeis = checkins
        .flatMap(c => c.movimentos_dificeis || [])
        .reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
      const topMovsDificeis = Object.entries(movsDificeis)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([m, n]) => `${m} (${n}x)`);
      const lesoes = checkins.filter(c => c.nova_lesao).map(c => c.descricao_lesao).filter(Boolean);
      const treinos = checkins.length;
      const concluidos = checkins.filter(c => c.concluido).length;
      const feedbacks = checkins.map(c => c.observacoes).filter(Boolean).slice(0, 3);

      checkinResumo = `
HISTÓRICO DE CHECK-INS (últimos ${treinos} treinos):
- Treinos concluídos: ${concluidos}/${treinos}
- Sensação média: ${mediaSensacao}/5
- RPE médio: ${mediaRPE}/10
- Movimentos mais difíceis: ${topMovsDificeis.length ? topMovsDificeis.join(', ') : 'nenhum registrado'}
- Lesões/dores reportadas: ${lesoes.length ? lesoes.join(', ') : 'nenhuma'}
- Feedbacks recentes: ${feedbacks.length ? feedbacks.join(' | ') : 'nenhum'}
AJUSTE a programação com base neste histórico: se RPE médio > 8, reduza intensidade; se sensação < 3, priorize recuperação; inclua progressão nos movimentos difíceis.`;
    } else {
      checkinResumo = '\nHISTÓRICO DE CHECK-INS: Primeira semana — sem histórico ainda.';
    }

    // Formatar PRs para o prompt
    const prs = atleta.prs || {};
    const prsTexto = Object.keys(prs).length
      ? Object.entries(prs).map(([k, v]) => `${k.replace(/_/g,' ')}: ${v}${k.includes('remo') ? 'min' : 'kg'}`).join(', ')
      : 'Não informado';

    const localLabels = {
      box: 'Box / Academia de treino funcional (equipamento completo)',
      casa_equip: 'Casa com equipamentos básicos (barra, anilhas, halteres)',
      casa_sem: 'Casa sem equipamentos (apenas peso corporal)',
      viagem: 'Viagem / Hotel (sem equipamentos ou muito limitado)',
      ar_livre: 'Ao ar livre'
    };

    const perfilTexto = `
PERFIL DO ATLETA:
- Nome: ${atleta.nome}
- Categoria: ${atleta.categoria}
- Tempo de treino: ${atleta.tempo_treino}
- Nível: ${atleta.nivel}
- Objetivos: ${(atleta.objetivos || []).join(', ')}
- Frequência semanal: ${atleta.frequencia}
- Tempo disponível por treino: ${atleta.tempo_treino_disponivel || 'Não informado'} — RESPEITE ESTE LIMITE
- Local de treino: ${localLabels[atleta.local_treino] || atleta.local_treino || 'Box'} — ADAPTE OS EXERCÍCIOS AO LOCAL
- Habilidades (1-5): ${Object.entries(skills).map(([k, v]) => `${skillNames[k] || k}: ${v}`).join(', ')}
- Deficiências principais: ${deficiencias.length ? deficiencias.join(', ') : 'Nenhuma crítica'}
- Pontos fortes: ${pontosFortes.length ? pontosFortes.join(', ') : 'Nenhum destaque'}
- Movimentos para desenvolver: ${(atleta.movimentos_desenvolver || []).join(', ')}
- Recordes pessoais: ${prsTexto} — USE ESSES VALORES PARA PRESCREVER % DE CARGA
- Limitações físicas: ${(atleta.lesoes || []).join(', ') || 'Nenhuma'}
- Últimas semanas (auto-avaliação inicial): ${atleta.ultima_semana} (volume: ${atleta.volume})
- Contexto adicional: ${atleta.contexto || 'Nenhum'}
- Fase atual: ${fase} (semana ${semanaNumero})
${atleta.tem_competicao ? `- Competição: ${atleta.competicao_nome} em ${atleta.competicao_data} (categoria: ${atleta.competicao_categoria})` : ''}
${checkinResumo}

Gere a semana ${semanaNumero} da fase de ${fase}.
IMPORTANTE: Adapte todos os treinos ao local "${atleta.local_treino || 'box'}" e ao tempo disponível "${atleta.tempo_treino_disponivel || '1h'}".`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: perfilTexto }]
    });

    const responseText = message.content[0].text;

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let semanaData;
    try {
      semanaData = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Erro ao parsear JSON da IA:', parseErr);
      return res.status(500).json({ erro: 'Erro ao processar a programação gerada. Tente novamente.' });
    }

    const { data: prog, error: progError } = await supabase
      .from('programacoes')
      .insert({ atleta_id, semana_numero: semanaNumero, fase, conteudo: semanaData })
      .select()
      .single();

    if (progError) throw progError;

    res.json({ programacao_id: prog.id, semana: semanaData });
  } catch (err) {
    console.error('Erro ao gerar programação:', err);
    res.status(500).json({
      erro: err.message || 'Erro ao gerar a programação. Tente novamente em alguns segundos.',
      detalhe: err.toString(),
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

// GET /api/programacao/:atleta_id/atual
app.get('/api/programacao/:atleta_id/atual', async (req, res) => {
  try {
    const { atleta_id } = req.params;
    const { data, error } = await supabase
      .from('programacoes')
      .select('*')
      .eq('atleta_id', atleta_id)
      .order('gerado_em', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.status(404).json({ erro: 'Nenhuma programação encontrada.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar programação.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CHECK-IN ROUTES
// ═══════════════════════════════════════════════════════════════════

// POST /api/checkin/registrar
app.post('/api/checkin/registrar', async (req, res) => {
  try {
    const {
      atleta_id, programacao_id, data_checkin, dia_semana,
      concluido, sensacao, rpe, movimentos_dificeis,
      pontos_positivos, observacoes, nova_lesao, descricao_lesao, titulo_treino
    } = req.body;

    const { data, error } = await supabase
      .from('checkins')
      .insert({
        atleta_id, programacao_id,
        data_checkin: data_checkin || new Date().toISOString().split('T')[0],
        dia_semana, concluido: concluido !== false,
        sensacao, rpe, movimentos_dificeis,
        pontos_positivos, observacoes,
        nova_lesao: nova_lesao || false,
        descricao_lesao, titulo_treino
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ sucesso: true, checkin: data });
  } catch (err) {
    console.error('Erro ao registrar check-in:', err);
    res.status(500).json({ erro: 'Erro ao registrar check-in.' });
  }
});

// GET /api/atleta/:atleta_id/checkins
app.get('/api/atleta/:atleta_id/checkins', async (req, res) => {
  try {
    const { atleta_id } = req.params;
    const limit = parseInt(req.query.limit) || 30;

    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('atleta_id', atleta_id)
      .order('criado_em', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar check-ins.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// RESULTADO ROUTES (legado, mantido para compatibilidade)
// ═══════════════════════════════════════════════════════════════════

app.post('/api/resultado/registrar', async (req, res) => {
  try {
    const { atleta_id, programacao_id, data_treino, dia_semana, resultado, observacoes } = req.body;
    const { data, error } = await supabase
      .from('resultados')
      .insert({ atleta_id, programacao_id, data_treino, dia_semana, resultado, observacoes })
      .select()
      .single();

    if (error) throw error;
    res.json({ sucesso: true, resultado: data });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar resultado.' });
  }
});

app.get('/api/atleta/:atleta_id/resultados', async (req, res) => {
  try {
    const { atleta_id } = req.params;
    const { data, error } = await supabase
      .from('resultados')
      .select('*')
      .eq('atleta_id', atleta_id)
      .order('registrado_em', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resultados.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PRs ROUTES
// ═══════════════════════════════════════════════════════════════════

// GET /api/atleta/:atleta_id/prs — retorna PRs atuais + histórico
app.get('/api/atleta/:atleta_id/prs', async (req, res) => {
  try {
    const { atleta_id } = req.params;

    const { data: atleta, error: atletaError } = await supabase
      .from('atletas')
      .select('prs, nome')
      .eq('id', atleta_id)
      .single();

    if (atletaError || !atleta) return res.status(404).json({ erro: 'Atleta não encontrado.' });

    const { data: historico } = await supabase
      .from('pr_historico')
      .select('*')
      .eq('atleta_id', atleta_id)
      .order('registrado_em', { ascending: false });

    res.json({ prs: atleta.prs || {}, historico: historico || [] });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar PRs.' });
  }
});

// POST /api/atleta/:atleta_id/prs — atualiza PRs e salva histórico dos que melhoraram
app.post('/api/atleta/:atleta_id/prs', async (req, res) => {
  try {
    const { atleta_id } = req.params;
    const { prs } = req.body;

    if (!prs || typeof prs !== 'object') {
      return res.status(400).json({ erro: 'PRs inválidos.' });
    }

    // Buscar PRs atuais para comparar
    const { data: atleta } = await supabase
      .from('atletas')
      .select('prs')
      .eq('id', atleta_id)
      .single();

    const prsAtuais = atleta?.prs || {};
    const registros = [];

    // Para cada PR que melhorou, salvar no histórico
    for (const [movimento, valor] of Object.entries(prs)) {
      const novo = parseFloat(valor);
      const atual = parseFloat(prsAtuais[movimento] || 0);
      if (!isNaN(novo) && novo > 0 && novo !== atual) {
        registros.push({
          atleta_id,
          movimento,
          valor: novo,
          valor_anterior: atual || null
        });
      }
    }

    // Atualizar PRs no perfil
    const { error: updateError } = await supabase
      .from('atletas')
      .update({ prs })
      .eq('id', atleta_id);

    if (updateError) throw updateError;

    // Salvar histórico dos PRs alterados
    if (registros.length > 0) {
      await supabase.from('pr_historico').insert(registros);
    }

    res.json({ sucesso: true, atualizados: registros.length });
  } catch (err) {
    console.error('Erro ao atualizar PRs:', err);
    res.status(500).json({ erro: err.message || 'Erro ao atualizar PRs.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════

const ADMIN_KEY = process.env.ADMIN_KEY || 'adr_admin_2024';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ erro: 'Acesso negado.' });
  next();
}

// GET /api/admin/stats — KPIs gerais
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const agora = new Date();
    const set7 = new Date(agora - 7 * 24 * 60 * 60 * 1000).toISOString();
    const set30 = new Date(agora - 30 * 24 * 60 * 60 * 1000).toISOString();
    const inicioSemana = new Date(agora - (agora.getDay() || 7) * 24 * 60 * 60 * 1000);
    inicioSemana.setHours(0, 0, 0, 0);

    const [{ count: totalAtletas }, { count: novosSemana }, checkins7, checkins30, todosCheckins] = await Promise.all([
      supabase.from('atletas').select('*', { count: 'exact', head: true }),
      supabase.from('atletas').select('*', { count: 'exact', head: true }).gte('criado_em', inicioSemana.toISOString()),
      supabase.from('checkins').select('atleta_id', { count: 'exact' }).gte('criado_em', set7),
      supabase.from('checkins').select('atleta_id', { count: 'exact' }).gte('criado_em', set30),
      supabase.from('checkins').select('rpe, sensacao').gte('criado_em', set30).limit(500),
    ]);

    const checkins7Ids = new Set((checkins7.data || []).map(c => c.atleta_id));
    const ativosUltimos7 = checkins7Ids.size;
    const allC = todosCheckins.data || [];
    const mediaRPE = allC.length ? (allC.reduce((a, c) => a + (c.rpe || 5), 0) / allC.length).toFixed(1) : '—';
    const mediaSensacao = allC.length ? (allC.reduce((a, c) => a + (c.sensacao || 3), 0) / allC.length).toFixed(1) : '—';

    res.json({
      total_atletas: totalAtletas || 0,
      novos_semana: novosSemana || 0,
      ativos_7dias: ativosUltimos7,
      inativos: (totalAtletas || 0) - ativosUltimos7,
      checkins_30dias: checkins30.count || 0,
      media_rpe: mediaRPE,
      media_sensacao: mediaSensacao,
    });
  } catch (err) {
    console.error('Erro admin stats:', err);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/admin/atletas — lista completa com dados agregados
app.get('/api/admin/atletas', adminAuth, async (req, res) => {
  try {
    const { data: atletas, error } = await supabase
      .from('atletas')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    const ids = (atletas || []).map(a => a.id);

    // Se não há atletas, retorna vazio
    if (ids.length === 0) return res.json([]);

    const [progsResult, checkinsResult] = await Promise.all([
      supabase.from('programacoes').select('atleta_id, semana_numero, gerado_em').in('atleta_id', ids),
      supabase.from('checkins').select('atleta_id, criado_em, sensacao, rpe, concluido').in('atleta_id', ids).order('criado_em', { ascending: false }),
    ]);

    const progs = progsResult.data || [];
    const checkins = checkinsResult.data || [];

    // Agrupar por atleta
    const progMap = {};
    (progs || []).forEach(p => {
      if (!progMap[p.atleta_id] || p.semana_numero > progMap[p.atleta_id].semana_numero) {
        progMap[p.atleta_id] = p;
      }
    });

    const checkinMap = {};
    (checkins || []).forEach(c => {
      if (!checkinMap[c.atleta_id]) checkinMap[c.atleta_id] = [];
      checkinMap[c.atleta_id].push(c);
    });

    const resultado = (atletas || []).map(a => {
      const meusProg = progMap[a.id];
      const meusCheckins = checkinMap[a.id] || [];
      const ultimoCheckin = meusCheckins[0]?.criado_em || null;
      const diasSemCheckin = ultimoCheckin
        ? Math.floor((Date.now() - new Date(ultimoCheckin)) / (1000 * 60 * 60 * 24))
        : null;
      const mediaRPE = meusCheckins.length
        ? (meusCheckins.slice(0, 10).reduce((acc, c) => acc + (c.rpe || 5), 0) / Math.min(meusCheckins.length, 10)).toFixed(1)
        : null;
      const mediaSensacao = meusCheckins.length
        ? (meusCheckins.slice(0, 10).reduce((acc, c) => acc + (c.sensacao || 3), 0) / Math.min(meusCheckins.length, 10)).toFixed(1)
        : null;

      let status = 'novo';
      if (meusCheckins.length > 0) {
        status = diasSemCheckin !== null && diasSemCheckin <= 7 ? 'ativo' : 'inativo';
      }

      return {
        ...a,
        semanas_geradas: progMap[a.id]?.semana_numero || 0,
        total_checkins: meusCheckins.length,
        ultimo_checkin: ultimoCheckin,
        dias_sem_checkin: diasSemCheckin,
        media_rpe: mediaRPE,
        media_sensacao: mediaSensacao,
        status,
      };
    });

    res.json(resultado);
  } catch (err) {
    console.error('Erro admin atletas:', err);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/admin/atleta/:id — detalhes completos de 1 atleta
app.get('/api/admin/atleta/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [{ data: atleta }, { data: checkins }, { data: progs }, { data: prsHist }] = await Promise.all([
      supabase.from('atletas').select('*').eq('id', id).single(),
      supabase.from('checkins').select('*').eq('atleta_id', id).order('criado_em', { ascending: false }).limit(20),
      supabase.from('programacoes').select('id, semana_numero, fase, gerado_em').eq('atleta_id', id).order('gerado_em', { ascending: false }),
      supabase.from('pr_historico').select('*').eq('atleta_id', id).order('registrado_em', { ascending: false }).limit(30),
    ]);
    if (!atleta) return res.status(404).json({ erro: 'Atleta não encontrado.' });
    res.json({ atleta, checkins: checkins || [], programacoes: progs || [], pr_historico: prsHist || [] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/admin/atleta/:id — exclui atleta e todos os dados relacionados
app.delete('/api/admin/atleta/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Apagar em ordem para respeitar foreign keys
    await supabase.from('pr_historico').delete().eq('atleta_id', id);
    await supabase.from('checkins').delete().eq('atleta_id', id);
    await supabase.from('resultados').delete().eq('atleta_id', id);
    await supabase.from('programacoes').delete().eq('atleta_id', id);
    const { error } = await supabase.from('atletas').delete().eq('id', id);

    if (error) throw error;
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao excluir atleta:', err);
    res.status(500).json({ erro: err.message || 'Erro ao excluir atleta.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Atletas do Reino rodando na porta ${PORT}`);
});

module.exports = app;
