/**
 * Clear potentially invalid tokens from localStorage
 * This helps when JWT secrets change and old tokens become invalid
 */
export const clearInvalidTokens = () => {
  // Check if there are any tokens that might be invalid
  const token = localStorage.getItem('token');
  const authToken = localStorage.getItem('authToken');
  
  if (token || authToken) {
    console.log('🔄 Clearing potentially invalid authentication tokens...');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Show a user-friendly message
    if (window.location.pathname !== '/auth') {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/auth';
    }
  }
};

/**
 * Check if a token verification error occurred and handle it
 */
export const handleTokenError = (error) => {
  if (error.message && error.message.includes('invalid signature')) {
    clearInvalidTokens();
    return true; // Token error handled
  }
  return false; // Not a token error
};