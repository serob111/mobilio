export interface WelcomeEmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export function renderWelcomeEmail(name: string): WelcomeEmailContent {
  const subject = 'Welcome to ag2';

  return {
    subject,
    text: `Hi ${name},\n\nYour ag2 account is ready. Create a project to turn your website into a native Android or iOS app.\n\n— The ag2 team`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Welcome to ag2, ${name}</h1>
        <p>Your account is ready. Create a project to turn your website into a native Android or iOS app.</p>
        <p style="color: #6b7280; font-size: 12px;">— The ag2 team</p>
      </div>
    `.trim(),
  };
}
