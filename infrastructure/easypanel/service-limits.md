# Dimensionamento e Limites de Recursos dos Serviços (EasyPanel / Docker)

Este documento estabelece o perfil de dimensionamento de CPU e Memória RAM para cada container do ecossistema MGP em ambiente de produção e homologação, prevenindo paradas acidentais por *Out-Of-Memory (OOM Killer)*.

---

## 1. Matriz de Dimensionamento de Recursos (VPS 16GB RAM / 8 vCPUs Recomendada)

| Serviço EasyPanel | Imagem / Build | Reserva RAM | Limite Máximo RAM | Reserva CPU | Limite Máximo CPU | Prioridade de Sobrevivência (OOM Score) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`mgp-postgres`** | `postgres:16-alpine` | 1024 MB | 2048 MB | 0.5 vCPU | 2.0 vCPU | **Máxima (Não derrubar)** |
| **`mgp-redis`** | `redis:7-alpine` | 512 MB | 1024 MB | 0.25 vCPU | 1.5 vCPU | **Máxima (Não derrubar)** |
| **`mgp-adserver`** | `Dockerfile.adserver`| 512 MB | 1536 MB | 1.0 vCPU | 2.0 vCPU | **Alta** |
| **`mgp-api`** | `Dockerfile.api` | 512 MB | 1024 MB | 0.5 vCPU | 1.5 vCPU | **Alta** |
| **`mgp-workers`** | `Dockerfile.workers` | 512 MB | 1024 MB | 0.25 vCPU | 1.0 vCPU | **Média** (Pode reiniciar sob pressão) |
| **`mgp-web`** | `Dockerfile.web` | 512 MB | 1024 MB | 0.25 vCPU | 1.0 vCPU | **Alta** |
| **`mgp-admin`** | `Dockerfile.admin` | 256 MB | 512 MB | 0.25 vCPU | 1.0 vCPU | **Baixa** |
| **Total Mínimo Reservado** | — | **3.8 GB** | **8.1 GB** | **3.0 vCPUs**| **10.0 vCPUs** (Burst)| — |

> [!NOTE]
> O EasyPanel e o sistema operacional Linux reservam ~1.5 GB de RAM. Um Hostinger VPS com 8 GB de RAM atende confortavelmente o início da operação com até 100.000 requisições diárias. Ao ultrapassar essa marca, o upgrade para VPS de 16 GB garante tranquilidade operacional.

---

## 2. Parâmetros de Ajuste Fino do PostgreSQL (`postgresql.conf`)

Para evitar que o PostgreSQL consuma toda a memória do host, configure as seguintes variáveis no EasyPanel (Environment ou comando customizado):

```ini
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 128MB
max_connections = 100
checkpoint_completion_target = 0.9
```

---

## 3. Política de Memória do Redis (`redis.conf`)

O Redis precisa de um teto de memória e uma política de descarte explícita para chaves temporárias:

```ini
maxmemory 768mb
maxmemory-policy volatile-lru
```
* **Comportamento:** Ao atingir 768MB, chaves com tempo de expiração definido (como tokens e cache de campanhas) serão descartadas em modelo LRU (Least Recently Used), preservando as estruturas permanentes de filas BullMQ.

