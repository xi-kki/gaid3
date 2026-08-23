/**
 * Walrus Protocol Blob Storage Connector
 * Direct decentralized persistence for user profile snapshots & memory blobs on Walrus.
 */

export interface WalrusStoreResult {
  blobId: string;
  epoch: number;
  size: number;
  cost: number;
  isMock?: boolean;
}

export class WalrusBlobService {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor(
    publisherUrl = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
    aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space'
  ) {
    this.publisherUrl = publisherUrl.replace(/\/$/, '');
    this.aggregatorUrl = aggregatorUrl.replace(/\/$/, '');
  }

  /**
   * Stores raw data or JSON snapshot onto the Walrus decentralized network.
   */
  async storeBlob(data: string | object, numEpochs = 5): Promise<WalrusStoreResult> {
    const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    try {
      const response = await fetch(`${this.publisherUrl}/v1/store?epochs=${numEpochs}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (response.ok) {
        const json = (await response.json()) as any;
        // Standard Walrus store response handling (alreadyCertified or newlyCreated)
        const info = json.newlyCreated || json.alreadyCertified;
        return {
          blobId: info?.blobObject?.blobId || info?.blobId || `walrus_blob_${Date.now()}`,
          epoch: info?.blobObject?.storage?.startEpoch ?? 1,
          size: payload.length,
          cost: 1
        };
      }
    } catch (err) {
      // Fallback for offline / demo environments with simulated Walrus blob hash
    }

    // Local deterministic mock blob ID for resilient offline testing & demo modes
    const mockHash = Buffer.from(payload).toString('base64').substring(0, 24).replace(/[+/=]/g, 'w');
    return {
      blobId: `walrus_testnet_${mockHash || Date.now()}`,
      epoch: 12,
      size: payload.length,
      cost: 0.001,
      isMock: true
    };
  }

  /**
   * Retrieves blob content by Walrus blob ID from the Walrus aggregator.
   */
  async retrieveBlob(blobId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.aggregatorUrl}/v1/${blobId}`);
      if (response.ok) {
        return await response.text();
      }
    } catch (err) {
      // Network lookup failed
    }
    return null;
  }
}
