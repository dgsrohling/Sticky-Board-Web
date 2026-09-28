# Sticky Board Web 📌

Aplicação web de **notas adesivas (post-its)** construída com **Flask + SQLite**.
Um quadro virtual onde você pode criar, editar, mover, redimensionar, colorir e
excluir notas — tudo salvo automaticamente no banco de dados.

![tecnologias](https://img.shields.io/badge/Flask-3-blue) ![tecnologias](https://img.shields.io/badge/SQLite-3-lightgrey) ![tecnologias](https://img.shields.io/badge/JS-vanilla-yellow)

## ✨ Funcionalidades

- **Criar nota** — botão “+ Nova nota” na barra superior
- **Edição inline** — clique no título ou conteúdo e digite; salvamento automático (debounce de 700 ms), sem botão “Salvar”
- **Arrastar** — segure e arraste a nota pelo quadro; posição persistida
- **Redimensionar** — arraste o canto inferior direito (mínimo 180×150 px)
- **Cores pastéis** — amarelo, azul, verde, rosa, laranja, roxo e cinza
- **Excluir** — botão × com confirmação, sem recarregar a página
- **Z-index automático** — a nota clicada vem para frente (ordem persistida)
- **Pesquisa em tempo real** — filtra por título e conteúdo no frontend
- **Organizar** — botão que dispõe as notas em grade e salva as posições
- **Modo claro/escuro** — preferência salva no `localStorage`
- **Responsivo** — funciona em desktop, notebook, tablet e celular

## 📋 Requisitos

- Python 3.9+
- pip
- Não há dependências de banco externo: o SQLite já vem com o Python.

## 🚀 Instalação

### Linux / macOS

```bash
# 1. Clone ou copie o projeto e entre na pasta
cd sticky-notes

# 2. Crie e ative o ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Execute
python run.py
```

### Windows (PowerShell/CMD)

```bat
cd sticky-notes

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt

python run.py
```

Acesse **http://127.0.0.1:5000** no navegador.

> 💡 O banco de dados `instance/notes.db` é **criado automaticamente** na
> primeira execução. Não é necessário nenhum comando de migração.

## 📁 Estrutura do projeto

```
sticky-notes/
├── app/
│   ├── __init__.py       # Fábrica da aplicação (create_app) + criação do banco
│   ├── models.py         # Modelo Note (SQLAlchemy)
│   ├── routes.py         # API REST (/api/notes) com validação
│   ├── templates/
│   │   └── index.html    # Página única (Jinja2)
│   └── static/
│       ├── css/
│       │   └── style.css # Estilo dos post-its + modo escuro
│       └── js/
│           └── app.js    # Drag&drop, debounce, fetch, pesquisa, grade
├── instance/
│   └── notes.db          # Banco SQLite (gerado automaticamente)
├── run.py                # Ponto de entrada: python run.py
├── requirements.txt
├── .gitignore
└── README.md
```

## 🔌 API REST

| Método | Rota                | Descrição                                  |
|--------|---------------------|--------------------------------------------|
| GET    | `/api/notes`        | Lista todas as notas (JSON)                |
| POST   | `/api/notes`        | Cria uma nota                              |
| PUT    | `/api/notes/<id>`   | Atualiza campos parciais de uma nota       |
| DELETE | `/api/notes/<id>`   | Remove a nota                              |

### Exemplos com curl

```bash
# Listar notas
curl http://127.0.0.1:5000/api/notes

# Criar nota
curl -X POST http://127.0.0.1:5000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Compras", "content": "leite, café, pão", "color": "green"}'

# Atualizar posição/tamanho
curl -X PUT http://127.0.0.1:5000/api/notes/1 \
  -H "Content-Type: application/json" \
  -d '{"position_x": 300, "position_y": 120, "width": 260, "height": 200}'

# Excluir
curl -X DELETE http://127.0.0.1:5000/api/notes/1
```

### Exemplo de resposta JSON

```json
{
  "id": 1,
  "title": "Nova nota",
  "content": "",
  "color": "yellow",
  "position_x": 40,
  "position_y": 40,
  "width": 240,
  "height": 220,
  "z_index": 1,
  "created_at": "2026-09-25T12:00:00+00:00",
  "updated_at": "2026-09-25T12:00:00+00:00"
}
```

## 🗃️ Modelo de dados

Tabela `notes` (SQLite via SQLAlchemy):

| Campo       | Tipo     | Observação                    |
|-------------|----------|-------------------------------|
| id          | INTEGER  | PK autoincrement              |
| title       | VARCHAR  | máx. 150 caracteres           |
| content     | TEXT     | máx. 10.000 caracteres        |
| color       | VARCHAR  | um de 7 tons pastéis          |
| position_x  | INTEGER  | px                            |
| position_y  | INTEGER  | px                            |
| width       | INTEGER  | 180–1000 px                   |
| height      | INTEGER  | 150–1000 px                   |
| z_index     | INTEGER  | ordem de sobreposição         |
| created_at  | DATETIME | UTC, automático               |
| updated_at  | DATETIME | UTC, automático               |

## 🔒 Segurança aplicada

- ORM (SQLAlchemy) → sem SQL Injection
- Validação/clamp de todos os campos recebidos na API
- `escapeHtml()` no frontend ao renderizar conteúdo do banco
- Limite de tamanho de título (150) e conteúdo (10.000)
- Sem `eval()`; JavaScript puro

## 🛣️ Evoluções futuras (arquitetura já preparada)

- Usuários e autenticação (adicionar blueprint `auth` + FK `user_id` em `Note`)
- Múltiplos quadros (modelo `Board` + FK `board_id`)
- Docker (basta um `Dockerfile` expondo a porta 5000 com gunicorn)
- PostgreSQL (trocar `DATABASE_URL` na env var)
- WebSocket/sincronização em tempo real, etiquetas, anexos, exportação etc.

## Créditos

Desenvolido por Dionisio Rohling