const authService = require('../services/authService');

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const verification = await authService.verifyToken(token);

    if (!verification.success) {
      return res.status(401).json({
        success: false,
        error: verification.error,
        code: verification.code
      });
    }

    // Add user info to request object
    req.user = verification.user;
    req.userId = verification.userId;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Please authenticate first.',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (token) {
      const verification = await authService.verifyToken(token);
      if (verification.success) {
        req.user = verification.user;
        req.userId = verification.userId;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token verification fails
    next();
  }
};

/**
 * Middleware to get client IP address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getClientInfo = (req, res, next) => {
  // Get IP address
  req.clientIP = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] ||
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                 req.ip;

  // Get user agent
  req.userAgent = req.headers['user-agent'] || 'Unknown';

  next();
};

/**
 * Rate limiting middleware for auth endpoints
 * Simple in-memory rate limiter
 */
const authRateLimit = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const key = req.clientIP || req.ip;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }

    const record = attempts.get(key);

    if (now > record.resetTime) {
      // Reset the window
      record.count = 1;
      record.resetTime = now + WINDOW_MS;
      return next();
    }

    if (record.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
})();

/**
 * Validation middleware for user input
 */
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  const errors = [];

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Validate first name
  if (!firstName) {
    errors.push('First name is required');
  } else if (firstName.trim().length === 0) {
    errors.push('First name cannot be empty');
  } else if (firstName.length > 50) {
    errors.push('First name must be less than 50 characters');
  }

  // Validate last name
  if (!lastName) {
    errors.push('Last name is required');
  } else if (lastName.trim().length === 0) {
    errors.push('Last name cannot be empty');
  } else if (lastName.length > 50) {
    errors.push('Last name must be less than 50 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  getClientInfo,
  authRateLimit,
  validateRegistration,
  validateLogin
};