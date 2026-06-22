import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return Response.json({ error: 'Not authenticated' }, { status: 401, headers: CORS_HEADERS });
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return Response.json({ error: 'Not authenticated' }, { status: 401, headers: CORS_HEADERS });
        }

        const body = await req.json();
        const {
            type = 'income',
            raw_transcript,
            amount_usd,
            platform_fee_usd = 0,
            withdrawal_fee_usd = 0,
            exchange_rate,
            category,
            date,
            ...dynamicFields
        } = body;

        // Ensure user profile exists
        const { data: profile, error: profileSelectError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
            }, { onConflict: 'id' });
        }

        const zeroDecimalCurrencies = ['PKR', 'INR', 'JPY', 'KRW', 'IDR', 'VND'];
        let final_transcript = raw_transcript;

        if (dynamicFields.original_currency && dynamicFields.original_amount !== undefined) {
            if (zeroDecimalCurrencies.includes(dynamicFields.original_currency.toUpperCase())) {
                dynamicFields.original_amount = Math.round(Number(dynamicFields.original_amount));
            }
            final_transcript = (raw_transcript || '') + `|META:${JSON.stringify({ c: dynamicFields.original_currency, a: dynamicFields.original_amount })}`;
        }

        Object.keys(dynamicFields).forEach(key => {
            if (key.startsWith('amount_') || key.startsWith('net_')) {
                const currencyCode = key.split('_')[1]?.toUpperCase();
                if (currencyCode && zeroDecimalCurrencies.includes(currencyCode)) {
                    dynamicFields[key] = Math.round(Number(dynamicFields[key]));
                }
            }
        });

        const insertData: any = {
            user_id: user.id,
            type,
            raw_transcript: final_transcript,
            amount_usd,
            platform_fee_usd,
            withdrawal_fee_usd,
            exchange_rate,
            category,
            ...(date ? { date } : {}),
        };

        Object.keys(dynamicFields).forEach(key => {
            if (key.startsWith('amount_') || key.startsWith('net_')) {
                insertData[key] = dynamicFields[key];
            }
        });

        const { data, error } = await supabase.from('transactions').insert(insertData).select().single();

        if (error) {
            console.error('Transaction save error:', error);
            return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
        }

        return Response.json({ success: true, transaction: data }, { headers: CORS_HEADERS });
    } catch (error: any) {
        console.error('Transaction API error:', error);
        return Response.json({ error: error?.message || 'Server error' }, { status: 500, headers: CORS_HEADERS });
    }
}
