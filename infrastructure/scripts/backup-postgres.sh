#!/usr/bin/env bash
# ==============================================================================
# Mobile Growth Platform (MGP) — Script Automatizado de Backup do PostgreSQL
# Executado via Cron Job no Host ou via container de manutenção
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/mgp/backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="${PG_CONTAINER:-mgp-postgres}"
DB_NAME="${POSTGRES_DB:-mgp_prod_db}"
DB_USER="${POSTGRES_USER:-mgp_prod_user}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/mgp_db_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Iniciando backup do banco de dados ${DB_NAME} a partir do container ${CONTAINER_NAME}..."

# Executa pg_dump dentro do container e comprime via gzip diretamente
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F p --no-owner --no-privileges | gzip -9 > "$BACKUP_FILE"

# Validação do arquivo gerado
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup concluído com sucesso: ${BACKUP_FILE} (Tamanho: ${FILE_SIZE})"
else
    echo "[$(date)] ERRO: Falha ao gerar o arquivo de backup ou arquivo vazio!" >&2
    exit 1
fi

# Rotação de backups antigos (remove backups com mais de 30 dias)
echo "[$(date)] Executando política de rotação: expurgando backups com mais de ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -type f -name "mgp_db_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "[$(date)] Processo de backup finalizado com êxito."

