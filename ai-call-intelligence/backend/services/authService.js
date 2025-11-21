const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    this.SALT_ROUNDS = 12;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async register(userData) {
    try {
      const { email, password, firstName, lastName } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ 
        email: email.toLowerCase() 
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
          code: 'EMAIL_EXISTS'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        preferences: userData.preferences || {},
        metadata: {
          signupSource: userData.signupSource || 'web',
          ipAddress: userData.metadata?.registrationIP || userData.ipAddress,
          userAgent: userData.metadata?.userAgent || userData.userAgent,
          registrationIP: userData.metadata?.registrationIP || userData.ipAddress
        }
      });

      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user data (excluding password)
      const userResponse = this.sanitizeUser(user);

      return {
        success: true,
        user: userResponse,
        token,
        message: 'User registered successfully'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Login user
   * @param {Object} loginData - Login credentials
   * @returns {Promise<Object>} Login result
   */
  async login(loginData) {
    try {
      const { email, password, ipAddress, userAgent } = loginData;

      // Find user by email
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        status: 'active'
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Update last login info
      user.lastLoginAt = new Date();
      user.lastLoginIP = ipAddress;
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user data (excluding password)
      const userResponse = this.sanitizeUser(user);

      return {
        success: true,
        user: userResponse,
        token,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Verification result
   */
  async verifyToken(token) {
    try {
      if (!token) {
        return {
          success: false,
          error: 'No token provided',
          code: 'NO_TOKEN'
        };
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Verify token
      const decoded = jwt.verify(cleanToken, this.JWT_SECRET);

      // Find user
      const user = await User.findOne({ 
        userId: decoded.userId,
        status: 'active'
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        user: this.sanitizeUser(user),
        userId: user.userId
      };

    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      };
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findOne({ 
        userId,
        status: 'active'
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        user: this.sanitizeUser(user)
      };

    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: 'Failed to get user profile',
        details: error.message
      };
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateUserProfile(userId, updateData) {
    try {
      const { firstName, lastName, preferences } = updateData;

      const user = await User.findOne({ userId, status: 'active' });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Update allowed fields
      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (preferences) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      await user.save();

      return {
        success: true,
        user: this.sanitizeUser(user),
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: 'Failed to update profile',
        details: error.message
      };
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {Object} passwordData - Current and new passwords
   * @returns {Promise<Object>} Change password result
   */
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword } = passwordData;

      const user = await User.findOne({ userId, status: 'active' });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
      user.password = hashedNewPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Failed to change password',
        details: error.message
      };
    }
  }

  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, emailVerificationToken, resetPasswordToken, ...sanitizedUser } = userObj;
    return sanitizedUser;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength score
   * @param {string} password - Password to analyze
   * @returns {Object} Strength analysis
   */
  calculatePasswordStrength(password) {
    let score = 0;
    let level = 'weak';

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score >= 5) level = 'strong';
    else if (score >= 3) level = 'medium';

    return { score, level };
  }
}

module.exports = new AuthService();