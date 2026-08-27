import { useEffect, useState, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, jwtToAddress } from '@mysten/sui/zklogin';
import { CoreClient } from '@mysten/sui/client';

/// <reference types="vite/client" />

const getFullnodeUrl = (net: string) => `https://fullnode.${net === 'mainnet' ? '' : net + '.'}sui.io:443`;

const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK as string) || 'testnet';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export type ZkLoginState =
  | { status: 'idle' }
  | { status: 'ready'; address: string; jwt: string; salt: string }
  | { status: 'loading' }
  | { status: 'error'; error: string };

const STORAGE_KEY = 'gaid3_zklogin';

// CoreClient is abstract in types but concrete at runtime - use type assertion
const SuiClient = CoreClient as unknown as new (options: { url: string }) => { getObjects: (...args: unknown[]) => Promise<unknown> };

function getSuiClient() {
  return new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
}
export function useZkLogin() {
  const [state, setState] = useState<ZkLoginState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ZkLoginState;
    } catch {}
    return { status: 'idle' };
  });

  useEffect(() => {
    try {
      if (state.status === 'ready' || state.status === 'idle') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Parse JWT from URL hash after Google redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.slice(1));
      const idToken = params.get('id_token');
      const saved = sessionStorage.getItem('gaid3_ephemeral');
      if (idToken && saved) {
        const { salt: savedSalt } = JSON.parse(saved) as {
          ephemeralPrivateKey: string;
          randomness: string;
          maxEpoch: number;
          salt: string;
        };
        const finalize = async () => {
          try {
            setState({ status: 'loading' });
            // Get salt from server (Enoki key stays server-side)
            let salt = savedSalt;
            try {
              const res = await fetch('/api/auth/zklogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get-salt', token: idToken }),
              });
              if (res.ok) {
                const data = (await res.json()) as { salt: string; source?: string };
                if (data.salt) salt = data.salt;
              }
            } catch {}
            const address = jwtToAddress(idToken, salt, false);
            void getSuiClient();
            setState({ status: 'ready', address, jwt: idToken, salt });
            window.history.replaceState(null, '', window.location.pathname);
            sessionStorage.removeItem('gaid3_ephemeral');
            // Attach to Walrus memory
            try {
              await fetch('/api/memory/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `zkLogin connected: ${address} via Google (Gaid3)`, profile: { suiAddress: address } }),
              });
            } catch {}
          } catch (e) {
            setState({ status: 'error', error: e instanceof Error ? e.message : 'zkLogin failed' });
          }
        };
        finalize();
      }
    }
  }, []);

  const login = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setState({ status: 'error', error: 'Google OAuth not configured' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const maxEpoch = 20;
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      // Type assertion: Ed25519PublicKey extends PublicKey but TS doesn't know
      const nonce = generateNonce(ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey, maxEpoch, randomness);

      sessionStorage.setItem(
        'gaid3_ephemeral',
        JSON.stringify({
          ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
          randomness,
          maxEpoch,
          extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey),
        })
      );

      const redirectUri = window.location.origin + window.location.pathname;
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,
      });
      window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Login init failed' });
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('gaid3_ephemeral');
    setState({ status: 'idle' });
  }, []);

  return { state, login, logout, suiNetwork: SUI_NETWORK, hasClientId: Boolean(GOOGLE_CLIENT_ID) };
}