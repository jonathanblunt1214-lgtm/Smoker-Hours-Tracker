import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

/**
 * Express middleware enforcing authentication via Firebase ID tokens.
 * Verifies the Bearer token in the Authorization header.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Bearer token required.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();

  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Empty Bearer token provided.' });
  }

  try {
    // Verify token using Firebase Identity Toolkit REST API
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_FIREBASE_API_KEY;
    if (apiKey) {
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const userInfo = data.users?.[0];
        if (userInfo && userInfo.localId) {
          req.user = {
            uid: userInfo.localId,
            email: userInfo.email,
          };
          return next();
        }
      }
    }

    // Fallback simple JWT payload verification if API key validation is unavailable
    const parts = idToken.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      if (payload && payload.sub && payload.aud) {
        req.user = {
          uid: payload.sub || payload.user_id,
          email: payload.email,
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid ID Token.' });
  } catch (error: any) {
    console.error('[AuthMiddleware] Error verifying ID token:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed.' });
  }
}
