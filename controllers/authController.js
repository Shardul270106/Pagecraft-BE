const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

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

// ---------- SIGNUP (local, email + password) ----------
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // matches diagram: "Account already exists" -> route user to login
      return res.status(409).json({
        message: 'Account already exists. Please log in instead.',
        code: 'ACCOUNT_EXISTS',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: 'local',
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Something went wrong during signup.' });
  }
};

// ---------- LOGIN (local, email + password) ----------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // matches diagram: "Account doesn't exist" -> route user to signup
      return res.status(404).json({
        message: "Account doesn't exist. Please sign up first.",
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    // matches diagram: user signed up with Google, trying local login
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
// Frontend sends the Google ID token (credential) it gets from Google Identity Services
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

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Exists -> login directly regardless of how they originally signed up,
      // but keep provider consistent if it was local (optional: link accounts)
      if (user.provider === 'local' && !user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Doesn't exist -> create user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        provider: 'google',
        googleId,
      });
    }

    const token = generateToken(user);

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