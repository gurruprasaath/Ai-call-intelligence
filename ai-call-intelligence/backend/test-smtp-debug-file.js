require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');

const logFile = 'smtp-debug.log';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function testSmtp() {
    fs.writeFileSync(logFile, ''); // Clear log file
    log('📧 Testing SMTP Configuration...');

    const user = process.env.EMAIL_USER;
    const rawPass = process.env.EMAIL_PASS || '';
    const pass = rawPass.replace(/\s+/g, '');

    log(`👤 User: ${user}`);

    if (!user || !pass) {
        log('❌ EMAIL_USER or EMAIL_PASS is missing in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        debug: true,
        logger: true
    });

    try {
        log('\n🔄 Attempting to verify connection...');
        await transporter.verify();
        log('✅ SMTP Connection Successful!');
    } catch (error) {
        log('\n❌ SMTP Connection Failed!');
        log(`   Error Code: ${error.code}`);
        log(`   Response: ${error.response}`);

        if (error.responseCode === 535) {
            log('\n💡 DIAGNOSIS: Authentication Failed (535)');
            log('   Likely cause: Invalid App Password or restricted account.');
        }
    }
}

testSmtp().catch(err => log('Fatal: ' + err.message));
