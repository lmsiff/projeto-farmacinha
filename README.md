# 🏥 Farmacinha — Sistema de Farmácia Comunitária

Sistema completo para gerenciamento de farmácias comunitárias, com controle de pacientes, medicamentos, receitas, fila de entrega e relatórios em PDF.

---

## 🖥️ Tecnologias

**Backend**
- Node.js + TypeScript
- Express
- Prisma ORM
- MySQL
- JWT (autenticação)

**Frontend**
- HTML, CSS e JavaScript puro
- html2canvas + jsPDF (geração de relatórios)

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) — versão 18 ou superior
- [MySQL](https://dev.mysql.com/downloads/) — versão 8 ou superior
- [Git](https://git-scm.com/)
- [VS Code + extensão Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) *(para o frontend)*

---

## 🚀 Passo a passo para rodar

### 1. Clone ou extraia o projeto

Se veio por ZIP, extraia e abra a pasta. A estrutura será:

```
farmacinha/
├── backend/
└── frontend/
```

### 2. Configure o banco de dados MySQL

Abra o MySQL e crie o banco:

```sql
CREATE DATABASE farmacia_db;
```

> Você pode usar o MySQL Workbench, DBeaver, ou o próprio terminal do MySQL.

### 3. Configure as variáveis de ambiente

Dentro da pasta `backend/`, edite o arquivo `.env`:

```env
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/farmacia_db"
JWT_SECRET="qualquer_chave_secreta_aqui"
JWT_EXPIRES_IN="8h"
PORT=3000
```

> ⚠️ Troque `SUA_SENHA` pela senha do seu MySQL. Se não tiver senha, deixe assim:
> `mysql://root:@localhost:3306/farmacia_db`

### 4. Instale as dependências do backend

```bash
cd backend
npm install
```

### 5. Configure o banco e popule com dados iniciais

```bash
npm run setup
```

Esse comando vai:
- Criar todas as tabelas automaticamente
- Criar o usuário **admin** padrão

> Credenciais do admin criado:
> - **Usuário:** `admin`
> - **Senha:** `admin`

### 6. Inicie o servidor backend

```bash
npm run dev
```

Se tudo estiver certo, você verá:

```
🚀 Servidor rodando em http://localhost:3000
```

### 7. Abra o frontend

Na pasta `frontend/`, clique com o botão direito em `index.html` e selecione **"Open with Live Server"** no VS Code.

Ou acesse diretamente pelo navegador abrindo o arquivo `frontend/index.html`.

---

## 🔑 Acesso ao sistema

| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `admin` |

> O admin tem acesso total ao sistema, incluindo a aba de Voluntários.

---

## ✨ Funcionalidades

| Módulo | O que faz |
|--------|-----------|
| 👥 **Pacientes** | Cadastro, edição, exclusão e busca por nome, CPF e endereço |
| 💊 **Medicamentos** | Controle de estoque com alertas de quantidade baixa |
| 📋 **Receitas** | Emissão com validação de estoque em tempo real |
| 🕐 **Fila** | Gerenciamento de entrega com drag-and-drop |
| 📊 **Relatórios** | Dashboard com gráficos + exportação em PDF |
| 🙋 **Voluntários** | Gerenciamento de usuários *(somente admin)* |

---

## ⚙️ Scripts disponíveis

Dentro da pasta `backend/`:

```bash
npm run dev           # Inicia em modo desenvolvimento (com hot reload)
npm run build         # Compila TypeScript para JavaScript
npm start             # Inicia em modo produção
npm run setup         # Cria o banco, tabelas e dados iniciais
npm run seed          # Popula apenas os dados iniciais (admin)
npx prisma studio     # Abre interface visual do banco no browser
npx prisma migrate dev # Roda novas migrations após mudanças no schema
```

---

## 🗂️ Estrutura do projeto

```
farmacinha/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modelo do banco de dados
│   │   ├── seed.ts             # Dados iniciais (admin)
│   │   └── createDb.ts         # Script de criação do banco
│   ├── src/
│   │   ├── config/             # Configuração do Prisma
│   │   ├── controllers/        # Recebe e responde às requisições
│   │   ├── middlewares/        # Autenticação JWT
│   │   ├── repositories/       # Acesso ao banco de dados
│   │   ├── routes/             # Definição das rotas da API
│   │   ├── services/           # Regras de negócio
│   │   └── types/              # Tipos TypeScript
│   ├── .env                    # Variáveis de ambiente
│   └── package.json
│
└── frontend/
    ├── assets/
    │   ├── js/script.js        # Toda a lógica do frontend
    │   └── styles/             # CSS das páginas
    ├── index.html              # Página de login
    └── dashboard.html          # Sistema principal
```

---

## 🛡️ Permissões por perfil

| Recurso | Voluntário | Admin |
|---------|:----------:|:-----:|
| Pacientes | ✅ | ✅ |
| Medicamentos | ✅ | ✅ |
| Receitas | ✅ | ✅ |
| Fila de Entrega | ✅ | ✅ |
| Relatórios | ✅ | ✅ |
| Voluntários | ❌ | ✅ |

---

## ❗ Problemas comuns

**Erro de conexão com o banco**
> Verifique se o MySQL está rodando e se a senha no `.env` está correta.

**Porta 3000 em uso**
> Mude o `PORT` no `.env` para outro valor, ex: `3001`. Atualize também o `const API` no `frontend/assets/js/script.js`.

**npm run setup falha**
> Tente rodar os passos separadamente:
> ```bash
> npx ts-node prisma/createDb.ts
> npx prisma db push
> npm run seed
> ```

**Frontend não conecta na API**
> Confirme que o backend está rodando em `http://localhost:3000` e que não há bloqueio de CORS.

---

## 📄 Licença

Projeto desenvolvido para uso comunitário. Livre para uso e modificação.
