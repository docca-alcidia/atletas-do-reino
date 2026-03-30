// Onboarding Controller
(function() {
  let currentStep = 1;
  const totalSteps = 8;

  // Data store
  const data = {
    nome: '',
    data_nascimento: '',
    categoria: '',
    tempo_treino: '',
    nivel: '',
    categoria_competicao: '',
    objetivos: [],
    frequencia: '',
    tempo_treino_disponivel: '',
    local_treino: '',
    skills: {},
    movimentos_desenvolver: [],
    prs: {},
    lesoes: [],
    ultima_semana: '',
    volume: '',
    contexto: '',
    tem_competicao: false,
    competicao_nome: '',
    competicao_data: '',
    competicao_categoria: ''
  };

  // Skills definition — descrições práticas para leigos
  const skills = [
    {
      key: 'endurance',
      name: 'Resistência cardiovascular',
      desc: 'quanto tempo aguenta no remo, bike ou corrida',
      exemplos: ['1 = Para depois de 2 min correndo', '3 = Corre 5km sem parar', '5 = Mantém ritmo alto por 30min+']
    },
    {
      key: 'stamina',
      name: 'Stamina (fôlego)',
      desc: 'manter intensidade em WODs longos',
      exemplos: ['1 = Já canso nos primeiros rounds', '3 = Mantenho até o meio do WOD', '5 = Ritmo consistente do início ao fim']
    },
    {
      key: 'forca',
      name: 'Força muscular',
      desc: 'capacidade de levantar cargas pesadas',
      exemplos: ['1 = Dificuldade com barra vazia', '3 = Agacho 1x meu peso corporal', '5 = Levanto cargas altas com facilidade']
    },
    {
      key: 'flexibilidade',
      name: 'Flexibilidade / Mobilidade',
      desc: 'amplitude de movimento nas articulações',
      exemplos: ['1 = Não chego ao fundo no agachamento', '3 = Agacho ok, overhead limitado', '5 = OHS profundo sem compensações']
    },
    {
      key: 'potencia',
      name: 'Potência / Explosão',
      desc: 'força rápida em saltos, LPO e sprints',
      exemplos: ['1 = Box jump baixo, saltos fracos', '3 = Box jump 60cm, LPO básico', '5 = Salto alto, LPO explosivo']
    },
    {
      key: 'velocidade',
      name: 'Velocidade de movimento',
      desc: 'ciclo rápido de repetições (thrusters, wall balls)',
      exemplos: ['1 = Movimentos lentos e pesados', '3 = Ritmo médio nos ciclos', '5 = Cicla rápido sem perder técnica']
    },
    {
      key: 'coordenacao',
      name: 'Coordenação',
      desc: 'facilidade de aprender movimentos novos',
      exemplos: ['1 = Dificuldade com movimentos combinados', '3 = Aprendo com algumas repetições', '5 = Pego movimentos novos rápido']
    },
    {
      key: 'agilidade',
      name: 'Agilidade',
      desc: 'transição rápida entre exercícios diferentes',
      exemplos: ['1 = Lento para trocar de estação', '3 = Transição razoável', '5 = Troco de movimento sem perder tempo']
    },
    {
      key: 'equilibrio',
      name: 'Equilíbrio',
      desc: 'controle corporal em pistol squat, handstand, HSPU',
      exemplos: ['1 = Dificuldade até em pistol squat', '3 = Pistol ok, handstand instável', '5 = Handstand walk, L-sit estáveis']
    },
    {
      key: 'precisao',
      name: 'Precisão técnica',
      desc: 'controle fino em movimentos olímpicos e ginástica',
      exemplos: ['1 = Técnica muito inconsistente', '3 = Técnica ok em movimentos básicos', '5 = Técnica sólida mesmo sob fadiga']
    }
  ];

  const levelLabels = {
    1: { text: 'Preciso desenvolver muito', color: '#f87171' },
    2: { text: 'Abaixo da média', color: '#fb923c' },
    3: { text: 'Na média', color: 'var(--cinza)' },
    4: { text: 'Acima da média', color: '#4ade80' },
    5: { text: 'Ponto forte!', color: 'var(--dourado)' }
  };

  // Init skills sliders
  function initSkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = skills.map(s => `
      <div class="slider-group" style="margin-bottom:20px;">
        <div class="slider-label">
          <span style="font-size:0.9rem;color:var(--branco);font-weight:500;">${s.name}</span>
          <span class="val" id="val_${s.key}" style="color:var(--cinza);">3 — Na média</span>
        </div>
        <div style="font-size:0.78rem;color:var(--cinza-escuro);margin-bottom:6px;">${s.desc}</div>
        <input type="range" min="1" max="5" value="3" id="skill_${s.key}" data-key="${s.key}">
        <div class="skill-levels">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
        <div class="skill-example" id="ex_${s.key}">${s.exemplos[1]}</div>
      </div>
    `).join('');

    container.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', function() {
        const val = parseInt(this.value);
        const key = this.dataset.key;
        const skill = skills.find(s => s.key === key);
        data.skills[key] = val;
        const lbl = levelLabels[val];
        document.getElementById(`val_${key}`).textContent = `${val} — ${lbl.text}`;
        document.getElementById(`val_${key}`).style.color = lbl.color;
        // Exemplo correspondente
        const exIdx = val <= 1 ? 0 : val >= 5 ? 2 : val <= 3 ? 1 : 2;
        document.getElementById(`ex_${key}`).textContent = skill.exemplos[exIdx];
      });
      data.skills[slider.dataset.key] = 3;
    });
  }

  // Single select handlers
  function initSingleSelect(containerId, dataKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.op').forEach(op => {
      op.addEventListener('click', function() {
        container.querySelectorAll('.op').forEach(o => o.classList.remove('sel'));
        this.classList.add('sel');
        data[dataKey] = this.dataset.val;
      });
    });
  }

  // Multi select handlers
  function initMultiSelect(containerId, dataKey, countId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.mp').forEach(mp => {
      mp.addEventListener('click', function() {
        this.classList.toggle('sel');
        const selected = container.querySelectorAll('.mp.sel');
        data[dataKey] = Array.from(selected).map(s => s.dataset.val);
        if (countId) {
          const countEl = document.getElementById(countId);
          countEl.textContent = data[dataKey].length ? `${data[dataKey].length} selecionado${data[dataKey].length > 1 ? 's' : ''}` : '';
        }
      });
    });
  }

  // Category calculation from birth date
  function calcCategoria(dateStr) {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) return 'teens';
    if (age <= 34) return 'adulto';
    if (age <= 44) return 'm35';
    if (age <= 54) return 'm45';
    if (age <= 59) return 'm55';
    return 'm60';
  }

  const catLabels = {
    teens: 'Teens (menos de 18)',
    adulto: 'Adulto / Open (18-34)',
    m35: 'Master 35+ (35-44)',
    m45: 'Master 45+ (45-54)',
    m55: 'Master 55+ (55-59)',
    m60: 'Master 60+ (60+)'
  };

  // Periodization calculation
  function calcPeriodizacao(eventDate) {
    const hoje = new Date();
    const evento = new Date(eventDate);
    const diffMs = evento - hoje;
    if (diffMs <= 0) return null;
    const semanas = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
    const base = Math.round(semanas * 0.35);
    const forca = Math.round(semanas * 0.30);
    const precomp = Math.round(semanas * 0.25);
    const taper = Math.max(1, semanas - base - forca - precomp);
    return { semanas, base, forca, precomp, taper };
  }

  function renderPeriodizacao() {
    const dateVal = document.getElementById('compData').value;
    const preview = document.getElementById('periodPreview');
    const bar = document.getElementById('periodBar');
    if (!dateVal) { preview.classList.remove('show'); return; }
    const p = calcPeriodizacao(dateVal);
    if (!p) { preview.classList.remove('show'); return; }
    bar.innerHTML = `
      <div class="base" style="flex:${p.base}">${p.base}sem</div>
      <div class="forca" style="flex:${p.forca}">${p.forca}sem</div>
      <div class="precomp" style="flex:${p.precomp}">${p.precomp}sem</div>
      <div class="taper" style="flex:${p.taper}">${p.taper}sem</div>
    `;
    preview.classList.add('show');
  }

  // Collect PRs from inputs
  function collectPRs() {
    const prFields = [
      { id: 'pr_backsquat', key: 'back_squat' },
      { id: 'pr_frontsquat', key: 'front_squat' },
      { id: 'pr_deadlift', key: 'deadlift' },
      { id: 'pr_press', key: 'strict_press' },
      { id: 'pr_snatch', key: 'snatch' },
      { id: 'pr_cleanjerk', key: 'clean_jerk' },
      { id: 'pr_bench', key: 'bench_press' },
      { id: 'pr_remo500', key: 'remo_500m' }
    ];
    const prs = {};
    prFields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el && el.value.trim()) prs[f.key] = el.value.trim();
    });
    data.prs = prs;
  }

  // Summary rendering
  function renderSummary() {
    const container = document.getElementById('summaryContent');
    const skillsHtml = Object.entries(data.skills).map(([k, v]) => {
      const s = skills.find(s => s.key === k);
      const lbl = levelLabels[v];
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(160,186,214,0.06);">
        <span style="font-size:0.82rem;color:var(--cinza)">${s ? s.name : k}</span>
        <span style="font-size:0.82rem;font-weight:600;color:${lbl.color}">${v}/5</span>
      </div>`;
    }).join('');

    const prsHtml = Object.entries(data.prs || {}).length
      ? Object.entries(data.prs).map(([k, v]) => `<span class="pill blue">${k.replace(/_/g,' ')}: ${v}${k.includes('remo') ? '' : 'kg'}</span>`).join('')
      : '<span style="color:var(--cinza-escuro);font-size:0.82rem;">Nenhum PR informado</span>';

    const localLabels = {
      box: 'Box / Academia', casa_equip: 'Casa com equipamentos',
      casa_sem: 'Casa sem equipamentos', viagem: 'Viagem / Hotel', ar_livre: 'Ao ar livre'
    };

    container.innerHTML = `
      <div class="summary-card">
        <h4>Identificação</h4>
        <p><strong style="color:var(--branco)">${data.nome || 'Não informado'}</strong></p>
        <p>Categoria: ${catLabels[data.categoria] || 'Não calculada'}</p>
        <p>Tempo de treino: ${data.tempo_treino || '-'}</p>
      </div>
      <div class="summary-card">
        <h4>Nível e Categoria</h4>
        <p>Nível: <span style="color:var(--dourado)">${data.nivel || '-'}</span></p>
        <p>Competição: ${data.categoria_competicao || '-'}</p>
      </div>
      <div class="summary-card">
        <h4>Rotina de Treino</h4>
        <p>Frequência: <span style="color:var(--dourado)">${data.frequencia || '-'}</span></p>
        <p>Tempo disponível: ${data.tempo_treino_disponivel || '-'}</p>
        <p>Local: ${localLabels[data.local_treino] || data.local_treino || '-'}</p>
        <div class="pills" style="margin-top:8px;">
          ${(data.objetivos || []).map(o => `<span class="pill green">${o}</span>`).join('')}
        </div>
      </div>
      <div class="summary-card">
        <h4>Habilidades Físicas</h4>
        ${skillsHtml}
      </div>
      <div class="summary-card">
        <h4>Movimentos para Desenvolver</h4>
        <div class="pills">
          ${(data.movimentos_desenvolver || []).map(m => `<span class="pill blue">${m}</span>`).join('') || '<span style="color:var(--cinza-escuro);font-size:0.82rem;">Nenhum selecionado</span>'}
        </div>
      </div>
      <div class="summary-card">
        <h4>Recordes Pessoais</h4>
        <div class="pills">${prsHtml}</div>
      </div>
      <div class="summary-card">
        <h4>Últimas Semanas</h4>
        <p>Estado: ${data.ultima_semana || '-'} | Volume: ${data.volume || '-'}</p>
        ${data.contexto ? `<p style="margin-top:6px;font-style:italic;color:var(--cinza)">"${data.contexto}"</p>` : ''}
      </div>
      <div class="summary-card">
        <h4>Limitações</h4>
        <div class="pills">
          ${(data.lesoes || []).map(l => `<span class="pill pink">${l}</span>`).join('') || '<span style="color:var(--cinza-escuro);font-size:0.82rem;">Nenhuma</span>'}
        </div>
      </div>
      ${data.tem_competicao ? `
      <div class="summary-card">
        <h4>Competição</h4>
        <p>${data.competicao_nome || 'Evento'} — ${data.competicao_data || '?'}</p>
        <p>Categoria: ${data.competicao_categoria || '-'}</p>
      </div>` : ''}
    `;
  }

  // Navigation
  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    collectStepData(currentStep);
    currentStep = step;

    document.querySelectorAll('.progress-bar .step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 < currentStep) el.classList.add('done');
      if (i + 1 === currentStep) el.classList.add('active');
    });

    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');

    document.getElementById('btnPrev').style.display = currentStep > 1 ? '' : 'none';
    const navBtns = document.getElementById('navBtns');
    if (currentStep === totalSteps) {
      navBtns.style.display = 'none';
      renderSummary();
    } else {
      navBtns.style.display = '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function collectStepData(step) {
    switch(step) {
      case 1:
        data.nome = document.getElementById('nome').value.trim();
        data.data_nascimento = document.getElementById('dataNascimento').value;
        data.categoria = calcCategoria(data.data_nascimento);
        break;
      case 5:
        collectPRs();
        break;
      case 6:
        data.contexto = document.getElementById('contexto').value.trim();
        break;
      case 7:
        data.tem_competicao = document.getElementById('temCompToggle').checked;
        if (data.tem_competicao) {
          data.competicao_nome = document.getElementById('compNome').value.trim();
          data.competicao_data = document.getElementById('compData').value;
        }
        break;
    }
  }

  // Loading messages
  const loadingMessages = [
    'Analisando seu perfil...',
    'Identificando suas prioridades...',
    'Criando os treinos da semana...',
    'Calculando cargas e volumes...',
    'Montando a periodização...',
    'Quase pronto...'
  ];

  function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const msgEl = document.getElementById('loadingMsg');
    overlay.classList.add('show');
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < loadingMessages.length) {
        msgEl.style.opacity = '0';
        setTimeout(() => {
          msgEl.textContent = loadingMessages[idx];
          msgEl.style.opacity = '1';
        }, 200);
      }
    }, 2500);
    return () => {
      clearInterval(interval);
      overlay.classList.remove('show');
    };
  }

  // Generate program
  async function gerarProgramacao() {
    collectStepData(currentStep);
    collectPRs();

    const hideLoading = showLoading();
    const btnGerar = document.getElementById('btnGerar');
    btnGerar.disabled = true;

    try {
      const atletaIdExistente = localStorage.getItem('atletaId');
      if (atletaIdExistente) data.atleta_id = atletaIdExistente;

      const cadastro = await API.cadastrarAtleta(data);
      const atletaId = cadastro.atleta_id;

      localStorage.setItem('atletaId', atletaId);
      localStorage.setItem('atleta_id', atletaId);
      localStorage.setItem('atletaNome', data.nome);
      localStorage.setItem('atleta_nome', data.nome);

      const prog = await API.gerarProgramacao(atletaId);

      localStorage.setItem('programacaoId', prog.programacao_id);
      localStorage.setItem('programacao_id', prog.programacao_id);
      localStorage.setItem('programacao_data', JSON.stringify(prog.semana));

      window.location.href = '/programacao.html';
    } catch (err) {
      hideLoading();
      btnGerar.disabled = false;
      alert(err.message || 'Ocorreu um erro. Tente novamente.');
    }
  }

  // Init
  function init() {
    initSkills();

    initSingleSelect('tempoTreino', 'tempo_treino');
    initSingleSelect('nivel', 'nivel');
    initSingleSelect('categoriaComp', 'categoria_competicao');
    initSingleSelect('frequencia', 'frequencia');
    initSingleSelect('tempoDisponivel', 'tempo_treino_disponivel');
    initSingleSelect('localTreino', 'local_treino');
    initSingleSelect('ultimaSemana', 'ultima_semana');
    initSingleSelect('volume', 'volume');
    initSingleSelect('compCat', 'competicao_categoria');

    initMultiSelect('objetivos', 'objetivos', 'objCount');
    initMultiSelect('lesoes', 'lesoes', null);

    // Movimentos — coleta de todos os grupos
    const movGroups = ['movLPO', 'movGin', 'movAneis', 'movPlio', 'movCardio'];
    movGroups.forEach(gid => {
      const grp = document.getElementById(gid);
      if (!grp) return;
      grp.querySelectorAll('.mp').forEach(mp => {
        mp.addEventListener('click', function() {
          this.classList.toggle('sel');
          const all = [];
          movGroups.forEach(g => {
            const el = document.getElementById(g);
            if (el) el.querySelectorAll('.mp.sel').forEach(s => all.push(s.dataset.val));
          });
          data.movimentos_desenvolver = all;
          document.getElementById('movCount').textContent =
            all.length ? `${all.length} movimento${all.length > 1 ? 's' : ''} selecionado${all.length > 1 ? 's' : ''}` : '';
        });
      });
    });

    // Birth date → category
    document.getElementById('dataNascimento').addEventListener('change', function() {
      const cat = calcCategoria(this.value);
      const el = document.getElementById('categoriaAuto');
      if (cat) {
        el.textContent = `Categoria automática: ${catLabels[cat]}`;
        el.style.display = 'block';
        data.categoria = cat;
      } else {
        el.style.display = 'none';
      }
    });

    // Competition toggle
    document.getElementById('temCompToggle').addEventListener('change', function() {
      document.getElementById('compFields').classList.toggle('show', this.checked);
    });

    document.getElementById('compData').addEventListener('change', renderPeriodizacao);

    document.getElementById('btnNext').addEventListener('click', () => goToStep(currentStep + 1));
    document.getElementById('btnPrev').addEventListener('click', () => goToStep(currentStep - 1));
    document.getElementById('btnGerar').addEventListener('click', gerarProgramacao);

    goToStep(1);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
