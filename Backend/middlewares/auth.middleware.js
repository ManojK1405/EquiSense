import jwt from 'jsonwebtoken';

export const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication failed: No token provided' });
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decodedData?.userId;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    console.error('Auth Middleware Error:', error.message);
    res.status(401).json({ message: 'Authentication failed: Invalid or expired token' });
  }
};
