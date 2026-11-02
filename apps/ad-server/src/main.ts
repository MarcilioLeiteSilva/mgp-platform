import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'mgp-adserver' });
});

app.post('/ads/request', (req: Request, res: Response) => {
  // Skeleton implementado para homologação da Fase 03
  res.json({
    requestId: `req_${Date.now()}`,
    fill: false,
    reason: 'AD_SERVER_INITIALIZING',
  });
});

const port = process.env.PORT_ADSERVER || 3001;
app.listen(port, () => {
  console.info(`MGP Ad Server rodando em alta performance na porta ${port}`);
});

