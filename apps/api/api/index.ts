import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/main';

// Reuse the initialized Nest application across warm Vercel invocations.
let serverPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  serverPromise ??= createApp().catch(error => {
    serverPromise = undefined;
    throw error;
  });
  const app = await serverPromise;
  const express = app.getHttpAdapter().getInstance() as (request: IncomingMessage, response: ServerResponse) => void;
  express(req, res);
}
