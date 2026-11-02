# 04. Política de Backups, Recuperação de Desastres e Limites Operacionais

## 1. Política de Backups (RPO e RTO)

Os dados transacionais da MGP (especialmente o **Ledger Financeiro da Carteira**) são o ativo mais crítico da plataforma.

* **RPO (Recovery Point Objective):** Máximo de **24 horas** para backups completos (com WAL archiving contínuo planejado para estágios futuros de alta escala).
* **RTO (Recovery Time Objective):** Menos de **1 hora** para restauração completa e retorno da operação.
* **Período de Retenção:** **30 dias** de histórico armazenados localmente e replicados em Object Storage (Cloudflare R2 ou AWS S3).

---

## 2. Rotina Automatizada de Backup

O script [`infrastructure/scripts/backup-postgres.sh`](file:///f:/mobile_growth/infrastructure/scripts/backup-postgres.sh) realiza dumps comprimidos via `pg_dump` e remove cópias anteriores à janela de 30 dias.

### Agendamento no Crontab do Host VPS:
Configure a execução diária às 03:00 da manhã (horário de menor tráfego):

```bash
# Adicionar no crontab do servidor: crontab -e
0 3 * * * /opt/mgp/infrastructure/scripts/backup-postgres.sh >> /var/log/mgp_backup.log 2>&1
```

---

## 3. Teste e Procedimento de Restauração

Backups sem teste de restauração não são confiáveis. Trimestralmente, a equipe técnica deve restaurar o backup mais recente em ambiente de Staging para validar integridade:

```bash
# Execução da restauração via script oficial
chmod +x infrastructure/scripts/restore-postgres.sh
./infrastructure/scripts/restore-postgres.sh /opt/mgp/backups/postgres/mgp_db_backup_20261102_030000.sql.gz
```

O script exige confirmação textual explícita (`CONFIRMAR`) antes de executar o `psql` para evitar sobreposições acidentais em produção.

---

## 4. Gestão de Limites Operacionais e Proteção contra OOM

Para garantir que o servidor Hostinger VPS permaneça estável sob picos de tráfego publicitário, os seguintes limites operacionais são mandatários:

1. **Memória Swap como Buffer de Proteção:** O swap de 4GB ativado na VPS assegura que se um processo atingir um pico temporário, o sistema operacional não mate subitamente o processo do PostgreSQL (`OOM Killer`).
2. **PostgreSQL Work Mem Control:** O parâmetro `work_mem = 16MB` limita o consumo de RAM por query de ordenação e junção, impedindo que consultas analíticas pesadas no dashboard afetem a capacidade transacional da API.
3. **Pacing de Cache no Redis:** O Redis opera com teto rígido de 768MB e política de expiração `volatile-lru`, garantindo que chaves de telemetria e cache de campanhas expirem antes de comprometerem a memória do servidor.

