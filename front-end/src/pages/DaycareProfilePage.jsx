import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, MapPin, Phone, ShieldCheck, Wallet, Building2, Users, Video, Stethoscope, CheckCircle2, XCircle, GraduationCap, Clock3, ArrowUpRight } from "lucide-react";
import { getAdminDaycare, reviewDaycare } from "../api/adminApi";
import { getDaycareListing } from "../api/daycareApi";
import DaycarePhotoGallery from "../components/DaycarePhotoGallery";

const DaycareProfilePage = ({ adminView = false }) => {
    const navigate = useNavigate();
    const { daycareId } = useParams();
    const [daycare, setDaycare] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewSaving, setReviewSaving] = useState(false);
    const { user, token } = useMemo(() => {
        try {
            return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") };
        } catch {
            return { user: null, token: null };
        }
    }, []);

    useEffect(() => {
        const expectedRole = adminView ? "admin" : "parent";
        if (!token || user?.role !== expectedRole) {
            navigate(adminView ? "/admin" : "/", { replace: true });
            return;
        }
        let active = true;
        (adminView ? getAdminDaycare(daycareId, token) : getDaycareListing(daycareId))
            .then(({ data }) => { if (active) setDaycare(data.daycare); })
            .catch((error) => {
                if (active) {
                    toast.error(error.response?.data?.message || "Could not load daycare profile.");
                    setDaycare(null);
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [adminView, daycareId, navigate, token, user]);

    if (!token || user?.role !== (adminView ? "admin" : "parent")) return null;

    const profile = daycare?.profile || {};
    const images = profile.images || [];
    const list = (items) => Array.isArray(items) && items.length ? items : [];
    const handleReview = async (decision) => {
        try {
            setReviewSaving(true);
            const { data } = await reviewDaycare(daycare.id, decision, token);
            setDaycare((current) => ({ ...current, listingStatus: data.listingStatus, profile: current.profile ? { ...current.profile, approvalStatus: data.listingStatus, isVerified: data.listingStatus === "approved" } : null }));
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update daycare review.");
        } finally {
            setReviewSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                    <button onClick={() => navigate(adminView ? "/admin/dashboard" : "/parent/dashboard")} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><ArrowLeft size={18} />{adminView ? "Back to applications" : "Back to daycares"}</button>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><Building2 size={18} /></span>Online Daycare</div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
                {loading ? <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">Loading daycare profile...</div> : !daycare ? <div className="rounded-3xl bg-white p-12 text-center shadow-sm"><h1 className="text-xl font-bold text-slate-900">Daycare profile unavailable</h1><p className="mt-2 text-sm text-slate-500">This listing may have been removed or is no longer available.</p><button onClick={() => navigate(adminView ? "/admin/dashboard" : "/parent/dashboard")} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Return to dashboard</button></div> : <>
                    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                        <div className="p-3 sm:p-5"><DaycarePhotoGallery images={images} title={daycare.name} /></div>
                        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
                            <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{daycare.name}</h1>{profile.isVerified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck size={14} /> Verified</span>}</div><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><MapPin size={17} className="text-sky-600" />{profile.address || "Address not provided"}{profile.area ? `, ${profile.area}` : ""}</p><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{profile.description || "Contact the daycare to learn more about its care services."}</p></div>
                            <div className="shrink-0 rounded-2xl bg-indigo-50 px-5 py-4 sm:min-w-44"><p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Monthly fee</p><p className="mt-1 text-2xl font-extrabold text-indigo-900">{profile.fee != null ? `Rs. ${profile.fee}` : "Not provided"}</p></div>
                        </div>
                    </section>

                    {!adminView && <>
                        <nav aria-label="Daycare profile sections" className="sticky top-[73px] z-10 mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
                            {[ ["profile-overview", "Overview"], ["profile-care", "Care & facilities"], ["profile-qualifications", "Qualifications"], ["profile-contact", "Contact"] ].map(([id, label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">{label}</a>)}
                        </nav>
                        <section id="profile-overview" className="mt-5 grid gap-4 sm:grid-cols-3">
                            <ProfileHighlight icon={<MapPin size={18} />} label="Location" value={[profile.area, profile.address].filter(Boolean).join(" · ") || "Contact daycare for location"} />
                            <ProfileHighlight icon={<Clock3 size={18} />} label="Experience" value={profile.experienceYears != null ? `${profile.experienceYears} years in childcare` : "Not provided"} />
                            <ProfileHighlight icon={<Wallet size={18} />} label="Monthly fee" value={profile.fee != null ? `Rs. ${Number(profile.fee).toLocaleString()}` : "Contact daycare for fee details"} />
                        </section>
                    </>}

                    {adminView && <section className="mt-5 flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">Review application</h2><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${daycare.listingStatus === "approved" ? "bg-emerald-50 text-emerald-700" : daycare.listingStatus === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{daycare.listingStatus}</span></div><p className="mt-1 text-sm text-slate-500">Approving publishes this daycare profile to parents.</p></div><div className="flex gap-3"><button onClick={() => handleReview("approved")} disabled={!daycare.profile || !daycare.isActive || daycare.listingStatus === "approved" || reviewSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={16} />Approve</button><button onClick={() => handleReview("rejected")} disabled={daycare.listingStatus === "rejected" || reviewSaving} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={16} />Reject</button></div></section>}

                    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
                        <section id="profile-care" className="scroll-mt-36 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Care environment</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">Care and facilities</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={19} /></span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Info icon={<Users size={18} />} label="Services" value={list(profile.services).map((item) => item === "home" ? "Home based" : "Daycare facility").join(", ") || "Not provided"} />
                            <Info icon={<ShieldCheck size={18} />} label="Experience" value={profile.experienceYears != null ? `${profile.experienceYears} years` : "Not provided"} />
                            <Info icon={<Building2 size={18} />} label="Facilities" value={list(profile.facilities).join(", ") || "Not provided"} />
                            <Info icon={<Wallet size={18} />} label="Payment options" value={list(profile.paymentOptions).join(", ") || "Please contact the daycare"} />
                            <Info icon={<Video size={18} />} label="CCTV" value={profile.cctv ? "Available" : "Not available"} />
                            <Info icon={<Stethoscope size={18} />} label="Nursing facilities" value={profile.nursingFacilities ? `Available · ${profile.nursingStaffCount || 0} staff` : "Not available"} />
                        </div></section>
                        <aside id="profile-contact" className="scroll-mt-36 h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:sticky sm:top-36 sm:p-6"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Get in touch</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{adminView ? "Provider details" : "Contact daycare"}</h2><p className="mt-1 text-sm text-slate-500">{adminView ? "Registration information for review." : "Ask about availability or arrange a visit."}</p><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact person</p><p className="mt-1 font-semibold text-slate-800">{daycare.contactName}</p>{adminView && <p className="mt-1 break-all text-sm text-slate-500">{daycare.ownerEmail}</p>}</div><a href={`tel:${profile.phone || daycare.phone}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"><Phone size={17} />Call {profile.phone || daycare.phone}</a>{!adminView && profile.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([profile.address, profile.area].filter(Boolean).join(", "))}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><MapPin size={17} />Get directions<ArrowUpRight size={15} /></a>}<p className="mt-3 text-center text-xs text-slate-400">{adminView ? (daycare.isActive ? "Provider account active" : "Provider account inactive") : "Contact details are shared by the daycare provider."}</p></aside>
                    </div>
                    <section id="profile-qualifications" className="mt-5 scroll-mt-36 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><GraduationCap size={20} /></span><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Team expertise</p><h2 className="font-extrabold text-slate-900">Qualifications and training</h2></div></div><div className="grid gap-4 sm:grid-cols-2"><TextList title="Qualifications" items={profile.qualifications} /><TextList title="Training" items={profile.training} /></div></section>
                </>}
            </main>
        </div>
    );
};

const Info = ({ icon, label, value }) => <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><span className="mt-0.5 text-indigo-600">{icon}</span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm leading-5 text-slate-700">{value}</p></div></div>;
const ProfileHighlight = ({ icon, label, value }) => <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">{value}</p></div></div>;
const TextList = ({ title, items }) => <div className="rounded-2xl border border-slate-100 p-4"><h3 className="text-sm font-bold text-slate-800">{title}</h3>{items?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{items.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">Not provided</p>}</div>;

export default DaycareProfilePage;
