export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Identify User by IP Address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const dateKey = new Date().toISOString().slice(0, 7); // e.g., "2026-09"
    const userUsageKey = `usage:${ip}:${dateKey}`;

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Database variables missing in Vercel.' });
    }

    try {
        // 2. Fetch Current Generation Count from Database
        const countResponse = await fetch(`${redisUrl}/get/${userUsageKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });
        const countData = await countResponse.json();
        const currentCount = parseInt(countData.result || '0', 10);

        // 3. Block Request if 5 Generations Reached
        if (currentCount >= 5) {
            return res.status(429).json({ 
                error: 'Free limit reached! You have used all 5 free generations for this month. Upgrade to Pro for unlimited access.' 
            });
        }

        // 4. Generate Content with Gemini
        const { name, type, location, platform, description, audience, tone } = req.body;
        const prompt = `
        You are an expert social media manager. Generate marketing content for:
        - Business Name: ${name}
        - Type: ${type}
        - Location: ${location}
        - Platform: ${platform}
        - Description: ${description}
        - Target Audience: ${audience}
        - Tone: ${tone}

        Respond strictly in raw JSON format (no markdown formatting, no code blocks) with the exact keys: "caption", "idea", "script", "hashtags".
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        // 5. Increment Usage Count in Database
        await fetch(`${redisUrl}/incr/${userUsageKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        res.status(200).json({ ...result, remaining: 5 - (currentCount + 1) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate content: ' + error.message });
    }
}
