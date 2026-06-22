export interface OfflineTransaction {
    amount: number;
    type: 'inflow' | 'outflow';
    category: string;
    title: string;
}

const OUTFLOW_KEYWORDS = ['spent', 'bought', 'paid', 'purchased', 'lost'];
const INFLOW_KEYWORDS = ['earned', 'got', 'received', 'made', 'salary', 'income', 'won'];

const CATEGORY_MAP: Record<string, string[]> = {
    'Food': ['coffee', 'lunch', 'dinner', 'breakfast', 'snack', 'restaurant', 'cafe', 'food', 'groceries', 'burger', 'pizza'],
    'Transport': ['uber', 'lyft', 'taxi', 'train', 'bus', 'flight', 'gas', 'fuel', 'metro'],
    'Shopping': ['clothes', 'shoes', 'amazon', 'mall', 'jacket'],
    'Entertainment': ['movie', 'cinema', 'game', 'concert', 'ticket'],
    'Income': ['freelance', 'salary', 'client', 'bonus', 'paycheck'],
    // Add default mapping if nothing matches
};

export const parseOfflineTransactions = (input: string): OfflineTransaction[] => {
    // 1. Split compound sentences by conjunctions
    const segments = input
        .toLowerCase()
        .replace(/[.,]/g, '') // remove punctuation
        .split(/\s+(?:and|plus|then)\s+/);

    const transactions: OfflineTransaction[] = [];

    // 2. Parse each segment
    segments.forEach((segment) => {
        const words = segment.split(' ');

        // Find Amount (first sequence of digits)
        const amountMatch = segment.match(/\d+/);
        if (!amountMatch) return; // Cannot parse without amount
        const amount = parseInt(amountMatch[0], 10);

        // Find Type
        let type: 'inflow' | 'outflow' = 'outflow'; // Default to outflow
        const hasInflow = words.some(w => INFLOW_KEYWORDS.includes(w));
        const hasOutflow = words.some(w => OUTFLOW_KEYWORDS.includes(w));
        if (hasInflow && !hasOutflow) type = 'inflow';

        // Find Category
        let category = 'Other';
        for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
            if (words.some(w => keywords.includes(w))) {
                category = cat;
                if (type === 'outflow' && cat === 'Income') type = 'inflow'; // Safety override
                break;
            }
        }

        // Generate Title (Original text stripped of conjunctions, capitalized)
        const title = segment.charAt(0).toUpperCase() + segment.slice(1);

        transactions.push({
            amount,
            type,
            category,
            title
        });
    });

    return transactions;
};
