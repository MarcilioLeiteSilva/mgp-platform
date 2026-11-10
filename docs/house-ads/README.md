# MGP House Ads & Cross-Promotion — Documentação Oficial do Publisher

Bem-vindo à documentação oficial do ecossistema de **House Ads (Anúncios Próprios) e Promoção Cruzada (Cross-Promotion)** da **Mobile Growth Platform (MGP)**.

Este manual foi desenvolvido especificamente para desenvolvedores e publishers que gerenciam aplicativos próprios publicados (como o **Zapscore**, cursos de idiomas, jogos e ferramentas utilitárias) e desejam utilizar a infraestrutura da MGP para veicular anúncios de seus próprios produtos, garantindo 100% de preenchimento de inventário e crescendo sua base de usuários sem custos com mídia paga.

---

## Índice da Documentação

A documentação está organizada de forma modular para cobrir desde a estratégia de negócio até a implementação em código:

| Documento | Descrição |
| :--- | :--- |
| [**01. Visão Geral e Estratégia**](./01-visao-geral-e-estrategia.md) | O que é House Ads na MGP, matriz de cross-promotion, vantagens comerciais e arquitetura RTB. |
| [**02. Guia do Painel Passo a Passo**](./02-guia-do-painel-passo-a-passo.md) | Como cadastrar apps, gerar chaves de SDK, criar blocos de anúncio e configurar campanhas no painel. |
| [**03. Guia de Integração do SDK Android**](./03-guia-integracao-android-sdk.md) | Requisitos mínimos, importação do `.aar`/Gradle, permissões no Manifest e inicialização no `Application`. |
| [**04. Exemplos de Código Prontos**](./04-exemplos-de-codigo-prontos.md) | Códigos completos prontos para copiar e colar para **Banner**, **Intersticial**, **Rewarded** e **Nativo** (Kotlin e Java). |
| [**05. Convivência com AdMob e Fallback**](./05-convivencia-com-admob-e-fallback.md) | Como fazer AdMob e House Ads conviverem no mesmo app, padrão de substituição automática (Backfill) e regras da Google Play. |
| [**06. Caso Prático: Zapscore**](./06-caso-pratico-zapscore.md) | Arquitetura real de implementação no app de futebol Zapscore (placar ao vivo, mapa de calor VIP e cross-promotion). |
| [**07. Troubleshooting e Testes**](./07-troubleshooting-e-testes.md) | Depuração via Logcat, simulação offline, validação de requisições no Ad Server e códigos de erro. |

---

## Endpoints Oficiais em Produção

Todos os aplicativos integrados ao MGP SDK conectam-se diretamente à nossa infraestrutura de alta performance hospedada na nuvem:

* **Ad Server RTB (Ultra-baixa latência < 30ms):**
  `https://mgp-production-mgp-adserver.gtalg3.easypanel.host`
* **API Central de Gestão & Telemetria:**
  `https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1`
* **Painel Web do Publisher / Desenvolvedor:**
  `https://mgp-production-mgp-frontend.gtalg3.easypanel.host/`
