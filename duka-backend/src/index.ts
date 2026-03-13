import { createServer } from './server';
import { env } from './config/env';

const app = createServer();

app.listen(env.PORT, () => {
  process.stdout.write(`duka-backend listening on http://localhost:${env.PORT}\n`);
});

