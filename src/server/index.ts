import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildServer } from './app';

export { buildServer } from './app';

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const app = buildServer();
  app
    .listen({ port: 5174, host: '127.0.0.1' })
    .then(() => console.log('Plugin platform API listening on http://127.0.0.1:5174'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
