import * as crypto from 'crypto';
import { AdTrackingTokenPayload } from '@mgp/contracts';

export class TokenService {
  constructor(private readonly secret: string) {}

  /**
   * Gera um token assinado criptograficamente contendo os metadados da transação publicitária.
   * Estrutura: Base64Url(JSON) . HmacHex
   */
  generateTrackingToken(payload: AdTrackingTokenPayload): string {
    const jsonString = JSON.stringify(payload);
    const base64Payload = Buffer.from(jsonString, 'utf-8').toString('base64url');
    const hmac = crypto
      .createHmac('sha256', this.secret)
      .update(base64Payload, 'utf-8')
      .digest('hex');

    return `${base64Payload}.${hmac}`;
  }

  /**
   * Valida e decodifica um token de rastreamento com imunidade a timing attacks.
   * Retorna null se a assinatura for inválida, o formato for malformado ou se o token estiver expirado.
   */
  verifyTrackingToken(token: string): AdTrackingTokenPayload | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [base64Payload, signature] = parts;
    if (!base64Payload || !signature) {
      return null;
    }

    const expectedHmac = crypto
      .createHmac('sha256', this.secret)
      .update(base64Payload, 'utf-8')
      .digest('hex');

    // Validação em tempo constante contra timing side-channel attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    try {
      const jsonString = Buffer.from(base64Payload, 'base64url').toString('utf-8');
      const payload = JSON.parse(jsonString) as AdTrackingTokenPayload;

      // Verifica expiração
      if (!payload.expiresAt || Date.now() > payload.expiresAt) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
