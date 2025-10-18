(function setup() {
	// keep file as a module export for express use
})();

import { verifyToken } from '../utils/jwt.js';

export default function authMiddleware(req, res, next) {
	try {
		const authHeader = req.headers.authorization || req.headers.Authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'No token provided' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		req.user = decoded;
		return next();
	} catch (err) {
		console.error('Auth middleware error:', err.message || err);
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
}

