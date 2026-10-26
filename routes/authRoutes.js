const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { signup, login, googleAuth, requestPasswordReset, resetPassword, getProfile, updateProfile } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;
