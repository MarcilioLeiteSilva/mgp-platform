#!/usr/bin/env bash
# ==============================================================================
# Mobile Growth Platform (MGP) — VPS Provisioning & Hardening Script
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS (Hostinger VPS)
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo ">>> Iniciando provisionamento e hardening da Hostinger VPS"
echo "=========================================================="

# 1. Atualização do Sistema Operacional
echo ">>> [1/7] Atualizando repositórios e pacotes do sistema..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw fail2ban htop unzip jq ca-certificates gnupg lsb-release

# 2. Configuração de Memória Swap (4GB para estabilidade contra OOM em VPS)
echo ">>> [2/7] Verificando e configurando Swap..."
if [ ! -f /swapfile ]; then
    echo "Criando arquivo de swap de 4GB..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=20
    echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf
else
    echo "Swap já configurado."
fi

# 3. Otimizações de Rede e Kernel (sysctl) para Ad Server e WebSockets
echo ">>> [3/7] Aplicando otimizações de rede para alta concorrência..."
sudo tee -a /etc/sysctl.conf <<EOF
# Otimizações de rede MGP
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
EOF
sudo sysctl -p

# 4. Configuração do Firewall (UFW)
echo ">>> [4/7] Configurando regras de firewall UFW..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Let’s Encrypt'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 3000/tcp comment 'EasyPanel Web UI'
# NUNCA expor 5432 (Postgres) ou 6379 (Redis) para a internet externa!
sudo ufw --force enable
sudo ufw status verbose

# 5. Configuração do Fail2Ban para proteção contra Brute-Force SSH
echo ">>> [5/7] Ativando Fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 6. Instalação do Docker Engine e Docker Compose Plugin
echo ">>> [6/7] Instalando Docker Engine oficial..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Docker instalado com sucesso."
else
    echo "Docker já está instalado."
fi

# 7. Instalação do EasyPanel
echo ">>> [7/7] Instalando EasyPanel..."
if ! docker ps -a | grep -q "easypanel"; then
    curl -sSL https://get.easypanel.io | sudo bash
    echo "EasyPanel instalado com sucesso! Acesse em http://<IP_DO_VPS>:3000"
else
    echo "Container do EasyPanel já em execução."
fi

echo "=========================================================="
echo ">>> Provisionamento e Hardening da VPS concluídos com sucesso!"
echo "=========================================================="
