const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { 
  authenticateToken, 
  getClientInfo, 
  authRateLimit, 
  validateRegistration, 
  validateLogin 
} = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', getClientInfo, authRateLimit, validateRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, preferences } = req.body;

    const registrationData = {
      email,
      password,
      firstName,
      lastName,
      preferences: preferences || {},
      metadata: {
        registrationIP: req.clientIP,
        userAgent: req.userAgent
      }
    };

    const result = await authService.register(registrationData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = result.user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userWithoutPassword,
      token: result.token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', getClientInfo, authRateLimit, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const loginData = {
      email,
      password,
      loginIP: req.clientIP,
      userAgent: req.userAgent
    };

    const result = await authService.login(loginData);

    if (!result.success) {
      return res.status(401).json(result);
    }

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = result.user;

    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token: result.token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await authService.getUserProfile(req.userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Don't send password in response
    const { password, ...userWithoutPassword } = result.user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching profile',
      code: 'PROFILE_ERROR'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, preferences } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferences !== undefined) updateData.preferences = preferences;

    // Validate input
    if (firstName && (firstName.trim().length === 0 || firstName.length > 50)) {
      return res.status(400).json({
        success: false,
        error: 'First name must be between 1 and 50 characters'
      });
    }

    if (lastName && (lastName.trim().length === 0 || lastName.length > 50)) {
      return res.status(400).json({
        success: false,
        error: 'Last name must be between 1 and 50 characters'
      });
    }

    const result = await authService.updateUserProfile(req.userId, updateData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Don't send password in response
    const { password, ...userWithoutPassword } = result.user;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is required'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const result = await authService.changePassword(req.userId, currentPassword, newPassword);

    res.json(result);

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while changing password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token with same user data
    const result = await authService.generateNewToken(req.userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: result.token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while refreshing token',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (mainly for logging purposes)
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update last activity
    await authService.updateUserProfile(req.userId, {
      'metadata.lastActivity': new Date()
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * @route GET /api/auth/check
 * @desc Check if token is valid (health check)
 * @access Private
 */
router.get('/check', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    userId: req.userId,
    user: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role
    }
  });
});

module.exports = router;