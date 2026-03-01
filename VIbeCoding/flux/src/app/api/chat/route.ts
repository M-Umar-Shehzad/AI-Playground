import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const maxDuration = 30;

// Fetch real-time exchange rates for ALL major currencies (base: USD)
async function getAllExchangeRates(): Promise<Record<string, number> | null> {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
            next: { revalidate: 3600 } // Cache for 1 hour
        });
        const data = await res.json();
        if (data?.rates) {
            return data.rates; // e.g. { PKR: 278.5, CAD: 1.36, EUR: 0.92, GBP: 0.79, ... }
        }
    } catch (e) {
        console.error('Exchange rate fetch failed:', e);
    }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, country = "Pakistan", currency = "PKR", timezone = "Asia/Karachi" } = body;

        console.log(`[FLUX DEBUG] Received request — country: ${country}, currency: ${currency}, timezone: ${timezone}`);

        if (!process.env.GROQ_API_KEY) {
            return new Response(
                JSON.stringify({ error: "Missing GROQ_API_KEY in .env.local" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const modelMessages = messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.parts
                    ? m.parts
                        .filter((p: any) => p.type === 'text')
                        .map((p: any) => p.text)
                        .join('')
                    : (m.content || ''),
            }));

        // Fetch ALL live exchange rates
        const allRates = await getAllExchangeRates();

        let rateInfo = '';
        if (allRates) {
            const userRate = allRates[currency] || 1;
            // Build a compact rate table for the AI with major currencies
            const majorCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR', 'JPY', 'CNY', 'AED', 'SAR', 'BDT', 'LKR'];
            const rateLines = majorCurrencies
                .filter(c => c !== currency && allRates[c])
                .map(c => {
                    const crossRate = userRate / allRates[c]; // 1 foreign = X local
                    return `1 ${c} = ${crossRate.toFixed(4)} ${currency}`;
                });
            rateInfo = `You have access to LIVE real-time exchange rates (source: open.er-api.com). These are EXACT, not estimates. NEVER say "approximate" or "estimated".\n\nLive rates to ${currency}:\n${rateLines.join('\n')}\n\nFor any other currency, calculate: amount_foreign × (${userRate} / rate_of_foreign_in_USD).`;
        } else {
            rateInfo = `Exchange rate API is temporarily unavailable. Use commonly known approximate rates and mention they are approximate.`;
        }

        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: timezone
        });

        // The exact data keys that map to the Supabase database multi-currency schema
        const amountKey = `amount_${currency.toLowerCase()}`;
        const netKey = `net_${currency.toLowerCase()}`;

        const result = streamText({
            model: groq('llama-3.3-70b-versatile'),
            system: `You are Flux Agent, a high-end financial assistant for freelancers based in ${country}. Your goal is to accurately track income and expenses in a conversational way.

TODAY'S DATE: ${today}

REAL-TIME DATA YOU ALREADY KNOW:
${rateInfo}

KNOWN PLATFORM WITHDRAWAL FEES (use these automatically, don't ask the user):
- Upwork: 
  • Upwork service fee: 10% on first $500, 5% on $500.01–$10,000
  • Direct to Local Bank: $0.99 per withdrawal
  • Payoneer: Free transfer from Upwork → Payoneer, then Payoneer → Local bank has 2% forex markup
  • Wire Transfer: $30 fee
- Fiverr:
  • Fiverr service fee: 20% of each order
  • Payoneer withdrawal: $1.00 fee + 2% forex markup
  • Bank transfer: $3.00 fee
- Freelancer.com:
  • Service fee: 10% or $5 (whichever is greater)  
  • Bank transfer: $5.00
- Direct Client (no platform):
  • Wise: ~0.5-1% fee, mid-market rate
  • Payoneer: 2% forex markup + $1.50 fee
  • Western Union: Varies, typically $5-15

RULES:
1. ALL your internal mathematics and the final JSON MUST be in ${currency}. 
2. If the user DOES NOT specify a currency symbol (e.g. "I earned 2k"), YOU MUST ASSUME it is in your native currency: ${currency}.
3. IF AND ONLY IF the user explicitly mentions a DIFFERENT currency (e.g. "$300", "€200", "500 GBP", "¥1000"), use the exchange rate data above to convert it into ${currency}. Do not ask for their permission, just do the math. NEVER say the rate is approximate — you have LIVE rates.
4. For FOREIGN currency income, show a clean breakdown: Gross amount in original currency, Exchange rate used, Converted ${currency} amount, Platform fee (if any), Net ${currency} amount.
5. For ${currency} (native) income or expenses: NEVER ask about platforms, NEVER ask if it's from a client/local.
6. ABSOLUTE PRECISION: Never round numbers! If a conversion results in $0.72, you must output exactly 0.72. Do not round it to 1. 
7. STRICT CATEGORIZATIONS: Never fallback to lazy generic labels. Do NOT use "Shopping", "General", "Misc", or "Direct Client". Extract the SPECIFIC, EXPLICIT ITEM or service the user mentions. If they say "bought shoes for 15 gbp", the category MUST be "Shoes". If they say "paid $50 for wifi", the category MUST be "WiFi". Be granular and context-aware. If no context is provided at all, use "Transfer".
8. Keep responses short, professional, and friendly.

SAVING TRANSACTIONS:
After showing the financial breakdown, ALWAYS include a TRANSACTION_DATA JSON block on a NEW LINE at the very end of your message. Do NOT ask the user whether they want to save.

Format guidelines:
- You must output valid JSON on a single line after "TRANSACTION_DATA:".
- You must map their dynamic native currency to these exact keys: "${amountKey}" and "${netKey}".
- Always include "original_currency" (the 3-letter code the user entered, e.g. "PKR", "USD", "EUR") and "original_amount" (the exact amount they entered).
- IMPORTANT FOR original_amount: If the original currency is PKR, INR, JPY, KRW, IDR, or VND, NEVER append decimals. Output 6000, not 6000.00.
- Never output "amount_pkr" or "net_pkr" unless their native currency is PKR.
- The "exchange_rate" field MUST contain the conversion rate used. Set to 0 ONLY if no conversion occurred.
- The "amount_usd" field should contain the original USD amount if the transaction was in USD, otherwise set to 0.

Example response for USD income converted to ${currency}:
TRANSACTION_DATA:{"type":"income","original_currency":"USD","original_amount":500,"amount_usd":500,"${amountKey}":${allRates ? (500 * (allRates[currency] || 1)).toFixed(0) : 1390},"platform_fee_usd":50,"withdrawal_fee_usd":0.99,"${netKey}":${allRates ? ((500 - 50 - 0.99) * (allRates[currency] || 1)).toFixed(0) : 1247},"exchange_rate":${allRates ? (allRates[currency] || 1).toFixed(2) : 2.78},"category":"Upwork","raw_transcript":"$500 Upwork payment"}

Example response for local ${currency}-only expense:
TRANSACTION_DATA:{"type":"expense","original_currency":"${currency}","original_amount":200,"amount_usd":0,"${amountKey}":200,"platform_fee_usd":0,"withdrawal_fee_usd":0,"${netKey}":200,"exchange_rate":0,"category":"Bills","raw_transcript":"200 utility bills"}

Use the ACTUAL calculation values. Always include this data block after ANY financial calculation, no exceptions.`,
            messages: modelMessages,
        });

        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error("AI Route Error:", error?.message || error);
        return new Response(
            JSON.stringify({ error: error?.message || "An error occurred" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
