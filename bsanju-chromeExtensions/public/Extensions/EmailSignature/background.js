chrome.runtime.onInstalled.addListener(() => {
    console.log("Email Signature Extractor installed.");

    const headers = "Full Name,Email,Phone,Extension,Company Name,Date\n";
    chrome.storage.local.set({ csvData: headers });
});
