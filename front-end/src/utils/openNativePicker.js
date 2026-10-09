export const openNativePicker = (event) => {
    const input = event.currentTarget;
    if (typeof input.showPicker !== "function") return;

    try {
        input.showPicker();
    } catch {
        // The native picker may already be open or unavailable in this browser.
    }
};
