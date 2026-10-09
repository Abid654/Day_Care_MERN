import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { getAssetUrl } from "../api/client";
import { getDaycareListings } from "../api/daycareApi";
import { createParentComplaint, createParentRequest, deleteParentProfilePhoto, getParentChildPhoto, getParentPortal, getParentProfile, getParentProfilePhoto, updateParentProfile, uploadParentProfilePhoto } from "../api/parentApi";
import { connectRealtime, disconnectRealtime } from "../api/realtime";
import { clearCredentials, updateUser } from "../redux/slices/authSlice";
import { Bell, Building2, CalendarDays, ChevronRight, Clock3, CreditCard, Eye, Heart, LogOut, MapPin, Printer, ReceiptText, ShieldCheck, Users, X } from "lucide-react";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const parentAlertKey = (item, index) => [item.daycareName || "daycare", item._id || item.id || item.title || "update", item.sentAt || item.date || item.createdAt || index].join(":");
const age = (value) => {
    if (!value) return "Age not provided";
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return "Age not provided";
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    if (years < 1) return `${Math.max(0, months)} month${months === 1 ? "" : "s"} old`;
    return `${years} year${years === 1 ? "" : "s"} old`;
};
const date = (value) => value ? new Date(value).toLocaleDateString() : "â€”";
const printParentReceipt = (invoice, daycareName) => {
    if (!(Number(invoice.paidAmount) > 0)) return toast.info("A receipt is available after the daycare records a payment.");
    const escape = (value) => String(value ?? "â€”").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    const popup = window.open("", "_blank", "width=720,height=700");
    if (!popup) return toast.error("Allow pop-ups to print the receipt.");
    const payment = invoice.payments?.[invoice.payments.length - 1];
    const details = [["Daycare", daycareName], ["Invoice", invoice.invoiceNumber], ["Child", invoice.child?.name], ["Description", invoice.description], ["Invoice total", money(invoice.amount)], ["Payment received", money(payment?.amount ?? invoice.paidAmount)], ["Total paid", money(invoice.paidAmount)], ["Remaining", money(Math.max(0, Number(invoice.amount) - Number(invoice.paidAmount)))], ["Payment date", date(payment?.paymentDate || invoice.paidAt)], ["Payment method", payment?.paymentMethod || invoice.paymentMethod], ["Reference", payment?.transactionReference || invoice.transactionReference], ["Received by", payment?.receivedBy?.name], ["Status", invoice.status]];
    popup.document.write(`<!doctype html><html><head><title>Payment receipt</title><style>body{font:15px Arial,sans-serif;padding:32px;color:#1e293b}h1{margin-bottom:4px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}td{border-bottom:1px solid #e2e8f0;padding:11px 8px}td:first-child{font-weight:bold;width:38%}</style></head><body><h1>Payment receipt</h1><p>Daycare fee payment record</p><table>${details.map(([label, value]) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`).join("")}</table><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
};

const ParentDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [daycares, setDaycares] = useState([]);
    const [linkedDaycares, setLinkedDaycares] = useState([]);
    const [daycaresLoading, setDaycaresLoading] = useState(true);
    const [portalLoading, setPortalLoading] = useState(true);
    const [realtimeNotifications, setRealtimeNotifications] = useState([]);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [areaFilter, setAreaFilter] = useState("");
    const [careType, setCareType] = useState("");
    const [minimumExperience, setMinimumExperience] = useState("");
    const [maximumFee, setMaximumFee] = useState("");
    const [submitting, setSubmitting] = useState("");
    const [profileOpen, setProfileOpenState] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const setProfileOpen = (open) => { if (open) setAccountMenuOpen(true); else { setProfileOpenState(false); setAccountMenuOpen(false); } };
    useEffect(() => {
        if (!accountMenuOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!event.target.closest("[data-parent-account-menu]") && !event.target.closest("[data-parent-account-toggle]")) setAccountMenuOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, [accountMenuOpen]);
    useEffect(() => {
        if (!notificationOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!event.target.closest("[data-parent-notification-menu]")) setNotificationOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, [notificationOpen]);
    const [profileSaving, setProfileSaving] = useState(false);
    const [photoSaving, setPhotoSaving] = useState(false);
    const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
    const [profileForm, setProfileForm] = useState({ name: "", phone: "", address: "", area: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", emergencyContactDetails: "", childcareType: "", careStartTime: "", careEndTime: "" });
    const [form, setForm] = useState({ tenantId: "", childId: "", subject: "", description: "", requestType: "other", kind: "request" });
    const { user, token } = useMemo(() => {
        try { return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") }; }
        catch { return { user: null, token: null }; }
    }, []);
    const [profileUser, setProfileUser] = useState(user);
    const alertReadStorageKey = `parent-read-notifications:${user?._id || user?.id || user?.email || "parent"}`;
    const [readAlertIds, setReadAlertIds] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem(alertReadStorageKey) || "[]"); return Array.isArray(saved) ? saved : []; }
        catch { return []; }
    });

    useEffect(() => {
        if (!token || user?.role !== "parent") return;
        getParentProfile(token).then(({ data }) => {
            const savedProfile = { ...profileForm, ...data.profile };
            setProfileUser(savedProfile);
            setProfileForm(savedProfile);
            localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: data.profile.profilePhoto || "" }));
        }).catch(() => toast.error("Could not load your profile details."));
    }, [token, user]);

    useEffect(() => {
        const handlePhotoChange = (event) => setProfileUser((current) => ({ ...current, profilePhoto: event.detail || "" }));
        window.addEventListener("parent:profile-photo-updated", handlePhotoChange);
        return () => window.removeEventListener("parent:profile-photo-updated", handlePhotoChange);
    }, []);

    useEffect(() => {
        let active = true;
        let objectUrl = "";
        if (!token || !profileUser?.profilePhoto) {
            setProfilePhotoUrl("");
            return undefined;
        }
        getParentProfilePhoto(token).then(({ data }) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(data);
            setProfilePhotoUrl(objectUrl);
        }).catch(() => { if (active) setProfilePhotoUrl(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [profileUser?.profilePhoto, token]);

    const loadPortal = useCallback(async () => {
        if (!token || user?.role !== "parent") return;
        try {
            const { data } = await getParentPortal(token);
            setLinkedDaycares(data.daycares || []);
        } catch { toast.error("Could not load your family information. Please try again."); }
        finally { setPortalLoading(false); }
    }, [token, user]);

    useEffect(() => {
        if (!token || user?.role !== "parent") navigate("/", { replace: true });
    }, [navigate, token, user]);
    useEffect(() => {
        if (!token || user?.role !== "parent") return;
        getDaycareListings().then(({ data }) => setDaycares(data.daycares || []))
            .catch(() => toast.error("Could not load daycare listings. Please try again."))
            .finally(() => setDaycaresLoading(false));
        Promise.resolve().then(loadPortal);
    }, [loadPortal, token, user]);

    useEffect(() => {
        if (!token || user?.role !== "parent") return undefined;
        const socket = connectRealtime(token);
        if (!socket) return undefined;
        const handleNotification = (notification) => {
            setRealtimeNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 30));
            toast.info(notification.title || "You have a new daycare update.", { toastId: `live-notification-${notification.id}` });
        };
        socket.on("notification:new", handleNotification);
        return () => {
            socket.off("notification:new", handleNotification);
            disconnectRealtime(socket);
        };
    }, [token, user?.role]);

    const filteredDaycares = useMemo(() => daycares.filter((daycare) => {
        const matchesArea = !areaFilter || `${daycare.area} ${daycare.name}`.toLowerCase().includes(areaFilter.toLowerCase());
        const matchesCare = !careType || daycare.services.some((service) => service.toLowerCase() === careType);
        const matchesExperience = !minimumExperience || Number(daycare.experienceYears || 0) >= Number(minimumExperience);
        const matchesFee = !maximumFee || (daycare.fee != null && Number(daycare.fee) <= Number(maximumFee));
        return matchesArea && matchesCare && matchesExperience && matchesFee;
    }), [areaFilter, careType, daycares, minimumExperience, maximumFee]);
    const visibleDaycares = filteredDaycares.slice(0, 6);
    const suggestedDaycares = useMemo(() => [...daycares].sort((a, b) => {
        const preferredArea = (profileUser?.area || "").toLowerCase();
        const aMatch = preferredArea && `${a.area} ${a.name}`.toLowerCase().includes(preferredArea) ? 1 : 0;
        const bMatch = preferredArea && `${b.area} ${b.name}`.toLowerCase().includes(preferredArea) ? 1 : 0;
        return bMatch - aMatch;
    }).slice(0, 3), [daycares, profileUser?.area]);
    const paymentMethods = useMemo(() => [...new Set(daycares.flatMap((daycare) => daycare.paymentOptions || []))], [daycares]);
    const appointments = linkedDaycares.flatMap((daycare) => daycare.bookings.map((booking) => ({ ...booking, daycareName: daycare.name })));
    const invoices = linkedDaycares.flatMap((daycare) => daycare.invoices.map((invoice) => ({ ...invoice, daycareName: daycare.name })));
    const attendance = linkedDaycares.flatMap((daycare) => (daycare.attendance || []).map((record) => ({ ...record, daycareName: daycare.name })));
    const childrenCount = linkedDaycares.reduce((total, daycare) => total + daycare.children.length, 0);
    const activeBookings = appointments.filter((booking) => ["pending", "accepted"].includes(booking.status));
    const pendingInvoices = invoices.filter((invoice) => !["paid", "cancelled"].includes(invoice.status) && Number(invoice.amount) > Number(invoice.paidAmount || 0));
    const pendingRequests = linkedDaycares.flatMap((daycare) => daycare.requests || []).filter((request) => request.status === "pending");
    const upcomingEvents = linkedDaycares.flatMap((daycare) => (daycare.events || []).map((event) => ({ ...event, daycareName: daycare.name }))).filter((event) => new Date(event.date) >= new Date());
    const alerts = [...realtimeNotifications, ...linkedDaycares.flatMap((daycare) => [
        ...daycare.notifications.map((item) => ({ ...item, daycareName: daycare.name, date: item.sentAt || item.createdAt })),
        ...daycare.announcements.map((item) => ({ ...item, daycareName: daycare.name, message: item.description, date: item.startDate })),
        ...daycare.events.map((item) => ({ ...item, daycareName: daycare.name, title: item.name, date: item.date, message: `${item.startTime || ""}${item.location ? `  |  ${item.location}` : ""}` })),
    ])].sort((a, b) => new Date(b.sentAt || b.date || b.createdAt || 0) - new Date(a.sentAt || a.date || a.createdAt || 0));
    const unreadAlerts = alerts.filter((item, index) => !readAlertIds.includes(parentAlertKey(item, index)));
    const markAlertAsRead = (item, index) => {
        const key = parentAlertKey(item, index);
        setReadAlertIds((current) => {
            if (current.includes(key)) return current;
            const next = [...current, key];
            try { localStorage.setItem(alertReadStorageKey, JSON.stringify(next)); } catch { /* Keep the view updated if browser storage is unavailable. */ }
            return next;
        });
    };

    if (!token || user?.role !== "parent") return null;
    const firstName = profileUser.name?.trim().split(/\s+/)[0] || "there";
    const initials = profileUser.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P";
    const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); dispatch(clearCredentials()); navigate("/", { replace: true }); };
    const saveParentProfile = async (event) => {
        event.preventDefault();
        setProfileSaving(true);
        try {
            const { data } = await updateParentProfile(profileForm, token);
            localStorage.setItem("user", JSON.stringify(data.user));
            dispatch(updateUser(data.user));
            setProfileUser(data.user);
            setProfileForm({ ...profileForm, ...data.user });
            setProfileOpen(false);
            toast.success("Profile updated successfully.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not update your profile.");
        } finally {
            setProfileSaving(false);
        }
    };
    const saveProfilePhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
            toast.error("Choose a JPG, PNG, or WebP image up to 3 MB.");
            return;
        }
        setPhotoSaving(true);
        try {
            const { data } = await uploadParentProfilePhoto(file, token);
            const updatedUser = { ...profileUser, profilePhoto: data.profilePhoto };
            setProfileUser(updatedUser);
            localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: data.profilePhoto }));
            dispatch(updateUser({ profilePhoto: data.profilePhoto }));
            toast.success("Profile photo uploaded.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not upload your profile photo.");
        } finally {
            setPhotoSaving(false);
        }
    };
    const removeProfilePhoto = async () => {
        setPhotoSaving(true);
        try {
            await deleteParentProfilePhoto(token);
            setProfileUser((current) => ({ ...current, profilePhoto: "" }));
            localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: "" }));
            dispatch(updateUser({ profilePhoto: "" }));
            toast.success("Profile photo removed.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not remove your profile photo.");
        } finally {
            setPhotoSaving(false);
        }
    };
    const submitFamilyItem = async (event) => {
        event.preventDefault();
        if (!form.tenantId) return toast.error("Select a linked daycare first.");
        setSubmitting(form.kind);
        try {
            const payload = { subject: form.subject, description: form.description, childId: form.childId || undefined, requestType: form.requestType };
            if (form.kind === "complaint") await createParentComplaint(form.tenantId, payload, token);
            else await createParentRequest(form.tenantId, payload, token);
            toast.success(form.kind === "complaint" ? "Complaint submitted." : "Request submitted.");
            setForm((current) => ({ ...current, childId: "", subject: "", description: "" }));
            await loadPortal();
        } catch (error) { toast.error(error.response?.data?.message || "Could not submit your message."); }
        finally { setSubmitting(""); }
    };

    return <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <a href="#overview" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-200"><Building2 size={23} aria-hidden="true" /></div><div><p className="text-lg font-bold leading-tight">Online Daycare Centre</p><p className="text-xs text-slate-500">Family portal</p></div></a>
            <nav aria-label="Parent dashboard" className="hidden items-center gap-5 text-sm font-semibold lg:flex"><Link className="text-slate-500 hover:text-sky-600" to="/parent/daycares">Find Daycare</Link><a className="text-slate-500 hover:text-sky-600" href="#suggested">Suggested</a><Link className="text-slate-500 hover:text-sky-600" to="/parent/bookings">My Bookings</Link><a className="text-slate-500 hover:text-sky-600" href="#billing">Payments</a><a className="text-slate-500 hover:text-sky-600" href="#reviews">Reviews</a></nav>
            <div className="flex items-center gap-2 sm:gap-4"><div className="relative" data-parent-notification-menu><button type="button" onClick={() => setNotificationOpen((open) => !open)} aria-expanded={notificationOpen} aria-label="Open notifications" title="Notifications" className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"><Bell size={19} />{unreadAlerts.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}</button>{notificationOpen && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">Latest notifications</p><p className="mt-0.5 text-xs text-slate-500">Updates shared by your daycares</p></div><span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">{unreadAlerts.length}</span></div>{portalLoading ? <p className="px-4 py-6 text-center text-sm text-slate-500">Loading updates...</p> : unreadAlerts.length ? <div className="max-h-80 overflow-y-auto">{unreadAlerts.slice(0, 5).map((item, index) => <div key={parentAlertKey(item, index)} className="border-b border-slate-100 px-4 py-3"><button type="button" onClick={() => { setNotificationOpen(false); document.getElementById("updates")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="block w-full text-left"><span className="block truncate text-sm font-semibold text-slate-800">{item.title || "Daycare update"}</span><span className="mt-1 block truncate text-xs text-sky-700">{item.daycareName || "Daycare"}</span><span className="mt-1.5 block text-[10px] text-slate-400">{date(item.date || item.sentAt || item.createdAt)}</span></button><button type="button" onClick={() => markAlertAsRead(item, index)} className="mt-2 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-50">Mark as read</button></div>)}</div> : <p className="px-4 py-6 text-center text-sm text-slate-500">{alerts.length ? "You are all caught up." : "No updates yet."}</p>}{alerts.length > 0 && <button type="button" onClick={() => { setNotificationOpen(false); document.getElementById("updates")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="w-full bg-slate-50 px-4 py-3 text-left text-xs font-bold text-sky-700 transition hover:bg-sky-50">View all updates</button>}</div>}</div><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button type="button" data-parent-account-toggle onClick={() => setProfileOpen(true)} aria-label="Edit profile" title="Edit profile" className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-sky-50">{profilePhotoUrl ? <img src={profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">{initials}</div>}<span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{profileUser.name}</span><span className="hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 lg:inline">Profile</span></button></div>
            {accountMenuOpen && <><div data-parent-account-menu className="fixed right-4 top-[4.5rem] z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:right-8"><div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-bold text-slate-800">{profileUser.name}</p><p className="truncate text-xs text-slate-500">{profileUser.email}</p></div><button type="button" onClick={() => { setAccountMenuOpen(false); setProfileOpenState(true); }} className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">Profile</button><button type="button" onClick={() => { setAccountMenuOpen(false); setProfileOpenState(true); }} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">Settings</button><button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"><LogOut size={16} />Log out</button></div></>}
        </div></header>

        <main id="overview" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <section className="mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-100 sm:p-9"><div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center"><div className="max-w-xl"><p className="mb-3 text-sm font-semibold text-sky-100">{today}  |  FAMILY DASHBOARD</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Good morning, {firstName}</h1><p className="mt-3 max-w-lg leading-7 text-sky-50">Your children&apos;s care updates, provider information, and billing together in one place.</p></div><div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><ShieldCheck size={24} /></div><div><p className="font-semibold">Your family space</p><p className="text-sm text-sky-100">Private daycare information</p></div></div></div>
                <div className="mt-8 rounded-2xl bg-white p-3 text-slate-700 shadow-lg sm:p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="block text-xs font-semibold text-slate-500">LOCATION<input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-sky-400" placeholder="City or area" /></label><label className="block text-xs font-semibold text-slate-500">CARE SETTING<select value={careType} onChange={(e) => setCareType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-sky-400"><option value="">Any setting</option><option value="home">Home based</option><option value="facility">Facility</option></select></label><label className="block text-xs font-semibold text-slate-500">MINIMUM EXPERIENCE (YEARS)<input type="number" min="0" value={minimumExperience} onChange={(e) => setMinimumExperience(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-sky-400" placeholder="Any experience" /></label><label className="block text-xs font-semibold text-slate-500">MAXIMUM MONTHLY FEE (RS.)<input type="number" min="0" value={maximumFee} onChange={(e) => setMaximumFee(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-sky-400" placeholder="Any rate" /></label></div></div>
            </section>

            <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard icon={<Bell size={19} />} label="Updates" value={portalLoading ? "..." : alerts.length} detail="Notices and upcoming events" color="emerald" /><SummaryCard icon={<CalendarDays size={19} />} label="Active bookings" value={portalLoading ? "..." : activeBookings.length} detail="Pending or accepted" color="indigo" /><SummaryCard icon={<ReceiptText size={19} />} label="Pending payments" value={portalLoading ? "..." : pendingInvoices.length} detail={money(invoices.reduce((sum, item) => sum + Math.max(0, Number(item.amount) - Number(item.paidAmount || 0)), 0)) + " outstanding"} color="rose" /><SummaryCard icon={<Bell size={19} />} label="Notifications" value={portalLoading ? "..." : unreadAlerts.length} detail="Unread shared updates" color="indigo" /><SummaryCard icon={<Clock3 size={19} />} label="Pending requests" value={portalLoading ? "..." : pendingRequests.length} detail="Awaiting daycare response" color="rose" /><SummaryCard icon={<CalendarDays size={19} />} label="Upcoming events" value={portalLoading ? "..." : upcomingEvents.length} detail="Events shared by your daycares" color="sky" /></section>
            <section id="suggested" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Based on your profile" title="Suggested daycares" subtitle={profileUser.area ? `Providers near ${profileUser.area}; confirm care type and availability directly.` : "Complete your profile area to prioritize nearby providers."} icon={<Heart size={19} />} />{suggestedDaycares.length ? <div className="grid gap-3 sm:grid-cols-3">{suggestedDaycares.map((daycare) => <article key={daycare.id} className="rounded-2xl border border-slate-100 p-4"><h3 className="font-bold text-slate-900">{daycare.name}</h3><p className="mt-1 text-sm text-slate-500">{daycare.area}</p><p className="mt-2 text-sm font-semibold text-slate-700">{daycare.fee != null ? `${money(daycare.fee)} / month` : "Ask provider for rates"}</p><button onClick={() => navigate(`/daycares/${daycare.id}`)} className="mt-3 text-sm font-bold text-indigo-600">View details <ChevronRight size={14} className="inline" /></button></article>)}</div> : <Empty title="No suggestions available" text="Approved daycare listings will appear here." />}</section>
            <section id="daycares" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Find care</p><h2 className="mt-1 text-xl font-bold text-slate-900">Daycares for your family</h2><p className="mt-1 text-sm text-slate-500">Filter approved listings by location, care setting, experience, and listed monthly fee. Full-time/part-time availability is not currently published by providers.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">{daycares.length} listed</span></div>
                {daycaresLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading daycaresâ€¦</p> : filteredDaycares.length ? <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleDaycares.map((daycare) => <article key={daycare.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"><div className="relative h-40 overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-50 to-cyan-100">{daycare.images?.length ? <img src={getAssetUrl(daycare.images[0])} alt={`${daycare.name} daycare`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center"><Building2 size={34} className="text-sky-600" /></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/65 to-transparent p-4 pt-12"><div className="flex items-end justify-between gap-2"><h3 className="text-lg font-bold text-white drop-shadow">{daycare.name}</h3>{daycare.isVerified && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13} />Verified</span>}</div></div></div><div className="p-4"><p className="flex items-center gap-1.5 text-sm font-medium text-slate-500"><MapPin size={15} className="shrink-0 text-sky-600" />{daycare.area || "Location details on profile"}</p><p className="mt-2 min-h-10 line-clamp-2 text-sm leading-6 text-slate-600">{daycare.description || "Open the provider profile for care, facilities, and contact details."}</p><div className="mt-3 flex min-h-7 flex-wrap gap-2">{(daycare.services || []).map((service) => <span key={service} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">{service.replaceAll("-", " ")}</span>)}</div><div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Monthly fee</p><p className="mt-0.5 text-lg font-extrabold text-slate-900">{daycare.fee != null ? money(daycare.fee) : "Contact for fee"}</p></div><span className="max-w-[50%] truncate text-right text-xs text-slate-500">{daycare.phone || "Contact details on profile"}</span></div><button onClick={() => navigate(`/daycares/${daycare.id}`)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"><Eye size={16} />View full daycare profile<ChevronRight size={16} /></button></div></article>)}</div>{filteredDaycares.length > 6 && <div className="mt-6 flex justify-center"><button type="button" onClick={() => navigate("/parent/daycares")} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100">View more ({filteredDaycares.length - 6} more)<ChevronRight size={16} /></button></div>}</> : <Empty title={daycares.length ? "No daycares match your search" : "No approved daycares yet"} text="Try another area or check back after providers are approved." />}
            </section>

            <section className="mb-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div id="children" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Family profile" title="My children" subtitle="Children linked to your parent account at each daycare." icon={<Users size={19} />} />
                {portalLoading ? <InlineLoading /> : childrenCount ? <div className="space-y-4">{linkedDaycares.flatMap((center) => center.children.map((child) => ({ ...child, centerName: center.name, centerId: center.id, centerParent: center.parent }))).map((child) => <article key={`${child.centerId}-${child._id}`} className="flex gap-4 rounded-2xl border border-slate-100 p-4"><ParentChildPhoto child={child} token={token} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-900">{child.name}</h3><span className="text-xs font-semibold text-sky-700">{child.centerName}</span></div><p className="mt-1 text-sm text-slate-500">{age(child.dateOfBirth)} / {child.gender || "Gender not provided"} / {child.classGroup?.name || "Class not assigned"}  |  Enrolled {date(child.enrollmentDate)}</p><p className="mt-1 text-xs text-slate-500">Enrolled {date(child.enrollmentDate)} / Care contact: {child.assignedCaregiver?.fullName || "Center team"}</p><a className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800" href="#attendance">View attendance and activities</a></div></article>)}</div> : <Empty title="No child profiles linked yet" text="Ask your daycare to add your registered parent email to the family contact record." />}
            </div><div id="appointments" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Your schedule" title="Bookings" subtitle="Your submitted requests and existing care bookings. New requests stay pending until the daycare reviews them." icon={<CalendarDays size={19} />} />{portalLoading ? <InlineLoading /> : appointments.length ? <div className="space-y-3">{appointments.map((booking) => <article key={booking._id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{booking.childName || booking.child?.name || "Child"}</h3><Status value={booking.status} /></div><p className="mt-1 text-sm text-slate-600">{booking.daycareName} &middot; {booking.supportType}</p><p className="mt-1 text-xs text-slate-500">{date(booking.startDate)}{booking.endDate ? `  -  ${date(booking.endDate)}` : ""}</p></article>)}</div> : <Empty title="No bookings yet" text="Open a daycare profile to send your first booking request." />}</div></section>

            <section id="attendance" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Daily care" title="Attendance history" subtitle="Check-in and check-out records for your linked children." icon={<Clock3 size={19} />} />{portalLoading ? <InlineLoading /> : attendance.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-xl px-4 py-3">Child</th><th className="px-4 py-3">Daycare</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="rounded-r-xl px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{attendance.map((record) => <tr key={`${record.daycareName}-${record._id}`}><td className="px-4 py-4 font-semibold">{record.child?.name || "Child"}</td><td className="px-4 py-4">{record.daycareName}</td><td className="px-4 py-4">{date(record.date)}</td><td className="px-4 py-4">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td><td className="px-4 py-4">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td><td className="px-4 py-4"><Status value={record.status} />{record.notes && <p className="mt-1 max-w-xs text-xs text-slate-500">{record.notes}</p>}</td></tr>)}</tbody></table></div> : <Empty title="No attendance records yet" text="Attendance appears here after a linked daycare records a child's arrival or absence." />}</section>
            <section id="billing" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Family finances</p><h2 className="mt-1 text-xl font-bold text-slate-900">Billing & payments</h2><p className="mt-1 text-sm text-slate-500">Invoices and recorded payment information from your linked daycares.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><CreditCard size={15} /> Billing overview</span></div>
                {portalLoading ? <InlineLoading /> : invoices.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-xl px-4 py-3">Invoice</th><th className="px-4 py-3">Daycare / child</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Paid</th><th className="rounded-r-xl px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.map((invoice) => <tr key={`${invoice.daycareName}-${invoice._id}`}><td className="px-4 py-4"><p className="font-semibold text-slate-800">{invoice.invoiceNumber || "Invoice"}</p><p className="text-xs text-slate-500">{invoice.description || "Daycare fees"}</p></td><td className="px-4 py-4">{invoice.daycareName}<p className="text-xs text-slate-500">{invoice.child?.name || "Family"}</p></td><td className="px-4 py-4">{date(invoice.dueDate)}</td><td className="px-4 py-4 font-medium">{money(invoice.amount)}</td><td className="px-4 py-4">{money(invoice.paidAmount)}{invoice.payments?.length ? <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-indigo-600">{invoice.payments.length} invoice payment{invoice.payments.length === 1 ? "" : "s"}</summary><div className="mt-1 space-y-1">{invoice.payments.map((payment) => <p key={payment._id} className="text-xs text-slate-500">{money(payment.amount)} · {payment.paymentMethod} · {date(payment.paymentDate)}{payment.transactionReference ? ` · ${payment.transactionReference}` : ""}</p>)}</div></details> : invoice.paymentMethod && <p className="text-xs capitalize text-slate-500">{invoice.paymentMethod}</p>}</td><td className="px-4 py-4"><Status value={invoice.status} />{invoice.transactionReference && <p className="mt-1 text-xs text-slate-500">Ref: {invoice.transactionReference}</p>}{Number(invoice.paidAmount) > 0 && <button onClick={() => printParentReceipt(invoice, invoice.daycareName)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"><Printer size={13} />Print receipt</button>}</td></tr>)}</tbody></table></div> : <Empty title="No invoices linked to your account" text="When a daycare creates an invoice for your linked family record, it will appear here." />}
                {!portalLoading && linkedDaycares.some((center) => center.payments.length) && <div className="mt-5"><h3 className="mb-3 font-bold text-slate-900">Recorded payment history</h3><div className="grid gap-3 sm:grid-cols-2">{linkedDaycares.flatMap((center) => center.payments.map((payment) => ({ ...payment, daycareName: center.name }))).map((payment) => <article key={`${payment.daycareName}-${payment._id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"><div><p className="font-semibold">{money(payment.amount)} <span className="font-normal capitalize text-slate-500"> |  {payment.paymentMethod}</span></p><p className="mt-1 text-xs text-slate-500">{payment.daycareName}  |  {date(payment.paidAt || payment.createdAt)}{payment.transactionId ? `  |  Ref ${payment.transactionId}` : ""}</p></div><Status value={payment.status} /></article>)}</div></div>}
                <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-800">Payment options listed by daycares</p><div className="mt-2 flex flex-wrap gap-2">{paymentMethods.length ? paymentMethods.map((method) => <span key={method} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold capitalize text-slate-600 ring-1 ring-slate-200">{method}</span>) : <span className="text-xs text-slate-500">No options listed.</span>}</div></div><p className="max-w-sm text-xs leading-5 text-slate-500"><ShieldCheck size={14} className="mr-1 inline text-emerald-600" />Confirm payment directly with the provider; online card charging is not enabled.</p></div>
            </section>

            <section className="mb-7 grid gap-6 lg:grid-cols-2"><div id="updates" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="From your daycare" title="Updates & events" subtitle="Shared daily updates, announcements, and notices." icon={<Bell size={19} />} />{portalLoading ? <InlineLoading /> : alerts.length ? <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">{alerts.slice(0, 50).map((item, index) => <article key={`${item.daycareName}-${item._id || index}`} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-sky-700">{item.daycareName}</p></div><span className="shrink-0 text-xs text-slate-500">{date(item.date)}</span></div>{item.message && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.message}</p>}</article>)}</div> : <Empty title="No updates yet" text="Daycare notifications, announcements, and events shared with parents appear here." />}</div>
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Care notes" title="Daily updates" subtitle="Updates the daycare has shared with your family." icon={<Heart size={19} />} />{portalLoading ? <InlineLoading /> : linkedDaycares.some((center) => center.activities.length) ? <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">{linkedDaycares.flatMap((center) => center.activities.map((activity) => ({ ...activity, daycareName: center.name }))).map((activity) => <article key={`${activity.daycareName}-${activity._id}`} className="rounded-2xl bg-sky-50/70 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{activity.child?.name || "Child update"}</h3><span className="text-xs text-slate-500">{date(activity.date)}</span></div><p className="mt-1 text-xs font-medium text-sky-700">{activity.daycareName}</p><p className="mt-2 text-sm text-slate-600">{[activity.activities, activity.meals && `Meals: ${activity.meals}`, activity.healthObservations, activity.notes].filter(Boolean).join("  |  ") || "Daily care update shared."}</p></article>)}</div> : <Empty title="No shared daily updates" text="Updates become visible after the daycare shares a child activity with parents." />}</div></section>

            <section id="reviews" className="mb-7 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Reviews" title="Share your daycare experience" subtitle="Reviews are not enabled for parent accounts in the current backend." icon={<Heart size={19} />} /><p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Review submission is unavailable because there is no parent review endpoint. No review or rating will be submitted or shown as saved.</p></section>
            <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div id="contact" className="scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Contact your provider" title="Send a message" subtitle="Submit a complaint or a family request to a linked daycare." icon={<ChevronRight size={19} />} />{linkedDaycares.length ? <form onSubmit={submitFamilyItem} className="space-y-3"><select required value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value, childId: "" })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="">Choose linked daycare</option>{linkedDaycares.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select>{form.tenantId && <select value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="">Family-wide (no child)</option>{linkedDaycares.find((center) => String(center.id) === form.tenantId)?.children.map((child) => <option key={child._id} value={child._id}>{child.name}</option>)}</select>}<div className="grid grid-cols-2 gap-3"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="request">General request</option><option value="complaint">Complaint</option></select>{form.kind === "request" && <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="other">Other request</option><option value="pickup-dropoff">Pickup / dropoff</option><option value="information-update">Information update</option><option value="schedule">Schedule</option><option value="document">Document</option></select>}</div><input required maxLength={160} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /><textarea required maxLength={form.kind === "complaint" ? 5000 : 3000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what you need" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm" /><button disabled={!!submitting} className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Submittingâ€¦" : form.kind === "complaint" ? "Submit complaint" : "Submit request"}</button></form> : <Empty title="No linked daycare account" text="Your parent account needs to be connected to a daycare family record before sending a message." />}</div>
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><SectionTitle eyebrow="Your messages" title="Requests & complaints" subtitle="Track messages and provider responses." icon={<Clock3 size={19} />} />{portalLoading ? <InlineLoading /> : linkedDaycares.some((center) => center.requests.length || center.complaints.length) ? <div className="space-y-3">{linkedDaycares.flatMap((center) => [...center.requests.map((item) => ({ ...item, messageType: "Request" })), ...center.complaints.map((item) => ({ ...item, messageType: "Complaint" }))].map((item) => ({ ...item, daycareName: center.name }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((item) => <article key={`${item.daycareName}-${item._id}`} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="mr-2 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">{item.messageType}</span><span className="font-semibold">{item.subject}</span></div><Status value={item.status} /></div><p className="mt-2 text-sm text-slate-600">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.daycareName}  |  {date(item.createdAt)}</p>{(item.response || item.adminRemarks) && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Provider: {item.response || item.adminRemarks}</p>}</article>)}</div> : <Empty title="No messages sent" text="Your daycare requests and complaints will show here with their latest status." />}</div></section>

            <section className="mt-6 grid gap-4 md:grid-cols-3"><FeatureCard icon={<Heart size={20} />} title="Family care" text="Your linked child profiles are kept private to your daycare." color="rose" /><FeatureCard icon={<ShieldCheck size={20} />} title="Protected portal" text="Family information is loaded from your authenticated account." color="emerald" /><a href="#billing" className="rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100"><FeatureCard icon={<CreditCard size={20} />} title="Payments & receipts" text="Review invoices and recorded payment history." color="indigo" /></a></section>
            {profileOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && setProfileOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="parent-profile-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Family account</p><h2 id="parent-profile-title" className="mt-1 text-2xl font-extrabold text-slate-900">My profile</h2><p className="mt-1 text-sm text-slate-500">Add your contact details and the care schedule you need.</p></div><button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={saveParentProfile} className="mt-6 space-y-5"><div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Parent details</h3><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Full name" required value={profileForm.name} onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))} maxLength={50} /><ProfileField label="Contact number" type="tel" required value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} maxLength={20} /><label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Email address<input readOnly value={profileUser.email || ""} className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-normal text-slate-500" /><span className="mt-1 block text-xs font-normal text-slate-400">Email address cannot be changed here.</span></label><ProfileField label="Home address" required value={profileForm.address} onChange={(value) => setProfileForm((current) => ({ ...current, address: value }))} maxLength={500} /><ProfileField label="Area / city" required value={profileForm.area} onChange={(value) => setProfileForm((current) => ({ ...current, area: value }))} maxLength={120} /></div></div><div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Emergency contact</h3><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Contact person name" required value={profileForm.emergencyContactName} onChange={(value) => setProfileForm((current) => ({ ...current, emergencyContactName: value }))} maxLength={100} /><ProfileField label="Emergency contact number" type="tel" required value={profileForm.emergencyContactPhone} onChange={(value) => setProfileForm((current) => ({ ...current, emergencyContactPhone: value }))} maxLength={30} /><ProfileField label="Relationship" required value={profileForm.emergencyContactRelationship} onChange={(value) => setProfileForm((current) => ({ ...current, emergencyContactRelationship: value }))} maxLength={80} /><label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Emergency contact details<textarea required maxLength={500} value={profileForm.emergencyContactDetails} onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContactDetails: event.target.value }))} placeholder="Any additional details to use in an emergency" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-sky-400" /></label></div></div><div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Childcare needs</h3><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-semibold text-slate-700">Support type<select required value={profileForm.childcareType} onChange={(event) => setProfileForm((current) => ({ ...current, childcareType: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-sky-400"><option value="">Select full or part time</option><option value="full-time">Full time</option><option value="part-time">Part time</option></select></label><ProfileField label="Care needed from" type="time" required value={profileForm.careStartTime} onChange={(value) => setProfileForm((current) => ({ ...current, careStartTime: value }))} /><ProfileField label="Care needed until" type="time" required value={profileForm.careEndTime} onChange={(value) => setProfileForm((current) => ({ ...current, careEndTime: value }))} /></div></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setProfileOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={profileSaving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">{profileSaving ? "Saving…" : "Save profile"}</button></div></form></section></div>}
            <section className="mb-7 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-center gap-4"><div className="relative">{profilePhotoUrl ? <img src={profilePhotoUrl} alt="Parent profile" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-xl font-bold text-sky-700">{initials}</div>}{profilePhotoUrl && <button type="button" onClick={removeProfilePhoto} disabled={photoSaving} aria-label="Remove profile photo" title="Remove photo" className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 disabled:opacity-50"><X size={15} /></button>}</div><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Parent profile</p><h2 className="mt-1 text-lg font-bold text-slate-900">Profile photo</h2><p className="mt-1 text-sm text-slate-500">JPG, PNG, or WebP · up to 3 MB</p></div></div><label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 sm:mr-auto">{photoSaving ? "Please wait…" : profilePhotoUrl ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoSaving} onChange={saveProfilePhoto} className="sr-only" /></label></section>
        </main>
    </div>;
};

const colors = { sky: "bg-sky-50 text-sky-600", indigo: "bg-indigo-50 text-indigo-600", rose: "bg-rose-50 text-rose-500", emerald: "bg-emerald-50 text-emerald-600" };
const SummaryCard = ({ icon, label, value, detail, color }) => <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</span></div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
const SectionTitle = ({ eyebrow, title, subtitle, icon }) => <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">{eyebrow}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</span></div>;
const ProfileField = ({ label, value, onChange, type = "text", required = false, maxLength }) => <>{label === "Full name" && <ParentProfilePhotoField />}<label className="block text-sm font-semibold text-slate-700">{label}{label === "Relationship" ? <select required={required} value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-sky-400"><option value="">Select relationship</option>{["Mother", "Father", "Grandmother", "Grandfather", "Aunt", "Uncle", "Sibling", "Other"].map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input type={type} required={required} maxLength={maxLength} value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-sky-400" />}</label></>;
const ParentProfilePhotoField = () => {
    const dispatch = useDispatch();
    const [photoUrl, setPhotoUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [photoKey, setPhotoKey] = useState(() => { try { return JSON.parse(localStorage.getItem("user") || "{}").profilePhoto || ""; } catch { return ""; } });
    const token = localStorage.getItem("token");
    const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
    useEffect(() => {
        let active = true;
        let objectUrl = "";
        if (!photoKey || !token) { setPhotoUrl(""); return undefined; }
        getParentProfilePhoto(token).then(({ data }) => { if (active) { objectUrl = URL.createObjectURL(data); setPhotoUrl(objectUrl); } }).catch(() => { if (active) setPhotoUrl(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [photoKey, token]);
    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) return toast.error("Choose a JPG, PNG, or WebP image up to 3 MB.");
        setSaving(true);
        try {
            const { data } = await uploadParentProfilePhoto(file, token);
            setPhotoKey(data.profilePhoto);
            localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: data.profilePhoto }));
            dispatch(updateUser({ profilePhoto: data.profilePhoto }));
            window.dispatchEvent(new CustomEvent("parent:profile-photo-updated", { detail: data.profilePhoto }));
            toast.success("Profile photo uploaded.");
        } catch (error) { toast.error(error.response?.data?.message || "Could not upload your profile photo."); }
        finally { setSaving(false); }
    };
    const remove = async () => {
        setSaving(true);
        try {
            await deleteParentProfilePhoto(token);
            setPhotoKey("");
            localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: "" }));
            dispatch(updateUser({ profilePhoto: "" }));
            window.dispatchEvent(new CustomEvent("parent:profile-photo-updated", { detail: "" }));
            toast.success("Profile photo removed.");
        } catch (error) { toast.error(error.response?.data?.message || "Could not remove your profile photo."); }
        finally { setSaving(false); }
    };
    return <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 sm:col-span-2"><div className="relative">{photoUrl ? <img src={photoUrl} alt="Parent profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-white" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-xl font-bold text-sky-700 ring-2 ring-white">P</div>}{photoUrl && <button type="button" onClick={remove} disabled={saving} aria-label="Remove profile photo" title="Remove photo" className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 disabled:opacity-50"><X size={15} /></button>}</div><div><p className="font-bold text-slate-800">Profile photo</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP · up to 3 MB</p><label className="mt-2 inline-flex cursor-pointer items-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700">{saving ? "Please wait…" : photoUrl ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={upload} className="sr-only" /></label></div></div>;
};
const Empty = ({ title, text }) => <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center"><h3 className="font-semibold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p></div>;
const InlineLoading = () => <div className="animate-pulse space-y-3"><div className="h-16 rounded-xl bg-slate-100" /><div className="h-16 rounded-xl bg-slate-100" /></div>;
const ParentChildPhoto = ({ child, token }) => {
    const [src, setSrc] = useState("");
    useEffect(() => {
        let active = true;
        let objectUrl = "";
        if (!child.profilePhoto) { setSrc(""); return undefined; }
        if (!child.profilePhoto.startsWith("private:")) { setSrc(getAssetUrl(child.profilePhoto)); return undefined; }
        getParentChildPhoto(child.centerId, child._id, token).then(({ data }) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(data);
            setSrc(objectUrl);
        }).catch(() => { if (active) setSrc(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [child.centerId, child._id, child.profilePhoto, token]);
    return src ? <img src={src} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Users size={24} /></div>;
};
const Status = ({ value }) => { const status = String(value || "pending").toLowerCase(); const tone = ["active", "accepted", "paid", "completed", "resolved"].includes(status) ? "bg-emerald-50 text-emerald-700" : ["inactive", "rejected", "failed", "cancelled"].includes(status) ? "bg-rose-50 text-rose-700" : ["pending", "partially-paid", "overdue"].includes(status) ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{status.replaceAll("-", " ")}</span>; };
const featureColors = { rose: "bg-rose-50 text-rose-500", emerald: "bg-emerald-50 text-emerald-600", indigo: "bg-indigo-50 text-indigo-600" };
const FeatureCard = ({ icon, title, text, color }) => <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${featureColors[color]}`}>{icon}</div><div><h3 className="font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{text}</p></div></div>;

export default ParentDashboard;
