import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiUrl } from './constants';

describe('getApiUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hostname: 'localhost',
        protocol: 'http:',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
  });

  it('falls back to window hostname on port 3001 if VITE_API_URL is missing', () => {
    vi.stubEnv('VITE_API_URL', '');
    window.location.hostname = 'my-custom-host';
    window.location.protocol = 'https:';
    expect(getApiUrl()).toBe('https://my-custom-host:3001/api/v1');
  });

  it('returns VITE_API_URL as-is if hostname matches', () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.1.121:3001/api/v1');
    window.location.hostname = '192.168.1.121';
    expect(getApiUrl()).toBe('http://192.168.1.121:3001/api/v1');
  });

  it('swaps the hostname dynamically if window location hostname differs from VITE_API_URL hostname', () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.1.121:3001/api/v1');
    window.location.hostname = '36.93.22.142';
    expect(getApiUrl()).toBe('http://36.93.22.142:3001/api/v1');
  });

  it('keeps the protocol, port and path of VITE_API_URL when swapping hostname', () => {
    vi.stubEnv('VITE_API_URL', 'https://lan-ip-address:8080/custom/api');
    window.location.hostname = 'public-domain.com';
    expect(getApiUrl()).toBe('https://public-domain.com:8080/custom/api');
  });
});
