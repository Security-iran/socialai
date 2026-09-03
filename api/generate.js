export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, type, location, platform, description, audience, tone } = req.body;

    const prompt = `
    Generate social media content for:
    - Name: ${name}
    - Type: ${type}
    - Location: ${location}
    - Platform: ${platform}
    - Description: ${description}
    - Audience: ${audience}
    - Tone: ${tone}

    Respond strictly in JSON with keys: "caption", "idea", "script", "hashtags".
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate content' });
    }
}
