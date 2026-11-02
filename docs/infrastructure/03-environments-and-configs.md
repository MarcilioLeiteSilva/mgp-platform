# 03. Ambientes, Configurações e Variáveis de Ambiente

## 1. Segregação de Ambientes

O ciclo de vida de software da MGP opera com três ambientes estritamente isolados:

| Ambiente | Propósito | Infraestrutura | Banco de Dados | Domínio Base |
| :--- | :--- | :--- | :--- | :--- |
| **Development (Dev)** | Desenvolvimento local do desenvolvedor | Máquina local com Docker Compose | PostgreSQL e Redis em containers locais | `localhost` |
| **Staging (Homologação)**| Testes integrados, auditorias técnicas de fases e validação de SDK | EasyPanel em ambiente isolado (VPS) | Banco de testes dedicado (`mgp_staging_db`) | `staging-app.mgp.com.br` |
| **Production (Prod)** | Operação real com tráfego e monetização | EasyPanel Projeto Produção (VPS) | Banco de produção com replicação e backups | `app.mgp.com.br` |

> [!WARNING]
> Nunca compartilhe credenciais, chaves de criptografia JWT ou bancos de dados entre os ambientes de Homologação e Produção.

---

## 2. Matriz Completa de Variáveis de Ambiente

As configurações de cada ambiente são centralizadas em arquivos de modelo dedicados:
* **Desenvolvimento Local:** [`infrastructure/env/.env.development.example`](file:///f:/mobile_growth/infrastructure/env/.env.development.example)
* **Homologação:** [`infrastructure/env/.env.staging.example`](file:///f:/mobile_growth/infrastructure/env/.env.staging.example)
* **Produção:** [`infrastructure/env/.env.production.example`](file:///f:/mobile_growth/infrastructure/env/.env.production.example)

### Sumário dos Grupos de Variáveis:
1. **Infraestrutura e Portas:** `NODE_ENV`, `PORT_API`, `PORT_ADSERVER`, `PORT_WEB`, `PORT_ADMIN`.
2. **URLs e Roteamento:** `APP_URL`, `API_URL`, `ADSERVER_URL`, `ADMIN_URL`, `CDN_URL`.
3. **Persistência Transacional:** `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
4. **Cache & Filas:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL`.
5. **Analytics:** `CLICKHOUSE_HOST`, `CLICKHOUSE_DB`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`.
6. **Object Storage:** `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_CREATIVES`.
7. **Segurança Criptográfica:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AD_TOKEN_SIGNING_SECRET`.

---

## 3. Validação Fail-Fast de Configurações (Zod Schema)

Para evitar que qualquer aplicação suba com variáveis ausentes ou com formato corrompido, o pacote `@mgp/config` (criado na Fase 03) valida o ambiente no momento do boot:

```typescript
// Exemplo da regra normativa de validação
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  AD_TOKEN_SIGNING_SECRET: z.string().min(32, 'AD_TOKEN_SIGNING_SECRET deve ter no mínimo 32 caracteres'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    console.error('Configuração de ambiente inválida:', parsed.error.format());
    process.exit(1); // Fail-fast imediato
  }
  return parsed.data;
}
```

---

## 4. Geração de Segredos de Alta Entropia

Para ambientes de Staging e Produção, nunca utilize senhas simples. Gere chaves criptográficas de 256 bits via OpenSSL:

```bash
# Gerar segredo para JWT_ACCESS_SECRET
openssl rand -hex 32

# Gerar segredo para JWT_REFRESH_SECRET
openssl rand -hex 32

# Gerar segredo para AD_TOKEN_SIGNING_SECRET
openssl rand -hex 32
```

