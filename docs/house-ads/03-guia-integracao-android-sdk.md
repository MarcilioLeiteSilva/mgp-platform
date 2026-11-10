# 03. Guia de Integração do SDK Android

Este manual técnico orienta desenvolvedores Android na importação e configuração do **MGP Android SDK (Kotlin)** no projeto host (ex: Zapscore).

---

## 1. Requisitos do Sistema

* **Android Studio:** Hedgehog (2023.1.1) ou superior.
* **JDK:** Java 17 ou superior.
* **Min SDK:** Android 7.0 (API Level 24) ou superior.
* **Target / Compile SDK:** Android 14 (API Level 34).
* **Linguagens Suportadas:** Kotlin 1.9+ ou Java 8+.

---

## 2. Importação do SDK no Projeto

### Opção A: Importação via Arquivo `.aar` Local (Recomendado para Testes Imediatos)

1. Copie o arquivo compilado `mgp-sdk-release.aar` para a pasta `libs/` do seu módulo Android (geralmente `app/libs/`).
2. No arquivo `app/build.gradle` (ou `app/build.gradle.kts`), adicione a dependência:

```kotlin
// build.gradle.kts (Kotlin DSL)
dependencies {
    implementation(files("libs/mgp-sdk-release.aar"))
    
    // Dependências obrigatórias de suporte do AndroidX
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-process:2.8.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
```

Ou em Groovy:
```groovy
// build.gradle (Groovy)
dependencies {
    implementation files('libs/mgp-sdk-release.aar')
    
    implementation 'androidx.core:core-ktx:1.13.1'
    implementation 'androidx.lifecycle:lifecycle-process:2.8.4'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1'
    implementation 'androidx.work:work-runtime-ktx:2.9.1'
}
```

---

## 3. Configuração do `AndroidManifest.xml`

Abra o arquivo `app/src/main/AndroidManifest.xml` e certifique-se de que as seguintes permissões estão presentes:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissões necessárias para carregar anúncios e telemetria -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Permissão recomendada da Google Play para ID de Publicidade (Frequency Capping) -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />

    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:theme="@style/Theme.MyApp">

        <!-- Seus componentes normais -->

    </application>
</manifest>
```

---

## 4. Inicialização no `Application.onCreate()`

O SDK deve ser inicializado uma única vez durante o ciclo de inicialização do aplicativo, na classe customizada derivada de `Application`.

A inicialização do MGP SDK é **completamente assíncrona e não-bloqueante**, liberando a Main Thread em **menos de 10 milissegundos**, sem impactar o tempo de inicialização a frio (cold start) do seu app.

### Em Kotlin:
```kotlin
package com.zapscore.app

import android.app.Application
import com.mgp.sdk.MGP
import com.mgp.sdk.MgpConfig

class ZapscoreApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Configuração do SDK com a sua chave obtida no painel MGP
        val config = MgpConfig.Builder("mgp_live_app_sua_chave_aqui")
            .setDebugMode(BuildConfig.DEBUG) // ativa logs detalhados durante o desenvolvimento
            .setAutoCollectLifecycle(true)   // rastreia abertura e tempo de sessão automaticamente
            .build()

        MGP.initialize(this, config)
    }
}
```

### Em Java:
```java
package com.zapscore.app;

import android.app.Application;
import com.mgp.sdk.MGP;
import com.mgp.sdk.MgpConfig;

public class ZapscoreApp extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        MgpConfig config = new MgpConfig.Builder("mgp_live_app_sua_chave_aqui")
            .setDebugMode(BuildConfig.DEBUG)
            .setAutoCollectLifecycle(true)
            .build();

        MGP.initialize(this, config);
    }
}
```

---

## 5. Parâmetros Avançados de Configuração (`MgpConfig`)

Você pode personalizar o comportamento do SDK através do `MgpConfig.Builder`:

| Método | Tipo Padrão | Descrição |
| :--- | :--- | :--- |
| `setDebugMode(Boolean)` | `false` | Se `true`, emite logs detalhados com a tag `MGP_SDK` no Logcat. Deve ser `false` em builds de produção para a Play Store. |
| `setAutoCollectLifecycle(Boolean)` | `true` | Habilita o rastreamento automático do ciclo de vida do app (`APP_OPEN`, `SESSION_START`, `SESSION_HEARTBEAT`). |
| `setHeartbeatInterval(Long)` | `60L` | Intervalo em segundos para envio de pulso de presença do app ativo (mínimo 10 segundos). |
| `setAdServerUrl(String)` | Produção | Permite alterar a URL base do Ad Server (já configurada para a nuvem EasyPanel por padrão). |
