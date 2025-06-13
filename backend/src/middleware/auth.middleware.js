import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - No Token Provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Unauthorized - Invalid Token' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - User Not Found' });
    }

    req.user = user; // attach user to request
    next(); // proceed

  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    return res.status(401).json({ message: 'Unauthorized - Invalid or Expired Token' });
  }
};
