// Netlify Serverless Function: nim-proxy.js
// The API key lives ONLY here (Netlify env var: NIM_API_KEY)
// It is NEVER sent to or accessible by the browser

export const handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.NIM_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'API key is not configured. Please contact the site administrator.' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid request body.' })
        };
    }

    const { messages, max_tokens = 1024 } = body;

    // Hard timeout slightly under Netlify's 120s function limit
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000);

    try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'meta/llama-3.2-90b-vision-instruct',
                messages,
                max_tokens,
                temperature: 0.4,
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Always parse as JSON — NVIDIA API always returns JSON
        let data;
        try {
            data = await response.json();
        } catch {
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'The AI service returned an unreadable response. Please try again.' })
            };
        }

        if (!response.ok) {
            const detail = data?.detail || data?.message || `AI service error (${response.status})`;
            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: detail })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            return {
                statusCode: 504,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'The AI service took too long to respond. Please try again in a moment.' })
            };
        }

        // Network-level failure (DNS, connection refused, etc.)
        return {
            statusCode: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Could not reach the AI service. Please check your connection and try again.' })
        };
    }
};
