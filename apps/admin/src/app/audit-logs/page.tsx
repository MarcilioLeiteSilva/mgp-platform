'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLogItem {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  diffBefore?: any;
  diffAfter?: any;
  createdAt: string;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await api.get<AuditLogResponse>(`/admin/audit-logs?page=${targetPage}&limit=20`);
      if (res.success && res.data) {
        setLogs(res.data.items);
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Trilha de Auditoria Imutável</h1>
          <p className="text-xs text-slate-400">
            Registro cronológico e imutável de todas as mutações e eventos de segurança da plataforma.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </button>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            <p className="text-xs text-slate-400">Consultando trilha de auditoria...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhum evento de auditoria encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Entidade</th>
                  <th className="px-6 py-4">ID do Objeto</th>
                  <th className="px-6 py-4">Operador</th>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4 text-right">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-sans font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-300">{log.entityType}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[120px]" title={log.entityId}>
                      {log.entityId}
                    </td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[120px]" title={log.userId || 'Sistema'}>
                      {log.userId || 'SYSTEM'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{log.ipAddress || '—'}</td>
                    <td className="px-6 py-4 text-right font-sans">
                      {(log.diffBefore || log.diffAfter) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Inspecionar Diferenças"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Total: <strong>{total}</strong> evento(s) registrado(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Inspeção de Diff */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Inspeção de Auditoria: {selectedLog.action}</h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Objeto: {selectedLog.entityType} ({selectedLog.entityId})
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Estado Anterior (diffBefore)</span>
                <pre className="text-red-400 text-[11px]">
                  {JSON.stringify(selectedLog.diffBefore, null, 2) || 'null'}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Novo Estado (diffAfter)</span>
                <pre className="text-emerald-400 text-[11px]">
                  {JSON.stringify(selectedLog.diffAfter, null, 2) || 'null'}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
