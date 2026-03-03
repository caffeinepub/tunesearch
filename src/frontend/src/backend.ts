// Stub backend — this is a pure frontend app with no Motoko backend.
// This file satisfies build-time imports from config.ts and useActor.ts.
import { type ActorConfig } from "@icp-sdk/core/agent";

export interface backendInterface {
  _initializeAccessControlWithSecret: (secret: string) => Promise<undefined>;
}

export type CreateActorOptions = {
  agentOptions?: Record<string, unknown>;
  actorOptions?: ActorConfig;
};

export class ExternalBlob {
  private _bytes: Uint8Array;
  onProgress?: (progress: number) => void;
  constructor(bytes: Uint8Array) { this._bytes = bytes; }
  static fromURL(_url: string): ExternalBlob { return new ExternalBlob(new Uint8Array()); }
  async getBytes(): Promise<Uint8Array> { return this._bytes; }
}

export function createActor(
  _canisterId: string,
  _upload: (f: ExternalBlob) => Promise<Uint8Array>,
  _download: (b: Uint8Array) => Promise<ExternalBlob>,
  _opts?: CreateActorOptions,
): backendInterface {
  return { _initializeAccessControlWithSecret: async () => undefined };
}
