import type { Request, Response } from 'express';

export interface DbChangeEvent {
  type: 'db-change';
  table: string;
  action: 'insert' | 'update' | 'delete' | 'import' | 'sync';
  recordId?: string | number | null;
  timestamp: string;
}

const sseClients = new Set<Response>();

export function registerSseClient(res: Response, req?: Request): void {
  try {
    req?.socket?.setTimeout?.(0);
    req?.socket?.setNoDelay?.(true);
    req?.socket?.setKeepAlive?.(true, 15000);
  } catch {
    // ignore socket option errors on virtual streams
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Alt-Svc', 'clear');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);

  try {
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        clients: sseClients.size
      })}\n\n`
    );
  } catch {
    sseClients.delete(res);
  }

  const keepAlive = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
}

export function emitDbChange(
  table: string,
  action: DbChangeEvent['action'] = 'update',
  recordId?: string | number | null
): void {
  const payload: DbChangeEvent = {
    type: 'db-change',
    table,
    action,
    recordId: recordId ?? null,
    timestamp: new Date().toISOString()
  };

  const chunk = `event: db-change\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(chunk);
    } catch {
      sseClients.delete(client);
    }
  }
}
