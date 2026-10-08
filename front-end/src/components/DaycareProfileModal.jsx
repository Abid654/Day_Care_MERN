import { useEffect } from "react";
import { X, MapPin, Phone, Wallet, ShieldCheck } from "lucide-react";
import DaycarePhotoGallery from "./DaycarePhotoGallery";

const DaycareProfileModal = ({ daycare, onClose }) => {
    useEffect(() => {
        if (!daycare) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [daycare]);

    if (!daycare) return null;
    const profile = daycare.profile || {};
    const list = (value) => Array.isArray(value) && value.length ? value.join(", ") : "Not provided";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="daycare-profile-title" className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden overscroll-contain rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
                    <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Daycare profile</p><h2 id="daycare-profile-title" className="mt-1 truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{daycare.name || profile.daycareName}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} />{profile.address || daycare.address || "Address not provided"}{(profile.area || daycare.area) ? `, ${profile.area || daycare.area}` : ""}</p></div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close profile"><X size={20} /></button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
                    <div className="mb-6"><DaycarePhotoGallery images={profile.images || []} title={daycare.name} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Detail label="About the daycare" value={profile.description || daycare.description || "No description provided."} wide />
                        <Detail label="Contact person" value={daycare.contactName || "Not provided"} icon={<ShieldCheck size={16} />} />
                        <Detail label="Contact phone" value={profile.phone || daycare.phone || "Not provided"} icon={<Phone size={16} />} />
                        <Detail label="Monthly fee" value={profile.fee != null || daycare.fee != null ? `Rs. ${profile.fee ?? daycare.fee}` : "Not provided"} icon={<Wallet size={16} />} />
                        <Detail label="Experience" value={`${profile.experienceYears || 0} years`} />
                        <Detail label="Payment options" value={list(profile.paymentOptions)} />
                        <Detail label="Services" value={list(profile.services || daycare.services)} />
                        <Detail label="Qualifications" value={list(profile.qualifications)} />
                        <Detail label="Training" value={list(profile.training)} />
                        <Detail label="Facilities" value={list(profile.facilities)} />
                        <Detail label="Medical staff" value={profile.medicalStaffCount ?? 0} />
                        <Detail label="Nursing staff" value={profile.nursingStaffCount ?? 0} />
                        <Detail label="Care facilities" value={`CCTV: ${profile.cctv ? "Available" : "Not available"} · Nursing facilities: ${profile.nursingFacilities ? "Available" : "Not available"}`} wide />
                    </div>
                </div>
            </section>
        </div>
    );
};

const Detail = ({ label, value, icon, wide }) => <div className={`rounded-2xl bg-slate-50 p-4 ${wide ? "sm:col-span-2" : ""}`}><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{icon}{label}</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p></div>;

export default DaycareProfileModal;
