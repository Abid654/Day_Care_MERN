import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { getAssetUrl } from "../api/client";
import { changeAdminDaycareStatus, getAdminDaycares, getAdminOverview, getAdminRecords, reviewDaycare } from "../api/adminApi";
import { Activity, Building2, CalendarDays, CheckCircle2, CircleAlert, Clock3, CreditCard, Eye, FileText, LogOut, MapPin, Menu, MessageSquareWarning, Search, ShieldCheck, Star, UserCog, Users, XCircle } from "lucide-react";
import { clearCredentials } from "../redux/slices/authSlice";
import ActionModal from "../components/ActionModal";
import { openNativePicker } from "../utils/openNativePicker";

const PAGE_SIZE = 10;
const DAYCARE_STATUS_TABS = [
    { value: "all", label: "All daycares" },
    { value: "pending", label: "Pending" },
    { value: "needs-info", label: "More info requested" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
    { value: "inactive", label: "Deactivated" },
];
const MODULE_TITLES = { parents: "Parents", children: "Children", bookings: "Bookings", payments: "Payments", complaints: "Complaints", reviews: "Reviews & ratings", "activity-logs": "Activity logs", users: "Platform users" };
const MODULE_COLUMNS = {
    parents: [["name", "Parent"], ["email", "Email"], ["phone", "Phone"], ["childrenCount", "Children"], ["daycareLabels", "Daycare(s)"], ["statusLabel", "Status"], ["createdAt", "Registered"]],
    children: [["name", "Child"], ["parent", "Parent"], ["daycare", "Daycare"], ["className", "Class"], ["gender", "Gender"], ["enrollmentDate", "Enrolled"], ["status", "Status"]],
    bookings: [["id", "Booking"], ["parent", "Parent"], ["child", "Child"], ["daycare", "Daycare"], ["date", "Booking date"], ["serviceType", "Service"], ["status", "Status"]],
    payments: [["transactionId", "Transaction"], ["parent", "Parent"], ["child", "Child"], ["daycare", "Daycare"], ["amountLabel", "Amount"], ["method", "Method"], ["date", "Date"], ["status", "Status"]],
    complaints: [["complaintNumber", "Complaint"], ["parent", "Parent"], ["child", "Child"], ["daycare", "Daycare"], ["subject", "Subject"], ["priority", "Priority"], ["status", "Status"], ["createdAt", "Date"]],
    reviews: [["parent", "Parent"], ["daycare", "Daycare"], ["ratingLabel", "Rating"], ["comment", "Review"], ["createdAt", "Date"]],
    "activity-logs": [["user", "User"], ["role", "Role"], ["action", "Action"], ["module", "Module"], ["daycare", "Daycare"], ["ipAddress", "IP address"], ["createdAt", "Time"]],
    users: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["daycare", "Daycare"], ["statusLabel", "Status"], ["createdAt", "Created"]],
};
const statusClass = (status) => ({ approved: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", "needs-info": "bg-sky-50 text-sky-700", rejected: "bg-rose-50 text-rose-700", suspended: "bg-rose-50 text-rose-700", inactive: "bg-slate-100 text-slate-600" }[status] || "bg-slate-100 text-slate-600");

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch();
    const { user, token } = useMemo(() => {
        try { return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") }; }
        catch { return { user: null, token: null }; }
    }, []);
    const [daycares, setDaycares] = useState([]);
    const [platformOverview, setPlatformOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [actionModal, setActionModal] = useState(null);
    const selectedStatus = searchParams.get("status") || "all";
    const isOverview = location.pathname === "/admin/dashboard";
    const moduleSlug = location.pathname.split("/")[2] || "";
    const isDaycareList = location.pathname === "/admin/daycares";
    const isReports = location.pathname === "/admin/reports";
    const platformModule = MODULE_TITLES[moduleSlug] ? moduleSlug : "";
    const [records, setRecords] = useState([]);
    const [recordLoading, setRecordLoading] = useState(false);
    const [recordError, setRecordError] = useState("");
    const [recordPage, setRecordPage] = useState(1);
    const [recordPages, setRecordPages] = useState(1);
    const [recordTotal, setRecordTotal] = useState(0);
    const [recordSearch, setRecordSearch] = useState("");
    const [recordStatus, setRecordStatus] = useState("all");
    const [recordDaycare, setRecordDaycare] = useState("");
    const [recordFrom, setRecordFrom] = useState("");
    const [recordTo, setRecordTo] = useState("");
    const [recordDaycares, setRecordDaycares] = useState([]);

    const loadDaycares = useCallback(async () => {
        if (!token || user?.role !== "admin") return;
        setLoading(true); setError("");
        try {
            const [daycareResponse, overviewResponse] = await Promise.all([getAdminDaycares(token), getAdminOverview(token)]);
            setDaycares(daycareResponse.data.daycares || []);
            setPlatformOverview(overviewResponse.data.overview || null);
        }
        catch (requestError) { setError(requestError.response?.data?.message || "Could not load daycare applications."); }
        finally { setLoading(false); }
    }, [token, user]);

    useEffect(() => {
        if (!token || user?.role !== "admin") { navigate("/admin", { replace: true }); return; }
        if (isOverview || isDaycareList || isReports) loadDaycares();
    }, [isDaycareList, isOverview, isReports, loadDaycares, navigate, token, user]);

    useEffect(() => {
        if (!platformModule || !token || user?.role !== "admin") return;
        let active = true;
        setRecordLoading(true); setRecordError("");
        getAdminRecords(platformModule, { page: recordPage, limit: 25, search: recordSearch, status: recordStatus, daycare: recordDaycare, from: recordFrom, to: recordTo }, token)
            .then(({ data }) => { if (!active) return; setRecords(data.records || []); setRecordDaycares(data.daycares || []); setRecordPages(data.pagination?.pages || 1); setRecordTotal(data.pagination?.total || 0); })
            .catch((requestError) => { if (active) setRecordError(requestError.response?.data?.message || "Platform records could not be loaded."); })
            .finally(() => { if (active) setRecordLoading(false); });
        return () => { active = false; };
    }, [platformModule, recordDaycare, recordFrom, recordPage, recordSearch, recordStatus, recordTo, token, user]);

    const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); dispatch(clearCredentials()); navigate("/admin", { replace: true }); };
    const setStatusFilter = (status) => { setSearchParams(status === "all" ? {} : { status }); setPage(1); setSidebarOpen(false); };
    const overview = {
        total: daycares.length,
        pending: daycares.filter((item) => item.listingStatus === "pending").length,
        approved: daycares.filter((item) => item.listingStatus === "approved").length,
        rejected: daycares.filter((item) => item.listingStatus === "rejected").length,
        suspended: daycares.filter((item) => item.tenantStatus === "suspended").length,
    };
    const daycareState = (item) => item.tenantStatus === "suspended" ? "suspended" : item.isActive ? item.listingStatus : "inactive";
    const countForStatus = (status) => status === "all" ? daycares.length : daycares.filter((item) => daycareState(item) === status).length;
    const selectedStatusLabel = DAYCARE_STATUS_TABS.find((tab) => tab.value === selectedStatus)?.label || "All daycares";

    const visibleDaycares = useMemo(() => {
        let rows = daycares.filter((item) => {
            const state = daycareState(item);
            const matchesStatus = selectedStatus === "all" || state === selectedStatus;
            const haystack = [item.name, item.contactName, item.ownerEmail, item.phone, item.profile?.address, item.profile?.area].filter(Boolean).join(" ").toLowerCase();
            return matchesStatus && haystack.includes(query.toLowerCase()) && `${item.profile?.address || ""} ${item.profile?.area || ""}`.toLowerCase().includes(locationFilter.toLowerCase());
        });
        rows.sort((a, b) => sortBy === "name" ? a.name.localeCompare(b.name) : new Date(b.registrationDate || 0) - new Date(a.registrationDate || 0));
        return rows;
    }, [daycares, locationFilter, query, selectedStatus, sortBy]);
    const pageCount = Math.max(1, Math.ceil(visibleDaycares.length / PAGE_SIZE));
    const pageRows = visibleDaycares.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const displayRecords = records.map((item) => ({
        ...item,
        parent: item.parent || item.parentName || "",
        daycareLabels: (item.daycares || []).map((daycare) => daycare.name).join(", ") || item.daycare || "",
        statusLabel: item.isActive === false ? "inactive" : item.status || "active",
        amountLabel: `Rs. ${Number(item.amount || 0).toLocaleString()}`,
        ratingLabel: `${item.rating || 0} / 5`,
        createdAt: item.createdAt || item.date || item.enrollmentDate || "",
    }));

    const review = (daycare, decision) => {
        const label = decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Request more information from";
        setActionModal({ title: `${label} ${daycare.name}?`, description: decision === "approved" ? "Approving this daycare will make its profile visible to parents." : decision === "rejected" ? "The rejection reason will be shared with the daycare administrator." : "Enter the information the daycare administrator needs to provide.", inputLabel: decision === "approved" ? undefined : decision === "rejected" ? "Rejection reason" : "Information required", required: decision !== "approved", confirmLabel: label, tone: decision === "rejected" ? "danger" : "primary", onConfirm: async (reason) => {
            setBusyId(String(daycare.id));
            try { const { data } = await reviewDaycare(daycare.id, { decision, reason }, token); toast.success(data.message); setActionModal(null); await loadDaycares(); }
            catch (requestError) { toast.error(requestError.response?.data?.message || "Could not update this application."); throw requestError; }
            finally { setBusyId(""); }
        } });
    };

    const changeStatus = async (daycare, action) => {
        const destructive = ["suspend", "deactivate"].includes(action);
        const confirmation = action === "suspend" ? `Suspend ${daycare.name}? Its sign-ins and public listing will be blocked.` : action === "reactivate" ? `Reactivate ${daycare.name}?` : action === "deactivate" ? `Deactivate ${daycare.name}? All daycare sign-ins will be blocked.` : `Activate ${daycare.name}?`;
        setActionModal({ title: confirmation.split("?")[0], description: confirmation.split("?").slice(1).join("?").trim() || "Kya aap is action ko jari rakhna chahte hain?", inputLabel: destructive ? "Reason" : undefined, required: destructive, confirmLabel: action === "suspend" || action === "deactivate" ? "Confirm action" : action === "reactivate" ? "Reactivate" : "Activate", tone: destructive ? "danger" : "primary", onConfirm: async (reason) => {
            setBusyId(String(daycare.id));
            try { const { data } = await changeAdminDaycareStatus(daycare.id, action, reason, token); toast.success(data.message); setActionModal(null); await loadDaycares(); }
            catch (requestError) { toast.error(requestError.response?.data?.message || "Could not update daycare status."); throw requestError; }
            finally { setBusyId(""); }
        } });
    };

    if (!token || user?.role !== "admin") return null;
    const nav = [
        { label: "Platform overview", icon: Activity, href: "/admin/dashboard" },
        { label: "All daycares", icon: Building2, href: "/admin/daycares", status: "all" },
        { label: "Pending approvals", icon: Clock3, href: "/admin/daycares?status=pending", status: "pending", count: overview.pending },
        { label: "More info requested", icon: CircleAlert, href: "/admin/daycares?status=needs-info", status: "needs-info" },
        { label: "Approved", icon: CheckCircle2, href: "/admin/daycares?status=approved", status: "approved" },
        { label: "Rejected", icon: XCircle, href: "/admin/daycares?status=rejected", status: "rejected" },
        { label: "Suspended", icon: CircleAlert, href: "/admin/daycares?status=suspended", status: "suspended" },
        { label: "Inactive", icon: XCircle, href: "/admin/daycares?status=inactive", status: "inactive" },
        { label: "Parents", icon: Users, href: "/admin/parents", module: "parents" },
        { label: "Children", icon: Users, href: "/admin/children", module: "children" },
        { label: "Bookings", icon: CalendarDays, href: "/admin/bookings", module: "bookings" },
        { label: "Payments", icon: CreditCard, href: "/admin/payments", module: "payments" },
        { label: "Complaints", icon: MessageSquareWarning, href: "/admin/complaints", module: "complaints" },
        { label: "Reviews & ratings", icon: Star, href: "/admin/reviews", module: "reviews" },
        { label: "Activity logs", icon: FileText, href: "/admin/activity-logs", module: "activity-logs" },
        { label: "Users & roles", icon: UserCog, href: "/admin/users", module: "users" },
        { label: "Reports", icon: Activity, href: "/admin/reports", reports: true },
    ];

    return <div className="min-h-screen bg-slate-50 text-slate-800 lg:flex">
        {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><ShieldCheck size={22} /></span><div><p className="font-extrabold text-slate-900">Online Daycare</p><p className="text-xs font-medium text-indigo-600">Platform administration</p></div></div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">{nav.map((item) => { const Icon = item.icon; const active = item.module ? platformModule === item.module : item.reports ? isReports : item.href === "/admin/dashboard" ? isOverview : isDaycareList && selectedStatus === item.status; return <button key={item.label} onClick={() => { navigate(item.href); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={17} />{item.label}{item.count > 0 && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{item.count}</span>}</button>; })}</nav>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{user.name?.slice(0, 1)?.toUpperCase() || "A"}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="text-xs text-slate-500">Super Admin</p></div></div><button onClick={logout} aria-label="Sign out" title="Sign out" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"><LogOut size={17} /></button></div>
        </aside>

        <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button><div><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Super Admin</p><h1 className="font-bold text-slate-900">{isOverview ? "Platform overview" : isReports ? "Reports" : platformModule ? MODULE_TITLES[platformModule] : "Daycare management"}</h1></div></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:block">Platform-level access</span></header>
            <main className="mx-auto max-w-[1500px] p-4 sm:p-7">
                <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Operations</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{isOverview ? "Platform overview" : isReports ? "Platform reports" : platformModule ? MODULE_TITLES[platformModule] : selectedStatus === "all" ? "Daycare management" : selectedStatusLabel}</h2><p className="mt-1 text-sm text-slate-500">{platformModule ? `Platform-wide ${MODULE_TITLES[platformModule].toLowerCase()} records from the connected daycare databases.` : isReports ? "Live totals aggregated from platform accounts and connected daycare databases." : "Review provider applications and manage platform access using verified registration data."}</p></div>
                {isReports && loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Platform report load ho rahi hai...</div>}
                {isReports && error && <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-10 text-center"><p className="font-bold text-rose-700">Unable to load the report</p><p className="mt-1 text-sm text-slate-500">{error}</p><button onClick={loadDaycares} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Try again</button></div>}
                {isReports && !loading && !error && platformOverview && <ReportsPanel overview={platformOverview} />}
                {(isOverview || isDaycareList) && <>
                <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Total daycares" value={loading ? "..." : overview.total} color="indigo" /><Metric label="Pending approval" value={loading ? "..." : overview.pending} color="amber" /><Metric label="Approved" value={loading ? "..." : overview.approved} color="emerald" /><Metric label="Rejected" value={loading ? "..." : overview.rejected} color="rose" /><Metric label="Suspended" value={loading ? "..." : overview.suspended} color="rose" /></section>
                {isOverview && platformOverview && <>
                    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total parents" value={platformOverview.parents} color="indigo" /><Metric label="Total children" value={platformOverview.children.total} color="indigo" /><Metric label="Total bookings" value={platformOverview.bookings.total} color="indigo" /><Metric label="Pending bookings" value={platformOverview.bookings.pending} color="amber" /><Metric label="Completed bookings" value={platformOverview.bookings.completed} color="emerald" /><Metric label="Payment transactions" value={platformOverview.payments.total} color="indigo" /><Metric label="Platform revenue" value={`Rs. ${Number(platformOverview.payments.revenue || 0).toLocaleString()}`} color="emerald" /><Metric label="Pending complaints" value={platformOverview.complaints.pending} color="rose" /><Metric label="Total reviews" value={platformOverview.reviews.total} color="indigo" /><Metric label="Average rating" value={platformOverview.reviews.averageRating ?? "—"} color="amber" /></section>
                    <section className="mb-6 grid gap-4 xl:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Booking status</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(platformOverview.bookings).filter(([key]) => key !== "total").map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-xs capitalize text-slate-500">{key}</p><p className="mt-1 text-lg font-bold text-slate-800">{value}</p></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Payments & complaints</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Paid payments", platformOverview.payments.paid], ["Pending payments", platformOverview.payments.pending], ["Failed payments", platformOverview.payments.failed], ["Refunded", platformOverview.payments.refunded], ["In progress", platformOverview.complaints.inProgress], ["Resolved", platformOverview.complaints.resolved], ["Rejected", platformOverview.complaints.rejected]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-800">{value}</p></div>)}</div></div></section>
                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Activity size={17} className="text-indigo-600" /><h3 className="font-extrabold text-slate-900">Recent tenant activity</h3></div>{platformOverview.recentActivity.length ? <div className="divide-y divide-slate-100">{platformOverview.recentActivity.map((item, index) => <div key={`${item.tenant}-${item.record}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><span className="font-semibold text-slate-800">{item.user}</span><span className="text-slate-500"> · {item.action} · {item.module} · {item.tenant}</span></div><time className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div>)}</div> : <p className="text-sm text-slate-500">No tenant activity records are available.</p>}</section>
                </>}
                 <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><nav aria-label="Daycare status tabs" role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3 sm:px-5">{DAYCARE_STATUS_TABS.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={selectedStatus === tab.value} onClick={() => setStatusFilter(tab.value)} className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3 py-3 text-sm font-semibold transition ${selectedStatus === tab.value ? "border-indigo-600 bg-indigo-50/60 text-indigo-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{tab.label}<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selectedStatus === tab.value ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{countForStatus(tab.value)}</span></button>)}</nav><div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">{selectedStatus === "all" ? "All registered daycares" : `${selectedStatusLabel} daycares`}</h3><p className="mt-1 text-sm text-slate-500">Profile information is loaded from the daycare tenant databases.</p></div><button onClick={loadDaycares} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Refresh</button></div>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search name, owner, email..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></label><label className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setPage(1); }} placeholder="Filter location" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></label><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"><option value="newest">Newest first</option><option value="name">Name A-Z</option></select></div></div>
                    {loading ? <div className="animate-pulse space-y-3 p-6"><div className="h-12 rounded-xl bg-slate-100" /><div className="h-20 rounded-xl bg-slate-100" /><div className="h-20 rounded-xl bg-slate-100" /></div> : error ? <div role="alert" className="p-10 text-center"><p className="font-bold text-rose-700">Could not load daycare records</p><p className="mt-1 text-sm text-slate-500">{error}</p><button onClick={loadDaycares} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Retry</button></div> : pageRows.length === 0 ? <div className="p-12 text-center"><Building2 className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-bold text-slate-800">No matching daycares</p><p className="mt-1 text-sm text-slate-500">Try a different search or status filter.</p></div> : <div className="divide-y divide-slate-100">{pageRows.map((daycare) => <DaycareCard key={daycare.id} daycare={daycare} busy={busyId === String(daycare.id)} onReview={review} onStatus={changeStatus} onView={() => navigate(`/admin/daycares/${daycare.id}`)} />)}</div>}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>{visibleDaycares.length ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, visibleDaycares.length)} of ${visibleDaycares.length}` : "0 results"}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><span className="px-2 py-1.5">{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></div></div>
                </section>
                </>}
                {platformModule && <PlatformRecords module={platformModule} title={MODULE_TITLES[platformModule]} records={displayRecords} daycares={recordDaycares} loading={recordLoading} error={recordError} page={recordPage} pages={recordPages} total={recordTotal} search={recordSearch} status={recordStatus} daycare={recordDaycare} from={recordFrom} to={recordTo} onSearch={(value) => { setRecordSearch(value); setRecordPage(1); }} onStatus={(value) => { setRecordStatus(value); setRecordPage(1); }} onDaycare={(value) => { setRecordDaycare(value); setRecordPage(1); }} onFrom={(value) => { setRecordFrom(value); setRecordPage(1); }} onTo={(value) => { setRecordTo(value); setRecordPage(1); }} onPage={setRecordPage} />}
                {!platformModule && !isOverview && !isDaycareList && !isReports && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="font-bold text-slate-800">This Super Admin module is not connected yet.</p><p className="mt-1 text-sm text-slate-500">No backend endpoint is available for this screen.</p></div>}
            </main>
        </div>
        <ActionModal open={Boolean(actionModal)} {...actionModal} onClose={() => setActionModal(null)} />
    </div>;
};

const Metric = ({ label, value, color }) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-extrabold ${color === "rose" ? "text-rose-700" : color === "amber" ? "text-amber-700" : color === "emerald" ? "text-emerald-700" : "text-indigo-700"}`}>{value}</p></div>;

const ReportsPanel = ({ overview }) => <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Registered daycares" value={overview.daycares.total} color="indigo" /><Metric label="Parents" value={overview.parents} color="indigo" /><Metric label="Children" value={overview.children.total} color="indigo" /><Metric label="Bookings" value={overview.bookings.total} color="indigo" /><Metric label="Paid transactions" value={overview.payments.paid} color="emerald" /><Metric label="Collected payments" value={`Rs. ${Number(overview.payments.revenue || 0).toLocaleString()}`} color="emerald" /><Metric label="Open complaints" value={overview.complaints.pending + overview.complaints.inProgress} color="amber" /><Metric label="Reviews" value={`${overview.reviews.total} · ${overview.reviews.averageRating ?? "—"} avg`} color="amber" /></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Booking breakdown</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(overview.bookings).filter(([key]) => key !== "total").map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><p className="text-sm capitalize text-slate-500">{key.replaceAll("-", " ")}</p><p className="mt-1 text-xl font-bold text-slate-800">{value}</p></div>)}</div></section>
    <p className="text-xs text-slate-500">Yeh report connected tenant databases aur platform account records se load hoti hai.</p>
</div>;

const PlatformRecords = ({ module, title, records, daycares, loading, error, page, pages, total, search, status, daycare, from, to, onSearch, onStatus, onDaycare, onFrom, onTo, onPage }) => {
    const columns = MODULE_COLUMNS[module] || [];
    const statuses = [...new Set([...records.map((record) => record.status || (record.isActive === false ? "inactive" : "active")).filter(Boolean), ...(module === "bookings" ? ["pending", "accepted", "completed", "cancelled", "rejected"] : module === "payments" ? ["pending", "paid", "failed", "refunded"] : module === "complaints" ? ["pending", "in-progress", "resolved", "rejected"] : module === "parents" || module === "users" ? ["active", "inactive"] : [])])];
    const valueFor = (record, key) => {
        const value = record[key];
        if (key === "daycare") return value || record.daycareLabels || "—";
        if (key === "createdAt" || key === "date" || key === "enrollmentDate") return value ? new Date(value).toLocaleString() : "—";
        if (key === "comment" || key === "subject" || key === "action") return value || record.description || "—";
        if (value === undefined || value === null || value === "") return "—";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };
    return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative md:col-span-2 xl:col-span-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></label>
            <select value={status} onChange={(event) => onStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={daycare} onChange={(event) => onDaycare(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All daycares</option>{daycares.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input aria-label="From date" type="date" value={from} onClick={openNativePicker} onChange={(event) => onFrom(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input aria-label="To date" type="date" value={to} onClick={openNativePicker} onChange={(event) => onTo(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        {loading ? <div className="animate-pulse space-y-3 p-6"><div className="h-10 rounded bg-slate-100" /><div className="h-16 rounded bg-slate-100" /><div className="h-16 rounded bg-slate-100" /></div> : error ? <div role="alert" className="p-10 text-center"><p className="font-bold text-rose-700">Records unavailable</p><p className="mt-1 text-sm text-slate-500">{error}</p></div> : !records.length ? <div className="p-12 text-center text-sm text-slate-500">No matching records found.</div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record.id} className="hover:bg-slate-50">{columns.map(([key]) => <td key={key} className="max-w-72 px-4 py-3 text-slate-700"><span className={key.toLowerCase().includes("status") || key === "status" ? `inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClass(String(record[key] || "").toLowerCase())}` : ""}>{valueFor(record, key)}</span></td>)}</tr>)}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>{total ? `${(page - 1) * 25 + 1}-${Math.min(page * 25, total)} of ${total}` : "0 results"}</span><div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><span>{page} / {Math.max(1, pages)}</span><button disabled={page >= pages || loading} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></div></div>
    </section>;
};

const DaycareCard = ({ daycare, busy, onReview, onStatus, onView }) => {
    const state = daycare.tenantStatus === "suspended" ? "suspended" : daycare.tenantStatus === "inactive" || !daycare.isActive ? "inactive" : daycare.listingStatus;
    const history = daycare.statusHistory || [];
    return <article className="p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start"><div className="flex min-w-0 flex-1 gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600">{daycare.profile?.images?.[0] ? <img className="h-full w-full object-cover" src={getAssetUrl(daycare.profile.images[0])} alt="" /> : <Building2 size={21} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-extrabold text-slate-900">{daycare.name}</h4><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClass(state)}`}>{state.replaceAll("-", " ")}</span></div><p className="mt-1 text-sm text-slate-600">{daycare.contactName} · {daycare.ownerEmail} · {daycare.phone || "Phone not provided"}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{[daycare.profile?.address, daycare.profile?.area].filter(Boolean).join(", ") || "Location not provided"}</p><div className="mt-3 grid gap-x-5 gap-y-1 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-3"><p>Registered: {daycare.registrationDate ? new Date(daycare.registrationDate).toLocaleDateString() : "—"}</p><p>Experience: {daycare.profile?.experienceYears ?? "—"} years</p><p>Monthly fee: {daycare.profile?.fee != null ? `Rs. ${Number(daycare.profile.fee).toLocaleString()}` : "Not provided"}</p><p>Services: {daycare.profile?.services?.join(", ") || "Not provided"}</p><p>Facilities: {daycare.profile?.facilities?.join(", ") || "Not provided"}</p><p>CCTV: {daycare.profile?.cctv ? "Available" : "No"} · Nursing: {daycare.profile?.nursingFacilities ? `Yes (${daycare.profile?.nursingStaffCount || 0})` : "No"} · Medical staff: {daycare.profile?.medicalStaffCount ?? 0}</p><p>Qualifications: {daycare.profile?.qualifications?.join(", ") || "Not provided"}</p><p>Training: {daycare.profile?.training?.join(", ") || "Not provided"}</p></div>{daycare.adminRemarks && <p className="mt-3 rounded-lg bg-sky-50 p-2.5 text-xs text-sky-800">Information requested: {daycare.adminRemarks}</p>}{daycare.rejectionReason && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">Rejection reason: {daycare.rejectionReason}</p>}{history.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-slate-600">Status history ({history.length})</summary><div className="mt-2 space-y-1">{history.slice().reverse().map((item, index) => <p key={`${item.changedAt}-${index}`} className="text-slate-500">{item.status} · {item.changedAt ? new Date(item.changedAt).toLocaleString() : ""}{item.reason ? ` · ${item.reason}` : ""}</p>)}</div></details>}</div></div><div className="flex flex-wrap gap-2 xl:max-w-80 xl:justify-end"><button onClick={onView} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Eye size={14} />Profile</button>{daycare.listingStatus !== "approved" && daycare.tenantStatus === "active" && daycare.isActive && daycare.profileComplete && <button disabled={busy} onClick={() => onReview(daycare, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve</button>}{daycare.listingStatus !== "rejected" && daycare.tenantStatus === "active" && daycare.isActive && <button disabled={busy} onClick={() => onReview(daycare, "rejected")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Reject</button>}{daycare.tenantStatus === "active" && daycare.isActive && daycare.listingStatus !== "approved" && <button disabled={busy} onClick={() => onReview(daycare, "needs-info")} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 disabled:opacity-50">Request info</button>}{daycare.tenantStatus === "suspended" ? <button disabled={busy} onClick={() => onStatus(daycare, "reactivate")} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Reactivate</button> : daycare.tenantStatus === "inactive" ? <button disabled={busy} onClick={() => onStatus(daycare, "activate")} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">Activate</button> : <><button disabled={busy} onClick={() => onStatus(daycare, "suspend")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Suspend</button><button disabled={busy} onClick={() => onStatus(daycare, "deactivate")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Deactivate</button></>}</div></div>{daycare.profile?.images?.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pl-[60px]">{daycare.profile.images.map((image, index) => <a key={`${image}-${index}`} href={getAssetUrl(image)} target="_blank" rel="noreferrer"><img src={getAssetUrl(image)} alt={`${daycare.name} facility ${index + 1}`} className="h-16 w-24 rounded-lg object-cover" /></a>)}</div>}</article>;
};

export default AdminDashboard;
