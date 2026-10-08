import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ActionModal = ({ open, title, description, inputLabel, inputPlaceholder = "", inputType = "textarea", minLength = 0, required = false, confirmLabel = "Continue", tone = "primary", onConfirm, onClose }) => {
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);
    const closeRef = useRef(onClose);
    const busyRef = useRef(false);
    closeRef.current = onClose;
    busyRef.current = busy;

    useEffect(() => {
        if (!open) return undefined;
        setValue(""); setError(""); setBusy(false);
        const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
        const onKeyDown = (event) => { if (event.key === "Escape" && !busyRef.current) closeRef.current(); };
        window.addEventListener("keydown", onKeyDown);
        return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKeyDown); };
    }, [open]);

    if (!open) return null;
    const submit = async (event) => {
        event.preventDefault();
        const cleanValue = value.trim();
        if (required && !cleanValue) { setError("This field is required."); inputRef.current?.focus(); return; }
        if (cleanValue && cleanValue.length < minLength) { setError(`Enter at least ${minLength} characters.`); inputRef.current?.focus(); return; }
        setBusy(true); setError("");
        try { await onConfirm(cleanValue); }
        catch { setError("Unable to complete this action. Please try again."); setBusy(false); }
    };
    const destructive = tone === "danger";

    return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
        <section role="dialog" aria-modal="true" aria-labelledby="action-modal-title" className="my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
            <form onSubmit={submit}>
                <header className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${destructive ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}><AlertTriangle size={19} /></span>
                    <div className="min-w-0 flex-1"><h2 id="action-modal-title" className="text-lg font-extrabold text-slate-900">{title}</h2><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{description}</p></div>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button>
                </header>
                {inputLabel && <div className="px-5 pb-5 sm:px-6"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{inputLabel}{required ? " *" : ""}</span>{inputType === "textarea" ? <textarea ref={inputRef} rows={3} value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} placeholder={inputPlaceholder} maxLength={2000} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" aria-invalid={Boolean(error)} /> : <input ref={inputRef} type={inputType} value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} placeholder={inputPlaceholder} maxLength={2000} autoComplete="new-password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" aria-invalid={Boolean(error)} />}{error && <span role="alert" className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}</label></div>}
                <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={busy} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>{busy ? "Saving..." : confirmLabel}</button></footer>
            </form>
        </section>
    </div>;
};

export default ActionModal;
