# 02. Guia do Painel Passo a Passo

Este guia descreve como configurar seus aplicativos, blocos de anúncio e campanhas de House Ads através do painel web oficial da MGP:
👉 **[https://mgp-production-mgp-frontend.gtalg3.easypanel.host/](https://mgp-production-mgp-frontend.gtalg3.easypanel.host/)**

---

## Passo 1: Cadastrar os Aplicativos no Painel

Antes de veicular qualquer anúncio, você deve registrar os seus aplicativos publishers na plataforma para receber a chave secreta de integração (`sdkKey`).

1. Acesse o menu lateral **Meus Aplicativos** (`/apps`).
2. Clique no botão **"Novo Aplicativo"**.
3. Preencha as informações:
   * **Nome do App:** Ex: `Zapscore - Futebol ao Vivo`
   * **Package Name (Android):** Ex: `com.zapscore.app`
   * **Plataforma:** `ANDROID`
   * **Categoria:** `SPORTS` (ou GAMES, EDUCATION, UTILITIES)
4. Clique em **Salvar**.
5. Na listagem de aplicativos, localize o app cadastrado e copie a **SDK Key** gerada (exemplo: `mgp_live_app_xxxxxxxxxxxx`).
   > ⚠️ **Importante:** Guarde esta chave. Ela será utilizada na inicialização do SDK Android no código do seu app.

---

## Passo 2: Criar os Blocos de Anúncio (AdUnits)

Para cada espaço publicitário que o seu aplicativo terá na tela, crie um bloco de anúncio correspondente:

1. Acesse o menu lateral **Blocos de Anúncios** (`/ad-units`).
2. Clique no botão **"Novo Bloco de Anúncio"**.
3. Preencha os campos:
   * **Aplicativo:** Selecione o aplicativo desejado (ex: `Zapscore`).
   * **Nome do Bloco:** Ex: `Banner Rodapé Principal` ou `Intersticial Fim de Partida`.
   * **Formato:** Escolha o formato desejado (`BANNER`, `INTERSTITIAL`, `REWARDED` ou `NATIVE`).
   * **Posicionamento (Placement):** Ex: `BOTTOM_STICKY`, `TRANSITION_SCREEN`, `REWARD_MAP_HEAT`.
   * **Piso de eCPM (Floor eCPM):** Mantenha `0.00` para blocos que receberão House Ads (assim qualquer anúncio próprio será elegível sem restrição de valor mínimo).
4. Clique em **Criar Bloco**.
5. Copie o **Ad Unit ID** gerado (UUID de identificação do bloco).

---

## Passo 3: Criar a Campanha de House Ads

Agora você vai cadastrar a campanha que promoverá um dos seus outros aplicativos:

1. Acesse o menu lateral **Campanhas** (`/campaigns`).
2. Clique no botão **"Nova Campanha"**.
3. No formulário:
   * **Nome da Campanha:** Ex: `Promoção Cruzada - App de Idiomas no Zapscore`.
   * **Tipo da Campanha:** Selecione obrigatoriamente **`HOUSE_AD (Anúncios Próprios - Isento de saldo)`**.
     > 💡 *Nota:* Campanhas `HOUSE_AD` não exigem saldo bancário e não debitam valores da sua carteira.
   * **Modelo de Cobrança (RTB):** Mantenha `CPM` ou `CPC`.
   * **Lance Nominal (Bid Amount):** Defina um valor para ponderar a prioridade (ex: `1.00`). Se tiver várias campanhas de House Ads e quiser dar prioridade a uma delas, defina um lance maior (ex: `2.50`).
   * **Orçamento Diário e Total:** Preencha valores de referência simbólicos (ex: Diário `100.00` e Total `5000.00`).
   * **Frequency Cap (Limite por Hora):** Recomendado `3` a `5` impressões por usuário por hora.
   * **País Alvo:** `BR` (Brasil) ou `ALL`.
4. Clique em **Salvar Campanha**.
5. A campanha será criada inicialmente com status `DRAFT` (Rascunho).

---

## Passo 4: Fazer Upload dos Criativos

Uma campanha precisa de pelo menos um criativo ativo no formato desejado para poder ser iniciada:

1. Na lista de campanhas, clique no botão **"Criativos"** (ícone de imagem/camadas) na linha da campanha criada.
2. No modal de criativos, clique em **"Adicionar Criativo"**.
3. Preencha os dados do criativo:
   * **Formato:** Selecione o mesmo formato do bloco que você quer atender (ex: `BANNER` para 320x50 ou `INTERSTITIAL` para tela cheia).
   * **Título do Anúncio:** Ex: `Aprenda Inglês Rápido!`.
   * **Texto/Descrição:** Ex: `Método comprovado com 15 min por dia. Baixe grátis!`.
   * **URL da Imagem / Banner:** URL pública do banner hospedado (JPG, PNG ou GIF animado).
   * **URL de Destino (Click URL):** Link da Google Play Store do aplicativo promovido.
     > Exemplo: `https://play.google.com/store/apps/details?id=com.seuapp.idiomas&referrer=utm_source%3Dzapscore_housead`
   * **Botão de Ação (CTA):** Ex: `Instalar Agora`, `Jogar Grátis`, `Abrir`.
4. Clique em **Salvar Criativo**.

---

## Passo 5: Ativar a Campanha

1. Com o criativo salvo e ativo, volte à tela de campanhas.
2. Na linha da campanha, altere o status de `DRAFT` para **`ACTIVE`**.
3. A partir deste momento, qualquer requisição enviada pelo SDK com a `sdkKey` e `adUnitId` compatíveis já receberá este anúncio em menos de 30 milissegundos!

---

## Passo 6: Acompanhar os Resultados

No dashboard de campanhas, acompanhe os indicadores em tempo real:
* **Impressões:** Quantas vezes o banner ou tela cheia foi visualizado com pelo menos 50% de área visível por mais de 1 segundo (controle estrito de viewability).
* **Cliques:** Quantos usuários clicaram no anúncio para ir à Play Store.
* **CTR (Click-Through Rate):** Taxa percentual de conversão de cliques por visualização (geralmente entre 1.5% e 6.0% em House Ads bem posicionados).
