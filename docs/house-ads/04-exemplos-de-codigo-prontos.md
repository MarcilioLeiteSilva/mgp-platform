# 04. Exemplos de Código Prontos para Copiar & Colar

Esta seção contém snippets de código completos e prontos para uso em **Kotlin** e **Java** para cada um dos formatos de anúncio suportados pelo MGP SDK.

---

## 1. Banner (320x50 dp)

O componente `MgpBannerView` gerencia requisição, renderização, atualização automática a cada 30-60s e controle de viewability (mínimo 50% visível por mais de 1s para contar impressão).

### A. Adicionando ao Layout XML
```xml
<!-- res/layout/activity_main.xml -->
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- Conteúdo do seu aplicativo (ex: lista de jogos) -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerView"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_above="@id/mgpBannerView" />

    <!-- Banner Fixo no Rodapé -->
    <com.mgp.sdk.ads.banner.MgpBannerView
        android:id="@+id/mgpBannerView"
        android:layout_width="match_parent"
        android:layout_height="50dp"
        android:layout_alignParentBottom="true"
        android:background="#0F172A" />

</RelativeLayout>
```

### B. Inicializando no Código (Kotlin)
```kotlin
package com.zapscore.app

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.mgp.sdk.ads.banner.MgpBannerListener
import com.mgp.sdk.ads.banner.MgpBannerView

class MainActivity : AppCompatActivity() {

    private lateinit var bannerView: MgpBannerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bannerView = findViewById(R.id.mgpBannerView)

        bannerView.setBannerListener(object : MgpBannerListener {
            override fun onAdLoaded() {
                Log.d("MGP", "Banner carregado e renderizado com sucesso.")
            }

            override fun onAdFailedToLoad(error: String) {
                Log.w("MGP", "Falha ao carregar banner: $error")
            }

            override fun onAdClicked() {
                Log.d("MGP", "Usuário clicou no banner da campanha própria.")
            }

            override fun onAdImpressionRecorded() {
                Log.d("MGP", "Impressão oficial registrada com sucesso no Ad Server.")
            }
        })

        // Carrega o anúncio passando o AdUnitId criado no painel da MGP
        bannerView.loadAd("SEU_AD_UNIT_ID_DO_BANNER")
    }

    override fun onDestroy() {
        super.onDestroy()
        bannerView.destroy() // Libera recursos de memória
    }
}
```

### C. Inicializando no Código (Java)
```java
package com.zapscore.app;

import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import com.mgp.sdk.ads.banner.MgpBannerListener;
import com.mgp.sdk.ads.banner.MgpBannerView;

public class MainActivity extends AppCompatActivity {

    private MgpBannerView bannerView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bannerView = findViewById(R.id.mgpBannerView);

        bannerView.setBannerListener(new MgpBannerListener() {
            @Override
            public void onAdLoaded() {
                Log.d("MGP", "Banner carregado.");
            }

            @Override
            public void onAdFailedToLoad(String error) {
                Log.w("MGP", "Erro no banner: " + error);
            }

            @Override
            public void onAdClicked() {
                Log.d("MGP", "Clique no banner registrado.");
            }

            @Override
            public void onAdImpressionRecorded() {
                Log.d("MGP", "Impressão contabilizada.");
            }
        });

        bannerView.loadAd("SEU_AD_UNIT_ID_DO_BANNER");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (bannerView != null) {
            bannerView.destroy();
        }
    }
}
```

---

## 2. Intersticial (Tela Cheia)

O anúncio intersticial ocupa a tela inteira do dispositivo durante pausas naturais de navegação (ex: após o usuário sair da tela de detalhes de um jogo de futebol ou ao trocar de lição no app de idiomas).

