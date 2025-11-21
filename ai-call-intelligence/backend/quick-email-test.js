const nodemailer = require('nodemailer');
require('dotenv').config();

async function quickEmailTest() {
  console.log('🚀 Quick Email Test Starting...');
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 5000,
      greetingTimeout: 3000,
      socketTimeout: 5000
    });

    console.log('📡 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    console.log('📨 Sending quick test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.DEFAULT_USER_EMAIL,
      subject: '🧪 Quick Email Test - SUCCESS!',
      text: 'If you receive this email, your AI Call Intelligence notification system is working perfectly!'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', result.messageId);
    console.log('🎉 Email system is fully operational!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication issue - check Gmail app password');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('🌐 Connection timeout - check internet/firewall');
    }
  }
  
  process.exit(0);
}

quickEmailTest();