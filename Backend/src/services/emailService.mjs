import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendDoctorNotificationEmail = async (doctorName, doctorEmail) => {
    if (!doctorEmail) {
        console.warn(`No email provided for doctor ${doctorName}. Skipping notification.`);
        return; // Alternatively, we could throw, but skipping might be safer so the job doesn't fail if the email is just missing.
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: doctorEmail,
        subject: 'Your MSF Survey has been Distributed',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <p>Dear Dr. ${doctorName},</p>
                <p>We are pleased to inform you that your Multi-Source Feedback (MSF) survey has been successfully distributed to your selected evaluators.</p>
                <p>To help ensure a high response rate, we kindly ask that you remind your evaluators to complete and submit their responses as soon as possible.</p>
                <p>Thank you for your cooperation.</p>
                <br>
                <p>Best regards,</p>
                <p><strong>MSF Administration Team</strong></p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(` Notification email sent to ${doctorName} at ${doctorEmail}`);
    } catch (error) {
        console.error(` Failed to send notification email to ${doctorEmail}:`, error);
        throw error;
    }
};
