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

module.exports = { welcomeEmail, loginAlertEmail };