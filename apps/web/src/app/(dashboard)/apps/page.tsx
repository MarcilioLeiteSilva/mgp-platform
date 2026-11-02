'use client';

import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Key,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  platform: string;
  sdkKey: string;
  status: string;
  appStoreUrl?: string | null;
  createdAt: string;
}

export default function AppsPage() {
  const { currentOrg } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  const fetchApps = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await api.get<AppItem[]>(`/apps?organizationId=${currentOrg.id}`);
      if (res.success && Array.isArray(res.data)) {
        setApps(res.data);
      } else {
        setApps([]);
      }
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [currentOrg?.id]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!name || !packageName) {
      setModalError('Nome e Package Name são obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post<AppItem>('/apps', {
        organizationId: currentOrg?.id,
        name,
        packageName,
        platform: 'ANDROID',
        appStoreUrl: appStoreUrl || undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        setName('');
        setPackageName('');
        setAppStoreUrl('');
        await fetchApps();
      } else {
        setModalError(res.error || 'Erro ao criar aplicativo.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Meus Aplicativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie os aplicativos Android vinculados à organização{' '}
            <span className="font-semibold text-slate-800">{currentOrg?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApps}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Aplicativo
          </button>
        </div>
      </div>

      {/* Tabela ou Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-2" />
            <p className="text-xs text-slate-400">Carregando aplicativos...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhum aplicativo cadastrado</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Comece adicionando seu primeiro app Android para obter sua SDK Key e integrar aos módulos de monetização e inteligência.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Aplicativo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Aplicativo / Package</th>
                  <th className="px-6 py-4">Plataforma</th>
                  <th className="px-6 py-4">SDK Key</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{app.name}</p>
                          <p className="text-xs font-mono text-slate-400">{app.packageName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {app.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded font-mono border border-slate-200 max-w-[180px] truncate">
                          {app.sdkKey}
                        </code>
                        <button
                          onClick={() => handleCopyKey(app.sdkKey)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Copiar SDK Key"
                        >
                          {copiedKey === app.sdkKey ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(app.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Aplicativo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Novo Aplicativo Android</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Informe os dados do seu aplicativo para vinculação à organização e geração da chave SDK.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Nome do Aplicativo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Super Runner Game"
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Package Name (Android)
                </label>
                <input
                  type="text"
                  required
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="Ex: com.acme.superrunner"
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  URL da Play Store (Opcional)
                </label>
                <input
                  type="url"
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cadastrar Aplicativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
