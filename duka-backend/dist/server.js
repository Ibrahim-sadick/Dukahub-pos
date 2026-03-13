"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
function createServer() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    const allowedOrigins = new Set(String(env_1.env.CORS_ORIGIN || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean));
    app.use((0, cors_1.default)({
        origin(origin, cb) {
            if (!origin)
                return cb(null, true);
            if (allowedOrigins.has('*') || allowedOrigins.has(origin))
                return cb(null, true);
            return cb(null, false);
        },
        credentials: true
    }));
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    app.get('/health', (_req, res) => {
        res.json({ ok: true });
    });
    app.get('/health/db', async (_req, res, next) => {
        try {
            await prisma_1.prisma.$executeRawUnsafe('SELECT 1');
            res.json({ ok: true, db: true });
        }
        catch (e) {
            next(e);
        }
    });
    app.use('/api', routes_1.apiRouter);
    app.use(notFoundHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
