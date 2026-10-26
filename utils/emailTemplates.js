function welcomeEmail(name) {
  return {
    subject: 'Welcome to Pagecraft 🎉',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Your Pagecraft account has been created successfully.</p>
        <p>Start building your first page today.</p>
      </div>
    `,
  };
}

function loginAlertEmail(name) {
  const time = new Date().toLocaleString();
  return {
    subject: 'New login to your Pagecraft account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Hi ${name},</h2>
        <p>We noticed a new login to your Pagecraft account at ${time}.</p>
        <p>If this was you, no action is needed. If you don't recognize this, please secure your account.</p>
      </div>
    `,
  };
}

function passwordResetEmail(name, resetUrl) {
  const safeName = String(name || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const safeResetUrl = String(resetUrl || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return {
    subject: 'Reset your Pagecraft password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; color: #171717;">
        <h2>Reset your password</h2>
        <p>Hi ${safeName},</p>
        <p>Use the link below to choose a new Pagecraft password. This link expires in 30 minutes and can only be used once.</p>
        <p><a href="${safeResetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 24px; background: #171717; color: #fff; text-decoration: none;">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}

module.exports = { welcomeEmail, loginAlertEmail, passwordResetEmail };
