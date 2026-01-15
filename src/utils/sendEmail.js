import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ test connection
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Expense Splitter" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  console.log(process.env.SMTP_USER, process.env.SMTP_PASS ? "PASS_OK" : "PASS_MISSING");

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.log("❌ Nodemailer Error:", err); // ✅ REAL ERROR
    throw new Error("Failed to send invitation email");
  }
};
