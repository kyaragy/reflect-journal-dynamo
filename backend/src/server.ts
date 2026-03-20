import { createServer, type IncomingMessage } from 'node:http';
import { createHandler } from './functions/api/handler';
import type { ApiGatewayHttpEvent } from './functions/api/types';
import { createJournalServiceFromEnv } from './repositories/factory';

const PORT = Number(process.env.PORT ?? 4000);
const { driver, journalService } = createJournalServiceFromEnv('memory');
const handler = createHandler(journalService);

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks).toString('utf-8') : null;
};

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { code: 'INVALID_REQUEST_BODY', message: 'Invalid request' } }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const body = await readBody(req);

  const event: ApiGatewayHttpEvent = {
    version: '2.0',
    rawPath: url.pathname,
    body,
    isBase64Encoded: false,
    headers: Object.fromEntries(
      Object.entries(req.headers)
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value] as const)
        .filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string')
    ),
    requestContext: {
      requestId: crypto.randomUUID(),
      http: {
        method: req.method,
        path: url.pathname,
      },
      authorizer: {
        jwt: {
          claims: {
            sub: req.headers['x-dev-user-id']?.toString() ?? 'local-dev-user',
          },
        },
      },
    },
  };

  const response = await handler(event);
  res.writeHead(response.statusCode, response.headers);
  res.end(response.body);
});

server.listen(PORT, () => {
  console.log(`reflect-journal backend listening on http://localhost:${PORT} (driver: ${driver})`);
});
