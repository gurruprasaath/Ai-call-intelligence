const dns = require('dns');
const util = require('util');

// Force Google DNS
dns.setServers(['8.8.8.8', '1.1.1.1']);

const resolveSrv = util.promisify(dns.resolveSrv);
const resolveTxt = util.promisify(dns.resolveTxt);

const CLUSTER_HOST = 'cluster0.drohpmm.mongodb.net';
const SRV_RECORD = `_mongodb._tcp.${CLUSTER_HOST}`;

async function getStandardConnectionString() {
    console.log('🔍 Attempting to resolve MongoDB SRV record...');
    console.log(`📍 Host: ${CLUSTER_HOST}`);
    console.log(`🌐 Using DNS: ${dns.getServers().join(', ')}`);

    try {
        // 1. Resolve SRV record to get replica set hosts
        console.log(`\n1️⃣ Resolving SRV: ${SRV_RECORD}`);
        const addresses = await resolveSrv(SRV_RECORD);
        console.log('✅ SRV Records Found:');
        addresses.forEach(a => console.log(`   - ${a.name}:${a.port}`));

        // 2. Resolve TXT record to get options (like replicaSet name)
        console.log(`\n2️⃣ Resolving TXT: ${CLUSTER_HOST}`);
        const txtRecords = await resolveTxt(CLUSTER_HOST);
        const options = txtRecords.flat().join('');
        console.log(`✅ TXT Record: ${options}`);

        // 3. Construct Standard Connection String
        const hosts = addresses.map(a => `${a.name}:${a.port}`).join(',');

        // Extract query params from original URI for username/password placeholders
        // We'll just provide a template
        const standardURI = `mongodb://${hosts}/Ai-call-intelligence?ssl=true&authSource=admin&${options}`;

        console.log('\n✨ SUCCESS! Here is your Standard Connection String (Bypasses SRV lookup):');
        console.log('---------------------------------------------------');
        console.log(standardURI);
        console.log('---------------------------------------------------');
        console.log('\n📋 To use this:');
        console.log('1. Copy the string above.');
        console.log('2. Replace the start "mongodb://" with "mongodb://<username>:<password>@"');
        console.log('3. Paste it into your MONGODB_URI in .env');

    } catch (error) {
        console.error('\n❌ SRV Resolution Failed:', error.message);

        console.log('\n🔄 Attempting to resolve standard Atlas shard hosts directly...');
        const shardHosts = [
            'cluster0-shard-00-00.drohpmm.mongodb.net',
            'cluster0-shard-00-01.drohpmm.mongodb.net',
            'cluster0-shard-00-02.drohpmm.mongodb.net'
        ];

        const resolvedHosts = [];

        for (const host of shardHosts) {
            try {
                console.log(`   Checking ${host}...`);
                await util.promisify(dns.lookup)(host);
                console.log(`   ✅ Resolved: ${host}`);
                resolvedHosts.push(`${host}:27017`);
            } catch (e) {
                console.log(`   ❌ Failed: ${host}`);
            }
        }

        if (resolvedHosts.length > 0) {
            console.log('\n✨ SUCCESS! Found direct shard hosts. Use this connection string:');
            const standardURI = `mongodb://${resolvedHosts.join(',')}/Ai-call-intelligence?ssl=true&authSource=admin&retryWrites=true&w=majority`;
            console.log('---------------------------------------------------');
            console.log(standardURI);
            console.log('---------------------------------------------------');
            console.log('replace "mongodb://" with "mongodb://<username>:<password>@"');
        } else {
            console.error('\n❌ Could not resolve any MongoDB hosts. Please check your internet connection or firewall.');
        }
    }
}

getStandardConnectionString();
