import nodemailer from "nodemailer";

export class MailService {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  async sendOTP({
    to,
    subject,
    otp,
  }: {
    to: string;
    subject: string;
    otp: string;
  }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Chat App" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>Email Verification</h2>

            <p>Your One-Time Password (OTP) is:</p>

            <div
              style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 6px;
                padding: 12px;
                background: #f4f4f4;
                text-align: center;
                border-radius: 8px;
              "
            >
              ${otp}
            </div>

            <p style="margin-top: 20px;">
              This OTP is valid for <strong>5 minutes</strong>.
            </p>

            <p>
              If you did not request this code, please ignore this email.
            </p>

            <hr />

            <small>
              This is an automated message. Please do not reply.
            </small>
          </div>
        `,
      });

      return true;
    } catch (error) {
      console.error("Failed to send OTP:", error);
      return false;
    }
  }
}

export const mailService = new MailService();