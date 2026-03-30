require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

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

const SYSTEM_PROMPT = `Você é um programador de treinos funcional especialista da plataforma Atletas do Reino.
Gere uma semana de treinos personalizada baseada no perfil do atleta fornecido.

REGRAS FUNDAMENTAIS:
1. NUNCA use a palavra "CrossFit" — use "treino funcional", "movimento olímpico", "ginástica", "metcon"
2. Os treinos devem ser 100% ORIGINAIS — não copie programações de coaches conhecidos
3. A programação deve ser GERAL mas com ênfase nas deficiências identificadas
4. Cada deficiência do perfil deve aparecer em pelo menos 1 treino da semana
5. Respeite a frequência semanal informada pelo atleta
6. Adapte volume e intensidade com base em como foram as últimas semanas

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

// POST /api/atleta/cadastrar
app.post('/api/atleta/cadastrar', async (req, res) => {
  try {
    const dados = req.body;
    const { data, error } = await supabase
      .from('atletas')
      .upsert({
        nome: dados.nome,
        data_nascimento: dados.data_nascimento,
        categoria: dados.categoria,
        tempo_treino: dados.tempo_treino,
        nivel: dados.nivel,
        categoria_competicao: dados.categoria_competicao,
        objetivos: dados.objetivos,
        frequencia: dados.frequencia,
        skills: dados.skills,
        movimentos_desenvolver: dados.movimentos_desenvolver,
        lesoes: dados.lesoes,
        ultima_semana: dados.ultima_semana,
        volume: dados.volume,
        contexto: dados.contexto,
        tem_competicao: dados.tem_competicao,
        competicao_nome: dados.competicao_nome,
        competicao_data: dados.competicao_data,
        competicao_categoria: dados.competicao_categoria,
        email: dados.email || null
      }, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      // If upsert fails (e.g., no email), try insert
      const { data: inserted, error: insertError } = await supabase
        .from('atletas')
        .insert({
          nome: dados.nome,
          data_nascimento: dados.data_nascimento,
          categoria: dados.categoria,
          tempo_treino: dados.tempo_treino,
          nivel: dados.nivel,
          categoria_competicao: dados.categoria_competicao,
          objetivos: dados.objetivos,
          frequencia: dados.frequencia,
          skills: dados.skills,
          movimentos_desenvolver: dados.movimentos_desenvolver,
          lesoes: dados.lesoes,
          ultima_semana: dados.ultima_semana,
          volume: dados.volume,
          contexto: dados.contexto,
          tem_competicao: dados.tem_competicao,
          competicao_nome: dados.competicao_nome,
          competicao_data: dados.competicao_data,
          competicao_categoria: dados.competicao_categoria
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return res.json({ atleta_id: inserted.id, mensagem: 'Atleta cadastrado com sucesso!' });
    }

    res.json({ atleta_id: data.id, mensagem: 'Atleta cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar atleta:', err);
    res.status(500).json({ erro: 'Erro ao cadastrar atleta. Tente novamente.' });
  }
});

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

    // Montar prompt com perfil
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
    const pontoFortes = Object.entries(skills)
      .filter(([, v]) => v >= 4)
      .map(([k]) => skillNames[k] || k);

    let fase = 'Base';
    let semanaNumero = 1;
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

    const perfilTexto = `
PERFIL DO ATLETA:
- Nome: ${atleta.nome}
- Categoria: ${atleta.categoria}
- Tempo de treino: ${atleta.tempo_treino}
- Nível: ${atleta.nivel}
- Objetivos: ${(atleta.objetivos || []).join(', ')}
- Frequência semanal: ${atleta.frequencia}
- Habilidades (1-5): ${Object.entries(skills).map(([k, v]) => `${skillNames[k] || k}: ${v}`).join(', ')}
- Deficiências principais: ${deficiencias.length ? deficiencias.join(', ') : 'Nenhuma crítica'}
- Pontos fortes: ${pontoFortes.length ? pontoFortes.join(', ') : 'Nenhum destaque'}
- Movimentos para desenvolver: ${(atleta.movimentos_desenvolver || []).join(', ')}
- Limitações físicas: ${(atleta.lesoes || []).join(', ') || 'Nenhuma'}
- Últimas semanas: ${atleta.ultima_semana} (volume: ${atleta.volume})
- Contexto adicional: ${atleta.contexto || 'Nenhum'}
- Fase atual: ${fase} (semana ${semanaNumero})
${atleta.tem_competicao ? `- Competição: ${atleta.competicao_nome} em ${atleta.competicao_data} (categoria: ${atleta.competicao_categoria})` : ''}

Gere a semana ${semanaNumero} da fase de ${fase}.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: perfilTexto }]
    });

    const responseText = message.content[0].text;

    // Extrair JSON da resposta
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    let semanaData;
    try {
      semanaData = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Erro ao parsear JSON da IA:', parseErr);
      return res.status(500).json({ erro: 'Erro ao processar a programação gerada. Tente novamente.' });
    }

    // Salvar no Supabase
    const { data: prog, error: progError } = await supabase
      .from('programacoes')
      .insert({
        atleta_id,
        semana_numero: semanaNumero,
        fase,
        conteudo: semanaData
      })
      .select()
      .single();

    if (progError) throw progError;

    res.json({
      programacao_id: prog.id,
      semana: semanaData
    });
  } catch (err) {
    console.error('Erro ao gerar programação:', err);
    res.status(500).json({ erro: 'Erro ao gerar a programação. Tente novamente em alguns segundos.' });
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

    if (error || !data) {
      return res.status(404).json({ erro: 'Nenhuma programação encontrada.' });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar programação:', err);
    res.status(500).json({ erro: 'Erro ao buscar programação.' });
  }
});

// POST /api/resultado/registrar
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
    console.error('Erro ao registrar resultado:', err);
    res.status(500).json({ erro: 'Erro ao registrar resultado.' });
  }
});

// GET /api/atleta/:atleta_id/resultados
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
    console.error('Erro ao buscar resultados:', err);
    res.status(500).json({ erro: 'Erro ao buscar resultados.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Atletas do Reino rodando na porta ${PORT}`);
});

module.exports = app;
