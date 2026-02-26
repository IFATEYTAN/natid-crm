import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { applyDemoMode } from '@/demo/applyDemoMode';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

export const base44 = applyDemoMode(client);
