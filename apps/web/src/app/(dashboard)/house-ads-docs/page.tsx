'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Smartphone,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Zap,
  Server,
  Terminal,
  Activity,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  PlaySquare,
  Maximize2,
  Layout,
  FileCode,
} from 'lucide-react';

export default function HouseAdsDocsPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'panel' | 'sdk' | 'codes' | 'admob' | 'zapscore' | 'troubleshoot'
  >('overview');

  const [codeLang, setCodeLang] = useState<'kotlin' | 'java'>('kotlin');
  const [codeFormat, setCodeFormat] = useState<'banner' | 'interstitial' | 'rewarded' | 'native'>('banner');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {copiedKey && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-emerald-500/40 text-white rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Código copiado para a área de transferência!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Central do Publisher: House Ads & SDK
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Guia definitivo de implementação de anúncios próprios, promoção cruzada (cross-promotion) e convivência com AdMob.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/apps"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            Meus Apps
          </a>
          <a
            href="/campaigns"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4" />
            Criar Campanha House Ad
          </a>
        </div>
      </div>

      {/* Live System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ad Server RTB</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online (&lt; 30ms)
            </div>
            <div className="text-[10px] text-slate-500 truncate">mgp-adserver.gtalg3</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Taxa de Preenchimento</div>
            <div className="text-sm font-bold text-white">100% Fill Rate</div>
            <div className="text-[10px] text-slate-500">Zero inventário desperdiçado</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MGP SDK Android</div>
            <div className="text-sm font-bold text-white">v0.1.0 Release</div>
            <div className="text-[10px] text-slate-500">Android 7.0+ (API 24+)</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Custo de Mídia</div>
            <div className="text-sm font-bold text-white">R$ 0,00 (Isento)</div>
            <div className="text-[10px] text-slate-500">Sem débito em carteira</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          1. Visão Geral & Estratégia
        </button>

        <button
          onClick={() => setActiveTab('panel')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'panel'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          2. Guia no Painel
        </button>

        <button
          onClick={() => setActiveTab('sdk')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'sdk'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          3. Integração do SDK
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'codes'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          4. Códigos Prontos
        </button>

        <button
          onClick={() => setActiveTab('admob')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'admob'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
          5. Convivência com AdMob (Fallback)
        </button>

        <button
          onClick={() => setActiveTab('zapscore')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'zapscore'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          6. Caso Prático: Zapscore
        </button>

        <button
          onClick={() => setActiveTab('troubleshoot')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'troubleshoot'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          7. Testes & Logcat
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              O Que É e Como Funciona o MGP House Ads?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              O **House Ads** da Mobile Growth Platform permite que você utilize seus próprios aplicativos publicados
              (como o <strong>Zapscore</strong>, apps de idiomas, jogos e utilitários) para promover os demais aplicativos do seu catálogo.
              Diferente de campanhas pagas convencionais, o House Ads é <strong>100% isento de saldo em carteira</strong> e garante que você nunca perca uma impressão quando outras redes de anúncios não tiverem inventário pago.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-sm font-bold text-white">CAC Zero (Custo Gratuito)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Adquira novos usuários para o seu app de idiomas ou jogos usando o tráfego que você já tem no Zapscore, sem pagar nada à Google ou Meta.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-sm font-bold text-white">Controle de Frequência</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evite que o usuário veja o mesmo anúncio repetidamente. O sistema rotaciona automaticamente entre os apps do seu portfólio via Redis atômico.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-sm font-bold text-white">Entrega Instantânea (&lt; 30ms)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Engine construída em Fastify com leilão determinístico, entregando anúncios e criativos de forma transparente e não-bloqueante no Android.
                </p>
              </div>
            </div>
          </div>

          {/* Matriz de Cross-Promotion */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Matriz Estratégica de Promoção Cruzada
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">App de Origem (Publisher)</th>
                    <th className="py-3 px-4">Formato Ideal</th>
                    <th className="py-3 px-4">App Promovido (Destino)</th>
                    <th className="py-3 px-4">Gatilho Recomendado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      App de Futebol (Zapscore)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold">
                        INTERSTITIAL
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-amber-300">Jogos de Esportes / Games</td>
                    <td className="py-3.5 px-4 text-slate-400">Ao sair da tela de detalhes da partida após o apito final.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Jogos de Esportes / Games
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                        REWARDED VIDEO
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-300">Cursos de Idiomas & Zapscore</td>
                    <td className="py-3.5 px-4 text-slate-400">Ganhar mais uma vida ou dobrar moedas do jogo ao assistir 15s.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Ferramentas Utilitárias
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                        BANNER (320x50)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-300">Cursos de Idiomas</td>
                    <td className="py-3.5 px-4 text-slate-400">Rodapé de telas de resultados ou histórico de cálculos/tarefas.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Cursos de Idiomas
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[10px] font-bold">
                        NATIVE AD
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-300">Ferramentas Utilitárias</td>
                    <td className="py-3.5 px-4 text-slate-400">Card nativo ao final de uma lição completada com sucesso.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUIA NO PAINEL */}
      {activeTab === 'panel' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Passo a Passo de Configuração no Painel MGP
            </h2>

            <div className="space-y-6">
              {/* Passo 1 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/30 text-sm">
                  1
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm font-bold text-white">Cadastre seu Aplicativo e Obtenha a SDK Key</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Acesse o menu <a href="/apps" className="text-blue-400 hover:underline font-semibold">Meus Aplicativos</a>, clique em <strong>Novo Aplicativo</strong>, preencha o nome (ex: <em>Zapscore</em>), o package name (ex: <em>com.zapscore.app</em>) e plataforma <em>ANDROID</em>. Copie a <strong>sdkKey</strong> gerada.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/30 text-sm">
                  2
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm font-bold text-white">Crie os Blocos de Anúncio (AdUnits)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Acesse <a href="/ad-units" className="text-blue-400 hover:underline font-semibold">Blocos de Anúncios</a> e crie os blocos que existirão nas suas telas:
                  </p>
                  <ul className="text-xs text-slate-400 list-disc pl-5 space-y-1">
                    <li><strong>Banner:</strong> formato <code>BANNER</code>, floor eCPM <code>0.00</code>.</li>
                    <li><strong>Intersticial:</strong> formato <code>INTERSTITIAL</code>.</li>
                    <li><strong>Rewarded:</strong> formato <code>REWARDED</code>.</li>
                  </ul>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/30 text-sm">
                  3
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm font-bold text-white">Crie a Campanha selecionando o tipo HOUSE_AD</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    No menu <a href="/campaigns" className="text-blue-400 hover:underline font-semibold">Campanhas</a>, clique em <strong>Nova Campanha</strong>. No campo <strong>Tipo da Campanha</strong>, selecione obrigatoriamente <strong><code>HOUSE_AD (Anúncios Próprios - Isento de saldo)</code></strong>. Defina um lance simbólico (ex: <code>1.00</code>) para controlar o peso de prioridade entre suas campanhas.
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/30 text-sm">
                  4
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm font-bold text-white">Faça Upload dos Criativos e Ative a Campanha</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clique no ícone de criativos da campanha, informe a URL da imagem/banner, o título, a mensagem e o link de download direto na Google Play Store. Com o criativo salvo, mude o status da campanha de <strong>DRAFT</strong> para <strong>ACTIVE</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRAÇÃO DO SDK */}
      {activeTab === 'sdk' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Importação do MGP Android SDK (Kotlin)
            </h2>
            <p className="text-xs text-slate-400">
              Copie o arquivo <code>mgp-sdk-release.aar</code> para a pasta <code>app/libs/</code> do seu projeto Android e declare as dependências abaixo:
            </p>

            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                <span>app/build.gradle.kts (Kotlin DSL)</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `dependencies {\n    implementation(files("libs/mgp-sdk-release.aar"))\n    implementation("androidx.core:core-ktx:1.13.1")\n    implementation("androidx.lifecycle:lifecycle-process:2.8.4")\n    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")\n    implementation("androidx.work:work-runtime-ktx:2.9.1")\n}`,
                      'gradle'
                    )
                  }
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'gradle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'gradle' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
{`dependencies {
    implementation(files("libs/mgp-sdk-release.aar"))
    
    // Suporte obrigatório do AndroidX
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-process:2.8.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}`}
              </pre>
            </div>

            <div className="pt-4 space-y-2">
              <h3 className="text-sm font-bold text-white">Permissões no AndroidManifest.xml</h3>
              <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto">
{`<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<!-- Permissão recomendada da Google Play para controle de frequência -->
<uses-permission android:name="com.google.android.gms.permission.AD_ID" />`}
              </pre>
            </div>

            <div className="pt-4 space-y-2">
              <h3 className="text-sm font-bold text-white">Inicialização no Application.onCreate()</h3>
              <p className="text-xs text-slate-400">
                A inicialização é assíncrona e não-bloqueante, liberando a Main Thread em menos de 10ms:
              </p>
              <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 overflow-x-auto">
{`// Kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val config = MgpConfig.Builder("mgp_live_app_SUA_CHAVE_AQUI")
            .setDebugMode(BuildConfig.DEBUG)
            .setAutoCollectLifecycle(true)
            .build()
        MGP.initialize(this, config)
    }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CÓDIGOS PRONTOS */}
      {activeTab === 'codes' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  Snippets de Código Completos
                </h2>
                <p className="text-xs text-slate-400">
                  Selecione o formato desejado e a linguagem para copiar o código pronto para o seu projeto.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Format Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setCodeFormat('banner')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeFormat === 'banner' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Banner
                  </button>
                  <button
                    onClick={() => setCodeFormat('interstitial')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeFormat === 'interstitial' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Intersticial
                  </button>
                  <button
                    onClick={() => setCodeFormat('rewarded')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeFormat === 'rewarded' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rewarded
                  </button>
                  <button
                    onClick={() => setCodeFormat('native')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeFormat === 'native' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Nativo
                  </button>
                </div>

                {/* Language Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setCodeLang('kotlin')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeLang === 'kotlin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Kotlin
                  </button>
                  <button
                    onClick={() => setCodeLang('java')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      codeLang === 'java' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Java
                  </button>
                </div>
              </div>
            </div>

            {/* Code Display Area */}
            {codeFormat === 'banner' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                    <span>Banner View ({codeLang.toUpperCase()})</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          codeLang === 'kotlin'
                            ? `val banner = findViewById<MgpBannerView>(R.id.mgpBanner)\nbanner.setBannerListener(object : MgpBannerListener {\n    override fun onAdLoaded() { Log.d("MGP", "Banner pronto") }\n    override fun onAdFailedToLoad(error: String) { Log.e("MGP", error) }\n    override fun onAdClicked() { Log.d("MGP", "Clique registrado") }\n    override fun onAdImpressionRecorded() { Log.d("MGP", "Impressão oficial") }\n})\nbanner.loadAd("SEU_AD_UNIT_ID_BANNER")`
                            : `MgpBannerView banner = findViewById(R.id.mgpBanner);\nbanner.setBannerListener(new MgpBannerListener() {\n    @Override public void onAdLoaded() { Log.d("MGP", "Banner pronto"); }\n    @Override public void onAdFailedToLoad(String error) { Log.e("MGP", error); }\n    @Override public void onAdClicked() { Log.d("MGP", "Clique registrado"); }\n    @Override public void onAdImpressionRecorded() { Log.d("MGP", "Impressão oficial"); }\n});\nbanner.loadAd("SEU_AD_UNIT_ID_BANNER");`,
                          'banner_code'
                        )
                      }
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'banner_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'banner_code' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{codeLang === 'kotlin'
  ? `// Layout XML:
// <com.mgp.sdk.ads.banner.MgpBannerView
//     android:id="@+id/mgpBanner"
//     android:layout_width="match_parent"
//     android:layout_height="50dp"
//     android:layout_alignParentBottom="true" />

val banner = findViewById<MgpBannerView>(R.id.mgpBanner)

banner.setBannerListener(object : MgpBannerListener {
    override fun onAdLoaded() {
        Log.d("MGP", "Banner carregado com sucesso.")
    }

    override fun onAdFailedToLoad(error: String) {
        Log.w("MGP", "Falha ao carregar banner: \$error")
    }

    override fun onAdClicked() {
        Log.d("MGP", "Usuário clicou no banner.")
    }

    override fun onAdImpressionRecorded() {
        Log.d("MGP", "Impressão oficial registrada com sucesso no Ad Server.")
    }
})

// Carrega o anúncio passando o AdUnitId do painel
banner.loadAd("SEU_AD_UNIT_ID_BANNER")`
  : `MgpBannerView banner = findViewById(R.id.mgpBanner);

banner.setBannerListener(new MgpBannerListener() {
    @Override
    public void onAdLoaded() {
        Log.d("MGP", "Banner carregado com sucesso.");
    }

    @Override
    public void onAdFailedToLoad(String error) {
        Log.w("MGP", "Falha no banner: " + error);
    }

    @Override
    public void onAdClicked() {
        Log.d("MGP", "Clique registrado.");
    }

    @Override
    public void onAdImpressionRecorded() {
        Log.d("MGP", "Impressão registrada.");
    }
});

banner.loadAd("SEU_AD_UNIT_ID_BANNER");`}
                  </pre>
                </div>
              </div>
            )}

            {codeFormat === 'interstitial' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                    <span>Intersticial Tela Cheia ({codeLang.toUpperCase()})</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `MgpInterstitialAd.load(this, "SEU_AD_UNIT_ID_INTERSTITIAL", object : MgpInterstitialListener {\n    override fun onAdLoaded(ad: MgpInterstitialAd) { ad.show(this@MainActivity) }\n    override fun onAdFailedToLoad(error: String) { Log.e("MGP", error) }\n    override fun onAdDismissed() { finish() }\n    override fun onAdClicked() {}\n})`,
                          'interstitial_code'
                        )
                      }
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'interstitial_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'interstitial_code' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
{codeLang === 'kotlin'
  ? `MgpInterstitialAd.load(
    context = this,
    adUnitId = "SEU_AD_UNIT_ID_INTERSTITIAL",
    listener = object : MgpInterstitialListener {
        override fun onAdLoaded(ad: MgpInterstitialAd) {
            // Exibe o anúncio de tela cheia
            ad.show(this@MainActivity)
        }

        override fun onAdFailedToLoad(error: String) {
            Log.w("MGP", "Falha ao carregar intersticial: \$error")
        }

        override fun onAdDismissed() {
            Log.d("MGP", "Usuário fechou o intersticial.")
            // Continua a ação do usuário (ex: troca de tela ou fecha partida)
        }

        override fun onAdClicked() {
            Log.d("MGP", "Clique no intersticial.")
        }
    }
)`
  : `MgpInterstitialAd.load(this, "SEU_AD_UNIT_ID_INTERSTITIAL", new MgpInterstitialListener() {
    @Override
    public void onAdLoaded(MgpInterstitialAd ad) {
        ad.show(MainActivity.this);
    }

    @Override
    public void onAdFailedToLoad(String error) {
        Log.w("MGP", "Erro no intersticial: " + error);
    }

    @Override
    public void onAdDismissed() {
        Log.d("MGP", "Intersticial fechado.");
    }

    @Override
    public void onAdClicked() {
        Log.d("MGP", "Clique registrado.");
    }
});`}
                  </pre>
                </div>
              </div>
            )}

            {codeFormat === 'rewarded' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                    <span>Vídeo Recompensado ({codeLang.toUpperCase()})</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `MgpRewardedAd.load(this, "SEU_AD_UNIT_REWARDED", object : MgpRewardedListener {\n    override fun onAdLoaded(ad: MgpRewardedAd) { ad.show(this@MainActivity) }\n    override fun onAdFailedToLoad(error: String) {}\n    override fun onUserEarnedReward(reward: MgpRewardItem) { liberarRecursoVip() }\n    override fun onAdDismissed() {}\n})`,
                          'rewarded_code'
                        )
                      }
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'rewarded_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'rewarded_code' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-amber-300 overflow-x-auto leading-relaxed">
{codeLang === 'kotlin'
  ? `MgpRewardedAd.load(
    context = this,
    adUnitId = "SEU_AD_UNIT_REWARDED",
    listener = object : MgpRewardedListener {
        override fun onAdLoaded(ad: MgpRewardedAd) {
            ad.show(this@MainActivity)
        }

        override fun onAdFailedToLoad(error: String) {
            Log.e("MGP", "Falha ao carregar vídeo: \$error")
        }

        override fun onUserEarnedReward(reward: MgpRewardItem) {
            // LIBERAR RECOMPENSA AO USUÁRIO AQUI (Ex: Mapa de calor do time)
            Log.i("MGP", "Recompensa concedida: \${reward.amount} \${reward.type}")
            liberarEstatisticasVip()
        }

        override fun onAdDismissed() {
            Log.d("MGP", "Vídeo fechado.")
        }
    }
)`
  : `MgpRewardedAd.load(this, "SEU_AD_UNIT_REWARDED", new MgpRewardedListener() {
    @Override
    public void onAdLoaded(MgpRewardedAd ad) {
        ad.show(MainActivity.this);
    }

    @Override
    public void onAdFailedToLoad(String error) {
        Log.e("MGP", "Erro no vídeo: " + error);
    }

    @Override
    public void onUserEarnedReward(MgpRewardItem reward) {
        liberarEstatisticasVip();
    }

    @Override
    public void onAdDismissed() {
        Log.d("MGP", "Vídeo encerrado.");
    }
});`}
                  </pre>
                </div>
              </div>
            )}

            {codeFormat === 'native' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                    <span>Anúncio Nativo Customizado ({codeLang.toUpperCase()})</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `MgpNativeAd.load(this, "SEU_AD_UNIT_NATIVO", object : MgpNativeAdListener {\n    override fun onAdLoaded(ad: MgpNativeAd) {\n        txtTitle.text = ad.title\n        txtDesc.text = ad.description\n        btnCta.text = ad.callToAction\n        ad.registerViewForInteraction(container, btnCta)\n    }\n    override fun onAdFailedToLoad(error: String) {}\n})`,
                          'native_code'
                        )
                      }
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'native_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'native_code' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-purple-300 overflow-x-auto leading-relaxed">
{`MgpNativeAd.load(
    context = this,
    adUnitId = "SEU_AD_UNIT_NATIVO",
    listener = object : MgpNativeAdListener {
        override fun onAdLoaded(nativeAd: MgpNativeAd) {
            // Preenche os componentes nativos do seu layout:
            txtTitle.text = nativeAd.title
            txtDescription.text = nativeAd.description
            btnCta.text = nativeAd.callToAction // ex: "Instalar Agora"
            imgIcon.setImageUrl(nativeAd.iconUrl)

            // Registra para tracking de viewability e clique
            nativeAd.registerViewForInteraction(adContainerView, btnCta)
        }

        override fun onAdFailedToLoad(error: String) {
            Log.w("MGP", "Nativo indisponível: \$error")
        }
    }
)`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CONVIVÊNCIA COM ADMOB (FALLBACK) */}
      {activeTab === 'admob' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Como Fazer AdMob e House Ads Conviverem Sem Conflito
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Você <strong>NÃO precisa abrir mão do AdMob</strong>. O modelo mais lucrativo é o <strong>Fallback Automático (Backfill)</strong>:
              o seu app tenta exibir o AdMob primeiro. Se o AdMob responder sem anúncio (Fill Rate vazio), o seu aplicativo chama imediatamente o <strong>House Ad da MGP</strong>, garantindo que o espaço nunca fique em branco!
            </p>

            <div className="relative pt-2">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl text-[11px] font-mono text-slate-400">
                <span>Banner AdMob com Fallback Automático para MGP House Ads</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `private fun loadAdmobWithMgpFallback(container: FrameLayout) {\n    val admobView = AdView(this).apply {\n        setAdSize(AdSize.BANNER)\n        adUnitId = "ADMOB_BANNER_ID"\n    }\n    container.removeAllViews()\n    container.addView(admobView)\n    admobView.adListener = object : AdListener() {\n        override fun onAdFailedToLoad(error: LoadAdError) {\n            Log.w("AD_MEDIATION", "AdMob sem anúncio. Acionando MGP House Ad...")\n            container.removeAllViews()\n            val mgpBanner = MgpBannerView(this@MainActivity)\n            container.addView(mgpBanner)\n            mgpBanner.loadAd("MGP_BANNER_AD_UNIT_ID")\n        }\n    }\n    admobView.loadAd(AdRequest.Builder().build())\n}`,
                      'admob_code'
                    )
                  }
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'admob_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'admob_code' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-b-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`private fun loadAdmobWithMgpFallback(container: FrameLayout) {
    val admobView = AdView(this).apply {
        setAdSize(AdSize.BANNER)
        adUnitId = "ADMOB_BANNER_ID"
    }

    container.removeAllViews()
    container.addView(admobView)

    admobView.adListener = object : AdListener() {
        override fun onAdLoaded() {
            Log.i("AD_MEDIATION", "AdMob carregado com sucesso (Monetização em Dólar).")
        }

        override fun onAdFailedToLoad(error: LoadAdError) {
            Log.w("AD_MEDIATION", "AdMob sem inventário. Acionando MGP House Ad...")

            // Substitui imediatamente o container pelo MGP House Ad
            container.removeAllViews()
            val mgpBanner = MgpBannerView(this@MainActivity)
            container.addView(mgpBanner)

            mgpBanner.loadAd("SEU_MGP_BANNER_AD_UNIT_ID")
        }
    }

    admobView.loadAd(AdRequest.Builder().build())
}`}
              </pre>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Conformidade Total com as Políticas da Google Play
              </div>
              <p className="text-xs text-slate-300">
                O método <code>container.removeAllViews()</code> assegura que nunca existirão dois anúncios sobrepostos ao mesmo tempo, respeitando integralmente as regras do AdMob e da Google Play Store.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CASO PRÁTICO ZAPSCORE */}
      {activeTab === 'zapscore' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Arquitetura de Anúncios Recomendada para o Zapscore
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              O aplicativo <strong>Zapscore</strong> possui alta densidade de sessões em dias de jogos. A distribuição ideal de anúncios é:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Tela de Jogos ao Vivo</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">BANNER</span>
                </div>
                <h3 className="text-sm font-bold text-white">Banner Rodapé (Fallback)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AdMob tenta monetizar. Se falhar, exibe o banner promovendo o seu <strong>App de Cursos de Idiomas</strong> ou <strong>Utilitários</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase">Saída da Partida</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">INTERSTITIAL</span>
                </div>
                <h3 className="text-sm font-bold text-white">Tela Cheia no Apito Final</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Quando a partida atinge 90'+ e o usuário volta para a lista, exibe intersticial convidando para jogar o seu <strong>Jogo Esportivo</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase">Mapa de Calor VIP</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">REWARDED</span>
                </div>
                <h3 className="text-sm font-bold text-white">Desbloqueio com Vídeo</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O usuário assiste a um vídeo de 15s de outro app seu e ganha acesso gratuito às estatísticas avançadas da partida por 24h.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/campaigns"
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Configurar Campanhas do Zapscore no Painel <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: TROUBLESHOOTING & LOGCAT */}
      {activeTab === 'troubleshoot' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Depuração e Validação no Android Studio
            </h2>
            <p className="text-xs text-slate-400">
              No Android Studio, abra a aba <strong>Logcat</strong> e filtre pela tag <code>tag:MGP_SDK</code> com o modo debug ativado no <code>MgpConfig</code>:
            </p>

            <pre className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`I/MGP_SDK: [Core] Inicializando MGP Android SDK v0.1.0 para key: mgp_live_app_...
D/MGP_SDK: [AdHttpClient] Enviando requisição RTB para: /ads/decision (AdUnit: 7b8f...)
I/MGP_SDK: [AdHttpClient] Resposta RTB recebida com sucesso em 26ms (Fill: true, Creative: cr_01...)
D/MGP_SDK: [BannerView] Banner renderizado na tela (320x50dp). Monitorando viewability.
I/MGP_SDK: [BannerView] Viewability validada (>50% visível por 1.2s). Impressão confirmada.`}
            </pre>

            <div className="pt-2 space-y-3">
              <h3 className="text-sm font-bold text-white">Códigos de Retorno do Ad Server</h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5">
                  <span className="font-mono text-amber-400 font-bold shrink-0">NO_CREATIVES_AVAILABLE</span>
                  <span className="text-slate-400">Não há campanhas com criativos ativos para o formato do bloco. Verifique se a campanha está como <code>ACTIVE</code> no painel.</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5">
                  <span className="font-mono text-blue-400 font-bold shrink-0">FREQUENCY_CAPPED</span>
                  <span className="text-slate-400">O usuário de teste atingiu o limite de exibições por hora. Aguarde ou crie uma segunda campanha para testar a rotação automática.</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5">
                  <span className="font-mono text-rose-400 font-bold shrink-0">UNAUTHORIZED_MISSING_SDK_KEY</span>
                  <span className="text-slate-400">A chave <code>sdkKey</code> informada na inicialização do app está em branco ou nula.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
