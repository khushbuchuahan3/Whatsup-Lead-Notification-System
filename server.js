require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const TEAM_NUMBERS = process.env.TEAM_NUMBERS
  ? process.env.TEAM_NUMBERS.split(',').map(n => n.trim()).filter(Boolean)
  : [];

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

function buildTeamWhatsApp(lead) {
  return `🔔 *NEW LEAD ALERT*
━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${lead.name}
🏢 *Company:* ${lead.company || 'N/A'}
📧 *Email:* ${lead.email || 'N/A'}
📞 *Phone:* ${lead.phone}
📍 *City:* ${lead.city}
🗺️ *Address:* ${lead.address || 'N/A'}
📋 *Requirement:*
${lead.requirement}
━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
}

function buildClientWhatsApp(lead) {
  return `Hello ${lead.name}! 👋

Thank you for reaching out to *${process.env.COMPANY_NAME}*. 🙏

We have received your enquiry and our team will get back to you shortly.

📋 *Your Requirement:*
_${lead.requirement}_

━━━━━━━━━━━━━━━━━━━━
🏢 *${process.env.COMPANY_NAME}*
📞 ${process.env.COMPANY_PHONE || ''}
🌐 ${process.env.COMPANY_WEBSITE || ''}
📧 ${process.env.GMAIL_USER || ''}
━━━━━━━━━━━━━━━━━━━━

We look forward to serving you! 😊`;
}

function buildClientEmail(lead) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2b6cb0,#1a4a8a);padding:36px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:26px;">${process.env.COMPANY_NAME}</h1>
            <p style="color:#bee3f8;margin:6px 0 0;font-size:14px;">${process.env.COMPANY_TAGLINE || 'Professional Solutions'}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="color:#2d3748;font-size:16px;margin:0 0 8px;">Dear <strong>${lead.name}</strong>,</p>
            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Thank you for contacting <strong>${process.env.COMPANY_NAME}</strong>. We have received your enquiry and will get back to you within <strong>24 hours</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border-left:4px solid #2b6cb0;border-radius:4px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#2b6cb0;text-transform:uppercase;letter-spacing:0.8px;">Your Enquiry Summary</p>
                <table width="100%" cellpadding="5" cellspacing="0" style="font-size:14px;color:#4a5568;">
                  <tr><td style="width:110px;font-weight:600;color:#2d3748;">Name</td><td>${lead.name}</td></tr>
                  ${lead.company ? `<tr><td style="font-weight:600;color:#2d3748;">Company</td><td>${lead.company}</td></tr>` : ''}
                  <tr><td style="font-weight:600;color:#2d3748;">Phone</td><td>${lead.phone}</td></tr>
                  <tr><td style="font-weight:600;color:#2d3748;">City</td><td>${lead.city}</td></tr>
                  <tr><td style="font-weight:600;color:#2d3748;vertical-align:top;">Requirement</td><td>${lead.requirement}</td></tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 28px;">For urgent queries, contact us directly at the details below.</p>
            <p style="color:#718096;font-size:14px;margin:0;">Warm regards,<br/><strong style="color:#2d3748;">${process.env.COMPANY_NAME} Team</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background:#2d3748;padding:24px 40px;text-align:center;">
            <p style="color:#a0aec0;font-size:13px;margin:0 0 6px;">
              📞 ${process.env.COMPANY_PHONE || ''} &nbsp;|&nbsp; 🌐 ${process.env.COMPANY_WEBSITE || ''} &nbsp;|&nbsp; 📍 ${process.env.COMPANY_ADDRESS || ''}
            </p>
            <p style="color:#718096;font-size:12px;margin:8px 0 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

app.post('/api/leads', async (req, res) => {
  const { name, company, email, city, address, phone, requirement } = req.body;

  if (!name || !phone || !requirement) {
    return res.status(400).json({ success: false, message: 'Name, phone and requirement are required.' });
  }

  const lead = { name, company, email, city, address, phone, requirement };
  const tasks = [];

  // 1. Notify team on WhatsApp
  if (TEAM_NUMBERS.length > 0) {
    const teamMsg = buildTeamWhatsApp(lead);
    TEAM_NUMBERS.forEach(to => {
      tasks.push(client.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to, body: teamMsg }));
    });
  }

  // 2. Thank-you WhatsApp to client
  const clientWaNum = `whatsapp:+${phone.replace(/\D/g, '')}`;
  tasks.push(
    client.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: clientWaNum, body: buildClientWhatsApp(lead), mediaUrl: ["https://raw.githubusercontent.com/khushbuchuahan3/Whatsup-Lead-Notification-System/main/public/autech-brochure.pdf"] })
      .catch(e => console.warn('Client WhatsApp skipped:', e.message))
  );

  // 3. Confirmation email to client
  if (email) {
    tasks.push(
      mailer.sendMail({
        from: `"${process.env.COMPANY_NAME}" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Thank you for your enquiry — ${process.env.COMPANY_NAME}`,
        html: buildClientEmail(lead)
      }).catch(e => console.warn('Client email skipped:', e.message))
    );
  }

  try {
    await Promise.all(tasks);
    console.log(`Lead from ${name} processed.`);
    res.json({ success: true, message: 'Enquiry received! Check your email & WhatsApp for confirmation.' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send notifications. Check credentials.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ ${process.env.COMPANY_NAME} Lead Capture → http://localhost:${PORT}\n`);
});
