# 05. Convivência com Google AdMob e Padrão de Fallback (Backfill)

Uma das maiores dúvidas de desenvolvedores e publishers que já monetizam seus aplicativos com o **Google AdMob** é:
> *"Preciso remover o AdMob para usar o House Ads da MGP? Como eles convivem sem conflito?"*

A resposta é: **Eles podem conviver no mesmo aplicativo e inclusive no mesmo bloco de anúncio!**

---

## 1. O Conceito de Fallback (Backfill Inteligente)

O **AdMob** é excelente para gerar receita em dólar, mas **nunca possui 100% de taxa de preenchimento (Fill Rate)**. Em muitos momentos, operadoras, países ou horários de baixo tráfego, o AdMob retorna o evento `onAdFailedToLoad(LoadAdError)`, deixando o espaço da sua tela em branco e desperdiçando impressões valiosas.

O padrão de **Fallback / Backfill** resolve isso:
1. O aplicativo tenta carregar o anúncio do **Google AdMob** primeiro.
2. **Se o AdMob preencher (`onAdLoaded`):** Exibe o anúncio do AdMob e você fatura em dinheiro.
3. **Se o AdMob falhar (`onAdFailedToLoad`):** O listener do seu app aciona **imediatamente o House Ad da MGP**, preenchendo o espaço vazio com a promoção dos seus próprios apps!

```mermaid
flowchart TD
    START["App inicia requisição de anúncio"] --> ADMOB["1. Tenta carregar Google AdMob"]
    ADMOB -->|onAdLoaded| SHOW_ADMOB["Exibe AdMob (Monetização em Dólar/Real)"]
    ADMOB -->|onAdFailedToLoad\n(Sem inventário)| MGP["2. Fallback imediato: Chama MGP House Ads"]
    MGP -->|onAdLoaded| SHOW_MGP["Exibe House Ad (Download dos seus outros apps)"]
    MGP -->|Falha| GONE["Oculta View (Espaço limpo)"]
```

---

## 2. A Regra do Formato: Preciso usar o mesmo formato?

* **No mesmo espaço de tela (Substituição Imediata):** **SIM, deve ser o mesmo formato** para respeitar o layout da Activity:
  * Banner AdMob (320x50) $\rightarrow$ se falhar, substitui por Banner MGP (320x50).
  * Intersticial AdMob (Tela cheia) $\rightarrow$ se falhar, substitui por Intersticial MGP.
  * Rewarded AdMob (Vídeo) $\rightarrow$ se falhar, substitui por Rewarded MGP.
* **Em telas ou momentos diferentes:** **NÃO precisa ser o mesmo formato!**
  * Você pode usar AdMob exclusivamente para Banners de rodapé e usar MGP House Ads para Intersticiais de transição de telas ou Vídeos Recompensados.

---

## 3. Código Completo: Banner AdMob com Fallback Automático para MGP House Ads

### Layout XML (`activity_main.xml`)
Utilizamos um `FrameLayout` como contêiner único. O contêiner recebe o AdMob Banner e, se este falhar, recebe o `MgpBannerView`:

```xml
<!-- Contêiner de Banner no Rodapé -->
<FrameLayout
    android:id="@+id/bannerContainer"
    android:layout_width="match_parent"
    android:layout_height="50dp"
    android:layout_alignParentBottom="true"
    android:background="#0F172A" />
```

