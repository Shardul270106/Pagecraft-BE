const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { welcomeEmail, loginAlertEmail, passwordResetEmail } = require('../utils/emailTemplates');


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------- Helper: sign JWT ----------
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider,
  };
}

// ---------- SIGNUP (local, email + password) --------
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedName || !normalizedEmail || typeof password !== 'string') {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (normalizedName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'Account already exists. Please log in instead.',
        code: 'ACCOUNT_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      provider: 'local',
    });

    const token = generateToken(newUser);

    const { subject, html } = welcomeEmail(newUser.name);
    sendEmail({ to: newUser.email, subject, html });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Account already exists. Please log in instead.',
        code: 'ACCOUNT_EXISTS',
      });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Something went wrong during signup.' });
  }
};

// ---------- LOGIN (local, email + password) ----------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "Account doesn't exist. Please sign up first.",
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    if (user.provider === 'google') {
      return res.status(400).json({
        message: 'This account was created with Google. Please continue with Google.',
        code: 'USE_GOOGLE_LOGIN',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = generateToken(user);

    const { subject, html } = loginAlertEmail(user.name);
    sendEmail({ to: user.email, subject, html });

    return res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Something went wrong during login.' });
  }
};

// ---------- GOOGLE AUTH (handles both signup + login) ----------
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;
    if (!payload.email_verified || !email) {
      return res.status(401).json({ message: 'Google account email could not be verified.' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (user) {
      if (user.provider === 'local' && !user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        provider: 'google',
        googleId,
      });
      isNewUser = true;
    }

    const token = generateToken(user);

    const { subject, html } = isNewUser ? welcomeEmail(user.name) : loginAlertEmail(user.name);
    sendEmail({ to: user.email, subject, html });

    return res.status(200).json({
      message: 'Authenticated with Google successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({ message: 'Google authentication failed.' });
  }
};

// ---------- REQUEST PASSWORD RESET ----------
exports.requestPasswordReset = async (req, res) => {
  const genericMessage = 'If an account exists for that email, a password reset link is on its way.';
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const user = await User.findOne({ email, provider: 'local' });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
      const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      const { subject, html } = passwordResetEmail(user.name, resetUrl);
      await sendEmail({ to: user.email, subject, html });
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ message: 'Could not send a reset link right now. Please try again.' });
  }
};

// ---------- RESET PASSWORD ----------
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token || typeof password !== 'string') {
      return res.status(400).json({ message: 'A reset link and new password are required.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      provider: 'local',
    }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Your password has been reset. You can now log in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Could not reset your password right now. Please try again.' });
  }
};
