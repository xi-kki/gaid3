import { useEffect, useState, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, jwtToAddress } from '@mysten/sui/zklogin';

/// <reference types="vite/client" />

const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK as string) || 'testnet';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export type ZkLoginState =
  | { status: 'idle' }
  | { status: 'ready'; address: string; jwt?: string; salt: string; isDemo?: boolean }
  | { status: 'loading' }
  | { status: 'error'; error: string };

const STORAGE_KEY = 'gaid3_zklogin';

export function useZkLogin() {
  const [state, setState] = useState<ZkLoginState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.status === 'ready' && parsed.address) return parsed;
      }
    } catch {}
    return { status: 'idle' };
  });

  useEffect(() => {
    try {
      if (state.status === 'ready' || state.status === 'idle') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {}
  }, [state]);

  const handleJwtCallback = useCallback(
    async (jwt: string, ephemeralPrivateKey: string, _randomness: string, _maxEpoch: number, _nonce: string) => {
      try {
        setState({ status: 'loading' });

        // Call our API to get salt from Enoki or demo fallback
        const res = await fetch('/api/auth/zklogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-salt', token: jwt }),
        });
        const data = await res.json();
        const salt =
          data.salt ||
          '0x' +
            Array.from(new TextEncoder().encode(jwt.slice(0, 32)))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');

        const address = jwtToAddress(jwt, salt, false);
        const readyState: ZkLoginState = {
          status: 'ready',
          address,
          jwt,
          salt,
          isDemo: false,
        };
        setState(readyState);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readyState));
        sessionStorage.removeItem('gaid3_zklogin_pending');

        // Sync with Walrus memory
        fetch('/api/memory/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `zkLogin connected: ${address} via Google on Sui ${SUI_NETWORK}`,
            profile: { suiAddress: address, network: SUI_NETWORK, method: 'zklogin_google' },
          }),
        }).catch(() => {});

        // Notify Hero to auto-open chat
        window.dispatchEvent(new CustomEvent('gaid3:zklogin:ready', { detail: { address } }));
      } catch (e) {
        setState({ status: 'error', error: e instanceof Error ? e.message : 'Failed to complete login' });
        sessionStorage.removeItem('gaid3_zklogin_pending');
      }
    },
    []
  );

  // 1. Listen for postMessage from zklogin-callback.html popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'GAID3_ZKLOGIN_SUCCESS') {
        const { jwt, ephemeralPrivateKey, randomness, maxEpoch, nonce } = event.data;
        handleJwtCallback(jwt, ephemeralPrivateKey, randomness, maxEpoch, nonce);
      } else if (event.data.type === 'GAID3_ZKLOGIN_ERROR') {
        setState({ status: 'error', error: event.data.error });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleJwtCallback]);

  // 2. Fallback: Parse JWT from URL hash if popup was blocked and redirected in-window
  useEffect(() => {
    const hash = window.location.hash;
    const pending = sessionStorage.getItem('gaid3_zklogin_pending');
    if (hash && (pending || hash.includes('id_token='))) {
      const params = new URLSearchParams(hash.slice(1));
      const jwt = params.get('id_token');
      const error = params.get('error');
      sessionStorage.removeItem('gaid3_zklogin_pending');

      if (error) {
        setState({ status: 'error', error: `Google OAuth error: ${error}` });
        return;
      }
      if (jwt) {
        try {
          const ephemeralData = JSON.parse(sessionStorage.getItem('gaid3_ephemeral') || '{}');
          handleJwtCallback(
            jwt,
            ephemeralData.ephemeralPrivateKey || '',
            ephemeralData.randomness || '',
            ephemeralData.maxEpoch || 1000,
            ephemeralData.nonce || ''
          );
        } catch {
          setState({ status: 'error', error: 'Session expired. Please try again.' });
        }
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, [handleJwtCallback]);

  const login = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      loginDemo();
      return;
    }
    setState({ status: 'loading' });
    try {
      const redirectUri = window.location.origin + '/zklogin-callback.html';
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const maxEpoch = 1000;
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      const nonce = generateNonce(
        ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey,
        maxEpoch,
        randomness
      );

      sessionStorage.setItem(
        'gaid3_ephemeral',
        JSON.stringify({
          ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
          randomness,
          maxEpoch,
          nonce,
          extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(
            ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey
          ),
        })
      );
      sessionStorage.setItem('gaid3_zklogin_pending', 'true');

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      const popup = window.open(authUrl, 'zklogin_google_popup', 'width=520,height=620,status=no,toolbar=no,menubar=no');

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback to full-page redirect if popup blocked
        window.location.assign(authUrl);
      }
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Login initialization failed' });
    }
  }, []);

  const loginDemo = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const keypair = new Ed25519Keypair();
      const address = keypair.toSuiAddress();
      const demoSalt = '0x' + Math.random().toString(16).slice(2, 10) + '00000000';

      sessionStorage.setItem(
        'gaid3_ephemeral',
        JSON.stringify({
          ephemeralPrivateKey: keypair.getSecretKey(),
          randomness: 'demo_randomness',
          maxEpoch: 1000,
          salt: demoSalt,
        })
      );

      setState({
        status: 'ready',
        address,
        salt: demoSalt,
        isDemo: true,
      });

      // Sync demo address with Walrus Memory
      await fetch('/api/memory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Demo Sovereign Wallet initialized: ${address} on Sui ${SUI_NETWORK}`,
          profile: { suiAddress: address, network: SUI_NETWORK, method: 'demo_keypair' },
        }),
      }).catch(() => {});
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Demo wallet creation failed' });
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('gaid3_ephemeral');
    sessionStorage.removeItem('gaid3_zklogin_pending');
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    login,
    loginDemo,
    logout,
    suiNetwork: SUI_NETWORK,
    hasClientId: Boolean(GOOGLE_CLIENT_ID),
  };
}