'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Building2,
  Wallet,
  LogOut,
  User,
  Check,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export function Header() {
  const { user, organizations, currentOrg, switchOrganization, logout } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [walletTotal, setWalletTotal] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Buscar saldo resumido da organização ativa
  const fetchWalletSummary = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoadingWallet(true);
      const res = await api.get<{
        wallet?: {
          balances?: Array<{ balance: string | number }>;
        };
      }>(`/organizations/${currentOrg.id}`);

      if (res.success && res.data?.wallet?.balances) {
        const sum = res.data.wallet.balances.reduce((acc, curr) => {
          return acc + Number(curr.balance || 0);
        }, 0);
        setWalletTotal(sum);
      } else {
        setWalletTotal(0);
      }
    } catch {
      setWalletTotal(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
  }, [currentOrg?.id]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Lado Esquerdo: Seletor de Tenant */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={orgRef}>
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium leading-none">Organização</span>
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {currentOrg?.name || 'Selecione...'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
          </button>

          {/* Dropdown de Organizações */}
          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Alternar Organização
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {organizations.map((org) => {
                  const isSelected = org.id === currentOrg?.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-sm">{org.name}</p>
                        <p className="text-[11px] text-slate-400 uppercase font-medium">{org.role}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-1 mt-1 px-2">
                <Link
                  href="/organization"
                  onClick={() => setOrgDropdownOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium rounded hover:bg-blue-50/50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Gerenciar Organizações
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Saldo da Carteira + Menu de Usuário */}
      <div className="flex items-center gap-4">
        {/* Resumo da Carteira */}
        <Link
          href="/wallet"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 transition-colors"
          title="Ver detalhes da Carteira"
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block leading-none">
              Saldo Total
            </span>
            <span className="text-sm font-bold tracking-tight">
              {loadingWallet ? (
                <RefreshCw className="w-3 h-3 animate-spin inline-block" />
              ) : (
                `$${(walletTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </span>
          </div>
        </Link>

        {/* Menu de Usuário */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {user?.fullName ? user.fullName[0].toUpperCase() : user?.email[0].toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.fullName || user?.email.split('@')[0]}
              </span>
              <span className="text-[11px] text-slate-500 leading-none">{user?.email}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Dropdown de Usuário */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{user?.fullName || 'Usuário'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {user?.role || 'USER'}
                  </span>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  Perfil e Segurança
                </Link>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
