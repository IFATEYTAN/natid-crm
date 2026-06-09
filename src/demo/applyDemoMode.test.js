import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyDemoMode } from './applyDemoMode';

const DEMO_KEY = 'natid_demo_mode';

/** Build a fake Base44 client that resembles the real SDK surface. */
function makeFakeClient() {
  return {
    entities: new Proxy(
      {},
      {
        get: (_t, name) => ({
          list: vi.fn(() => Promise.resolve([{ id: 'real', __from: name }])),
          get: vi.fn((id) => Promise.resolve({ id, __from: name })),
        }),
      }
    ),
    auth: {
      me: vi.fn(() => Promise.resolve({ id: 'real_user', role: 'operator' })),
      updateMe: vi.fn((d) => Promise.resolve({ id: 'real_user', ...d })),
      logout: vi.fn(),
      redirectToLogin: vi.fn(),
      loginWithProvider: vi.fn(() => 'provider-redirect'),
      loginViaEmailPassword: vi.fn(() => Promise.resolve({ ok: true })),
      register: vi.fn(() => Promise.resolve({ ok: true })),
      resetPasswordRequest: vi.fn(() => Promise.resolve({ ok: true })),
    },
    functions: { invoke: vi.fn(() => Promise.resolve({ real: true })) },
    users: { inviteUser: vi.fn() },
    appLogs: { logUserInApp: vi.fn() },
  };
}

describe('applyDemoMode — auth passthrough', () => {
  beforeEach(() => {
    localStorage.removeItem(DEMO_KEY);
    // Ensure URL has no ?demo override leaking between tests
    window.history.replaceState({}, '', '/');
  });

  it('keeps real login methods callable when demo mode is OFF', async () => {
    const client = makeFakeClient();
    // applyDemoMode reassigns client.auth to a proxy, so capture the real spies first.
    const realAuth = client.auth;
    const wrapped = applyDemoMode(client);

    expect(typeof wrapped.auth.loginWithProvider).toBe('function');
    wrapped.auth.loginWithProvider('google', '/Dashboard');
    expect(realAuth.loginWithProvider).toHaveBeenCalledWith('google', '/Dashboard');

    await wrapped.auth.loginViaEmailPassword('a@b.com', 'secret');
    await wrapped.auth.register({ email: 'x@y.com' });
    await wrapped.auth.resetPasswordRequest('a@b.com');
    expect(realAuth.loginViaEmailPassword).toHaveBeenCalled();
    expect(realAuth.register).toHaveBeenCalled();
    expect(realAuth.resetPasswordRequest).toHaveBeenCalled();

    const me = await wrapped.auth.me();
    expect(me.id).toBe('real_user');
    expect(realAuth.me).toHaveBeenCalled();
  });

  it('returns the demo user from auth.me() when demo mode is ON', async () => {
    localStorage.setItem(DEMO_KEY, 'true');
    const client = makeFakeClient();
    const wrapped = applyDemoMode(client);

    const me = await wrapped.auth.me();
    expect(me.role).toBe('admin');
    // Real login methods remain functions even in demo mode (no crash on access)
    expect(typeof wrapped.auth.loginWithProvider).toBe('function');
  });
});

describe('applyDemoMode — entity methods in demo mode', () => {
  beforeEach(() => {
    localStorage.setItem(DEMO_KEY, 'true');
    window.history.replaceState({}, '', '/');
  });

  it('exposes get/list/bulkCreate/subscribe on mock entities', async () => {
    const client = makeFakeClient();
    const wrapped = applyDemoMode(client);
    const Call = wrapped.entities.Call;

    expect(typeof Call.get).toBe('function');
    expect(typeof Call.bulkCreate).toBe('function');
    expect(typeof Call.subscribe).toBe('function');

    // subscribe returns an unsubscribe function and does not throw
    const unsub = Call.subscribe(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});
