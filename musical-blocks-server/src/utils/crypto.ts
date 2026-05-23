import crypto from 'crypto';

// Secure random HMAC secret generated on server startup
const HMAC_SECRET = process.env.HMAC_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Generates an HMAC signed session token bound to the socket ID and playerName.
 */
export function generateSessionToken(socketId: string, playerName: string): string {
  const payload = `${socketId}:${playerName}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verifies a given HMAC session token.
 * Ensures the signature is valid and corresponds to the specific socket ID.
 */
export function verifySessionToken(token: string, socketId: string): boolean {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [payload, signature] = parts;
  const [tokenSocketId] = payload.split(':');
  
  // Guard: Token MUST belong to this socket connection
  if (tokenSocketId !== socketId) return false;
  
  const expectedHmac = crypto.createHmac('sha256', HMAC_SECRET);
  expectedHmac.update(payload);
  const expectedSignature = expectedHmac.digest('hex');
  
  // Constant time comparison to mitigate timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}
