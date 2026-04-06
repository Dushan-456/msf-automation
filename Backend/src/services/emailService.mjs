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

export const sendDoctorNotificationEmail = async (doctorName, doctorEmail, specialty, level) => {
    if (!doctorEmail) {
        console.warn(`No email provided for doctor ${doctorName}. Skipping notification.`);
        return; 
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: doctorEmail,
      subject: `Your ${specialty || ""} - ${level || ""} MSF Survey has been Distributed`,
      html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <p>Dear ${doctorName},</p>
                <p>We are pleased to inform you that your ${specialty || ""} - ${level || ""} Multi-Source Feedback (MSF) survey has been successfully <br>
                distributed to your selected feedback providers via email.</p>

                <p>The analysis will be carried out only after receiving a <strong>minimum of 12 responses</strong> from the feedback providers.</p>

                <p>To help ensure a high response rate, we kindly request that you remind your feedback providers to <br> 
                complete and submit their responses as soon as possible. If any responders indicate that they have not received the email, please inform <br>
                them that the survey email may sometimes be delivered to the spam/junk folder and advise them to check those folders as well.</p>

                <p>We also kindly request that you follow up on your MSF status and contact MERC <a href="mailto:merc@pgim.cmb.ac.lk">merc@pgim.cmb.ac.lk</a> if you require any clarification.</p>
                <p>Thank you for your cooperation.</p>
                <br>
                <p>Best regards,</p>
                <p><strong>K N Dushan</strong></p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(` Notification email sent to ${doctorName} at ${doctorEmail}`);
    } catch (error) {
        console.error(` Failed to send notification email to ${doctorEmail}:`, error);
        throw error;
    }
};
