#!/usr/bin/env bash
# ==============================================================================
# Mobile Growth Platform (MGP) — Script de Restauração de Backup do PostgreSQL
# USO: ./restore-postgres.sh /caminho/do/arquivo_backup.sql.gz
# ==============================================================================

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "USO: $0 <caminho_para_o_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${PG_CONTAINER:-mgp-postgres}"
DB_NAME="${POSTGRES_DB:-mgp_prod_db}"
DB_USER="${POSTGRES_USER:-mgp_prod_user}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERRO: Arquivo de backup '$BACKUP_FILE' não encontrado." >&2
    exit 1
fi

echo "=========================================================="
echo ">>> ATENÇÃO: OPERAÇÃO CRÍTICA DE RESTAURAÇÃO"
echo ">>> Banco de destino: ${DB_NAME} (Container: ${CONTAINER_NAME})"
echo ">>> Arquivo de origem: ${BACKUP_FILE}"
echo "=========================================================="

read -p "Tem certeza que deseja sobrescrever o banco de dados? (digite 'CONFIRMAR'): " CONFIRMATION

if [ "$CONFIRMATION" != "CONFIRMAR" ]; then
    echo "Operação abortada pelo operador."
    exit 0
fi

echo "[$(date)] Descomprimindo e restaurando banco de dados..."

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo "[$(date)] Restauração finalizada com sucesso! Executando verificação de integridade..."

docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"

echo "[$(date)] Verificação concluída."

