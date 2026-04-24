import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`${env.APP_NAME} listening on port ${env.PORT}`);
});
