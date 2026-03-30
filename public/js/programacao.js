// Programação Controller
(function() {
  let semanaData = null;
  let currentDayIndex = 0;
  let currentLevel = 'avancado';
  let weekViewActive = false;
  let programacaoId = null;
  let atletaId = null;

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const diasAbrev = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  function init() {
    atletaId = localStorage.getItem('atletaId') || localStorage.getItem('atleta_id');
    const atletaNome = localStorage.getItem('atletaNome') || localStorage.getItem('atleta_nome');

    if (!atletaId) {
      window.location.href = '/login.html';
      return;
    }

    document.getElementById('atletaNome').textContent = atletaNome || '';

    // Try localStorage first, then API
    const cached = localStorage.getItem('programacao_data');
    if (cached) {
      try {
        semanaData = JSON.parse(cached);
        programacaoId = localStorage.getItem('programacao_id');
        renderAll();
      } catch(e) {
        loadFromAPI();
      }
    } else {
      loadFromAPI();
    }

    // Level selector
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentLevel = this.dataset.level;
        renderDayDetail();
      });
    });

    // View toggle
    document.getElementById('viewToggle').addEventListener('click', toggleView);

    // Day nav
    document.getElementById('prevDay').addEventListener('click', () => navigateDay(-1));
    document.getElementById('nextDay').addEventListener('click', () => navigateDay(1));

    // Modal
    document.getElementById('cancelResult').addEventListener('click', closeModal);
    document.getElementById('saveResult').addEventListener('click', saveResult);
  }

  async function loadFromAPI() {
    try {
      const prog = await API.getProgramacaoAtual(atletaId);
      semanaData = prog.conteudo;
      programacaoId = prog.id;
      localStorage.setItem('programacao_data', JSON.stringify(semanaData));
      localStorage.setItem('programacao_id', programacaoId);
      renderAll();
    } catch(e) {
      document.getElementById('dayDetail').innerHTML = `
        <div class="rest-card">
          <h3>Nenhuma programação encontrada</h3>
          <p>Volte ao onboarding para gerar sua primeira semana.</p>
          <div style="margin-top:16px">
            <a href="index.html" class="btn btn-primary" style="text-decoration:none">Ir para Onboarding</a>
          </div>
        </div>`;
    }
  }

  function getDias() {
    if (!semanaData) return [];
    return semanaData.semana ? semanaData.semana.dias : (semanaData.dias || []);
  }

  function getFase() {
    if (!semanaData) return {};
    return semanaData.semana || semanaData;
  }

  function renderAll() {
    const fase = getFase();
    const dias = getDias();
    if (!dias.length) return;

    // Header
    const faseText = fase.fase || 'Base';
    const semNum = fase.numero || 1;
    document.getElementById('faseBadge').textContent = `FASE DE ${faseText.toUpperCase()} · SEMANA ${semNum}`;
    document.getElementById('semanaTitulo').textContent = fase.tema || 'Semana de Treinos';

    // Find today
    const hoje = new Date().getDay(); // 0=Sun, 1=Mon
    const todayIdx = hoje === 0 ? 6 : hoje - 1;
    currentDayIndex = Math.min(todayIdx, dias.length - 1);

    renderDaysNav();
    renderWeekView();
    renderDayDetail();
  }

  function renderDaysNav() {
    const dias = getDias();
    const nav = document.getElementById('daysNav');
    const hoje = new Date().getDay();
    const todayIdx = hoje === 0 ? 6 : hoje - 1;

    nav.innerHTML = dias.map((dia, i) => {
      const isToday = i === todayIdx;
      const isRest = dia.tipo === 'descanso';
      const isActive = i === currentDayIndex;
      let cls = 'day-btn';
      if (isActive) cls += ' active';
      else if (isToday) cls += ' today';
      if (isRest) cls += ' rest';

      return `<button class="${cls}" data-idx="${i}">
        <span>${diasAbrev[i] || dia.dia_semana?.substring(0, 3).toUpperCase()}</span>
        <span class="num">${i + 1}</span>
      </button>`;
    }).join('');

    nav.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        currentDayIndex = parseInt(this.dataset.idx);
        if (weekViewActive) toggleView();
        renderDaysNav();
        renderDayDetail();
      });
    });
  }

  function renderWeekView() {
    const dias = getDias();
    const container = document.getElementById('weekView');
    const hoje = new Date().getDay();
    const todayIdx = hoje === 0 ? 6 : hoje - 1;

    container.innerHTML = dias.map((dia, i) => {
      const isToday = i === todayIdx;
      const isRest = dia.tipo === 'descanso';
      let dotCls = 'status-dot';
      if (isToday) dotCls += ' today';
      else if (isRest) dotCls += ' rest';

      const mods = (dia.modalidade || []).map(m =>
        `<span class="mod-pill ${m.toLowerCase()}" style="font-size:0.6rem;padding:2px 6px">${m}</span>`
      ).join('');

      return `<div class="week-card" data-idx="${i}">
        <div class="day-label">
          <div>${diasAbrev[i]}</div>
          <div class="d-num">${i + 1}</div>
        </div>
        <div class="day-info">
          <div class="title">${dia.titulo || dia.dia_semana}</div>
          <div class="mods">${mods}</div>
        </div>
        <div class="${dotCls}"></div>
      </div>`;
    }).join('');

    container.querySelectorAll('.week-card').forEach(card => {
      card.addEventListener('click', function() {
        currentDayIndex = parseInt(this.dataset.idx);
        toggleView();
        renderDaysNav();
        renderDayDetail();
      });
    });
  }

  function renderDayDetail() {
    const dias = getDias();
    if (!dias.length) return;

    const dia = dias[currentDayIndex];
    const container = document.getElementById('dayDetail');

    if (dia.tipo === 'descanso') {
      container.innerHTML = `
        <div class="rest-card">
          <h3>${dia.titulo || 'Descanso Ativo'}</h3>
          <p>${dia.descricao || 'Mobilidade leve, foam roller, caminhada.'}</p>
        </div>`;
      updateNavButtons();
      return;
    }

    let html = '';

    // Day header
    const mods = (dia.modalidade || []).map(m => {
      const cls = m.toLowerCase().replace(/\s/g, '');
      return `<span class="mod-pill ${cls}">${m}</span>`;
    }).join('');

    html += `<div class="day-header">
      <h3>${dia.titulo || dia.dia_semana}</h3>
      <div class="foco">${dia.foco || ''}</div>
      <div class="modalidades">${mods}</div>
    </div>`;

    // Aquecimento
    if (dia.aquecimento) {
      html += renderBlock('aquecimento', dia.aquecimento.tag || 'AQUECIMENTO', dia.aquecimento);
    }

    // Força
    if (dia.forca) {
      html += renderBlock('forca', dia.forca.tag || 'FORÇA', dia.forca);
    }

    // WOD
    if (dia.wod) {
      html += renderBlock('wod', dia.wod.tag || 'WOD', dia.wod);
    }

    // Acessórios
    if (dia.acessorios) {
      html += renderBlock('acessorios', dia.acessorios.tag || 'ACESSÓRIOS', dia.acessorios);
    }

    // Deficiency callout
    if (dia.deficiencia_foco) {
      html += `<div class="deficiency-callout">
        <h4>${dia.deficiencia_foco.titulo || 'Foco do Dia'}</h4>
        <p>${dia.deficiencia_foco.texto || ''}</p>
      </div>`;
    }

    // Botões de ação (hoje ou passado)
    const hoje = new Date().getDay();
    const todayIdx = hoje === 0 ? 6 : hoje - 1;
    if (currentDayIndex <= todayIdx) {
      // Coletar movimentos do dia para o check-in
      const movsDia = [];
      [dia.aquecimento, dia.forca, dia.wod, dia.acessorios].forEach(bloco => {
        if (bloco && bloco.exercicios) {
          bloco.exercicios.forEach(ex => { if (ex.nome) movsDia.push(ex.nome); });
        }
      });
      const movsEncoded = encodeURIComponent(JSON.stringify([...new Set(movsDia)]));
      const tituloEncoded = encodeURIComponent(dia.titulo || dia.dia_semana || 'Treino');
      const diaEncoded = encodeURIComponent(dia.dia_semana || diasSemana[currentDayIndex]);
      const progId = programacaoId || localStorage.getItem('programacaoId') || '';

      html += `<div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn-result" style="flex:1;background:var(--dourado);color:var(--azul);"
          onclick="window.location.href='/checkin.html?dia=${diaEncoded}&titulo=${tituloEncoded}&prog=${progId}&movs=${movsEncoded}'">
          ✓ Check-in do Treino
        </button>
        <button class="btn-result" style="flex:0 0 auto;background:var(--azul-claro);color:var(--cinza);border:1px solid rgba(160,186,214,0.15);"
          onclick="document.getElementById('resultModal').classList.add('show')">
          📝
        </button>
      </div>`;
    }

    container.innerHTML = html;
    updateNavButtons();
  }

  function renderBlock(type, tag, block) {
    const dur = block.duracao_min ? `<span class="dur-badge">${block.duracao_min} min</span>` : '';

    let exerciciosHtml = '';
    if (block.exercicios && block.exercicios.length) {
      exerciciosHtml = block.exercicios.map(ex => {
        let detail = '';
        if (ex.tem_escala) {
          const levelMap = {
            iniciante: ex.iniciante,
            avancado: ex.avancado,
            rx: ex.rx,
            scaled: ex.scaled
          };
          // Map current level to exercise scale
          let selected = levelMap[currentLevel];
          if (!selected && currentLevel === 'avancado') selected = ex.avancado || ex.scaled;
          if (!selected) selected = ex.detalhes || ex.rx || '';
          detail = selected;
        } else {
          detail = ex.detalhes || '';
        }

        const ytQuery = encodeURIComponent('como fazer ' + ex.nome + ' treino funcional');
        const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

        return `<div class="exercicio">
          <div class="nome">
            <span>${ex.nome}</span>
            <a href="${ytUrl}" target="_blank" rel="noopener" class="yt-btn" title="Ver vídeo no YouTube">▶</a>
          </div>
          <div class="detalhes">${detail}</div>
        </div>`;
      }).join('');
    }

    const formato = block.formato ? `<div class="formato">${block.formato}</div>` : '';
    const descFmt = block.descricao_formato ? `<div class="formato">${block.descricao_formato}</div>` : '';

    return `<div class="treino-card ${type}">
      <div class="card-tag">${tag} ${dur}</div>
      ${descFmt}${formato}
      ${exerciciosHtml}
    </div>`;
  }

  function updateNavButtons() {
    const dias = getDias();
    document.getElementById('prevDay').disabled = currentDayIndex <= 0;
    document.getElementById('nextDay').disabled = currentDayIndex >= dias.length - 1;
  }

  function navigateDay(dir) {
    const dias = getDias();
    const next = currentDayIndex + dir;
    if (next >= 0 && next < dias.length) {
      currentDayIndex = next;
      renderDaysNav();
      renderDayDetail();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function toggleView() {
    weekViewActive = !weekViewActive;
    document.getElementById('weekView').classList.toggle('show', weekViewActive);
    document.getElementById('dayDetail').classList.toggle('show', !weekViewActive);
    document.getElementById('dayNav').style.display = weekViewActive ? 'none' : '';
    document.getElementById('viewToggle').querySelector('span:last-child').textContent =
      weekViewActive ? 'Visão do dia' : 'Visão semanal';
  }

  function closeModal() {
    document.getElementById('resultModal').classList.remove('show');
    document.getElementById('resultText').value = '';
    document.getElementById('resultObs').value = '';
  }

  async function saveResult() {
    const resultado = document.getElementById('resultText').value.trim();
    const observacoes = document.getElementById('resultObs').value.trim();

    if (!resultado) {
      alert('Informe seu resultado.');
      return;
    }

    const dias = getDias();
    const dia = dias[currentDayIndex];

    try {
      await API.registrarResultado({
        atleta_id: atletaId,
        programacao_id: programacaoId,
        data_treino: new Date().toISOString().split('T')[0],
        dia_semana: dia.dia_semana || diasSemana[currentDayIndex],
        resultado,
        observacoes
      });

      closeModal();
      alert('Resultado registrado!');
    } catch(e) {
      alert(e.message || 'Erro ao salvar. Tente novamente.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
