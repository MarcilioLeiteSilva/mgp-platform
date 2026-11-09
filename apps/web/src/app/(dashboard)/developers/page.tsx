'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  Cpu,
  Clock,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  ApiKeyDto,
  ApiKeyCreatedDto,
  ApiKeyUsageStatsDto,
} from '@mgp/contracts';

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeyDto[]>([]);
  const [stats, setStats] = useState<ApiKeyUsageStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'aso:read',
    'estimates:read',
    'trends:read',
  ]);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Key Revelation State (exibida apenas uma vez)
  const [createdKeyResult, setCreatedKeyResult] = useState<ApiKeyCreatedDto | null>(null);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);

  // Code Snippet Tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'nodejs' | 'python'>('curl');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [keysRes, statsRes] = await Promise.all([
        api.get<ApiKeyDto[]>('/api/v1/api-keys'),
        api.get<ApiKeyUsageStatsDto>('/api/v1/api-keys/stats'),
      ]);

      const keysData = keysRes?.data || (keysRes as any);
      const statsData = statsRes?.data || (statsRes as any);

      if (Array.isArray(keysData)) setKeys(keysData);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      showToast(err.message || 'Falha ao carregar chaves de API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.post<ApiKeyCreatedDto>('/api/v1/api-keys', {
        name: nameInput.trim(),
        scopes: selectedScopes,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });

      const data = res?.data || (res as any);
      if (data && data.plainTextKey) {
        setCreatedKeyResult(data);
        setIsCreateModalOpen(false);
        setNameInput('');
        setExpiresInDays(undefined);
        await loadData();
      }
    } catch (err: any) {
      showToast('Erro ao criar chave: ' + (err.message || 'Falha na requisição'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja revogar a chave "${name}"? Todas as requisições ativas serão interrompidas imediatamente.`)) {
      return;
    }

    try {
      await api.post(`/api/v1/api-keys/${id}/revoke`, {});
      showToast('Chave de API revogada com sucesso.');
      await loadData();
    } catch (err: any) {
      showToast('Falha ao revogar chave: ' + (err.message || 'Erro inesperado'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedKey(true);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setHasCopiedKey(false), 3000);
  };

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const sampleKey = keys.find((k) => !k.isRevoked)?.keyPrefix + '...' || 'mgp_live_sua_chave_secreta';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-blue-500/40 text-white rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">API Comercial & Desenvolvedores</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie credenciais programáticas, consulte quotas de requisição e integre a inteligência da MGP no seu produto.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Criar Nova API Key
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Chaves Ativas</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats ? stats.activeKeys : 0}{' '}
            <span className="text-xs font-normal text-slate-500 font-mono">
              / {stats ? stats.totalKeys : 0} total
            </span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Quota Utilizada (Mês)</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats ? stats.monthlyUsed.toLocaleString('pt-BR') : 0}{' '}
            <span className="text-xs font-normal text-slate-500 font-mono">
              / {stats ? stats.monthlyQuota.toLocaleString('pt-BR') : 0}
            </span>
          </div>
          {stats && stats.monthlyQuota > 0 && (
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((stats.monthlyUsed / stats.monthlyQuota) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Quota Restante</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {stats ? stats.remainingQuota.toLocaleString('pt-BR') : 0}
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Rate Limit Padrão</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            60 <span className="text-xs font-normal text-slate-400 font-mono">req / min</span>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Chaves de API Cadastradas</h2>
            <p className="text-xs text-slate-400">Credenciais geradas para autenticação via cabeçalho X-API-Key.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Carregando credenciais...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Key className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma chave de API gerada</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Crie uma chave comercial para habilitar a extração programática de inteligência ASO e estimativas preditivas.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Chave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Nome / Aplicação</th>
                  <th className="px-5 py-3.5">Prefixo</th>
                  <th className="px-5 py-3.5">Escopos</th>
                  <th className="px-5 py-3.5">Consumo Mensal</th>
                  <th className="px-5 py-3.5">Último Uso</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div>{k.name}</div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Criada em {new Date(k.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {k.keyPrefix}...
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {k.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-300">
                      {k.quotaUsed.toLocaleString('pt-BR')} / {k.quotaMonthly.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-[11px]">
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Nunca utilizada'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          k.isRevoked
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {k.isRevoked ? 'Revogada' : 'Ativa'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!k.isRevoked && (
                        <button
                          onClick={() => handleRevokeKey(k.id, k.name)}
                          title="Revogar chave"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration Code Snippets & Quick Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Guia Rápido de Consumo da API Pública</h3>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['curl', 'nodejs', 'python'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSnippetTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  activeSnippetTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Code Block */}
        <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-slate-300">
          {activeSnippetTab === 'curl' && (
            <pre>{`# Consultar estimativas preditivas de downloads e faturamento
curl -X GET "https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1/public/aso/apps/com.whatsapp/estimates?days=30" \\
  -H "X-API-Key: ${sampleKey}"

# Consultar tendências setoriais e breakouts
curl -X GET "https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1/public/aso/trends/categories/FINANCE" \\
  -H "X-API-Key: ${sampleKey}"`}</pre>
          )}

          {activeSnippetTab === 'nodejs' && (
            <pre>{`const API_KEY = '${sampleKey}';
const BASE_URL = 'https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1/public';

async function fetchEstimates(appId) {
  const res = await fetch(\`\${BASE_URL}/aso/apps/\${appId}/estimates?days=30\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  const data = await res.json();
  console.log('Estimativas:', data);
}

fetchEstimates('com.whatsapp');`}</pre>
          )}

          {activeSnippetTab === 'python' && (
            <pre>{`import requests

API_KEY = '${sampleKey}'
BASE_URL = 'https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1/public'

headers = {'X-API-Key': API_KEY}
response = requests.get(f'{BASE_URL}/aso/apps/com.whatsapp/estimates', headers=headers)

if response.status_code == 200:
    data = response.json()
    print('Downloads Mediana:', data['data']['latestEstimate']['dailyDownloadsMedian'])
else:
    print('Erro:', response.status_code, response.text)`}</pre>
          )}
        </div>
      </div>

      {/* Modal 1: Criar Nova API Key */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" />
                Criar Nova Chave de API
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nome da Chave / Aplicação *
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="ex: Dashboard BI, Script Python, App Cliente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Escopos de Permissão Concedidos
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'aso:read', label: 'Leitura ASO' },
                    { id: 'estimates:read', label: 'Estimativas Preditivas' },
                    { id: 'trends:read', label: 'Radar de Tendências' },
                    { id: 'audit:read', label: 'Auditoria Heurística' },
                  ].map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(s.id)}
                        onChange={() => toggleScope(s.id)}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600"
                      />
                      <span className="text-slate-300 text-xs">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Validade da Chave (Dias)
                </label>
                <select
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Sem Expiração (Permanente)</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                  <option value="365">1 ano (365 dias)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !nameInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Gerando...' : 'Gerar Chave Secreta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Revelação da Chave de API (One-Time Display) */}
      {createdKeyResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Chave de API Gerada com Sucesso</h3>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Importante:</strong> Esta é a única vez em que a sua chave secreta será exibida em texto puro.
                Guarde-a em um gerenciador de segredos seguro. Se perdê-la, será necessário gerar uma nova chave.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Sua Chave Secreta (X-API-Key):
              </span>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <code className="text-white font-mono text-xs break-all flex-1 select-all">
                  {createdKeyResult.plainTextKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKeyResult.plainTextKey)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shrink-0"
                  title="Copiar chave"
                >
                  {hasCopiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedKeyResult(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
