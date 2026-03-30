# Atletas do Reino — Plataforma de Treino Funcional

**"Do Reino para a Glória."**

Plataforma web para geração de treinos funcionais personalizados com inteligência artificial. O atleta preenche um onboarding completo e recebe uma semana de treinos 100% adaptada ao seu perfil, nível, objetivos e limitações.

---

## Funcionalidades

- Onboarding em 8 passos com perfil completo do atleta
- Geração de treinos personalizados por IA (Claude Sonnet)
- Escalas automáticas: Iniciante / Avançado / RX
- Periodização automática para competições
- Registro de resultados diários
- Interface mobile-first

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuito)
- Chave da API [Anthropic](https://console.anthropic.com)

---

## Instalação

```bash
# Clone ou baixe o projeto
cd atletas-do-reino

# Instale as dependências
npm install

# Copie o arquivo de ambiente
cp .env.example .env
```

---

## Configuração do .env

Edite o arquivo `.env` com suas credenciais:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...
PORT=3000
```

### Como obter a chave da API Anthropic

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta ou faça login
3. Vá em **API Keys** > **Create Key**
4. Copie a chave gerada

### Como configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No painel, vá em **Settings** > **API**
3. Copie a **URL** e a **anon/public key**

---

## Criar as Tabelas no Supabase

No painel do Supabase, vá em **SQL Editor** e execute:

```sql
-- Atletas
CREATE TABLE atletas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  categoria TEXT,
  tempo_treino TEXT,
  nivel TEXT,
  categoria_competicao TEXT,
  objetivos TEXT[],
  frequencia TEXT,
  skills JSONB,
  movimentos_desenvolver TEXT[],
  lesoes TEXT[],
  ultima_semana TEXT,
  volume TEXT,
  contexto TEXT,
  tem_competicao BOOLEAN DEFAULT false,
  competicao_nome TEXT,
  competicao_data DATE,
  competicao_categoria TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  email TEXT UNIQUE
);

-- Programações geradas
CREATE TABLE programacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  atleta_id UUID REFERENCES atletas(id),
  semana_numero INTEGER,
  fase TEXT,
  conteudo JSONB,
  gerado_em TIMESTAMP DEFAULT NOW()
);

-- Resultados registrados
CREATE TABLE resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  atleta_id UUID REFERENCES atletas(id),
  programacao_id UUID REFERENCES programacoes(id),
  data_treino DATE,
  dia_semana TEXT,
  resultado TEXT,
  observacoes TEXT,
  registrado_em TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) - desabilitado para MVP
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE programacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para o MVP (sem autenticação)
CREATE POLICY "public_atletas" ON atletas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_programacoes" ON programacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_resultados" ON resultados FOR ALL USING (true) WITH CHECK (true);
```

---

## Rodar Localmente

```bash
npm start
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy no Vercel

1. Instale o Vercel CLI: `npm i -g vercel`
2. Na pasta do projeto, rode: `vercel`
3. Configure as variáveis de ambiente no painel do Vercel:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

Ou conecte o repositório Git diretamente pelo [vercel.com](https://vercel.com).

---

## Estrutura do Projeto

```
atletas-do-reino/
├── package.json
├── server.js            ← API backend (Express)
├── vercel.json          ← Config de deploy
├── .env.example
├── .gitignore
├── README.md
└── public/
    ├── index.html       ← Onboarding (8 passos)
    ├── programacao.html ← Semana de treinos
    ├── css/
    │   └── style.css
    └── js/
        ├── onboarding.js
        ├── programacao.js
        └── api.js       ← Integração frontend/backend
```

---

## Stack Técnica

- **Frontend:** HTML + CSS + JavaScript vanilla
- **Backend:** Node.js + Express
- **Banco de dados:** Supabase (PostgreSQL)
- **IA:** API Anthropic (Claude Sonnet)
- **Deploy:** Vercel

---

## Licença

Projeto privado — Atletas do Reino. Todos os direitos reservados.
