export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel settings.' });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate content: ' + error.message });
    }
}
