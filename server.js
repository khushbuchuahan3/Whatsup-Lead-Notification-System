require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const TEAM_NUMBERS = process.env.TEAM_NUMBERS
  ? process.env.TEAM_NUMBERS.split(',').map(n => n.trim()).filter(Boolean)
  : [];

function buildWhatsAppMessage(lead) {
  return `🔔 *NEW LEAD ALERT*
━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${lead.name}
🏢 *Company:* ${lead.company}
📍 *City:* ${lead.city}
🗺️ *Address:* ${lead.address}
📞 *Phone:* ${lead.phone}
📋 *Requirement:*
${lead.requirement}
━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
}

app.post('/api/leads', async (req, res) => {
  const { name, company, city, address, phone, requirement } = req.body;

  if (!name || !phone || !requirement) {
    return res.status(400).json({ success: false, message: 'Name, phone and requirement are required.' });
  }

  const lead = { name, company, city, address, phone, requirement };
  const message = buildWhatsAppMessage(lead);

  if (TEAM_NUMBERS.length === 0) {
    console.warn('No TEAM_NUMBERS configured in .env');
    return res.status(500).json({ success: false, message: 'No team numbers configured.' });
  }

  try {
    const sends = TEAM_NUMBERS.map(to =>
      client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to,
        body: message,
      })
    );
    await Promise.all(sends);
    console.log(`Lead from ${name} sent to ${TEAM_NUMBERS.length} team member(s).`);
    res.json({ success: true, message: 'Lead received! Your team has been notified on WhatsApp.' });
  } catch (err) {
    console.error('Twilio error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp notification. Check your Twilio credentials.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Lead Capture running at http://localhost:${PORT}`);
  console.log(`📲 Notifying ${TEAM_NUMBERS.length} team member(s) on WhatsApp\n`);
});
