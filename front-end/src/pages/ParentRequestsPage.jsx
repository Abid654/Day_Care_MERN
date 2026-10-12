import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, Search } from "lucide-react";
import { getParentPortal } from "../api/parentApi";

const formatDate = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable";
const statusClass = (status) => ({
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    completed: "bg-sky-50 text-sky-700 ring-sky-200",
    rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    "in-progress": "bg-indigo-50 text-indigo-700 ring-indigo-200",
}[String(status || "").toLowerCase()] || "bg-slate-100 text-slate-600 ring-slate-200");

const ParentRequestsPage = () => {
    const navigate = useNavigate();
    const [daycares, setDaycares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const token = localStorage.getItem("token");
    const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();

    useEffect(() => {
        let active = true;
        if (!token || user?.role !== "parent") { navigate("/", { replace: true }); return undefined; }
        getParentPortal(token)
            .then(({ data }) => { if (active) setDaycares(data.daycares || []); })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Requests and complaints could not be loaded."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [navigate, token, user?.role]);

    const messages = useMemo(() => daycares.flatMap((center) => [
        ...(center.requests || []).map((item) => ({ ...item, messageType: "Request" })),
        ...(center.complaints || []).map((item) => ({ ...item, messageType: "Complaint" })),
    ].map((item) => ({ ...item, daycareName: center.name || "Daycare" }))).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [daycares]);
    const filteredMessages = useMemo(() => messages.filter((item) => {
        const typeMatches = filter === "all" || item.messageType.toLowerCase() === filter;
        const text = `${item.subject || ""} ${item.description || ""} ${item.daycareName} ${item.messageType}`.toLowerCase();
        return typeMatches && (!search || text.includes(search.toLowerCase()));
    }), [messages, filter, search]);
    const types = ["all", "request", "complaint"];

    return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
            <Link to="/parent/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-sky-700"><ArrowLeft size={17} />Back to dashboard</Link>
            <header className="mt-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-100">Family portal</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Requests &amp; complaints</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50">Review your complete message history and daycare responses.</p></div><div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3"><p className="text-xs font-semibold text-sky-100">Total messages</p><p className="mt-1 text-2xl font-extrabold">{messages.length}</p></div></div>
            </header>

            <section className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <label className="relative block"><span className="sr-only">Search requests and complaints</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search daycare, subject, or message" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" /></label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter messages">{types.map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-full px-3.5 py-2 text-xs font-bold capitalize transition ${filter === type ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"}`}>{type === "all" ? "All messages" : `${type}s`}</button>)}</div>
            </section>

            <section className="mt-5 space-y-4" aria-live="polite">
                {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading messages...</div>
                    : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-700">{error}</div>
                        : filteredMessages.length ? filteredMessages.map((item) => <article key={`${item.daycareName}-${item._id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${item.messageType === "Complaint" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"}`}>{item.messageType}</span><h2 className="mt-2 break-words text-lg font-bold text-slate-900">{item.subject || "No subject"}</h2></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ring-inset ${statusClass(item.status)}`}>{String(item.status || "pending").replaceAll("-", " ")}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>{item.daycareName}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{formatDate(item.createdAt)}</span>{item.requestType && <span className="capitalize">{item.requestType.replaceAll("-", " ")}</span>}</div><div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{item.description || "No message details provided."}</div>{(item.response || item.adminRemarks) && <div className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><p className="mb-1 text-xs font-bold uppercase tracking-wide">Daycare response</p>{item.response || item.adminRemarks}</div>}</article>)
                            : <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-bold text-slate-800">No messages found</p><p className="mt-1 text-sm text-slate-500">Your requests and complaints will appear here.</p></div>}
            </section>
        </div>
    </main>;
};

export default ParentRequestsPage;
