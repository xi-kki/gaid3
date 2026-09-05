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
      if (state.status === 'ready' || state.status === 'idle') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Parse JWT from URL hash after Google redirect (fallback for popup block)
  useEffect(() => {
    const hash = window.location.hash;
    const pending = sessionStorage.getItem('gaid3_zklogin_pending');
    if (hash && pending) {
      const params = new URLSearchParams(hash.slice(1));
      const jwt = params.get('id_token');
      const error = params.get('error');
      sessionStorage.removeItem('gaid3_zklogin_pending');
      
      if (error) {
        setState({ status: 'error', error: `Google OAuth error: ${error}` });
        return;
      }
      if (jwt) {
        // Retrieve ephemeral data from sessionStorage
        try {
          const ephemeralData = JSON.parse(sessionStorage.getItem('gaid3_ephemeral') || '{}');
          if (ephemeralData.ephemeralPrivateKey) {
            handleJwtCallback(
              jwt,
              ephemeralData.ephemeralPrivateKey,
              ephemeralData.randomness,
              ephemeralData.maxEpoch,
              ephemeralData.nonce
            );
          }
        } catch {
          setState({ status: 'error', error: 'Session expired. Please try again.' });
        }
      }
      // Clean hash from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  const handleJwtCallback = useCallback(async (jwt: string, ephemeralPrivateKey: string, randomness: string, maxEpoch: number, nonce: string) => {
    try {
      setState({ status: 'loading' });
      
      // Reconstruct keypair from stored private key
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(ephemeralPrivateKey);
      
      // Call our API to get salt from Enoki
      const res = await fetch('/api/auth/zklogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-salt', token: jwt }),
      });
      const data = await res.json();
      if (!res.ok || !data.salt) {
        throw new Error(data.error || 'Failed to get salt from Enoki');
      }

      const salt = data.salt;
      const address = jwtToAddress(jwt, salt, false);
      const readyState: ZkLoginState = {
        status: 'ready',
        address,
        jwt,
        salt,
      };
      setState(readyState);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readyState));
      sessionStorage.removeItem('gaid3_ephemeral');
      sessionStorage.removeItem('gaid3_zklogin_pending');
      
      // Notify parent (Hero) to open chat drawer
      window.dispatchEvent(new CustomEvent('gaid3:zklogin:ready', { detail: { address } }));
      
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Failed to complete login' });
      sessionStorage.removeItem('gaid3_ephemeral');
      sessionStorage.removeItem('gaid3_zklogin_pending');
    }
  }, []);

  const login = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setState({ status: 'error', error: 'Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID in Vercel env vars.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      // Use popup window with callback page
      const redirectUri = window.location.origin + '/zklogin-callback.html';
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      const maxEpoch = 20;
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      const nonce = generateNonce(ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey, maxEpoch, randomness);

      sessionStorage.setItem(
        'gaid3_ephemeral',
        JSON.stringify({
          ephemeralPrivateKey: ephemeralKeyPair.getSecretKey(),
          randomness,
          maxEpoch,
          extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(ephemeralPublicKey as unknown as import('@mysten/sui/cryptography').PublicKey),
          nonce,
        })
      );

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,
        prompt: 'select_account',
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
      // Open popup (500x600 centered)
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'gaid3_zklogin',
        `width=${width},height=${height},left=${left},top=${top},location=yes,toolbar=no,menubar=no`
      );

      if (!popup) {
        setState({ status: 'error', error: 'Popup blocked. Allow popups for this site and try again.' });
        return;
      }

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GAID3_ZKLOGIN_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          popup.close();
          handleJwtCallback(
            event.data.jwt,
            event.data.ephemeralPrivateKey,
            event.data.randomness,
            event.data.maxEpoch,
            event.data.nonce
          );
        } else if (event.data?.type === 'GAID3_ZKLOGIN_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          popup.close();
          setState({ status: 'error', error: event.data.error || 'OAuth failed' });
        }
      };
      window.addEventListener('message', handleMessage);

      // Poll for popup closure (fallback if postMessage fails)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          // Check if we got the hash in the main window (popup redirected to same origin)
          // The hash parsing useEffect above will handle it
        }
      }, 500);

      // Store pending flag for fallback hash parsing
      sessionStorage.setItem('gaid3_zklogin_pending', 'true');

    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Login init failed' });
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('gaid3_ephemeral');
    sessionStorage.removeItem('gaid3_zklogin_pending');
    setState({ status: 'idle' });
  }, []);

  return { state, login, logout, suiNetwork: SUI_NETWORK, hasClientId: Boolean(GOOGLE_CLIENT_ID) };
}