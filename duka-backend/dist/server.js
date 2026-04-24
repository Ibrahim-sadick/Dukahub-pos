"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
app_1.app.listen(env_1.env.PORT, () => {
    console.log(`${env_1.env.APP_NAME} listening on port ${env_1.env.PORT}`);
});
//# sourceMappingURL=server.js.map