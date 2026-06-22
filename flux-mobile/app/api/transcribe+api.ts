const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return Response.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = (formData as any).get('file') as Blob | null;
        const country = (formData as any).get('country') as string | null;

        if (!file) {
            return Response.json({ error: 'No audio file provided' }, { status: 400, headers: corsHeaders });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        const upliftApiKey = process.env.UPLIFT_API_KEY;
        if (!geminiApiKey) {
            console.error('GEMINI_API_KEY is not configured');
            return Response.json({ error: 'Server configuration error' }, { status: 500, headers: corsHeaders });
        }

        // --- GEOGRAPHIC ROUTER (Phase 14) ---
        // senior-architect-decision: For Pakistani users, we bypass global models entirely and 
        // route directly to the regional specialist (Uplift AI) to conquer phonetic code-switching overlaps.
        const countryUpper = (country || '').toUpperCase();
        const isPakistan = countryUpper.includes('PK') || countryUpper.includes('PAKISTAN') || countryUpper === 'GLOBAL'; // Defaulting 'Global' to PK for testing since user is in PK but might not have location on

        if (isPakistan && upliftApiKey) {

            const upliftFormData = new FormData();
            upliftFormData.append('file', file, 'audio.m4a');
            upliftFormData.append('model', 'scribe');

            const upliftUrl = 'https://api.upliftai.org/v1/transcribe/speech-to-text';

            const upliftResponse = await fetch(upliftUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${upliftApiKey}`
                },
                body: upliftFormData
            });

            if (!upliftResponse.ok) {
                const errorText = await upliftResponse.text();
                // Fallback to Gemini if Uplift AI drops
                // Let it flow strictly down to the global fallback
            } else {
                const data = await upliftResponse.json();
                const resultText = data.text?.trim() || '';
                return Response.json({ text: resultText }, { headers: corsHeaders });
            }
        }

        // --- GLOBAL MULTIMODAL PROCESSING (Fallback & Rest of World) ---
        // senior-architect-decision: We bypass Whisper/Llama "guessing" by using a model 
        // that HEARS the audio directly. 

        // 1. Prepare Audio Data (Base64)
        const arrayBuffer = await file.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'audio/m4a';

        // 2. The Global Acoustic Intelligence Prompt (Senior Architect Phase 11: Neural Acoustic)
        const prompt = `You are a Senior Neural Acoustic Intelligence Expert for "Flux", a high-end Fintech Command Center.
The user is in: ${country || 'Global'}.

YOUR MISSION:
Listen to the audio and extract the intended financial transaction command. You possess "Semantic Logic": you don't just hear sounds, you understand the user's situation.

DOMAIN ANCHORS:
- This is a financial app. Users talk about:
  - LOCATIONS: Park, Mall, Store, Petrol Pump, Gym.
  - ITEMS: Chips, Coffee, Lunch, Groceries, Rent.
  - ACTIONS: Khareede (Bought), Diye (Gave), Pay kiya (Paid).

FEW-SHOT ACOUSTIC ARCHETYPES:
When audio is noisy, Whisper-style models fail. Use these forensic mappings:
- *Acoustic Noise*: "paar gaye", "paara", "pak de", "paas gaya" -> *Semantic Intent*: "park gaya"
- *Acoustic Noise*: "khori dein", "kharedain", "khareedi" -> *Semantic Intent*: "khareede"
- *Acoustic Noise*: "doosron", "dus", "das" (when context is > 100) -> *Semantic Intent*: "do sau"
- *Acoustic Noise*: "ruppee k", "rupee ke" -> *Semantic Intent*: "rupee ke"

ARCHITECTURAL RULES:
1. LOANWORD BIAS: In a finance context, prioritize English loanwords (Park, Chips, Mall) over phonetically similar native literals (Paar, Chics, Maal) if the loanword fits a transaction scenario.
2. NUMERIC LOGIC: Apply "Pricing Priors". A visit to a "Park" where multiple items are bought is 99% likely to be "200" (do sau) rather than "2" or "10" (das).
3. TRANSLITERATION:
   - Output perfectly cleaned Romanized characters (e.g. Roman Urdu/Hinglish).
   - Maintain the original spoken grammar and code-switching intent. 
   - Example Goal: "Main park gaya aur do sau rupee ke chips khareede"
4. REJECTION: If the audio is pure noise or silence ("Thank you", "Watching"), return: EMPTY

OUTPUT: Return ONLY the final Romanized result. No quotes, no preamble.`;

        // 3. Gemini Multimodal Engine (Phase 14: Neural Acoustic) with Pro → Flash Fallback
        // senior-architect-decision: Gemini HEARS the audio directly with Semantic Logic.
        // If gemini-2.5-pro hits its free-tier quota (429), we automatically retry with gemini-2.0-flash.
        // When Pro credits refresh, the system naturally uses Pro again on the next request.

        const geminiModels = ['gemini-2.5-pro', 'gemini-2.0-flash'];

        const requestBody = JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Audio } }
                ]
            }],
            generationConfig: {
                temperature: 0.1, // Forensic precision
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            }
        });

        let resultText: string | null = null;
        let lastError = '';

        for (const model of geminiModels) {
            console.log(`[Neural Acoustic] Attempting inference with: ${model}...`);
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });

            if (response.ok) {
                const data = await response.json();
                resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                console.log(`[Neural Acoustic] ✓ Success using ${model}`);
                break;
            } else {
                const errorText = await response.text();
                lastError = errorText;
                console.warn(`[Neural Acoustic] ✗ ${model} failed (quota/error). Falling back to next model. Status: ${response.status}`);
                // Continue to next model in the fallback array
            }
        }

        if (resultText === null) {
            console.error('[Neural Acoustic] All Gemini models exhausted. Last error:', lastError);
            return Response.json({ error: 'All Gemini models temporarily at quota limit. Please try again in a few minutes.', details: lastError }, { status: 429, headers: corsHeaders });
        }

        if (resultText === 'EMPTY') {
            return Response.json({ text: '' }, { headers: corsHeaders });
        }

        return Response.json({ text: resultText }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Neural Acoustic Engine error:', error);
        return Response.json({ error: 'Internal server error during audio processing' }, { status: 500, headers: corsHeaders });
    }
}
