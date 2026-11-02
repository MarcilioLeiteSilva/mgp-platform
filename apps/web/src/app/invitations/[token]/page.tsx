'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth-context';

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

function InvitationAcceptContent() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { user, loading: authLoading, refreshData, switchOrganization } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await api.get<InvitationDetails>(`/invitations/${token}`);
        if (res.success && res.data) {
          setInvitation(res.data);
        } else {
          setError(res.error || 'Convite não encontrado ou expirado.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar convite.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      setError(null);
      const res = await api.post(`/invitations/${token}/accept`);
      if (res.success) {
        setAccepted(true);
        await refreshData();
        if (invitation?.organization?.id) {
          switchOrganization(invitation.organization.id);
        }
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(res.error || 'Erro ao aceitar convite.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao aceitar convite.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Layers className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-white tracking-tight">
          Convite para Organização
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Mobile Growth Platform — Acesso Colaborativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-xs text-slate-400">Verificando dados do convite...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Convite Indisponível</h3>
              <p className="text-xs text-red-400 mt-2 mb-6">{error}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Ir para Login
              </Link>
            </div>
          ) : accepted ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Convite Aceito!</h3>
              <p className="text-xs text-slate-300 mt-2">
                Você agora é membro de <span className="font-semibold text-white">{invitation?.organization.name}</span>.
              </p>
              <p className="text-xs text-slate-500 mt-4">Redirecionando para o painel...</p>
            </div>
          ) : (
            <div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Organização Convidante
                    </span>
                    <h3 className="text-base font-bold text-white">{invitation?.organization.name}</h3>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Papel Atribuído:</span>
                    <span className="font-bold uppercase text-blue-400">{invitation?.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destinatário:</span>
                    <span className="font-mono text-slate-200">{invitation?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expira em:</span>
                    <span>{new Date(invitation?.expiresAt || '').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {user ? (
                <div>
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aceitando...
                      </>
                    ) : (
                      <>
                        Aceitar Convite e Entrar
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-3">
                    Conectado como <strong className="text-slate-300">{user.email}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 text-center mb-4">
                    Para aceitar este convite, entre na sua conta ou crie um novo cadastro.
                  </p>
                  <Link
                    href={`/login?redirect=/invitations/${token}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all"
                  >
                    Entrar com Minha Conta
                  </Link>
                  <Link
                    href={`/register?redirect=/invitations/${token}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700"
                  >
                    Criar Novo Cadastro
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <AuthProvider>
      <InvitationAcceptContent />
    </AuthProvider>
  );
}

