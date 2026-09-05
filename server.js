// Production entry point for Node.js hosting (Hostinger, cPanel/Plesk "Node.js App"
// panels, etc.) that require a literal JS file to launch, rather than running an
// npm script directly. This wraps Next.js's own production server exactly the way
// `next start` does internally — same build output, same request handling — it just
// gives the host process manager a concrete file to point at.
//
// It listens on the PORT the hosting platform assigns via the PORT environment
// variable (falling back to 3000 only for local/manual use), and binds to all
// network interfaces so the platform's reverse proxy can reach it.

import { createServer } from 'http';
import next from 'next';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`> GJ5 ERP ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start GJ5 ERP server:', err);
    process.exit(1);
  });
