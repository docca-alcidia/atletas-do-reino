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
    skills: {},
    movimentos_desenvolver: [],
    lesoes: [],
    ultima_semana: '',
    volume: '',
    contexto: '',
    tem_competicao: false,
    competicao_nome: '',
    competicao_data: '',
    competicao_categoria: ''
  };

  // Skills definition
  const skills = [
    { key: 'endurance', name: 'Resistência cardiovascular', desc: 'corrida, remo, bike' },
    { key: 'stamina', name: 'Stamina', desc: 'manter ritmo por tempo longo' },
    { key: 'forca', name: 'Força muscular', desc: 'levantar cargas máximas' },
    { key: 'flexibilidade', name: 'Flexibilidade', desc: 'mobilidade articular' },
    { key: 'potencia', name: 'Potência', desc: 'força máxima em mínimo tempo' },
    { key: 'velocidade', name: 'Velocidade', desc: 'ciclo rápido de movimentos' },
    { key: 'coordenacao', name: 'Coordenação', desc: 'combinar padrões de movimento' },
    { key: 'agilidade', name: 'Agilidade', desc: 'transição entre movimentos' },
    { key: 'equilibrio', name: 'Equilíbrio', desc: 'controle do centro de gravidade' },
    { key: 'precisao', name: 'Precisão', desc: 'controle de direção e intensidade' }
  ];

  const levelLabels = ['', 'Muito fraco', 'Fraco', 'Médio', 'Forte', 'Muito forte'];

  // Init skills sliders
  function initSkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = skills.map(s => `
      <div class="slider-group">
        <div class="slider-label">
          <span>${s.name} <small style="color:var(--cinza-escuro)">(${s.desc})</small></span>
          <span class="val" id="val_${s.key}">3 — Médio</span>
        </div>
        <input type="range" min="1" max="5" value="3" id="skill_${s.key}" data-key="${s.key}">
      </div>
    `).join('');

    container.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', function() {
        const val = parseInt(this.value);
        const key = this.dataset.key;
        data.skills[key] = val;
        document.getElementById(`val_${key}`).textContent = `${val} — ${levelLabels[val]}`;
      });
      // Set default
      data.skills[slider.dataset.key] = 3;
    });
  }

  // Single select handlers
  function initSingleSelect(containerId, dataKey) {
    const container = document.getElementById(containerId);
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

    if (!dateVal) {
      preview.classList.remove('show');
      return;
    }

    const p = calcPeriodizacao(dateVal);
    if (!p) {
      preview.classList.remove('show');
      return;
    }

    const total = p.semanas;
    bar.innerHTML = `
      <div class="base" style="flex:${p.base}">${p.base}sem</div>
      <div class="forca" style="flex:${p.forca}">${p.forca}sem</div>
      <div class="precomp" style="flex:${p.precomp}">${p.precomp}sem</div>
      <div class="taper" style="flex:${p.taper}">${p.taper}sem</div>
    `;
    preview.classList.add('show');
  }

  // Summary rendering
  function renderSummary() {
    const container = document.getElementById('summaryContent');

    const skillsHtml = Object.entries(data.skills)
      .map(([k, v]) => {
        const s = skills.find(s => s.key === k);
        const color = v <= 2 ? 'var(--laranja)' : v >= 4 ? 'var(--verde)' : 'var(--cinza)';
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;">
          <span style="font-size:0.85rem;color:var(--cinza)">${s ? s.name : k}</span>
          <span style="font-size:0.85rem;font-weight:600;color:${color}">${v}/5</span>
        </div>`;
      }).join('');

    container.innerHTML = `
      <div class="summary-card">
        <h4>Identificação</h4>
        <p><strong style="color:var(--branco)">${data.nome || 'Não informado'}</strong></p>
        <p>Categoria: ${catLabels[data.categoria] || 'Não calculada'}</p>
        <p>Tempo de treino: ${data.tempo_treino || 'Não informado'}</p>
      </div>

      <div class="summary-card">
        <h4>Nível e Categoria</h4>
        <p>Nível: <span style="color:var(--dourado)">${data.nivel || 'Não informado'}</span></p>
        <p>Competição: ${data.categoria_competicao || 'Não informada'}</p>
      </div>

      <div class="summary-card">
        <h4>Objetivos</h4>
        <div class="pills">
          ${(data.objetivos || []).map(o => `<span class="pill green">${o}</span>`).join('')}
        </div>
        <p style="margin-top:8px">Frequência: <span style="color:var(--dourado)">${data.frequencia || '-'}</span></p>
      </div>

      <div class="summary-card">
        <h4>Habilidades Físicas</h4>
        ${skillsHtml}
      </div>

      <div class="summary-card">
        <h4>Movimentos para Desenvolver</h4>
        <div class="pills">
          ${(data.movimentos_desenvolver || []).map(m => `<span class="pill blue">${m}</span>`).join('')}
        </div>
      </div>

      <div class="summary-card">
        <h4>Últimas Semanas</h4>
        <p>Estado: ${data.ultima_semana || 'Não informado'} | Volume: ${data.volume || '-'}</p>
        ${data.contexto ? `<p style="margin-top:6px;font-style:italic">"${data.contexto}"</p>` : ''}
      </div>

      <div class="summary-card">
        <h4>Limitações</h4>
        <div class="pills">
          ${(data.lesoes || []).map(l => `<span class="pill pink">${l}</span>`).join('')}
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

    // Collect data from current step before leaving
    collectStepData(currentStep);

    currentStep = step;

    // Update progress bar
    document.querySelectorAll('.progress-bar .step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 < currentStep) el.classList.add('done');
      if (i + 1 === currentStep) el.classList.add('active');
    });

    // Show/hide steps
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');

    // Show/hide nav buttons
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

    const hideLoading = showLoading();
    const btnGerar = document.getElementById('btnGerar');
    btnGerar.disabled = true;

    try {
      // Cadastrar atleta
      const cadastro = await API.cadastrarAtleta(data);
      const atletaId = cadastro.atleta_id;

      // Salvar no localStorage
      localStorage.setItem('atleta_id', atletaId);
      localStorage.setItem('atleta_nome', data.nome);

      // Gerar programação
      const prog = await API.gerarProgramacao(atletaId);

      // Salvar programação no localStorage como backup
      localStorage.setItem('programacao_id', prog.programacao_id);
      localStorage.setItem('programacao_data', JSON.stringify(prog.semana));

      // Redirecionar
      window.location.href = 'programacao.html';
    } catch (err) {
      hideLoading();
      btnGerar.disabled = false;
      alert(err.message || 'Ocorreu um erro. Tente novamente.');
    }
  }

  // Init
  function init() {
    initSkills();

    // Single selects
    initSingleSelect('tempoTreino', 'tempo_treino');
    initSingleSelect('nivel', 'nivel');
    initSingleSelect('categoriaComp', 'categoria_competicao');
    initSingleSelect('frequencia', 'frequencia');
    initSingleSelect('ultimaSemana', 'ultima_semana');
    initSingleSelect('volume', 'volume');
    initSingleSelect('compCat', 'competicao_categoria');

    // Multi selects
    initMultiSelect('objetivos', 'objetivos', 'objCount');
    initMultiSelect('movLPO', 'movimentos_desenvolver', 'movCount');
    initMultiSelect('movGin', 'movimentos_desenvolver', 'movCount');
    initMultiSelect('movAneis', 'movimentos_desenvolver', 'movCount');
    initMultiSelect('movPlio', 'movimentos_desenvolver', 'movCount');
    initMultiSelect('movCardio', 'movimentos_desenvolver', 'movCount');
    initMultiSelect('lesoes', 'lesoes', null);

    // Fix multi-select for movements (collect from all groups)
    const movGroups = ['movLPO', 'movGin', 'movAneis', 'movPlio', 'movCardio'];
    movGroups.forEach(gid => {
      document.getElementById(gid).querySelectorAll('.mp').forEach(mp => {
        mp.removeEventListener('click', mp._handler);
        mp._handler = function() {
          // Recollect all selected movements
          const all = [];
          movGroups.forEach(g => {
            document.getElementById(g).querySelectorAll('.mp.sel').forEach(s => {
              all.push(s.dataset.val);
            });
          });
          data.movimentos_desenvolver = all;
          document.getElementById('movCount').textContent =
            all.length ? `${all.length} movimento${all.length > 1 ? 's' : ''} selecionado${all.length > 1 ? 's' : ''}` : '';
        };
        mp.addEventListener('click', mp._handler);
      });
    });

    // Birth date → category
    document.getElementById('dataNascimento').addEventListener('change', function() {
      const cat = calcCategoria(this.value);
      const el = document.getElementById('categoriaAuto');
      if (cat) {
        el.textContent = `Categoria: ${catLabels[cat]}`;
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

    // Competition date → periodization
    document.getElementById('compData').addEventListener('change', renderPeriodizacao);

    // Nav buttons
    document.getElementById('btnNext').addEventListener('click', () => goToStep(currentStep + 1));
    document.getElementById('btnPrev').addEventListener('click', () => goToStep(currentStep - 1));

    // Generate button
    document.getElementById('btnGerar').addEventListener('click', gerarProgramacao);

    // Init first step
    goToStep(1);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
