/**
 * Authentication Controller
 * 
 * Handles user registration, login, and authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthController {
  
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'All fields are required: email, password, firstName, lastName'
        });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          signupSource: 'web'
        }
      });
      
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.userId,
          email: user.email 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );
      
      // Return user info (without password)
      const userResponse = {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      };
      
      res.status(201).json({
        message: 'User registered successfully',
        user: userResponse,
        token
      });
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        details: error.message
      });
    }
  }
  
  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }
      
      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }
      
      // Update last login
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.userId,
          email: user.email 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );
      
      // Return user info (without password)
      const userResponse = {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      };
      
      res.json({
        message: 'Login successful',
        user: userResponse,
        token
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        details: error.message
      });
    }
  }
  
  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findOne({ userId: req.user.userId }).select('-password');
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      
      res.json({
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      });
      
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get user profile',
        details: error.message
      });
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, preferences } = req.body;
      
      const user = await User.findOne({ userId: req.user.userId });
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      
      // Update allowed fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };
      
      await user.save();
      
      res.json({
        message: 'Profile updated successfully',
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferences: user.preferences
        }
      });
      
    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        details: error.message
      });
    }
  }
}

module.exports = new AuthController();