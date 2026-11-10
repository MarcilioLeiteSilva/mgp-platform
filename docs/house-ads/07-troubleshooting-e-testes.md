# 07. Troubleshooting e Testes

Este guia fornece orientações para diagnosticar, testar e homologar a exibição de anúncios do **MGP House Ads** durante o desenvolvimento e publicação de seus aplicativos.

---

## 1. Depuração via Android Studio Logcat

Ao inicializar o SDK com `.setDebugMode(true)`, todas as operações internas são registradas detalhadamente no Logcat.

No campo de busca do Logcat, filtre por:
```text
tag:MGP_SDK
```

### Exemplos de Logs Normais:
```text
I/MGP_SDK: [Core] Inicializando MGP Android SDK v0.1.0 para key: mgp_live_app_...
D/MGP_SDK: [AdHttpClient] Enviando requisição de anúncio para: /ads/decision (AdUnit: 7b8f...)
I/MGP_SDK: [AdHttpClient] Resposta RTB recebida com sucesso em 28ms (Fill: true, Creative: cr_91a...)
D/MGP_SDK: [BannerView] Banner renderizado na tela (320x50dp). Iniciando monitoramento de viewability.
I/MGP_SDK: [BannerView] Viewability validada (100% visível por 1.2s). Enviando evento de impressão...
```

---

## 2. Códigos de Erro Comuns e Soluções

Caso o listener retorne `onAdFailedToLoad(error)`, consulte a tabela abaixo para identificar a causa e aplicar a solução:

| Código de Erro / Mensagem | Causa Provável | Solução |
| :--- | :--- | :--- |
| `UNAUTHORIZED_MISSING_SDK_KEY` | A `sdkKey` passada no `MgpConfig.Builder` está vazia ou nula. | Verifique se a chave do app foi passada corretamente no `Application.onCreate()`. |
| `UNAUTHORIZED_INVALID_OR_INACTIVE_APP` | A `sdkKey` informada não existe no banco de dados ou o app foi marcado como inativo. | Confira a chave no painel web (`/apps`) e certifique-se de que o aplicativo está ativo. |
| `NO_CREATIVES_AVAILABLE` | Não há campanhas de House Ads ativas com criativos no formato solicitado. | Acesse o painel (`/campaigns`), verifique se a campanha está com status `ACTIVE` e se há criativos salvos no formato exato do bloco (ex: `BANNER` ou `INTERSTITIAL`). |
| `FREQUENCY_CAPPED` | O usuário do dispositivo de teste atingiu o limite de exibições por hora. | Aguarde o próximo ciclo ou, em desenvolvimento, crie uma segunda campanha de House Ads para testar a rotação automática. |
| `AD_UNIT_NOT_FOUND` | O `adUnitId` passado no método `loadAd` não existe ou pertence a outro app. | Copie o ID exato do bloco no menu **Blocos de Anúncios** (`/ad-units`) do painel. |

---

## 3. Teste de Resiliência Offline

O SDK da MGP possui uma camada de armazenamento local em banco SQLite com sincronização assíncrona via `WorkManager`. Isso significa que:

1. Se o usuário estiver sem internet no momento de uma partida (sinal fraco ou modo avião):
   * O SDK não trava nem causa travamento na interface (`ANR`).
   * A tentativa falha de forma graciosa sem impactar a navegação do usuário.
2. Se o usuário visualizou o anúncio e a internet oscilou antes de confirmar o evento:
   * O evento de impressão ou clique fica enfileirado no banco local criptografado.
   * Assim que a conectividade for restaurada, o `WorkManager` despacha o lote pendente em segundo plano para o Ad Server.

---

## 4. Checklist Pré-Lançamento na Google Play Store

Antes de gerar o pacote final `AAB` (Android App Bundle) e publicar o seu aplicativo na Google Play:

- [ ] **Desativar o Modo Debug:** No `Application`, garanta que `.setDebugMode(false)` esteja configurado em builds de produção:
  ```kotlin
  .setDebugMode(BuildConfig.DEBUG) // false automaticamente em builds Release
  ```
- [ ] **Configuração do ProGuard / R8:** Se você utiliza ofuscação no seu app, adicione as regras no arquivo `proguard-rules.pro`:
  ```proguard
  # Regras do MGP Android SDK
  -keep class com.mgp.sdk.** { *; }
  -keepclassmembers class com.mgp.sdk.** { *; }
  ```
- [ ] **Permissão do Advertising ID:** Certifique-se de que a permissão `com.google.android.gms.permission.AD_ID` esteja no `AndroidManifest.xml` para garantir o controle correto de frequency capping em dispositivos Android 13+.
- [ ] **Conferir Links da Google Play:** Teste todos os criativos cadastrados no painel clicando neles para garantir que abrem diretamente a página de download do app de destino.
