require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSmtp() {
    console.log('📧 Testing SMTP Configuration...');

    const user = process.env.EMAIL_USER;
    const rawPass = process.env.EMAIL_PASS || '';
    // Apply the same cleaning logic as the main app
    const pass = rawPass.replace(/\s+/g, '');

    console.log(`👤 User: ${user}`);
    console.log(`🔑 Password Length (raw): ${rawPass.length}`);
    console.log(`🔑 Password Length (cleaned): ${pass.length}`);
    console.log(`🔑 Password starts with: ${pass.substring(0, 2)}...`);

    if (!user || !pass) {
        console.error('❌ EMAIL_USER or EMAIL_PASS is missing in .env');
        return;
    }

    // Check if it's an educational account
    if (user.endsWith('.edu')) {
        console.log('⚠️  NOTE: You are using an .edu email address.');
        console.log('   Many organizations block "App Passwords" or SMTP access.');
        console.log('   You might need to use a personal Gmail (gmail.com) account instead.');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        },
        debug: true, // Enable debug output
        logger: true // Log to console
    });

    try {
        console.log('\n🔄 Attempting to verify connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection Successful!');
        console.log('   Your credentials are correct and Less Secure Apps/App Passwords are working.');
    } catch (error) {
        console.error('\n❌ SMTP Connection Failed!');
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Response: ${error.response}`);

        if (error.responseCode === 535) {
            console.log('\n💡 DIAGNOSIS: Authentication Failed');
            console.log('   1. The App Password might be incorrect or expired.');
            console.log('   2. The EMAIL_USER might not match the account the password was generated for.');
            console.log('   3. If this is an organization account (.edu), they may have blocked SMTP.');
            console.log('   👉 TRY: Use a personal @gmail.com account to test.');
        }
    }
}

testSmtp();
