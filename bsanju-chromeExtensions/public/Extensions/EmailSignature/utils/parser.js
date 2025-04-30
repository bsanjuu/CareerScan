export function extractSignature(text) {
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Improved patterns
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
    const extensionRegex = /(ext(?:ension)?[:\s]?\s*(\d+))/i;
    const companyRegex = /^(?!.*(http|www|\.com))[A-Z][a-zA-Z0-9\s&-]+(Inc|LLC|Ltd|Corp|Co|Tech|Solutions|Systems)?$/i;

    let name = "", email = "", phone = "", extension = "", company = "";

    // More sophisticated name detection
    const nameCandidates = lines.filter(line => {
        const words = line.split(/\s+/);
        return words.length >= 2 && words.length <= 4 &&
            words.every(w => /^[A-Z][a-z]*$/.test(w)) &&
            !emailRegex.test(line) &&
            !phoneRegex.test(line);
    });

    if (nameCandidates.length > 0) {
        name = nameCandidates[0];
    }

    // Process lines in reverse (signature usually at bottom)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];

        if (!email) {
            const emailMatch = line.match(emailRegex);
            if (emailMatch) email = emailMatch[0].toLowerCase();
        }

        if (!phone) {
            const phoneMatch = line.match(phoneRegex);
            if (phoneMatch) phone = phoneMatch[0];
        }

        if (!extension) {
            const extMatch = line.match(extensionRegex);
            if (extMatch) extension = extMatch[1];
        }

        if (!company) {
            const companyMatch = line.match(companyRegex);
            if (companyMatch && companyMatch[0].length > 3) {
                company = companyMatch[0];
                // Don't use domain as company name
                if (company.includes('.')) company = "";
            }
        }
    }

    // Improved fallbacks
    if (email && !company) {
        const domain = email.split('@')[1];
        company = domain.split('.')[0]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    if (email && !name) {
        name = email.split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    // Cleanup
    if (company) {
        company = company.replace(/,/g, ''); // Remove commas for CSV
    }

    return {
        name: name || "Not found",
        email: email || "Not found",
        phone: phone || "Not found",
        extension: extension || "",
        company: company || "Not found",
        date: new Date().toLocaleString()
    };
}