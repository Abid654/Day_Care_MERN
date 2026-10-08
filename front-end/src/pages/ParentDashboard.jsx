import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAssetUrl } from "../api/client";
import { getDaycareListings } from "../api/daycareApi";
import {
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Eye,
    Heart,
    LogOut,
    MapPin,
    Plus,
    Search,
    ShieldCheck,
    Users,
} from "lucide-react";

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [daycares, setDaycares] = useState([]);
    const [daycaresLoading, setDaycaresLoading] = useState(true);
    const [areaFilter, setAreaFilter] = useState("");
    const [careType, setCareType] = useState("");
    const { user, token } = useMemo(() => {
        try {
            return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") };
        } catch {
            return { user: null, token: null };
        }
    }, []);

    useEffect(() => {
        if (!token || user?.role !== "parent") navigate("/", { replace: true });
    }, [navigate, token, user]);

    useEffect(() => {
        if (!token || user?.role !== "parent") return;
        getDaycareListings()
            .then(({ data }) => setDaycares(data.daycares || []))
            .catch(() => toast.error("Could not load daycare listings. Please try again."))
            .finally(() => setDaycaresLoading(false));
    }, [token, user]);

    const filteredDaycares = useMemo(() => daycares.filter((daycare) => {
        const matchesArea = !areaFilter || `${daycare.area} ${daycare.name}`.toLowerCase().includes(areaFilter.toLowerCase());
        const matchesCare = !careType || daycare.services.some((service) => service.toLowerCase() === careType);
        return matchesArea && matchesCare;
    }), [areaFilter, careType, daycares]);

    if (!token || user?.role !== "parent") return null;

    const firstName = user.name?.trim().split(/\s+/)[0] || "there";
    const initials = user.name?.trim().split(/\s+/).slice(0, 2)
        .map((part) => part[0]?.toUpperCase()).join("") || "P";
    const today = new Intl.DateTimeFormat("en", {
        weekday: "long", month: "long", day: "numeric",
    }).format(new Date());
    const showComingSoon = () => toast.info("This feature is coming soon.");
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
            <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <a href="#overview" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xl text-white shadow-md shadow-sky-200">🧸</div>
                        <div><p className="text-lg font-bold leading-tight">Online Daycare</p><p className="text-xs text-slate-500">Family portal</p></div>
                    </a>
                    <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
                        <a className="text-sky-600" href="#overview">Overview</a>
                        <a className="text-slate-500 transition hover:text-sky-600" href="#children">My children</a>
                        <a className="text-slate-500 transition hover:text-sky-600" href="#appointments">Appointments</a>
                    </nav>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={showComingSoon} aria-label="Notifications" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"><Bell size={19} /></button>
                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                        <div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">{initials}</div><span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{user.name}</span></div>
                        <button onClick={handleLogout} aria-label="Sign out" title="Sign out" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>

            <main id="overview" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                <section className="mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-100 sm:p-9">
                    <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
                        <div className="max-w-xl"><p className="mb-3 text-sm font-semibold text-sky-100">{today} · FAMILY DASHBOARD</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Good morning, {firstName} <span aria-hidden="true">👋</span></h1><p className="mt-3 max-w-lg leading-7 text-sky-50">Find trusted care that fits your child, your schedule, and your family.</p></div>
                        <div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><ShieldCheck size={24} /></div><div><p className="font-semibold">Your family space</p><p className="text-sm text-sky-100">Care details in one place</p></div></div>
                    </div>
                    <div className="mt-8 rounded-2xl bg-white p-3 text-slate-700 shadow-lg sm:p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                            <label className="block text-xs font-semibold text-slate-500">DAYCARE LOCATION<span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal text-slate-400"><MapPin size={17} className="text-sky-600" /><input value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="w-full bg-transparent outline-none" placeholder="City or area" /></span></label>
                            <label className="block text-xs font-semibold text-slate-500">CARE TYPE<select value={careType} onChange={(event) => setCareType(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-500 outline-none focus:border-sky-400"><option value="">Any care type</option><option value="home">Home based</option><option value="facility">Facility</option></select></label>
                            <a href="#daycares" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:shadow-lg"><Search size={17} /> Search care</a>
                        </div>
                    </div>
                </section>

                <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard icon={<Users size={19} />} label="Children" value="0" detail="Add a child profile" color="sky" />
                    <SummaryCard icon={<CalendarDays size={19} />} label="Appointments" value="0" detail="Visits and care bookings" color="indigo" />
                    <SummaryCard icon={<Heart size={19} />} label="Saved daycares" value="0" detail="Your shortlisted providers" color="rose" />
                    <SummaryCard icon={<CheckCircle2 size={19} />} label="Family profile" value="In progress" detail="Add your care preferences" color="emerald" />
                </section>

                <section id="daycares" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Find care</p><h2 className="mt-1 text-xl font-bold text-slate-900">Daycares for your family</h2><p className="mt-1 text-sm text-slate-500">Providers appear here after they register.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">{daycares.length} listed</span></div>
                    {daycaresLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading daycares…</p> : filteredDaycares.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredDaycares.map((daycare) => <article key={daycare.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md"><div className="h-44 bg-gradient-to-br from-sky-100 via-indigo-50 to-cyan-100">{daycare.images?.length ? <a href={getAssetUrl(daycare.images[0])} target="_blank" rel="noreferrer"><img src={getAssetUrl(daycare.images[0])} alt={`${daycare.name} daycare`} className="h-full w-full object-cover" /></a> : <div className="flex h-full items-center justify-center"><MapPin size={30} className="text-sky-600" /></div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">{daycare.name}</h3>{daycare.isVerified && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Verified</span>}</div><p className="mt-1 text-sm text-slate-500">{daycare.area}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{daycare.description}</p>{daycare.images?.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{daycare.images.slice(1).map((image, index) => <a key={image} href={getAssetUrl(image)} target="_blank" rel="noreferrer" className="shrink-0"><img src={getAssetUrl(image)} alt={`${daycare.name} photo ${index + 2}`} className="h-14 w-16 rounded-lg object-cover" /></a>)}</div>}<div className="mt-4 flex flex-wrap gap-2">{daycare.services.length ? daycare.services.map((service) => <span key={service} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium capitalize text-sky-700">{service.replace("-", " ")}</span>) : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">New provider</span>}</div><button onClick={() => navigate(`/daycares/${daycare.id}`)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"><Eye size={16} />{"View daycare profile"}</button><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{daycare.profileComplete ? `Contact: ${daycare.phone}` : "Profile details coming soon"}</span>{daycare.fee != null && <strong className="text-slate-900">Rs. {daycare.fee}</strong>}</div></div></article>)}</div> : <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center"><h3 className="font-semibold text-slate-800">{daycares.length ? "No daycares match your search" : "No daycares registered yet"}</h3><p className="mt-2 text-sm text-slate-500">{daycares.length ? "Try a different area or care type." : "New daycare providers will show up here as soon as they sign up."}</p></div>}
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                    <div id="children" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                        <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Family profile</p><h2 className="mt-1 text-xl font-bold text-slate-900">Children & care needs</h2><p className="mt-1 text-sm text-slate-500">Profiles help match your family with suitable providers.</p></div><button aria-label="Add child" title="Add child" onClick={showComingSoon} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"><Plus size={20} /></button></div>
                        <div className="rounded-2xl border border-dashed border-sky-200 bg-gradient-to-br from-sky-50/70 to-indigo-50/60 px-5 py-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm"><Users size={25} /></div><h3 className="font-semibold text-slate-800">Start with a child profile</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Add age, schedule, location, and care requirements to make daycare searches more relevant.</p><button onClick={showComingSoon} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-50"><Plus size={16} /> Add child details</button></div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3"><InfoTile title="Schedule" value="Full-time or part-time" /><InfoTile title="Care area" value="Choose a location" /><InfoTile title="Emergency contact" value="Add contact details" /></div>
                    </div>
                    <div id="appointments" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Your schedule</p><h2 className="mt-1 text-xl font-bold text-slate-900">Appointments</h2><p className="mt-1 text-sm text-slate-500">Visits and upcoming care.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><CalendarDays size={19} /></div></div>
                        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-slate-50 px-5 py-8 text-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Clock3 size={21} /></div><h3 className="font-semibold text-slate-800">No appointments yet</h3><p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Your daycare visits and bookings will appear here.</p><button onClick={showComingSoon} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-indigo-600">Explore providers <ChevronRight size={16} /></button></div>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 md:grid-cols-3"><FeatureCard icon={<Heart size={20} />} title="Family reviews" text="Compare feedback from parents as you explore providers." color="rose" /><FeatureCard icon={<ShieldCheck size={20} />} title="Care preferences" text="Keep emergency contacts and support needs together." color="emerald" /><FeatureCard icon={<CheckCircle2 size={20} />} title="Payments & receipts" text="Keep daycare payments and payment history organized." color="indigo" /></section>
            </main>
        </div>
    );
};

const colorStyles = { sky: "bg-sky-50 text-sky-600", indigo: "bg-indigo-50 text-indigo-600", rose: "bg-rose-50 text-rose-500", emerald: "bg-emerald-50 text-emerald-600" };
const SummaryCard = ({ icon, label, value, detail, color }) => <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[color]}`}>{icon}</span></div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
const InfoTile = ({ title, value }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-xs font-medium text-slate-600">{value}</p></div>;
const featureColors = { rose: "bg-rose-50 text-rose-500", emerald: "bg-emerald-50 text-emerald-600", indigo: "bg-indigo-50 text-indigo-600" };
const FeatureCard = ({ icon, title, text, color }) => <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${featureColors[color]}`}>{icon}</div><div><h3 className="font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{text}</p></div></div>;

export default ParentDashboard;
