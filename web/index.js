
const os = require('os');
const express = require('express');
const redis = require('redis');

const app = express();

const redisClient = redis.createClient({
    url: 'redis://35.171.82.47:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

async function connectRedis() {
    await redisClient.connect();
    console.log('Connected to Redis');
}

app.get('/', async (req, res) => {
    try {
        // Identify the responding server
        const serverName = os.hostname();
        const serverIP = Object.values(os.networkInterfaces())
            .flat()
            .find(iface => iface && iface.family === 'IPv4' && !iface.internal)?.address
            || 'Unknown';

        // Get the user's IP address
        const userIP = req.headers['x-forwarded-for']
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.socket.remoteAddress;

        // Store the user's IP in Redis
        await redisClient.sAdd('userIPs', userIP);

        // Retrieve all recorded IP addresses
        const userIPs = await redisClient.sMembers('userIPs');

        // Increment the visit counter
        const numVisits = await redisClient.incr('numVisits');

        // Send response
        res.send(`
            <h1>Server Response</h1>
            <p><strong>Server Name:</strong> ${serverName}</p>
            <p><strong>Server IP:</strong> ${serverIP}</p>
            <hr>
            <h2>Client Information</h2>
            <p><strong>Your IP address:</strong> ${userIP}</p>
            <hr>
            <h2>Redis Statistics</h2>
            <p><strong>Number of visits:</strong> ${numVisits}</p>
            <p><strong>Recorded unique IP addresses:</strong> ${userIPs.length}</p>
            <h3>All recorded IP addresses:</h3>
            <ul>
                ${userIPs.map(ip => `<li>${ip}</li>`).join('')}
            </ul>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

connectRedis().then(() => {
    app.listen(5000, () => {
        console.log('Web application is listening on port 5000');
    });
});