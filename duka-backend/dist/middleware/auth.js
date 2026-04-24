"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const auth_1 = require("../shared/auth");
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const cookieToken = String(req.cookies?.dh_access_token || '').trim();
    const token = bearerToken || cookieToken;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    try {
        req.auth = (0, auth_1.verifyAccessToken)(token);
        return next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'TOKEN_INVALID' });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map