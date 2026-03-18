const CATEGORY_RULES = {
    "Food": [
        "swiggy", "zomato", "uber eats", "dominos", "pizza", "burger", "kfc", "mcdonalds",
        "restaurant", "cafe", "dhaba", "hotel", "biryani", "food", "snack", "tea", "coffee",
        "chai", "breakfast", "lunch", "dinner", "bakery", "sweet"
    ],
    "Groceries": [
        "bigbasket", "grofers", "blinkit", "dunzo", "grocery", "vegetables", "fruits",
        "milk", "dairy", "supermarket", "mart", "kirana", "dmart", "reliance fresh",
        "nature basket", "spencers"
    ],
    "Travel": [
        "uber", "ola", "rapido", "metro", "train", "irctc", "bus", "auto", "cab",
        "makemytrip", "goibibo", "flight", "airline", "indigo", "spicejet", "toll",
        "parking", "rapido", "yulu", "bounce", "cityflo"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho", "snapdeal",
        "clothing", "fashion", "shoes", "watch", "gift", "store", "shop", "mall",
        "lifestyle", "pantaloons", "westside", "zara", "h&m"
    ],
    "Entertainment": [
        "netflix", "amazon prime", "hotstar", "disney", "spotify", "youtube",
        "movie", "cinema", "pvr", "inox", "bookmyshow", "game", "steam",
        "playstore", "subscription", "zee5", "sonyliv"
    ],
    "Bills & Utilities": [
        "electricity", "water", "gas", "broadband", "wifi", "internet", "airtel",
        "jio", "vodafone", "vi", "bsnl", "postpaid", "recharge", "utility",
        "rent", "maintenance", "tata", "adani", "mseb", "bescom"
    ],
    "Healthcare": [
        "pharmacy", "medical", "hospital", "clinic", "doctor", "medicine",
        "apollo", "1mg", "netmeds", "pharmeasy", "lab", "test", "health",
        "wellness", "fitness", "gym", "yoga", "diagnostics"
    ],
    "Education": [
        "udemy", "coursera", "youtube premium", "book", "stationery", "school",
        "college", "tuition", "coaching", "byju", "unacademy", "vedantu",
        "course", "skill", "learning", "exam", "pen", "notebook"
    ],
    "Fuel": [
        "petrol", "diesel", "fuel", "hp", "bharat petroleum", "indian oil",
        "iocl", "bpcl", "cng", "pump", "station", "shell", "essar"
    ]
};

function categorizeTransaction(merchant, note = "") {
    const text = `${merchant} ${note || ""}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return category;
            }
        }
    }

    return "Others";
}

module.exports = { categorizeTransaction };
