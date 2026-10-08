import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAssetUrl } from "../api/client";
import { getAdminDaycares, reviewDaycare } from "../api/adminApi";
import { Activity, Building2, CheckCircle2, LogOut, MapPin, ShieldCheck, Users, XCircle } from "lucide-react";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user, token } = useMemo(() => {
        try {
            return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") };
        } catch {
            return { user: null, token: null };
        }
    }, []);
    const [daycares, setDaycares] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || user?.role !== "admin") {
            navigate("/admin", { replace: true });
            return;
        }
        getAdminDaycares(token)
            .then(({ data }) => setDaycares(data.daycares || []))
            .catch(() => toast.error("Could not load daycare providers."))
            .finally(() => setLoading(false));
    }, [navigate, token, user]);

    if (!token || user?.role !== "admin") return null;

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/admin", { replace: true });
    };
    const pendingCount = daycares.filter((daycare) => daycare.listingStatus === "pending").length;
    const approvedCount = daycares.filter((daycare) => daycare.listingStatus === "approved").length;
    const review = async (daycareId, decision) => {
        try {
            const { data } = await reviewDaycare(daycareId, decision, token);
            setDaycares((items) => items.map((item) => item.id === daycareId ? { ...item, listingStatus: data.listingStatus, profile: item.profile ? { ...item.profile, approvalStatus: data.listingStatus, isVerified: data.listingStatus === "approved" } : null } : item));
            toast.success(data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update daycare review.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><ShieldCheck size={23} /></span><div><p className="font-bold text-slate-900">Online Daycare</p><p className="text-xs text-slate-500">Administration</p></div></div>
                    <div className="flex items-center gap-4"><span className="hidden text-sm font-medium text-slate-600 sm:block">{user.name}</span><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LogOut size={16} /> Sign out</button></div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Platform overview</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Admin dashboard</h1><p className="mt-2 text-slate-500">Review daycare registrations and provider profile status.</p></div>

                <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric icon={<Building2 size={20} />} label="Daycare applications" value={loading ? "…" : daycares.length} color="indigo" />
                    <Metric icon={<CheckCircle2 size={20} />} label="Approved listings" value={loading ? "…" : approvedCount} color="emerald" />
                    <Metric icon={<Activity size={20} />} label="Waiting for review" value={loading ? "…" : pendingCount} color="amber" />
                </section>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-bold text-slate-900">Daycare applications</h2><p className="mt-1 text-sm text-slate-500">Review provider details before publishing them to parents</p></div><span className="flex items-center gap-2 text-sm text-slate-500"><Users size={17} /> {daycares.length} providers</span></div>
                    {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading provider applications…</p> : daycares.length === 0 ? <div className="p-10 text-center"><Building2 className="mx-auto text-slate-300" size={34} /><h3 className="mt-3 font-semibold text-slate-800">No daycare registrations yet</h3><p className="mt-1 text-sm text-slate-500">New active providers will appear here.</p></div> : <div className="divide-y divide-slate-100">{daycares.map((daycare) => <article key={daycare.id} className="px-6 py-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={20} /></span><div><h3 className="font-bold text-slate-900">{daycare.name}</h3><p className="mt-1 text-sm text-slate-500">Owner: {daycare.contactName} · {daycare.ownerEmail} · {daycare.phone}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={13} /> {daycare.profile?.address || "Address not submitted"}{daycare.profile?.area ? `, ${daycare.profile.area}` : ""}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${daycare.listingStatus === "approved" ? "bg-emerald-50 text-emerald-700" : daycare.listingStatus === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{daycare.listingStatus}</span>{daycare.profile && <><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Fee: Rs. {daycare.profile.fee}</span>{daycare.profile.services.map((service) => <span key={service} className="rounded-full bg-sky-50 px-3 py-1 text-xs capitalize text-sky-700">{service}</span>)}</>}</div></div></div><div className="flex gap-2 sm:shrink-0"><button onClick={() => review(daycare.id, "approved")} disabled={!daycare.profile || !daycare.isActive || daycare.listingStatus === "approved"} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={16} /> Approve</button><button onClick={() => review(daycare.id, "rejected")} disabled={daycare.listingStatus === "rejected"} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><XCircle size={16} /> Reject</button></div></div>
                        {daycare.profile ? <><div className="mt-4 grid gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><strong>Description:</strong> {daycare.profile.description || "Not provided"}</p><p><strong>Experience:</strong> {daycare.profile.experienceYears || 0} years</p><p><strong>Qualifications:</strong> {daycare.profile.qualifications.join(", ") || "Not provided"}</p><p><strong>Training:</strong> {daycare.profile.training.join(", ") || "Not provided"}</p><p><strong>Facilities:</strong> {daycare.profile.facilities.join(", ") || "Not provided"}</p><p><strong>Payment options:</strong> {daycare.profile.paymentOptions.join(", ") || "Not provided"}</p><p><strong>CCTV:</strong> {daycare.profile.cctv ? "Yes" : "No"} · <strong>Nursing:</strong> {daycare.profile.nursingFacilities ? "Yes" : "No"}</p></div>{daycare.profile.images.length > 0 && <div className="mt-3 flex gap-3 overflow-x-auto">{daycare.profile.images.map((image, index) => <a key={image} href={getAssetUrl(image)} target="_blank" rel="noreferrer"><img src={getAssetUrl(image)} alt={`${daycare.name} photo ${index + 1}`} className="h-24 w-32 rounded-xl object-cover" /></a>)}</div>}</> : <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Daycare profile details have not been submitted yet. Approval stays disabled until a profile is submitted.</p>}</article>)}</div>}
                </section>
            </main>
        </div>
    );
};

const metricStyles = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" };
const Metric = ({ icon, label, value, color }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metricStyles[color]}`}>{icon}</span></div><p className="mt-5 text-3xl font-extrabold text-slate-900">{value}</p></div>;

export default AdminDashboard;
