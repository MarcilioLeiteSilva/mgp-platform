# 08. Padrão de Logs, Auditoria e Observabilidade

## 1. Padrão de Logs Estruturados

Todas as aplicações do ecossistema MGP emitem logs exclusivamente em formato **JSON Estruturado** utilizando a biblioteca **Pino**, garantindo alta velocidade de I/O e compatibilidade com agregadores (Loki, Datadog ou Elastic).

### 1.1. Campos Obrigatórios de Todo Log
```json
{
  "level": "info",
  "time": "2026-11-01T20:26:00.150Z",
  "pid": 12840,
  "hostname": "mgp-prod-api-01",
  "service": "mgp-api",
  "traceId": "c4d36e78-831e-4501-9a74-984bbcd10023",
  "tenantId": "org_7f99120a",
  "userId": "usr_9918234a",
  "context": "CampaignService",
  "msg": "Campanha criada com sucesso",
  "campaignId": "cmp_847120a1"
}
```

### 1.2. Níveis de Log (Log Levels)
* `error`: Falhas não tratadas, exceções de banco, indisponibilidade de serviços externos e anomalias de segurança.
* `warn`: Degradação de performance, respostas no-fill atípicas, retentativas em filas BullMQ.
* `info`: Eventos significativos de negócio (login, criação de campanha, processamento de lote financeiro).
* `debug`: Detalhes de fluxo para ambientes de homologação e desenvolvimento.
* `trace`: Dump detalhado de payloads (desativado por padrão em produção).

---

## 2. Trilha de Auditoria Centralizada (`audit_logs`)

Operações críticas de negócio (mudança de papéis de usuários, alteração de dados bancários, exclusão de aplicativos, estorno de créditos) geram obrigatoriamente um registro imutável na tabela `audit_logs`:

```prisma
model AuditLog {
  id              String      @id @default(uuid())
  organizationId  String?     @map("organization_id")
  userId          String?     @map("user_id")
  action          String      // Ex: "USER_INVITED", "CAMPAIGN_BUDGET_CHANGED", "PAYOUT_REQUESTED"
  entityType      String      @map("entity_type") // Ex: "Campaign", "OrganizationMember"
  entityId        String      @map("entity_id")
  ipAddress       String?     @map("ip_address")
  userAgent       String?     @map("user_agent")
  diffBefore      Json?       @map("diff_before") // Estado anterior dos campos alterados
  diffAfter       Json?       @map("diff_after")  // Novo estado dos campos
  createdAt       DateTime    @default(now()) @map("created_at")

  @@index([organizationId, createdAt])
  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

---

## 3. Monitoramento de Saúde (Health Checks)

Todas as instâncias de backend (`api`, `ad-server`, `workers`) expõem endpoints padronizados compatíveis com health probes do Docker e Kubernetes:

* `GET /health/liveness`: Retorna `200 OK` se o processo Node.js estiver rodando e respondendo ao event loop.
* `GET /health/readiness`: Verifica conexões ativas com dependências críticas:
  * Conectividade com o banco PostgreSQL (`SELECT 1`).
  * Ping com o cluster Redis (`PING -> PONG`).
  * Espaço em disco e conectividade com o armazenamento de objetos.

Se qualquer dependência crítica falhar, o endpoint retorna `503 Service Unavailable`, sinalizando ao orquestrador (EasyPanel) a necessidade de reiniciar ou retirar a réplica de circulação.

---

## 4. Métricas Operacionais e de Negócio (Prometheus & NOC)

As aplicações expõem métricas na rota protegida `/metrics`:

| Métrica | Tipo | O que Mede | Alerta Crítico |
| :--- | :--- | :--- | :--- |
| `mgp_adserver_request_duration_ms` | Histogram | Latência de resposta na seleção de anúncios | p99 > 150ms |
| `mgp_ad_requests_total` | Counter | Total de chamadas ao Ad Server por app/formato | Queda súbita > 30% em 5 min |
| `mgp_ad_fill_rate_ratio` | Gauge | Percentual de requisições com anúncio preenchido | Fill rate < 20% com inventário ativo |
| `mgp_bullmq_queue_waiting_jobs` | Gauge | Quantidade de tarefas acumuladas nas filas | Fila `queue-ledger` > 5.000 itens |
| `mgp_ledger_discrepancy_count` | Counter | Contagem de discrepâncias de saldo da carteira | Discrepância > 0 (Alerta Imediato) |
| `mgp_http_5xx_errors_total` | Counter | Erros internos de servidor | > 1% das requisições totais |

