import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, FileText, Search } from "lucide-react";
import { getParentPortal } from "../api/parentApi";

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Not set";
const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const statusClass = (status) => ({
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    completed: "bg-sky-50 text-sky-700 ring-sky-200",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-rose-50 text-rose-700 ring-rose-200",
    refunded: "bg-violet-50 text-violet-700 ring-violet-200",
}[String(status || "").toLowerCase()] || "bg-slate-100 text-slate-600 ring-slate-200");

const ParentBookingsPage = () => {
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
        getParentPortal(token).then(({ data }) => {
            if (active) setDaycares(data.daycares || []);
        }).catch((requestError) => {
            if (active) setError(requestError.response?.data?.message || "Bookings could not be loaded. Please try again.");
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [navigate, token, user?.role]);

    const bookings = useMemo(() => daycares.flatMap((daycare) => (daycare.bookings || []).map((booking) => ({ ...booking, daycareName: daycare.name || "Daycare", daycareId: daycare.id, payments: (daycare.payments || []).filter((payment) => String(payment.booking) === String(booking._id)) }))).sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0)), [daycares]);
    const visibleBookings = useMemo(() => bookings.filter((booking) => {
        const statusMatch = filter === "all" || booking.status === filter;
        const searchMatch = !search || `${booking.childName || booking.child?.name || ""} ${booking.daycareName} ${booking.supportType || ""}`.toLowerCase().includes(search.toLowerCase());
        return statusMatch && searchMatch;
    }), [bookings, filter, search]);
    const statusOptions = [...new Set(bookings.map((booking) => booking.status).filter(Boolean))];

    return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
            <Link to="/parent/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-sky-700"><ArrowLeft size={17} />Back to dashboard</Link>
            <header className="mt-4 flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-100">Family portal</p><h1 className="mt-2 text-3xl font-extrabold">My Bookings</h1><p className="mt-2 max-w-xl text-sm leading-6 text-sky-50">Review every daycare request, its dates, current status, and any payment records linked to it.</p></div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4"><p className="text-xs font-semibold text-sky-100">Total requests</p><p className="mt-1 text-3xl font-extrabold">{bookings.length}</p></div>
            </header>

            <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
                <label className="relative min-w-0 flex-1"><span className="sr-only">Search bookings</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by child or daycare" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" /></label>
                <label className="sr-only" htmlFor="booking-status-filter">Filter by status</label><select id="booking-status-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-400"><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ").replace(/^./, (char) => char.toUpperCase())}</option>)}</select>
            </section>

            <section className="mt-5 space-y-4" aria-live="polite">
                {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading your bookings...</div>
                    : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-700">{error}</div>
                        : visibleBookings.length ? visibleBookings.map((booking) => <article key={booking._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:px-6">
                                <div><p className="text-xs font-bold uppercase tracking-wide text-sky-700">{booking.daycareName}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{booking.childName || booking.child?.name || "Child"}</h2></div>
                                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ring-inset ${statusClass(booking.status)}`}>{booking.status || "pending"}</span>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                                <Detail icon={<CalendarDays size={17} />} label="Requested care dates" value={`${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`} />
                                <Detail icon={<Clock3 size={17} />} label="Support type" value={booking.supportType?.replaceAll("-", " ") || "Not specified"} capitalize />
                                <Detail icon={<FileText size={17} />} label="Request submitted" value={formatDate(booking.createdAt)} />
                                {booking.child?.dateOfBirth || booking.childDateOfBirth ? <Detail icon={<CalendarDays size={17} />} label="Child date of birth" value={formatDate(booking.child?.dateOfBirth || booking.childDateOfBirth)} /> : null}
                            </div>
                            {booking.notes && <div className="mx-5 mb-5 rounded-xl bg-slate-50 p-4 sm:mx-6"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Parent notes</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{booking.notes}</p></div>}
                            <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:px-6"><div className="flex items-center gap-2"><CircleDollarSign size={17} className="text-sky-700" /><h3 className="text-sm font-bold text-slate-800">Payment records</h3></div>
                                {booking.payments.length ? <div className="mt-3 space-y-2">{booking.payments.map((payment) => <div key={payment._id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-800">{formatMoney(payment.amount)} <span className="font-normal capitalize text-slate-500">· {payment.paymentMethod || "Method not recorded"}</span></p><p className="mt-1 text-xs text-slate-500">{payment.transactionId ? `Transaction: ${payment.transactionId}` : "No transaction reference recorded"}{payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${statusClass(payment.status)}`}>{payment.status}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No payment record is linked to this booking yet.</p>}
                            </div>
                        </article>)
                            : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><CalendarDays size={28} className="mx-auto text-slate-400" /><h2 className="mt-3 font-bold text-slate-800">{bookings.length ? "No matching bookings" : "No bookings yet"}</h2><p className="mt-1 text-sm text-slate-500">{bookings.length ? "Try another search or status filter." : "Send a booking request from a daycare profile to see it here."}</p></div>}
            </section>
        </div>
    </main>;
};

const Detail = ({ icon, label, value, capitalize = false }) => <div className="flex items-start gap-3"><span className="mt-0.5 text-sky-700">{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-sm font-semibold text-slate-800 ${capitalize ? "capitalize" : ""}`}>{value}</p></div></div>;

export default ParentBookingsPage;
