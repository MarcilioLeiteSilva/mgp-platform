# Regras de ofuscação e retenção de símbolos públicos do MGP Android SDK
-keep public class com.mgp.sdk.MGP { *; }
-keep public class com.mgp.sdk.MgpConfig { *; }
-keep public class com.mgp.sdk.ads.** { *; }
-keep class com.mgp.sdk.telemetry.** { *; }
-keepattributes *Annotation*
-dontwarn com.google.android.gms.ads.identifier.**

