import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Eye, MapPin, Search, ShieldCheck } from "lucide-react";
import { getAssetUrl } from "../api/client";
import { getDaycareListings } from "../api/daycareApi";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const ParentDaycaresPage = () => {
    const navigate = useNavigate();
    const [daycares, setDaycares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [area, setArea] = useState("");
    const [careType, setCareType] = useState("");
    const [experience, setExperience] = useState("");
    const [maxFee, setMaxFee] = useState("");
    const token = localStorage.getItem("token");
    const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();

    useEffect(() => {
        let active = true;
        if (!token || user?.role !== "parent") { navigate("/", { replace: true }); return undefined; }
        getDaycareListings().then(({ data }) => { if (active) setDaycares(data.daycares || []); })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Daycare listings could not be loaded."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [navigate, token, user?.role]);

    const filtered = useMemo(() => daycares.filter((daycare) => {
        const areaMatch = !area || `${daycare.name || ""} ${daycare.area || ""} ${daycare.address || ""}`.toLowerCase().includes(area.toLowerCase());
        const careMatch = !careType || (daycare.services || []).some((service) => service.toLowerCase() === careType);
        const experienceMatch = !experience || Number(daycare.experienceYears || 0) >= Number(experience);
        const feeMatch = !maxFee || (daycare.fee != null && Number(daycare.fee) <= Number(maxFee));
        return areaMatch && careMatch && experienceMatch && feeMatch;
    }), [area, careType, daycares, experience, maxFee]);

    return <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
            <Link to="/parent/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-sky-700">← Back to dashboard</Link>
            <header className="mt-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-100">Parent portal</p><h1 className="mt-2 text-3xl font-extrabold">Find Daycare</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50">Browse all approved daycare listings and filter them by location, care setting, experience, and listed fee.</p></header>

            <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="relative block text-xs font-bold text-slate-500">LOCATION<Search size={16} className="absolute left-3 top-9 text-slate-400" /><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="City or area" className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-normal outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" /></label>
                <label className="block text-xs font-bold text-slate-500">CARE SETTING<select value={careType} onChange={(event) => setCareType(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-sky-400"><option value="">Any setting</option><option value="home">Home based</option><option value="facility">Facility</option></select></label>
                <label className="block text-xs font-bold text-slate-500">MINIMUM EXPERIENCE<input type="number" min="0" value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="Any experience" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-sky-400" /></label>
                <label className="block text-xs font-bold text-slate-500">MAXIMUM MONTHLY FEE (RS.)<input type="number" min="0" value={maxFee} onChange={(event) => setMaxFee(event.target.value)} placeholder="Any rate" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-sky-400" /></label>
            </section>
            <div className="mb-4 mt-5 flex items-center justify-between"><h2 className="font-bold text-slate-800">Daycare listings</h2><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">{loading ? "..." : `${filtered.length} found`}</span></div>

            {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading daycare listings...</div>
                : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-700">{error}</div>
                    : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((daycare) => <article key={daycare.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"><div className="relative h-40 overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-50 to-cyan-100">{daycare.images?.length ? <img src={getAssetUrl(daycare.images[0])} alt={`${daycare.name} daycare`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center"><Building2 size={32} className="text-sky-600" /></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-4 pt-10"><div className="flex items-end justify-between gap-2"><h3 className="truncate text-base font-bold text-white drop-shadow">{daycare.name}</h3>{daycare.isVerified && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-emerald-700"><ShieldCheck size={12} />Verified</span>}</div></div></div><div className="p-4"><p className="flex items-center gap-1.5 text-sm font-medium text-slate-500"><MapPin size={15} className="shrink-0 text-sky-600" />{daycare.area || "Location details on profile"}</p><p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-slate-600">{daycare.description || "Open the provider profile for care, facilities, and contact details."}</p><div className="mt-3 flex min-h-7 flex-wrap gap-2">{(daycare.services || []).map((service) => <span key={service} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">{service.replaceAll("-", " ")}</span>)}</div><div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Monthly fee</p><p className="mt-0.5 text-base font-extrabold text-slate-900">{daycare.fee != null ? money(daycare.fee) : "Contact for fee"}</p></div><span className="max-w-[50%] truncate text-right text-xs text-slate-500">{daycare.phone || "Contact details on profile"}</span></div><button onClick={() => navigate(`/daycares/${daycare.id}`)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"><Eye size={15} />View full daycare profile<ChevronRight size={15} /></button></div></article>)}</div>
                        : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Building2 size={28} className="mx-auto text-slate-400" /><h2 className="mt-3 font-bold text-slate-800">{daycares.length ? "No daycares match these filters" : "No approved daycares yet"}</h2><p className="mt-1 text-sm text-slate-500">{daycares.length ? "Adjust the filters to see more listings." : "Approved daycare providers will appear here."}</p></div>}
        </div>
    </main>;
};

export default ParentDaycaresPage;
