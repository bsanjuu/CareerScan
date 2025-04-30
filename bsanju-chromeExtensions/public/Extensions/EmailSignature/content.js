(function() {
    // Initial context check
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
        console.warn('Extension context not available at startup');
        return;
    }

    // State management
    let extensionContextValid = true;
    let processing = false;
    let observer;

    // Signature extraction
    function extractSignature(text) {
        text = text.replace(/\[Message clipped\]\s+View entire message/g, '')
            .replace(/\s+/g, ' ')
            .replace(/Â/g, '');

        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const signatureIndicators = [
            '--', 'Best regards', 'Thanks', 'Regards',
            'Sincerely', 'Cheers', 'Sent from my', 'Kind regards'
        ];

        let signatureStart = -1;
        for (const [i, line] of lines.entries()) {
            if (signatureIndicators.some(indicator =>
                line.toLowerCase().includes(indicator.toLowerCase()))) {
                signatureStart = i;
                break;
            }
        }

        const relevantLines = signatureStart !== -1 ?
            lines.slice(signatureStart) :
            lines.slice(Math.max(lines.length - 10, 0));

        let name = "", email = "", phone = "", extension = "", company = "";

        for (let line of [...relevantLines].reverse()) {
            if (line.length > 100 && line.includes('@') && /\d{6,}/.test(line)) continue;

            if (!email) {
                const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
                if (match) email = match[0].toLowerCase();
            }

            if (!phone) {
                const match = line.match(/(\+?\d{1,3}[\s-])?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
                if (match) phone = match[0];
            }

            if (!extension) {
                const match = line.match(/Ext(?:ension)?\.?\s?\d+/i);
                if (match) extension = match[0].toUpperCase();
            }

            if (!company && line.length < 80 &&
                /(Inc|LLC|Technologies|Corp|Solutions|Systems|Group|Company|Consulting|Services|Enterprises)$/i.test(line)) {
                company = line;
            }

            if (!name && /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(line) && !/^Hi\b/i.test(line)) {
                name = line;
            }
        }

        const fallbackCompany = (email && email.includes('@')) ?
            email.split('@')[1].split('.')[0] : "Unknown";
        const fallbackName = (email && email.includes('@')) ?
            email.split('@')[0].replace(/[._]/g, ' ') : "Unknown";

        return {
            name: name || fallbackName,
            email: email || "",
            phone: phone || "",
            extension: extension || "",
            company: company || fallbackCompany,
            date: new Date().toLocaleString()
        };
    }

    function isValidSignature(sig) {
        const validEmail = sig.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sig.email);
        const validPhone = sig.phone && /\d{7,}/.test(sig.phone.replace(/\D/g, ''));
        return validEmail && validPhone;
    }

    async function storeSignature(signature) {
        if (!extensionContextValid) return false;

        const cleanPhone = signature.phone.replace(/[^0-9]/g, '').slice(-10);
        const signatureKey = `${signature.name}-${signature.email}-${cleanPhone}`.toLowerCase();

        const row = [
            signature.name,
            signature.email,
            signature.phone,
            signature.extension,
            signature.company,
            signature.date
        ].map(v => `"${v}"`).join(",") + "\n";

        try {
            const data = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['csvData', 'extractedEmails'], result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            const existingKeys = new Set(data.extractedEmails || []);
            if (existingKeys.has(signatureKey)) {
                console.log('Skipped duplicate:', signatureKey);
                return true;
            }

            const updated = (data.csvData || 'Full Name,Email,Phone,Extension,Company Name,Date\n') + row;
            existingKeys.add(signatureKey);

            await new Promise((resolve, reject) => {
                chrome.storage.local.set({
                    csvData: updated,
                    extractedEmails: Array.from(existingKeys)
                }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });

            console.log('Added:', signatureKey);
            return true;
        } catch (error) {
            console.warn('Storage error:', error.message);
            extensionContextValid = false;
            cleanup();
            return false;
        }
    }

    async function processEmailSignatures() {
        if (processing || !extensionContextValid) return;
        processing = true;

        try {
            const emailBodies = document.querySelectorAll('.a3s, [role="textbox"]');
            for (const body of emailBodies) {
                if (!extensionContextValid) break;

                const text = body.innerText;
                const signature = extractSignature(text);

                if (!isValidSignature(signature)) continue;

                const success = await storeSignature(signature);
                if (!success) break;
            }
        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            processing = false;
        }
    }

    function cleanup() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function init() {
        if (!extensionContextValid) return;

        observer = new MutationObserver(() => {
            if (extensionContextValid) {
                processEmailSignatures();
            }
        });

        if (document.readyState === 'complete') {
            observer.observe(document.body, { childList: true, subtree: true });
            processEmailSignatures();
        } else {
            window.addEventListener('load', () => {
                if (extensionContextValid) {
                    observer.observe(document.body, { childList: true, subtree: true });
                    processEmailSignatures();
                }
            });
        }

        // Context check every 30 seconds
        const contextCheck = setInterval(() => {
            const isValid = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
            if (!isValid) {
                extensionContextValid = false;
                cleanup();
                clearInterval(contextCheck);
            }
        }, 30000);
    }

    init();
})();