### Código em Kotlin (`MainActivity.kt`)
```kotlin
package com.zapscore.app

import android.os.Bundle
import android.util.Log
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.mgp.sdk.ads.banner.MgpBannerListener
import com.mgp.sdk.ads.banner.MgpBannerView

class MainActivity : AppCompatActivity() {

    private lateinit var bannerContainer: FrameLayout
    private var admobAdView: AdView? = null
    private var mgpBannerView: MgpBannerView? = null

    // IDs de Configuração
    private val ADMOB_BANNER_ID = "ca-app-pub-3940256099942544/6300978111" // ID de Teste AdMob
    private val MGP_BANNER_AD_UNIT_ID = "SEU_MGP_BANNER_AD_UNIT_ID"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bannerContainer = findViewById(R.id.bannerContainer)

        // Inicia a cascata tentando o AdMob primeiro
        loadAdmobWithMgpFallback()
    }

    private fun loadAdmobWithMgpFallback() {
        Log.d("AD_MEDIATION", "1. Tentando carregar Google AdMob Banner...")

        admobAdView = AdView(this).apply {
            setAdSize(AdSize.BANNER)
            adUnitId = ADMOB_BANNER_ID
        }

        bannerContainer.removeAllViews()
        bannerContainer.addView(admobAdView)

        admobAdView?.adListener = object : AdListener() {
            override fun onAdLoaded() {
                Log.i("AD_MEDIATION", "Sucesso: AdMob preenchido e exibido.")
            }

            override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                Log.w("AD_MEDIATION", "AdMob sem inventário (código ${loadAdError.code}). Acionando Fallback MGP House Ads...")
                loadMgpHouseAd()
            }
        }

        val adRequest = AdRequest.Builder().build()
        admobAdView?.loadAd(adRequest)
    }

    private fun loadMgpHouseAd() {
        Log.d("AD_MEDIATION", "2. Carregando MGP House Ad Banner como substituto...")

        bannerContainer.removeAllViews()

        mgpBannerView = MgpBannerView(this)
        bannerContainer.addView(mgpBannerView)

        mgpBannerView?.setBannerListener(object : MgpBannerListener {
            override fun onAdLoaded() {
                Log.i("AD_MEDIATION", "Sucesso: MGP House Ad preencheu o espaço vazio!")
            }

            override fun onAdFailedToLoad(error: String) {
                Log.w("AD_MEDIATION", "MGP House Ad indisponível: $error")
            }

            override fun onAdClicked() {
                Log.d("AD_MEDIATION", "Clique no House Ad da MGP.")
            }

            override fun onAdImpressionRecorded() {
                Log.d("AD_MEDIATION", "Impressão do House Ad contabilizada.")
            }
        })

        mgpBannerView?.loadAd(MGP_BANNER_AD_UNIT_ID)
    }

    override fun onDestroy() {
        super.onDestroy()
        admobAdView?.destroy()
        mgpBannerView?.destroy()
    }
}
```

---

## 4. Código Completo: Intersticial com Fallback

```kotlin
class InterstitialManager(private val activity: Activity) {

    private var admobInterstitial: InterstitialAd? = null
    private var mgpInterstitial: MgpInterstitialAd? = null

    fun load(onReady: () -> Unit) {
        // Tenta AdMob primeiro
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(activity, "ADMOB_INTERSTITIAL_ID", adRequest, object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) {
                admobInterstitial = ad
                onReady()
            }

            override fun onAdFailedToLoad(error: LoadAdError) {
                Log.w("INTERSTITIAL", "AdMob falhou. Carregando MGP Interstitial...")
                // Fallback para MGP
                MgpInterstitialAd.load(activity, "MGP_INTERSTITIAL_AD_UNIT_ID", object : MgpInterstitialListener {
                    override fun onAdLoaded(ad: MgpInterstitialAd) {
                        mgpInterstitial = ad
                        onReady()
                    }
                    override fun onAdFailedToLoad(err: String) {
                        Log.e("INTERSTITIAL", "Ambas as redes falharam.")
                    }
                    override fun onAdDismissed() {}
                    override fun onAdClicked() {}
                })
            }
        })
    }

    fun show() {
        if (admobInterstitial != null) {
            admobInterstitial?.show(activity)
        } else if (mgpInterstitial?.isReady() == true) {
            mgpInterstitial?.show(activity)
        }
    }
}
```

---

## 5. Conformidade com as Políticas da Google Play Store

A integração do MGP House Ads segue rigorosamente todas as diretrizes do programa de desenvolvedores da Google Play:

1. **Sem Sobreposição de Anúncios:** O contêiner substitui uma View pela outra (`removeAllViews()`), garantindo que nunca existam dois banners sobrepostos ao mesmo tempo.
2. **Rotulagem de Anúncio:** Os criativos do MGP SDK respeitam os formatos padrão da IAB e incluem o botão "X" de fechamento com área de toque mínima de 48dp no Intersticial.
3. **Não-Indução a Cliques Acidentais:** O SDK posiciona os banners fora de zonas de toque acidental e só registra impressões oficiais quando mais de 50% do banner esteve visível na tela por tempo superior a 1 segundo.
