# 01. Configuração da Hostinger VPS e EasyPanel

Este guia descreve os procedimentos oficiais para o provisionamento do servidor Hostinger VPS, instalação do EasyPanel, configuração de rede, apontamentos de DNS e emissão de certificados SSL.

---

## 1. Especificações Recomendadas do Hostinger VPS

* **Plano Mínimo para MVP:** KVM 4 (4 vCPU, 16 GB RAM, 200 GB NVMe).
* **Plano de Entrada (Validação):** KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe) com Swap de 4GB ativado.
* **Sistema Operacional:** Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS x64 (Clean OS).

---

## 2. Hardening e Preparação do Servidor

Conecte-se via SSH como root e execute o script automatizado de preparação:

```bash
# Baixar ou transferir o script do repositório
curl -fsSL https://raw.githubusercontent.com/seu-usuario/mgp-platform/main/infrastructure/scripts/vps-setup.sh -o vps-setup.sh
chmod +x vps-setup.sh
sudo ./vps-setup.sh
```

### O que o script configura automaticamente:
1. **Swapfile de 4 GB:** Garante tolerância a picos temporários de memória evitando falhas imediatas de processos.
2. **Parâmetros de Kernel (`sysctl`):** Aumenta limites de descritores de arquivo (`fs.file-max = 2097152`) e portas locais para suportar alto volume de requisições concorrentes no Ad Server.
3. **Firewall UFW Estrito:** 
   * Permite apenas portas **22** (SSH), **80** (HTTP), **443** (HTTPS) e **3000** (Painel EasyPanel).
   * **Bloqueia expressamente** portas 5432 (Postgres), 6379 (Redis) e 8123 (ClickHouse) contra acessos da internet externa.
4. **Proteção Fail2ban:** Monitora logs do SSH contra ataques de força bruta.
5. **Docker Engine & EasyPanel:** Instala a versão oficial mais recente e inicia os containers de orquestração.

---

## 3. Configuração de DNS e Subdomínios

No seu registrador de domínio (ex: Registro.br ou Cloudflare), crie os seguintes apontamentos tipo `A` direcionando para o endereço IP público da sua VPS Hostinger:

| Subdomínio | Tipo | Destino (Valor) | Serviço Correspondente |
| :--- | :--- | :--- | :--- |
| `app.mgp.com.br` | A | `<IP_DA_VPS>` | Frontend / Dashboard do Usuário (`mgp-web`) |
| `api.mgp.com.br` | A | `<IP_DA_VPS>` | API Central REST (`mgp-api`) |
| `ads.mgp.com.br` | A | `<IP_DA_VPS>` | Servidor de Anúncios de Baixa Latência (`mgp-adserver`) |
| `admin.mgp.com.br`| A | `<IP_DA_VPS>` | Painel Backoffice e NOC (`mgp-admin`) |
| `cdn.mgp.com.br` | A | `<IP_DA_VPS>` | Servidor de Mídias e Criativos Publicitários |
| `docs.mgp.com.br` | A | `<IP_DA_VPS>` | Portal de Documentação Pública e SDK |
| `status.mgp.com.br`| A | `<IP_DA_VPS>` | Painel de Uptime e Status da Rede |

---

## 4. Configuração do EasyPanel e Emissão de SSL

1. Acesse o EasyPanel no navegador: `http://<IP_DA_VPS>:3000`.
2. Conclua o assistente de primeiro acesso definindo o e-mail e senha mestra do administrador.
3. Crie um novo projeto chamado **`MGP-Production`** (ou `MGP-Staging`).
4. Importe o modelo de serviços usando [`infrastructure/easypanel/easypanel-template.json`](file:///f:/mobile_growth/infrastructure/easypanel/easypanel-template.json).
5. O EasyPanel utiliza o Traefik internamente: ao atribuir cada domínio ao seu respectivo serviço e ativar o botão **HTTPS / SSL**, os certificados Let's Encrypt são gerados e renovados automaticamente sem intervenção manual.