### Implementação em Kotlin
```kotlin
package com.zapscore.app

import android.os.Bundle
import android.util.Log
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import com.mgp.sdk.ads.interstitial.MgpInterstitialAd
import com.mgp.sdk.ads.interstitial.MgpInterstitialListener

class MatchDetailActivity : AppCompatActivity() {

    private var interstitialAd: MgpInterstitialAd? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_match_detail)

        // Pré-carrega o anúncio em segundo plano para exibição instantânea
        preloadInterstitial()

        val btnBack = findViewById<Button>(R.id.btnBack)
        btnBack.setOnClickListener {
            showInterstitialAndExit()
        }
    }

    private fun preloadInterstitial() {
        MgpInterstitialAd.load(
            context = this,
            adUnitId = "SEU_AD_UNIT_ID_DO_INTERSTICIAL",
            listener = object : MgpInterstitialListener {
                override fun onAdLoaded(ad: MgpInterstitialAd) {
                    interstitialAd = ad
                    Log.d("MGP", "Intersticial pronto para exibição.")
                }

                override fun onAdFailedToLoad(error: String) {
                    Log.w("MGP", "Falha ao pré-carregar intersticial: $error")
                    interstitialAd = null
                }

                override fun onAdDismissed() {
                    Log.d("MGP", "Usuário fechou o intersticial.")
                    finish() // Continua a ação do usuário (ex: fecha a tela)
                }

                override fun onAdClicked() {
                    Log.d("MGP", "Clique no intersticial.")
                }
            }
        )
    }

    private fun showInterstitialAndExit() {
        val ad = interstitialAd
        if (ad != null && ad.isReady()) {
            ad.show(this)
        } else {
            // Se o anúncio ainda não estiver carregado, não bloqueia o usuário
            finish()
        }
    }
}
```

---

## 3. Vídeo Recompensado (Rewarded Ad)

O anúncio recompensado premia o usuário quando ele assiste a um vídeo completo de 15 a 30 segundos (ex: destravar estatísticas VIP de um jogo, ganhar vidas ou moedas).

### Implementação em Kotlin
```kotlin
package com.zapscore.app

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.mgp.sdk.ads.rewarded.MgpRewardedAd
import com.mgp.sdk.ads.rewarded.MgpRewardedListener
import com.mgp.sdk.ads.rewarded.MgpRewardItem

class VipStatsActivity : AppCompatActivity() {

    private var rewardedAd: MgpRewardedAd? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_vip_stats)

        loadRewardedAd()

        val btnUnlock = findViewById<Button>(R.id.btnUnlockWithVideo)
        btnUnlock.setOnClickListener {
            val ad = rewardedAd
            if (ad != null && ad.isReady()) {
                ad.show(this)
            } else {
                Toast.makeText(this, "Carregando vídeo promocional, aguarde...", Toast.LENGTH_SHORT).show()
                loadRewardedAd()
            }
        }
    }

    private fun loadRewardedAd() {
        MgpRewardedAd.load(
            context = this,
            adUnitId = "SEU_AD_UNIT_ID_DO_REWARDED",
            listener = object : MgpRewardedListener {
                override fun onAdLoaded(ad: MgpRewardedAd) {
                    rewardedAd = ad
                    Log.d("MGP", "Vídeo recompensado pronto.")
                }

                override fun onAdFailedToLoad(error: String) {
                    Log.w("MGP", "Falha ao carregar rewarded: $error")
                    rewardedAd = null
                }

                override fun onUserEarnedReward(reward: MgpRewardItem) {
                    // CONCEDER A RECOMPENSA AO USUÁRIO AQUI
                    Log.d("MGP", "Recompensa concedida: ${reward.amount} ${reward.type}")
                    unlockVipContent()
                }

                override fun onAdDismissed() {
                    Log.d("MGP", "Vídeo fechado.")
                    loadRewardedAd() // Pré-carrega o próximo
                }
            }
        )
    }

    private fun unlockVipContent() {
        Toast.makeText(this, "Estatísticas VIP Liberadas!", Toast.LENGTH_LONG).show()
        // Atualiza a tela exibindo os dados avançados da partida
    }
}
```

---

## 4. Anúncio Nativo (Native Ad)

O anúncio nativo adapta-se perfeitamente ao design do seu aplicativo (como cards no meio de uma lista de partidas de futebol ou notícias):

```kotlin
MgpNativeAd.load(
    context = this,
    adUnitId = "SEU_AD_UNIT_ID_NATIVO",
    listener = object : MgpNativeAdListener {
        override fun onAdLoaded(nativeAd: MgpNativeAd) {
            // Preenche as Views do seu layout customizado:
            txtTitle.text = nativeAd.title
            txtDescription.text = nativeAd.description
            btnCta.text = nativeAd.callToAction // ex: "Instalar"
            imgIcon.setImageUrl(nativeAd.iconUrl)
            
            // Registra a View para tracking automático de viewability e clique
            nativeAd.registerViewForInteraction(adContainerView, btnCta)
        }

        override fun onAdFailedToLoad(error: String) {
            Log.w("MGP", "Nativo indisponível: $error")
        }
    }
)
```
