import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "placeholder@example.com",
    pass: process.env.SMTP_PASS || "PLACEHOLDER_APP_PASSWORD",
  },
});

export async function sendActivationKeyEmail(
  to: string,
  key: string,
  userName: string
): Promise<boolean> {
  const mailOptions = {
    from: `"SupplyIQ" <sladethedeciever@gmail.com>`,
    to,
    subject: "Your SupplyIQ Activation Key",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #e2e8f0; margin: 0; font-size: 28px; font-weight: 600;">
            Stack<span style="color: #84cc16;">wise</span>
          </h1>
        </div>
        <div style="background: #f8fafc; padding: 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px;">Welcome to SupplyIQ!</h2>
          <p style="color: #475569; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
            Hi ${userName},<br><br>
            Thank you for subscribing to SupplyIQ. Your activation key is ready:
          </p>
          <div style="background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <code style="font-family: 'SF Mono', 'JetBrains Mono', monospace; font-size: 22px; letter-spacing: 3px; font-weight: 700; color: #0f172a;">${key}</code>
          </div>
          <p style="color: #475569; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
            1. Open the SupplyIQ application<br>
            2. Go to <strong>Settings</strong> or click <strong>Activate</strong><br>
            3. Enter the activation key above<br>
            4. Your subscription will be activated immediately
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            This email was sent automatically. If you did not request this key, please ignore.
          </p>
        </div>
      </div>
    `,
    text: `Your SupplyIQ activation key: ${key}\n\nEnter this in the app to activate your subscription.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Activation key sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR]", error);
    // Fallback: log to console if email sending fails
    console.log(`[EMAIL FALLBACK] Key for ${to}: ${key}`);
    return false;
  }
}
