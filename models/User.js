const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    publicSlug: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 48,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // only required for local signups, not google
      required: function () {
        return this.provider === 'local';
      },
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
      default: 'local',
    },
    googleId: {
      type: String,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
