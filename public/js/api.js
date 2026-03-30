// API Integration Layer
const API_BASE = window.location.origin;

const API = {
  async cadastrarAtleta(dados) {
    const res = await fetch(`${API_BASE}/api/atleta/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || 'Erro ao cadastrar atleta.');
    }
    return res.json();
  },

  async gerarProgramacao(atleta_id) {
    const res = await fetch(`${API_BASE}/api/programacao/gerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atleta_id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || 'Erro ao gerar programação.');
    }
    return res.json();
  },

  async getProgramacaoAtual(atleta_id) {
    const res = await fetch(`${API_BASE}/api/programacao/${atleta_id}/atual`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || 'Nenhuma programação encontrada.');
    }
    return res.json();
  },

  async registrarResultado(dados) {
    const res = await fetch(`${API_BASE}/api/resultado/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || 'Erro ao registrar resultado.');
    }
    return res.json();
  },

  async getResultados(atleta_id) {
    const res = await fetch(`${API_BASE}/api/atleta/${atleta_id}/resultados`);
    if (!res.ok) return [];
    return res.json();
  }
};
