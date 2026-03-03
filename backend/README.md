# 🏥 Farmácia Comunitária — Backend

Backend RESTful com **TypeScript + Express + Prisma + MySQL** para o sistema de Farmácia Comunitária.

---

## 📁 Estrutura do Projeto

```
src/
├── config/
│   └── prisma.ts             # Instância do PrismaClient
├── controllers/
│   ├── auth.controller.ts
│   ├── paciente.controller.ts
│   ├── medicamento.controller.ts
│   ├── receita.controller.ts
│   ├── voluntario.controller.ts
│   ├── fila.controller.ts
│   └── relatorio.controller.ts
├── middlewares/
│   └── auth.middleware.ts    # JWT authenticate + requireAdmin
├── repositories/
│   ├── auth.repository.ts
│   ├── paciente.repository.ts
│   ├── medicamento.repository.ts
│   ├── receita.repository.ts
│   ├── voluntario.repository.ts
│   ├── fila.repository.ts
│   └── relatorio.repository.ts
├── routes/
│   ├── auth.routes.ts
│   ├── paciente.routes.ts
│   ├── medicamento.routes.ts
│   ├── receita.routes.ts
│   ├── voluntario.routes.ts  # 🔒 Admin only
│   ├── fila.routes.ts
│   └── relatorio.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── paciente.service.ts
│   ├── medicamento.service.ts
│   ├── receita.service.ts
│   ├── voluntario.service.ts
│   ├── fila.service.ts
│   └── relatorio.service.ts
├── types/
│   └── index.ts              # JwtPayload, AuthRequest
├── app.ts                    # Express app setup
└── server.ts                 # Entry point
prisma/
├── schema.prisma
└── seed.ts
```

---

## 🚀 Como rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
DATABASE_URL="mysql://root:sua_senha@localhost:3306/farmacia_db"
JWT_SECRET="uma_chave_secreta_longa_e_aleatoria"
JWT_EXPIRES_IN="8h"
PORT=3000
```

### 3. Criar banco e rodar migrations

```bash
npx prisma migrate dev --name init
```

### 4. Popular o banco com o admin

```bash
npx ts-node prisma/seed.ts
```

Isso cria o usuário admin com:
- **Nome:** `admin`
- **Senha:** `admin`

### 5. Iniciar em desenvolvimento

```bash
npm run dev
```

---

## 🔐 Autenticação JWT

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "nome": "admin",
  "senha": "admin"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "nome": "admin",
    "isAdmin": true
  }
}
```

Use o token em todas as requisições autenticadas:

```http
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |

### Pacientes (🔒 Autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pacientes` | Listar todos |
| GET | `/api/pacientes/:id` | Buscar por ID |
| POST | `/api/pacientes` | Criar |
| PUT | `/api/pacientes/:id` | Atualizar |
| DELETE | `/api/pacientes/:id` | Excluir |

### Medicamentos (🔒 Autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/medicamentos` | Listar todos |
| GET | `/api/medicamentos/:id` | Buscar por ID |
| POST | `/api/medicamentos` | Criar |
| PUT | `/api/medicamentos/:id` | Atualizar |
| DELETE | `/api/medicamentos/:id` | Excluir |

### Receitas (🔒 Autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/receitas` | Listar todas |
| GET | `/api/receitas/:id` | Buscar por ID |
| POST | `/api/receitas` | Criar |
| PUT | `/api/receitas/:id` | Atualizar |
| DELETE | `/api/receitas/:id` | Excluir |

**Exemplo de criação de receita:**
```json
{
  "data": "2026-02-28",
  "medico": "Dr. João Souza",
  "pacienteId": 1,
  "voluntarioId": 2,
  "itens": [
    { "medicamentoId": 1, "quantidade": 30 },
    { "medicamentoId": 2, "quantidade": 60 }
  ]
}
```

### Voluntários (🔒🔒 Apenas Admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/voluntarios` | Listar todos |
| GET | `/api/voluntarios/:id` | Buscar por ID |
| POST | `/api/voluntarios` | Criar |
| PUT | `/api/voluntarios/:id` | Atualizar |
| DELETE | `/api/voluntarios/:id` | Excluir |

### Fila (🔒 Autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/fila` | Listar fila atual |
| POST | `/api/fila` | Adicionar receita à fila |
| PATCH | `/api/fila/:id/entregar` | Marcar como entregue |
| PATCH | `/api/fila/reordenar` | Reordenar fila |
| DELETE | `/api/fila/:id` | Remover da fila |

### Relatórios (🔒 Autenticado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/relatorios/dashboard` | Dados do painel |

---

## 🛡️ Controle de Acesso

| Recurso | Voluntário | Admin |
|---------|-----------|-------|
| Pacientes | ✅ | ✅ |
| Medicamentos | ✅ | ✅ |
| Receitas | ✅ | ✅ |
| Fila | ✅ | ✅ |
| Relatórios | ✅ | ✅ |
| **Voluntários** | ❌ | ✅ |

---

## 🗄️ Scripts úteis

```bash
npm run dev          # Dev com hot reload
npm run build        # Compilar TypeScript
npm start            # Iniciar produção
npx prisma studio    # Interface visual do banco
npx prisma migrate dev  # Rodar migrations
```
