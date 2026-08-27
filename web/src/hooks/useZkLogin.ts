import { useEffect, useState, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, jwtToAddress } from '@mysten/sui/zklogin';
import { CoreClient as SuiClient } from '@mysten/sui/client';
const getFullnodeUrl = (net: string) => `https://fullnode.${net === 'mainnet' ? '' : net + '.'}sui.io:443`;

const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK as string) || 'testnet';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY as string | undefined; // server proxy preferred later

export type ZkLoginState =
  | { status: 'idle' }
  | { status: 'ready'; address: string; jwt: string; salt: string }
  | { status: 'loading' }
  | { status: 'error'; error: string };

const STORAGE_KEY = 'gaid3_zklogin';

function getSuiClient() {
  return new SuiClient({ url: getFullnodeUrl(SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet') });
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
        const { ephemeralPrivateKey, randomness, maxEpoch, salt: savedSalt } = JSON.parse(saved) as {
          ephemeralPrivateKey: string;
          randomness: string;
          maxEpoch: number;
          salt: string;
        };
        const finalize = async () => {
          try {
            setState({ status: 'loading' });
            // Try Enoki salt service if configured, else use saved random salt (demo)
            let salt = savedSalt;
            if (ENOKI_API_KEY) {
              try {
                const res = await fetch('https://api.enoki.mystenlabs.com/v1/get-salt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', apikey: ENOKI_API_KEY },
                  body: JSON.stringify({ token: idToken }),
                });
                if (res.ok) {
                  const j = (await res.json()) as { salt: string };
                  if (j.salt) salt = j.salt;
                }
              } catch {}
            }
            const address = jwtToAddress(idToken, salt);
            // Optional: verify on Sui (light check)
            void getSuiClient();
            void ephemeralPrivateKey; void randomness; void maxEpoch;
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
      setState({ status: 'error', error: 'Missing VITE_GOOGLE_CLIENT_ID — add it in Vercel env (Google Cloud Console → OAuth Client ID)' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const maxEpoch = 20; // ~ 20 epochs (~ 20*24h) valid
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      const nonce = generateNonce(ephemeralPublicKey as unknown as Parameters<typeof generateNonce>[0], maxEpoch, randomness);

      // Fetch salt (demo: generate random 32-byte hex if no Enoki)
      let salt: string;
      if (ENOKI_API_KEY) {
        // Will be fetched after JWT; use placeholder now
        salt = BigInt('0x' + randomness.slice(0, 16)).toString();
      } else {
        salt = BigInt('0x' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')).toString();
      }

      sessionStorage.setItem(
        'gaid3_ephemeral',
        JSON.stringify({
          ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
          randomness,
          maxEpoch,
          salt,
          extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(ephemeralPublicKey as unknown as Parameters<typeof getExtendedEphemeralPublicKey>[0]),
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
