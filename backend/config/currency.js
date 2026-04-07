// backend/config/currency.js
const CURRENCY = {
    code: 'PGK',
    symbol: 'K',
    name: 'Papua New Guinea Kina',
    decimalPlaces: 2,
    
    // Format amount to PNG Kina (e.g., K 100.50)
    format: (amount) => {
        if (amount === null || amount === undefined) return 'K 0.00';
        return `K ${parseFloat(amount).toFixed(2)}`;
    },
    
    // Format without symbol (for calculations)
    parse: (formattedAmount) => {
        if (typeof formattedAmount === 'string') {
            return parseFloat(formattedAmount.replace('K', '').trim());
        }
        return parseFloat(formattedAmount);
    },
    
    // For converting from USD to PGK (if needed)
    fromUSD: (usdAmount, exchangeRate = 3.5) => {
        return usdAmount * exchangeRate;
    },
    
    // For converting to USD (if needed)
    toUSD: (pgkAmount, exchangeRate = 3.5) => {
        return pgkAmount / exchangeRate;
    }
};

module.exports = CURRENCY;