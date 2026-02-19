require('dotenv').config();
const Groq = require('groq-sdk');

console.log('🔑 Checking GROQ_API_KEY...');
if (process.env.GROQ_API_KEY) {
    console.log('✅ GROQ_API_KEY is present (Length: ' + process.env.GROQ_API_KEY.length + ')');
    console.log('Values start with: ' + process.env.GROQ_API_KEY.substring(0, 4) + '...');
} else {
    console.error('❌ GROQ_API_KEY is missing from process.env');
    process.exit(1);
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function testGroq() {
    console.log('\n🧠 Testing Groq API Connection...');
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Say hello" }],
            model: "llama-3.3-70b-versatile",
        });
        console.log('✅ Groq API Response:', completion.choices[0]?.message?.content);
    } catch (error) {
        console.error('❌ Groq API Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testGroq();
