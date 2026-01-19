import nodemailer from "nodemailer";

export const sendOTPEmail = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: "RunRiver - Email Verification OTP",
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="color:#1D4ED8;margin:0 0 12px">RunRiver Email Verification</h2>
          <p style="margin:0 0 10px">Use this OTP to verify your email:</p>
          <div style="font-size:28px;font-weight:800;letter-spacing:6px;color:#111;margin:10px 0 16px">
            ${otp}
          </div>
          <p style="margin:0;color:#444">This OTP expires in <b>10 minutes</b>.</p>
        </div>
      `,
    });

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("sendOTPEmail error:", err.message);
    return { ok: false, error: err.message };
  }
};
