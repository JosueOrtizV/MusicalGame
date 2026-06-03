import { describe, test, expect } from 'vitest';
import { generateSessionToken, verifySessionToken } from './crypto';

describe('Crypto Utility', () => {
  test('generateSessionToken should create a token with payload and signature', () => {
    const token = generateSessionToken('socket-1', 'Josue');
    expect(token).toContain('socket-1');
    expect(token).toContain('Josue');
    expect(token).toContain('.');
    
    const parts = token.split('.');
    expect(parts.length).toBe(2);
  });

  test('verifySessionToken should validate correct token and matching socket ID', () => {
    const token = generateSessionToken('socket-1', 'Josue');
    const isValid = verifySessionToken(token, 'socket-1');
    expect(isValid).toBe(true);
  });

  test('verifySessionToken should reject if socket ID does not match token', () => {
    const token = generateSessionToken('socket-1', 'Josue');
    // Verify with a different socket ID (potential hijack attempt)
    const isValid = verifySessionToken(token, 'socket-2');
    expect(isValid).toBe(false);
  });

  test('verifySessionToken should reject if token is signature-tampered', () => {
    const token = generateSessionToken('socket-1', 'Josue');
    const parts = token.split('.');
    
    // Modify one character of the signature
    const tamperedSignature = parts[1].replace(/.$/, parts[1][0] === 'a' ? 'b' : 'a');
    const tamperedToken = `${parts[0]}.${tamperedSignature}`;
    
    const isValid = verifySessionToken(tamperedToken, 'socket-1');
    expect(isValid).toBe(false);
  });

  test('verifySessionToken should reject malformed tokens', () => {
    expect(verifySessionToken('', 'socket-1')).toBe(false);
    expect(verifySessionToken('no-dot-token', 'socket-1')).toBe(false);
    expect(verifySessionToken('a.b.c', 'socket-1')).toBe(false);
  });
});
