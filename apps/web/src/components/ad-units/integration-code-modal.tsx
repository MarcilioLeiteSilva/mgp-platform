'use client';

import React, { useState } from 'react';
import { X, Code2, Copy, Check, Smartphone, Terminal } from 'lucide-react';

interface AdUnit {
  id: string;
  name: string;
  format: 'BANNER' | 'NATIVE' | 'INTERSTITIAL' | 'REWARDED';
  placement?: string;
  app?: {
    name: string;
    packageName: string;
    sdkKey?: string;
  };
}

interface IntegrationCodeModalProps {
  isOpen: boolean;
  adUnit: AdUnit | null;
  onClose: () => void;
}

export function IntegrationCodeModal({ isOpen, adUnit, onClose }: IntegrationCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !adUnit) return null;

  const getCodeSnippet = () => {
    switch (adUnit.format) {
      case 'BANNER':
        return `// 1. No arquivo de layout XML (ex: res/layout/activity_main.xml):
<com.mgp.sdk.ads.MgpBannerView
    android:id="@+id/mgpBannerView"
    android:layout_width="320dp"
    android:layout_height="50dp"
    android:layout_gravity="bottom|center_horizontal" />

// 2. Na sua Activity ou Fragment Kotlin:
val bannerView = findViewById<MgpBannerView>(R.id.mgpBannerView)
bannerView.loadAd(adUnitId = "${adUnit.id}")`;

      case 'INTERSTITIAL':
        return `// Na sua Activity Kotlin (ex: ao término de uma fase ou ação):
MGP.loadInterstitial(
    context = this,
    adUnitId = "${adUnit.id}",
    callback = object : MgpAdCallback {
        override fun onAdLoaded() {
            // Exibe quando carregado ou armazena para o momento oportuno
            MGP.showInterstitial(this@MainActivity)
        }
        override fun onAdClosed() {
            // Retome o fluxo normal do jogo/app
        }
        override fun onAdFailed(error: String) {
            Log.e("MGP", "Falha ao carregar Interstitial: \$error")
        }
    }
)`;

      case 'REWARDED':
        return `// Na sua Activity Kotlin (ex: ao clicar no baú de moedas):
MGP.loadRewarded(
    context = this,
    adUnitId = "${adUnit.id}",
    callback = object : MgpRewardCallback {
        override fun onAdLoaded() {
            MGP.showRewarded(this@MainActivity)
        }
        override fun onUserRewarded(rewardType: String, amount: Int) {
            // Concede os itens ao jogador com token criptográfico seguro
            Toast.makeText(this@MainActivity, "Ganhou \$amount \$rewardType!", Toast.LENGTH_SHORT).show()
        }
        override fun onAdFailed(error: String) {
            Log.e("MGP", "Falha ao exibir anúncio premiado: \$error")
        }
    }
)`;

      case 'NATIVE':
        return `// No feed, lista ou tela customizada:
MGP.loadNativeAd(
    context = this,
    adUnitId = "${adUnit.id}",
    callback = object : MgpNativeAdCallback {
        override fun onNativeAdLoaded(nativeAd: MgpNativeAd) {
            val customCard = findViewById<ViewGroup>(R.id.nativeAdContainer)
            nativeAd.bindToView(customCard)
        }
        override fun onAdFailed(error: String) {
            Log.e("MGP", "Falha ao renderizar Native Ad: \$error")
        }
    }
)`;

      default:
        return `// Inicialize o SDK e requisite o bloco:
MGP.loadAd(context = this, adUnitId = "${adUnit.id}")`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Código de Integração SDK</h2>
              <p className="text-xs text-slate-400">
                Bloco: <span className="text-blue-400 font-semibold">{adUnit.name}</span> ({adUnit.format})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                ID deste Bloco (adUnitId)
              </span>
              <code className="text-sm font-mono text-emerald-400 select-all">{adUnit.id}</code>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {adUnit.format}
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border border-b-0 border-slate-800 rounded-t-xl">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Kotlin (Android SDK)
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Snippet</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-b-xl text-xs font-mono text-slate-300 overflow-x-auto select-all leading-relaxed">
              {getCodeSnippet()}
            </pre>
          </div>

          <p className="text-xs text-slate-400">
            Certifique-se de que o SDK da MGP foi inicializado no `Application.onCreate()` com a chave de SDK do aplicativo antes de carregar qualquer anúncio.
          </p>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

