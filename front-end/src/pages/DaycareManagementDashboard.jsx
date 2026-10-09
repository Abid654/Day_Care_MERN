import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FormikProvider, useFormik } from "formik";
import * as Yup from "yup";
import {
    Activity, AlertTriangle, ArrowDownToLine, Baby, Bell, CalendarDays, CalendarCheck, Check, CheckCircle2, PanelLeftClose, PanelLeftOpen,
    ChevronLeft, ChevronRight, ClipboardList, Clock3, CreditCard, FileText, FolderOpen,
    LayoutDashboard, LogOut, Menu, MessageSquareWarning, Plus, Search, Settings, ShieldCheck,
    UserRound, Users, Wallet, X, Pencil, Eye, Trash2, Megaphone, UserCog, Bus, Utensils, ReceiptText,
} from "lucide-react";
import {
    createManagementRecord, deleteManagementRecord, getDaycareSettings, getManagementOverview,
    listManagementRecords, saveDaycareSettings, updateManagementRecord, listDaycareUsers, createDaycareUser, updateDaycareUser, logDaycareLogout,
    uploadDaycareDocument, downloadDaycareDocument, uploadManagementProfilePhoto, getManagementProfilePhoto,
    changeDaycarePassword,
} from "../api/managementApi";
import { getDaycareProfile, uploadDaycarePhoto } from "../api/daycareApi";
import { getAssetUrl } from "../api/client";
import { connectRealtime, disconnectRealtime } from "../api/realtime";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useForm } from "react-hook-form";
import { selectAuth, clearCredentials } from "../redux/slices/authSlice";
import { clearDashboard, clearDashboardNotifications, pushDashboardNotification, setDashboardLoading, setOverview } from "../redux/slices/dashboardSlice";
import ActionModal from "../components/ActionModal";
import { openNativePicker } from "../utils/openNativePicker";

const field = (name, label, type = "text", options = {}) => ({ name, label, type, ...options });
const MODULE_META = {
    children: { title: "Children", singular: "Child", icon: Baby, columns: ["profilePhoto", "name", "dateOfBirth", "age", "parentContact", "assignedCaregiver", "classGroup", "enrollmentDate", "status"], fields: [field("profilePhoto", "Profile photo", "photo"), field("name", "Full name", "text", { required: true }), field("dateOfBirth", "Date of birth", "date", { required: true }), field("gender", "Gender", "select", { options: ["female", "male", "other"] }), field("bloodGroup", "Blood group"), field("nationality", "Nationality"), field("parentContact", "Parent / guardian", "relation", { related: "parents", required: true }), field("address", "Address", "textarea"), field("enrollmentDate", "Enrollment date", "date"), field("assignedCaregiver", "Assigned caregiver", "relation", { related: "staff" }), field("classGroup", "Class / group", "relation", { related: "classes" }), field("emergencyContactName", "Emergency contact name"), field("emergencyContactNumber", "Emergency contact phone", "tel"), field("medicalInformation", "Medical information", "textarea"), field("allergies", "Allergies", "textarea"), field("emergencyMedicalInformation", "Emergency medical information", "textarea"), field("specialRequirements", "Special requirements", "textarea"), field("specialNotes", "Special notes", "textarea"), field("status", "Status", "select", { options: ["active", "inactive"] })] },
    parents: { title: "Parents", singular: "Parent", icon: Users, columns: ["profilePhoto", "name", "email", "phone", "childrenCount", "createdAt", "status"], fields: [field("profilePhoto", "Profile photo", "photo"), field("name", "Parent name", "text", { required: true }), field("email", "Email", "email", { required: true }), field("phone", "Phone", "tel", { required: true }), field("address", "Address", "textarea"), field("emergencyContactName", "Emergency contact"), field("emergencyContactPhone", "Emergency contact phone", "tel"), field("status", "Status", "select", { options: ["active", "inactive"] })] },
    staff: { title: "Staff & caregivers", singular: "Staff member", icon: UserRound, columns: ["profilePhoto", "fullName", "jobTitle", "role", "phone", "assignedClass", "status"], fields: [field("profilePhoto", "Profile photo", "photo"), field("fullName", "Full name", "text", { required: true }), field("email", "Email", "email"), field("phone", "Phone", "tel", { required: true }), field("jobTitle", "Job title"), field("role", "Role", "select", { options: ["manager", "caregiver", "nurse", "support"] }), field("gender", "Gender", "select", { options: ["female", "male", "other"] }), field("dateOfBirth", "Date of birth", "date"), field("joiningDate", "Joining date", "date"), field("qualification", "Qualification", "textarea"), field("experienceYears", "Experience (years)", "number"), field("address", "Address", "textarea"), field("assignedClass", "Assigned class", "relation", { related: "classes" }), field("emergencyContactName", "Emergency contact"), field("emergencyContactPhone", "Emergency contact phone", "tel"), field("status", "Status", "select", { options: ["active", "inactive"] })] },
    classes: { title: "Classes & groups", singular: "Class / group", icon: Users, columns: ["name", "minAgeMonths", "maxAgeMonths", "capacity", "assignedCaregiver", "status"], fields: [field("name", "Class name", "text", { required: true }), field("description", "Description", "textarea"), field("minAgeMonths", "Minimum age (months)", "number"), field("maxAgeMonths", "Maximum age (months)", "number"), field("capacity", "Capacity", "number", { required: true }), field("assignedCaregiver", "Assigned caregiver", "relation", { related: "staff" }), field("status", "Status", "select", { options: ["active", "inactive"] })] },
    attendance: { title: "Child attendance", singular: "Attendance record", icon: CalendarCheck, columns: ["child", "date", "status", "checkIn", "checkOut"], fields: [field("child", "Child", "relation", { related: "children", required: true }), field("date", "Date", "date", { required: true }), field("status", "Status", "select", { options: ["present", "absent", "late", "excused"], required: true }), field("checkIn", "Check-in", "datetime-local"), field("checkOut", "Check-out", "datetime-local"), field("notes", "Notes", "textarea")] },
    staffAttendance: { title: "Staff attendance", singular: "Staff attendance", icon: Clock3, columns: ["staff", "date", "status", "checkIn", "checkOut"], fields: [field("staff", "Staff member", "relation", { related: "staff", required: true }), field("date", "Date", "date", { required: true }), field("status", "Status", "select", { options: ["present", "absent", "late", "leave"] }), field("checkIn", "Check-in", "datetime-local"), field("checkOut", "Check-out", "datetime-local"), field("notes", "Notes", "textarea")] },
    dailyActivities: { title: "Daily child activities", singular: "Daily care record", icon: Utensils, columns: ["child", "date", "mood", "sharedWithParent"], fields: [field("child", "Child", "relation", { related: "children", required: true }), field("date", "Date", "date", { required: true }), field("meals", "Meals", "textarea"), field("snacks", "Snacks", "textarea"), field("nap", "Nap / sleep", "textarea"), field("toileting", "Diaper / toileting", "textarea"), field("activities", "Activities", "textarea"), field("mood", "Mood", "select", { options: ["happy", "calm", "upset", "tired", "other"] }), field("behavior", "Behavior", "textarea"), field("healthObservations", "Health observations", "textarea"), field("medication", "Medication", "textarea"), field("notes", "General notes", "textarea"), field("sharedWithParent", "Share with parent", "checkbox")] },
    fees: { title: "Fees & payments", singular: "Invoice", icon: Wallet, columns: ["invoiceNumber", "child", "amount", "paidAmount", "dueDate", "status"], fields: [field("child", "Child", "relation", { related: "children", required: true }), field("parent", "Parent", "relation", { related: "parents" }), field("description", "Fee description", "text", { required: true }), field("amount", "Amount (Rs.)", "number", { required: true }), field("paidAmount", "Paid amount (Rs.)", "number"), field("dueDate", "Due date", "date", { required: true }), field("paymentMethod", "Payment method", "select", { options: ["cash", "card", "bank", "jazzcash", "easypaisa", "other"] }), field("transactionReference", "Transaction reference"), field("status", "Status", "select", { options: ["pending", "partially-paid", "paid", "overdue"] }), field("notes", "Notes", "textarea")] },
    leave: { title: "Leave management", singular: "Leave request", icon: CalendarDays, columns: ["staff", "leaveType", "startDate", "endDate", "status"], fields: [field("staff", "Staff member", "relation", { related: "staff", required: true }), field("leaveType", "Leave type", "text", { required: true }), field("startDate", "Start date", "date", { required: true }), field("endDate", "End date", "date", { required: true }), field("reason", "Reason", "textarea", { required: true }), field("status", "Status", "select", { options: ["pending", "approved", "rejected", "cancelled"] }), field("adminRemarks", "Admin remarks", "textarea")] },
    complaints: { title: "Complaints", singular: "Complaint", icon: MessageSquareWarning, columns: ["complaintNumber", "subject", "parent", "priority", "status"], fields: [field("parent", "Parent", "relation", { related: "parents" }), field("child", "Child", "relation", { related: "children" }), field("subject", "Subject", "text", { required: true }), field("description", "Description", "textarea", { required: true }), field("priority", "Priority", "select", { options: ["low", "normal", "high", "urgent"] }), field("assignedStaff", "Assigned staff", "relation", { related: "staff" }), field("status", "Status", "select", { options: ["pending", "in-progress", "resolved", "rejected"] }), field("response", "Response", "textarea"), field("internalNotes", "Internal notes", "textarea")] },
    requests: { title: "Parent requests", singular: "Request", icon: ClipboardList, columns: ["subject", "requestType", "parent", "child", "status"], fields: [field("parent", "Parent", "relation", { related: "parents" }), field("child", "Child", "relation", { related: "children" }), field("requestType", "Request type", "select", { options: ["pickup-dropoff", "information-update", "schedule", "document", "other"], required: true }), field("subject", "Subject", "text", { required: true }), field("description", "Details", "textarea", { required: true }), field("status", "Status", "select", { options: ["pending", "approved", "rejected", "completed"] }), field("adminRemarks", "Admin remarks", "textarea")] },
    pickupPersons: { title: "Authorized pickup persons", singular: "Pickup authorization", icon: Bus, columns: ["photo", "child", "name", "relationship", "phone", "authorized"], fields: [field("photo", "Photo", "photo"), field("name", "Authorized person", "text", { required: true }), field("child", "Child", "relation", { related: "children", required: true }), field("relationship", "Relationship", "text", { required: true }), field("phone", "Phone", "tel", { required: true }), field("identificationNumber", "ID / document number"), field("authorized", "Authorized", "checkbox"), field("notes", "Notes", "textarea")] },
    pickupLogs: { title: "Pickup & drop-off log", singular: "Pickup / drop-off entry", icon: Bus, columns: ["child", "eventType", "pickupName", "occurredAt", "verified"], fields: [field("child", "Child", "relation", { related: "children", required: true }), field("pickupPerson", "Authorized person", "relation", { related: "pickupPersons" }), field("pickupName", "Person at handoff", "text", { required: true }), field("eventType", "Event", "select", { options: ["dropoff", "pickup"], required: true }), field("occurredAt", "Date and time", "datetime-local"), field("verified", "Identity verified", "checkbox"), field("notes", "Notes", "textarea")] },
    notifications: { title: "Notifications", singular: "Notification", icon: Bell, columns: ["title", "type", "audience", "status", "sentAt"], fields: [field("title", "Title", "text", { required: true }), field("message", "Message", "textarea", { required: true }), field("type", "Type", "select", { options: ["announcement", "fee-reminder", "attendance", "holiday", "emergency", "event", "child-update", "general"] }), field("audience", "Audience", "select", { options: ["all-parents", "parent", "class", "staff", "all"] }), field("parent", "Specific parent", "relation", { related: "parents" }), field("classGroup", "Class", "relation", { related: "classes" }), field("status", "Status", "select", { options: ["draft", "sent", "archived"] })] },
    announcements: { title: "Announcements", singular: "Announcement", icon: Megaphone, columns: ["title", "audience", "startDate", "endDate", "status"], fields: [field("title", "Title", "text", { required: true }), field("description", "Description", "textarea", { required: true }), field("attachment", "Attachment URL"), field("startDate", "Start date", "date", { required: true }), field("endDate", "End date", "date"), field("audience", "Audience", "select", { options: ["all", "parents", "staff", "class"] }), field("classGroup", "Class", "relation", { related: "classes" }), field("status", "Status", "select", { options: ["draft", "published", "archived"] })] },
    events: { title: "Events & calendar", singular: "Event", icon: CalendarDays, columns: ["name", "date", "startTime", "location", "audience", "status"], fields: [field("name", "Event name", "text", { required: true }), field("description", "Description", "textarea"), field("date", "Date", "date", { required: true }), field("startTime", "Start time", "time"), field("endTime", "End time", "time"), field("location", "Location"), field("audience", "Audience", "select", { options: ["everyone", "parents", "staff", "class"] }), field("classGroup", "Class", "relation", { related: "classes" }), field("reminderAt", "Reminder", "datetime-local"), field("status", "Status", "select", { options: ["scheduled", "cancelled", "completed"] })] },
    documents: { title: "Documents", singular: "Document", icon: FolderOpen, columns: ["title", "category", "child", "staff", "createdAt"], fields: [field("title", "Document title", "text", { required: true }), field("category", "Category", "select", { options: ["child", "parent", "staff", "certificate", "other"] }), field("child", "Child", "relation", { related: "children" }), field("parent", "Parent", "relation", { related: "parents" }), field("staff", "Staff", "relation", { related: "staff" }), field("file", "Upload file (PDF/JPG/PNG/WebP, max 10 MB)", "file")] },
    activity: { title: "Activity log", singular: "Activity", icon: Activity, columns: ["action", "module", "record", "createdAt"], fields: [], readOnly: true },
};

const NAV = [
    { key: "overview", label: "Dashboard", icon: LayoutDashboard },
    { key: "children", label: "Children", icon: Baby }, { key: "parents", label: "Parents", icon: Users },
    { key: "staff", label: "Staff / Caregivers", icon: UserRound }, { key: "classes", label: "Classes / Groups", icon: Users },
    { key: "attendance", label: "Child Attendance", icon: CalendarCheck }, { key: "staffAttendance", label: "Staff Attendance", icon: Clock3 },
    { key: "dailyActivities", label: "Daily Care Records", icon: Utensils }, { key: "fees", label: "Fees & Payments", icon: Wallet },
    { key: "leave", label: "Leave", icon: CalendarDays }, { key: "complaints", label: "Complaints", icon: MessageSquareWarning },
    { key: "requests", label: "Parent Requests", icon: ClipboardList }, { key: "pickupPersons", label: "Pickup Authorizations", icon: ShieldCheck },
    { key: "pickupLogs", label: "Pickup / Drop-off", icon: Bus }, { key: "notifications", label: "Notifications", icon: Bell },
    { key: "announcements", label: "Announcements", icon: Megaphone }, { key: "events", label: "Events / Calendar", icon: CalendarDays },
    { key: "documents", label: "Documents", icon: FolderOpen }, { key: "reports", label: "Reports", icon: FileText },
    { key: "users", label: "Users & Permissions", icon: UserCog }, { key: "activity", label: "Activity Logs", icon: Activity }, { key: "settings", label: "Settings", icon: Settings },
];

const ROLE_DEFAULT_PERMISSIONS = {
    manager: {
        dashboard: ["read"], children: ["read", "create", "update", "delete"], parents: ["read", "create", "update", "delete"], staff: ["read", "create", "update", "delete"], classes: ["read", "create", "update", "delete"],
        attendance: ["read", "create", "update"], staffAttendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update", "delete"], fees: ["read", "create", "update"], leave: ["read", "create", "update"], complaints: ["read", "create", "update"], requests: ["read", "update"],
        pickupPersons: ["read", "create", "update"], pickupLogs: ["read", "create"], notifications: ["read", "create"], announcements: ["read", "create", "update"], events: ["read", "create", "update"], documents: ["read", "create", "update"], activity: ["read"], reports: ["read"], settings: ["read"],
    },
    caregiver: { dashboard: ["read"], children: ["read"], attendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update"], pickupPersons: ["read"], pickupLogs: ["read", "create"], events: ["read"], announcements: ["read"] },
};
const getUserModulePermissions = (user, key) => {
    const assigned = user?.permissions?.[key];
    return Array.isArray(assigned) ? assigned : ROLE_DEFAULT_PERMISSIONS[user?.role]?.[key] || [];
};

const MONEY = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

const DaycareManagementDashboard = () => {
    const navigate = useNavigate();
    const { module: routeModule } = useParams();
    const dispatch = useDispatch();
    const { user, token } = useSelector(selectAuth);
    const overview = useSelector((state) => state.dashboard.overview);
    const overviewLoading = useSelector((state) => state.dashboard.loading);
    const realtimeNotifications = useSelector((state) => state.dashboard.notifications);
    const module = routeModule || "overview";
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [latestNotifications, setLatestNotifications] = useState([]);
    const [adminReviewNotice, setAdminReviewNotice] = useState(null);
    const lastReviewNotice = useRef("");

    useEffect(() => {
        if (!token || !["daycare", "manager", "caregiver"].includes(user?.role)) navigate("/", { replace: true });
    }, [navigate, token, user?.role]);

    useEffect(() => {
        if (!token) return;
        dispatch(setDashboardLoading(true));
        getManagementOverview(token)
            .then(({ data }) => dispatch(setOverview(data.overview)))
            .catch((error) => toast.error(error.response?.data?.message || "Could not load dashboard overview."))
            .finally(() => dispatch(setDashboardLoading(false)));
    }, [token, dispatch]);

    useEffect(() => {
        if (!token || user?.role !== "daycare") return undefined;
        const refreshReviewNotice = async () => {
            try {
                const { data } = await getDaycareProfile(token);
                const notice = data.listingStatus === "needs-info" && data.adminRemarks
                    ? { message: data.adminRemarks }
                    : null;
                setAdminReviewNotice(notice);
                const noticeKey = notice?.message || "";
                if (noticeKey && noticeKey !== lastReviewNotice.current) {
                    toast.info(`Admin requested more information: ${noticeKey}`, { toastId: `daycare-review-${noticeKey}` });
                }
                lastReviewNotice.current = noticeKey;
            } catch {
                // Keep the last known notice if a background refresh fails.
            }
        };
        void refreshReviewNotice();
        const interval = window.setInterval(refreshReviewNotice, 30000);
        return () => window.clearInterval(interval);
    }, [token, user?.role]);

    useEffect(() => {
        if (!token || !["daycare", "manager", "caregiver"].includes(user?.role)) return undefined;
        const socket = connectRealtime(token);
        if (!socket) return undefined;
        const handleNotification = (notification) => {
            dispatch(pushDashboardNotification(notification));
            toast.info(notification.title || "A new daycare notification was sent.", { toastId: `live-notification-${notification.id}` });
        };
        socket.on("notification:new", handleNotification);
        return () => {
            socket.off("notification:new", handleNotification);
            disconnectRealtime(socket);
        };
    }, [dispatch, token, user?.role]);

    useEffect(() => {
        if (!notificationOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (event.target instanceof Element && !event.target.closest("[data-notification-menu]")) setNotificationOpen(false);
        };
        document.addEventListener("click", closeOnOutsideClick);
        return () => document.removeEventListener("click", closeOnOutsideClick);
    }, [notificationOpen]);

    useEffect(() => {
        if (routeModule && !NAV.some((item) => item.key === routeModule)) navigate("/daycare/dashboard", { replace: true });
        const item = NAV.find((entry) => entry.key === routeModule);
        if (item && user?.role !== "daycare") {
            const permissionKey = item.key === "overview" ? "dashboard" : item.key;
            if (!getUserModulePermissions(user, permissionKey).includes("read")) navigate("/daycare/dashboard", { replace: true });
        }
    }, [navigate, routeModule, user]);

    if (!token || !["daycare", "manager", "caregiver"].includes(user?.role)) return null;

    const logout = () => {
        if (token) logDaycareLogout(token).catch(() => {});
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(clearCredentials());
        dispatch(clearDashboard());
        navigate("/", { replace: true });
    };
    const selectModule = (next) => { navigate(next === "overview" ? "/daycare/dashboard" : `/daycare/dashboard/${next}`); setSidebarOpen(false); setProfileOpen(false); setNotificationOpen(false); };
    const toggleNotifications = async () => {
        const opening = !notificationOpen;
        setNotificationOpen(opening);
        setProfileOpen(false);
        if (!opening || !canReadNotifications) return;
        setNotificationLoading(true);
        try {
            const { data } = await listManagementRecords("notifications", { page: 1, limit: 5, status: "sent", sortBy: "createdAt", sortOrder: "desc" }, token);
            const reviewNotification = adminReviewNotice ? [{ _id: "admin-review-request", title: "Admin requested more information", message: adminReviewNotice.message, createdAt: new Date().toISOString() }] : [];
            setLatestNotifications([...reviewNotification, ...(data.records || [])].slice(0, 5));
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load recent notifications.");
        } finally {
            setNotificationLoading(false);
        }
    };
    const currentNav = NAV.find((item) => item.key === module) || NAV[0];
    const currentDaycareName = overview?.settings?.daycareName?.trim() || user?.daycareName?.trim() || user?.tenant?.name?.trim() || (user?.role === "daycare" ? user.name : "Daycare");
    const canReadNotifications = user?.role === "daycare" || getUserModulePermissions(user, "notifications").includes("read");
    const visibleNav = NAV.filter((item) => {
        if (user?.role === "daycare") return true;
        if (item.key === "users") return false;
        const permissionKey = item.key === "overview" ? "dashboard" : item.key;
        return getUserModulePermissions(user, permissionKey).includes("read");
    });
    const greetingName = user.name?.trim().split(/\s+/)[0] || "there";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
            <aside className={`fixed inset-y-0 left-0 z-40 flex ${sidebarCollapsed ? "w-[78px]" : "w-[270px]"} flex-col border-r border-slate-200 bg-white transition-all duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className={`flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 ${sidebarCollapsed ? "px-4" : "px-5"}`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShieldCheck size={21} /></span>{!sidebarCollapsed && <div><p className="font-extrabold text-slate-900">Daycare Admin</p><p className="text-[11px] text-slate-500">Management portal</p></div>}</div><button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close menu"><X size={18} /></button></div>
                <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.key} title={sidebarCollapsed ? item.label : undefined} aria-current={module === item.key ? "page" : undefined} onClick={() => selectModule(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${module === item.key ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} className="shrink-0" />{!sidebarCollapsed && <><span className="flex-1">{item.label}</span>{item.key === "complaints" && overview?.pendingComplaints > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">{overview.pendingComplaints}</span>}</>}</button>; })}</nav>
                <div className={`shrink-0 border-t border-slate-100 p-4 ${sidebarCollapsed ? "flex justify-center" : ""}`}>{sidebarCollapsed ? <button title={user.name} onClick={() => setProfileModalOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</button> : <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{user.name}</p><p className="truncate text-xs capitalize text-slate-500">{user.role === "daycare" ? "Daycare administrator" : user.role}</p></div><button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><LogOut size={17} /></button></div>}</div>
            </aside>

            <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[78px]" : "lg:pl-[270px]"}`}>
                <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={() => setSidebarCollapsed((value) => !value)} className="hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button><button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={20} /></button><div><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Daycare workspace</p><h1 className="text-lg font-extrabold leading-tight text-slate-900">{currentNav.label}</h1></div></div><div className="flex items-center gap-2 sm:gap-3">{user.role === "daycare" && <button onClick={() => navigate("/daycare/profile/setup")} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:block">Edit public profile</button>}<span title={currentDaycareName} className="hidden max-w-64 truncate rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 xl:inline-flex xl:items-center xl:gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{currentDaycareName}</span><div className="relative" data-notification-menu><button onClick={toggleNotifications} aria-expanded={notificationOpen} aria-label="Open notifications" title="Open notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Bell size={18} />{(overview?.pendingComplaints || 0) + (overview?.pendingRequests || 0) > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{(overview?.pendingComplaints || 0) + (overview?.pendingRequests || 0)}</span>}</button>{notificationOpen && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">Latest notifications</p><p className="mt-0.5 text-xs text-slate-500">Recent messages for this daycare</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{latestNotifications.length}</span></div>{!canReadNotifications ? <p className="px-4 py-6 text-center text-sm text-slate-500">You do not have permission to view notifications.</p> : notificationLoading ? <p className="px-4 py-6 text-center text-sm text-slate-500">Loading notifications…</p> : latestNotifications.length ? <div className="max-h-80 overflow-y-auto">{latestNotifications.map((item) => <button key={item._id} onClick={() => selectModule("notifications")} className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"><span className="block truncate text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</span><span className="mt-1.5 block text-[10px] text-slate-400">{item.sentAt ? new Date(item.sentAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}</span></button>)}</div> : <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>}{canReadNotifications && <button onClick={() => selectModule("notifications")} className="w-full bg-slate-50 px-4 py-3 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">View all notifications</button>}</div>}</div><div className="relative"><button onClick={() => { setNotificationOpen(false); setProfileOpen((value) => !value); }} aria-expanded={profileOpen} aria-label="Open profile menu" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{user.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{user.name}</span></button>{profileOpen && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button onClick={() => { setProfileOpen(false); setProfileModalOpen(true); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Profile</button><button onClick={() => selectModule("settings")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Settings</button><button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">Logout</button></div>}</div></div></header>
                <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                    {adminReviewNotice && <section role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-amber-950">Admin requested more information</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-900">{adminReviewNotice.message}</p></div><button onClick={() => navigate("/daycare/profile/setup")} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">Open profile to update</button></section>}
                    {module === "notifications" && realtimeNotifications.length > 0 && <section aria-live="polite" className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-sky-900">Live notifications</h2><p className="text-xs text-sky-700">{realtimeNotifications.length} received during this session</p></div><button onClick={() => dispatch(clearDashboardNotifications())} className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100">Clear</button></div><div className="mt-3 space-y-2">{realtimeNotifications.slice(0, 5).map((item) => <article key={item.id} className="rounded-xl bg-white/80 px-3 py-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.message}</p><p className="mt-1 text-[10px] text-slate-400">{item.daycareName} · {new Date(item.sentAt).toLocaleString()}</p></article>)}</div></section>}
                    {module === "overview" && <OverviewPanel overview={overview} loading={overviewLoading} onSelect={selectModule} greeting={greetingName} />}
                    {module === "settings" && <SettingsPanel token={token} canEdit={user.role === "daycare" || user.permissions?.settings?.includes("update")} />}
                    {module === "reports" && <ReportsPanel token={token} overview={overview} />}
                    {module === "activity" && <ModulePanel moduleKey="activity" token={token} />}
                    {MODULE_META[module] && !["activity"].includes(module) && <ModulePanel key={module} moduleKey={module} token={token} />}
                    {module === "users" && (user.role === "daycare" ? <AccessPanel token={token} /> : <EmptyState icon={ShieldCheck} title="Owner access required" detail="Only the daycare owner can create and manage dashboard accounts." />)}
                </main>
            </div>
            {profileModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setProfileModalOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="admin-profile-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Account profile</p><h2 id="admin-profile-title" className="mt-1 text-xl font-extrabold text-slate-900">{user.name}</h2></div><button onClick={() => setProfileModalOpen(false)} aria-label="Close profile" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="mt-0.5 break-all font-medium text-slate-800">{user.email}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Role</dt><dd className="mt-0.5 capitalize font-medium text-slate-800">{user.role === "daycare" ? "Daycare administrator" : user.role}</dd></div></dl><button onClick={() => { setProfileModalOpen(false); selectModule("settings"); }} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Open settings</button></section></div>}
        </div>
    );
};

const STAT_CARDS = [
    ["children", "Total children", "children", Baby, "sky"], ["activeChildren", "Active children", "activeChildren", CheckCircle2, "emerald"],
    ["parents", "Parents", "parents", Users, "indigo"], ["staff", "Active staff", "staff", UserRound, "violet"],
    ["presentToday", "Children present today", "presentToday", CalendarCheck, "emerald"], ["absentToday", "Children absent today", "absentToday", AlertTriangle, "amber"],
    ["staffAttendanceToday", "Staff present today", "staffAttendanceToday", Clock3, "sky"], ["pendingFees", "Pending fee amount", "pendingFees", Wallet, "rose", true],
    ["paidFees", "Paid fees", "paidFees", CreditCard, "emerald", true], ["pendingComplaints", "Pending complaints", "pendingComplaints", MessageSquareWarning, "amber"],
    ["pendingRequests", "Pending requests", "pendingRequests", ClipboardList, "indigo"], ["upcomingEvents", "Upcoming events", "upcomingEvents", CalendarDays, "violet"],
];
const TONES = { sky: "bg-sky-50 text-sky-600", emerald: "bg-emerald-50 text-emerald-600", indigo: "bg-indigo-50 text-indigo-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" };

const OverviewPanel = ({ overview, loading, onSelect, greeting }) => {
    const [quickAdd, setQuickAdd] = useState(null);
    const actions = [["children", "Add child", Baby], ["parents", "Add parent", Users], ["staff", "Add staff", UserRound], ["attendance", "Mark attendance", CalendarCheck], ["fees", "Add fee", Wallet], ["notifications", "Send notification", Bell], ["announcements", "Create announcement", Megaphone]];
    const { user } = useSelector(selectAuth);
    const caregiverCards = new Set(["children", "activeChildren", "presentToday", "absentToday"]);
    const cardDestination = { children: "children", activeChildren: "children", parents: "parents", staff: "staff", presentToday: "attendance", absentToday: "attendance", staffAttendanceToday: "staffAttendance", pendingFees: "fees", paidFees: "fees", pendingComplaints: "complaints", pendingRequests: "requests", upcomingEvents: "events" };
    const cards = STAT_CARDS.filter(([key]) => {
        if (user?.role === "daycare") return true;
        if (user?.role === "caregiver" && !caregiverCards.has(key)) return false;
        const destination = cardDestination[key];
        return getUserModulePermissions(user, destination).includes("read") || (user?.role === "caregiver" && caregiverCards.has(key));
    });
    return <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#172554] via-indigo-700 to-sky-600 p-6 text-white shadow-xl sm:p-8"><p className="text-sm font-medium text-indigo-100">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p><h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Welcome back, {greeting}</h2><p className="mt-2 text-sm text-indigo-100">Here is what is happening at your daycare today.</p><div className="mt-6 flex flex-wrap gap-3"><QuickMetric label="Check-ins" value={overview?.checkIns} loading={loading} /><QuickMetric label="Check-outs" value={overview?.checkOuts} loading={loading} /><QuickMetric label="Staff check-ins" value={overview?.staffCheckIns} loading={loading} /><QuickMetric label="Staff check-outs" value={overview?.staffCheckOuts} loading={loading} /></div></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{cards.map(([key, label, stat, Icon, tone, money]) => <button key={key} type="button" onClick={() => cardDestination[key] && onSelect(cardDestination[key])} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={17} /></span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{loading ? "—" : money ? `Rs. ${MONEY.format(overview?.[stat] || 0)}` : (overview?.[stat] ?? 0)}</p></button>)}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h3 className="font-extrabold text-slate-900">Quick actions</h3><p className="mt-1 text-sm text-slate-500">Create a record or update today’s operations.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">{actions.filter(([key]) => user?.role === "daycare" || getUserModulePermissions(user, key).includes("create")).map(([key, label, Icon]) => <button key={key} onClick={() => setQuickAdd(key)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><Icon size={17} />{label}</button>)}</div></section>
        <section className="grid gap-5 xl:grid-cols-2"><ChartCard title="Child enrollment" subtitle="New children by month" data={overview?.charts?.enrollment} valueKey="count" /><ChartCard title="Monthly attendance" subtitle="Attendance records by month" data={overview?.charts?.attendance} valueKey="count" /><ChartCard title="Monthly fee collection" subtitle="Recorded paid amounts" data={overview?.charts?.fees} valueKey="amount" money /><ChartCard title="Staff attendance" subtitle="Attendance records by month" data={overview?.charts?.staffAttendance} valueKey="count" /><FeeStatusChart data={overview?.charts?.feeStatuses} /><ComplaintChart data={overview?.charts?.complaints} /></section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-extrabold text-slate-900">Recent activity</h3><p className="mt-1 text-sm text-slate-500">Latest changes made in this daycare.</p></div><button onClick={() => onSelect("activity")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">View log</button></div>{loading ? <p className="p-8 text-center text-sm text-slate-500">Loading activity…</p> : overview?.recentActivities?.length ? <div className="divide-y divide-slate-100">{overview.recentActivities.slice(0, 8).map((entry) => <div key={entry._id} className="flex items-start gap-3 px-5 py-3"><span className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Activity size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold capitalize text-slate-800">{entry.action} <span className="font-normal">{entry.module}</span></p><p className="mt-0.5 text-xs text-slate-500">{entry.metadata?.title || "Record updated"}</p></div><time className="shrink-0 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time></div>)}</div> : <EmptyState icon={Activity} title="No activity recorded" detail="Actions performed in your dashboard will appear here." />}</section>
        {quickAdd && <RecordFormModal moduleKey={quickAdd} token={window.localStorage.getItem("token")} onClose={() => setQuickAdd(null)} onSaved={() => { setQuickAdd(null); onSelect(quickAdd); }} />}
    </div>;
};

const QuickMetric = ({ label, value, loading }) => <div className="min-w-28 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5"><p className="text-xs text-indigo-100">{label}</p><p className="mt-0.5 text-xl font-extrabold">{loading ? "—" : value ?? 0}</p></div>;
const ChartCard = ({ title, subtitle, data = [], valueKey, money = false }) => {
    const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; return { key, label: date.toLocaleDateString("en", { month: "short" }), value: data.find((entry) => entry._id === key)?.[valueKey] || 0 }; });
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p><div className="mt-4 h-48 w-full" role="img" aria-label={title}><ResponsiveContainer width="100%" height="100%"><BarChart data={months} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => money ? `${Math.round(value / 1000)}k` : value} /><Tooltip formatter={(value) => money ? `Rs. ${MONEY.format(value)}` : value} /><Bar dataKey="value" name={money ? "Collected" : "Records"} fill="#4f46e5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></section>;
};
const ComplaintChart = ({ data = [] }) => {
    const colors = { pending: "#f59e0b", "in-progress": "#0ea5e9", resolved: "#10b981", rejected: "#f43f5e" };
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold text-slate-900">Complaints by status</h3><p className="mt-1 text-xs text-slate-500">Current complaint resolution progress</p>{data.length ? <div className="mt-4 h-48 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="_id" innerRadius={48} outerRadius={72} paddingAngle={3}>{data.map((item) => <Cell key={item._id} fill={colors[item._id] || "#6366f1"} />)}</Pie><Tooltip /><Legend formatter={(value) => String(value).replaceAll("-", " ")} /></PieChart></ResponsiveContainer></div> : <div className="flex h-40 items-center justify-center text-sm text-slate-400">No complaint data yet</div>}</section>;
};
const FeeStatusChart = ({ data = [] }) => { const totals = data.reduce((result, item) => ({ paid: result.paid + Number(item.paid || 0), pending: result.pending + Math.max(0, Number(item.amount || 0) - Number(item.paid || 0)) }), { paid: 0, pending: 0 }); const chartData = [{ name: "Paid", value: totals.paid }, { name: "Pending", value: totals.pending }].filter((item) => item.value > 0); return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-extrabold text-slate-900">Paid vs pending fees</h3><p className="mt-1 text-xs text-slate-500">Collected and remaining invoice amounts</p>{chartData.length ? <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>{chartData.map((item) => <Cell key={item.name} fill={item.name === "Paid" ? "#10b981" : "#f59e0b"} />)}</Pie><Tooltip formatter={(value) => `Rs. ${MONEY.format(value)}`} /><Legend /></PieChart></ResponsiveContainer></div> : <div className="flex h-40 items-center justify-center text-sm text-slate-400">No fee data yet</div>}</section>; };

const ModulePanel = ({ moduleKey, token }) => {
    const meta = MODULE_META[moduleKey];
    const { user } = useSelector(selectAuth);
    const [records, setRecords] = useState([]);
    const [relationOptions, setRelationOptions] = useState({});
    const [relationFilters, setRelationFilters] = useState({});
    const [loadedRequestKey, setLoadedRequestKey] = useState("");
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [category, setCategory] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sort, setSort] = useState({ by: "createdAt", order: "desc" });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [refresh, setRefresh] = useState(0);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [paymentRecord, setPaymentRecord] = useState(null);
    const [bulkAttendanceOpen, setBulkAttendanceOpen] = useState(false);
    const [actionModal, setActionModal] = useState(null);
    const relationFields = useMemo(() => meta.fields.filter((item) => item.type === "relation" && (user?.role !== "caregiver" || item.related === "children")), [meta.fields, user?.role]);
    const readOnly = Boolean(meta.readOnly);
    const permissionKey = moduleKey === "overview" ? "dashboard" : moduleKey;
    const allowedActions = user?.role === "daycare" ? ["read", "create", "update", "delete"] : getUserModulePermissions(user, permissionKey);
    const canCreate = allowedActions.includes("create");
    const canUpdate = allowedActions.includes("update");
    const canDelete = allowedActions.includes("delete");

    useEffect(() => {
        let active = true;
        const modules = [...new Set(relationFields.map((item) => item.related))];
        if (!modules.length) return undefined;
        Promise.all(modules.map(async (related) => {
            const { data } = await listManagementRecords(related, { page: 1, limit: 100, status: "all" }, token);
            return [related, data.records || []];
        })).then((entries) => { if (active) setRelationOptions(Object.fromEntries(entries)); })
            .catch((error) => { if (active) toast.error(error.response?.data?.message || "Filter options could not be loaded."); });
        return () => { active = false; };
    }, [relationFields, token]);

    useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
    const requestKey = JSON.stringify([moduleKey, page, debouncedSearch, status, category, dateFrom, dateTo, sort, relationFilters, refresh, token]);
    const loading = loadedRequestKey !== requestKey;
    useEffect(() => {
        let active = true;
        listManagementRecords(moduleKey, { page, limit: moduleKey === "events" ? 100 : 15, search: debouncedSearch, status, category, from: dateFrom, to: dateTo, sortBy: sort.by, sortOrder: sort.order, ...relationFilters }, token)
            .then(({ data }) => { if (active) { setRecords(data.records || []); setPagination(data.pagination || { page: 1, pages: 1, total: 0 }); setError(""); } })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load records."); })
            .finally(() => { if (active) setLoadedRequestKey(requestKey); });
        return () => { active = false; };
    }, [moduleKey, page, debouncedSearch, status, category, dateFrom, dateTo, sort, relationFilters, refresh, token, requestKey]);

    const removeRecord = async (record) => {
        const label = record.name || record.fullName || record.title || record.subject || record.invoiceNumber || meta.singular;
        setActionModal({ title: `Remove this ${meta.singular.toLowerCase()}?`, description: `“${label}” will be removed or deactivated in this daycare.`, confirmLabel: "Remove", tone: "danger", onConfirm: async () => {
            try { await deleteManagementRecord(moduleKey, record._id, token); toast.success("Record removed."); setActionModal(null); setRefresh((value) => value + 1); }
            catch (requestError) { toast.error(requestError.response?.data?.message || "Could not remove record."); throw requestError; }
        } });
    };
    const downloadDocument = async (record) => {
        try { const { data } = await downloadDaycareDocument(record._id, token); const url = URL.createObjectURL(data); const link = document.createElement("a"); link.href = url; link.download = record.title || "daycare-document"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
        catch (requestError) { toast.error(requestError.response?.data?.message || "Could not download document."); }
    };

    const cellLabel = (key) => meta.fields.find((item) => item.name === key)?.label || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Daycare management</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{meta.title}</h2><p className="mt-1 text-sm text-slate-500">{pagination.total} record{pagination.total === 1 ? "" : "s"} in this daycare.</p></div><div className="flex flex-wrap gap-2">{moduleKey === "attendance" && canCreate && <button onClick={() => setBulkAttendanceOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><CalendarCheck size={16} />Bulk mark</button>}{!readOnly && canCreate && <button onClick={() => setAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"><Plus size={17} />Add {meta.singular.toLowerCase()}</button>}</div></div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row"><label className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${meta.title.toLowerCase()}...`} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-400"><option value="all">All statuses</option>{["active", "inactive", "pending", "approved", "rejected", "present", "absent", "late", "excused", "paid", "partially-paid", "overdue", "in-progress", "resolved", "completed", "cancelled", "draft", "published", "sent", "scheduled"].map((item) => <option key={item} value={item}>{item.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase())}</option>)}</select>{moduleKey === "documents" && <select aria-label="Filter by document category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><option value="">All categories</option>{MODULE_META.documents.fields.find((item) => item.name === "category").options.map((value) => <option key={value} value={value}>{value}</option>)}</select>}{relationFields.map((relation) => <label key={relation.name} className="flex items-center gap-2 text-xs capitalize text-slate-500">{relation.label}<select aria-label={`Filter by ${relation.label}`} value={relationFilters[relation.name] || ""} onChange={(event) => { setRelationFilters((current) => ({ ...current, [relation.name]: event.target.value })); setPage(1); }} className="max-w-48 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="">All</option>{(relationOptions[relation.related] || []).map((item) => <option key={item._id} value={item._id}>{item.name || item.fullName || item.title || item.email}</option>)}</select></label>)}<label className="flex items-center gap-2 text-xs text-slate-500">From<input aria-label="Start date" type="date" value={dateFrom} onClick={openNativePicker} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-2 text-xs" /></label><label className="flex items-center gap-2 text-xs text-slate-500">To<input aria-label="End date" type="date" value={dateTo} onClick={openNativePicker} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-2 text-xs" /></label><button onClick={() => { setPage(1); setSearch(""); setStatus("all"); setCategory(""); setDateFrom(""); setDateTo(""); setRelationFilters({}); setSort({ by: "createdAt", order: "desc" }); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button></div>
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading {meta.title.toLowerCase()}…</div> : error ? <div className="p-8 text-center"><AlertTriangle className="mx-auto text-rose-500" size={25} /><p className="mt-2 text-sm text-rose-700">{error}</p><button onClick={() => setRefresh((value) => value + 1)} className="mt-3 text-sm font-bold text-indigo-600">Try again</button></div> : records.length ? <>
            {moduleKey === "events" ? <EventsCalendar records={records} onView={setViewing} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{meta.columns.map((column) => <th key={column} className="px-4 py-3 font-bold"><button disabled={column === "age"} className="hover:text-indigo-700 disabled:cursor-default" onClick={() => { setPage(1); setSort((current) => ({ by: column, order: current.by === column && current.order === "asc" ? "desc" : "asc" })); }}>{cellLabel(column)}{sort.by === column ? (sort.order === "asc" ? " ↑" : " ↓") : ""}</button></th>)}<th className="px-4 py-3 text-right font-bold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={record._id} className="transition hover:bg-slate-50/70">{meta.columns.map((column) => <td key={column} className="max-w-56 px-4 py-3 text-slate-600">{column === "age" ? <span>{formatAge(record.dateOfBirth)}</span> : ["profilePhoto", "photo"].includes(column) ? <ManagementRecordPhoto moduleKey={moduleKey} record={record} field={column} token={token} /> : <CellValue value={record[column]} status={column === "status"} />}</td>)}<td className="px-4 py-3"><div className="flex justify-end gap-1"><IconAction label="View" onClick={() => setViewing(record)}><Eye size={16} /></IconAction>{moduleKey === "fees" && Number(record.paidAmount) < Number(record.amount) && canUpdate && <IconAction label="Record payment" onClick={() => setPaymentRecord(record)}><CreditCard size={16} /></IconAction>}{moduleKey === "fees" && Number(record.paidAmount) > 0 && <IconAction label="Print payment receipt" onClick={() => printFeeReceipt(record)}><ReceiptText size={16} /></IconAction>}{moduleKey === "documents" && record.fileUrl && <IconAction label="Download secure file" onClick={() => downloadDocument(record)}><ArrowDownToLine size={16} /></IconAction>}{canUpdate && <IconAction label="Edit" onClick={() => setEditing(record)}><Pencil size={16} /></IconAction>}{canDelete && <IconAction label="Delete" tone="danger" onClick={() => removeRecord(record)}><Trash2 size={16} /></IconAction>}</div></td></tr>)}</tbody></table></div>}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-500">Page {pagination.page} of {Math.max(pagination.pages, 1)} · {pagination.total} total</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft size={16} />Previous</button><button disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-40">Next<ChevronRight size={16} /></button></div></div>
        </> : <EmptyState icon={meta.icon} title={search || status !== "all" ? "No matching records" : `No ${meta.title.toLowerCase()} yet`} detail={readOnly ? "Admin actions will be recorded here." : `Create your first ${meta.singular.toLowerCase()} record to get started.`} />}
        {(adding || editing) && <RecordFormModal moduleKey={moduleKey} token={token} record={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => { setAdding(false); setEditing(null); setRefresh((value) => value + 1); }} />}
        {paymentRecord && <PaymentModal record={paymentRecord} token={token} onClose={() => setPaymentRecord(null)} onSaved={() => { setPaymentRecord(null); setRefresh((value) => value + 1); }} />}
        {bulkAttendanceOpen && <BulkAttendanceModal token={token} onClose={() => setBulkAttendanceOpen(false)} onSaved={() => { setBulkAttendanceOpen(false); setRefresh((value) => value + 1); }} />}
        <ActionModal open={Boolean(actionModal)} {...actionModal} onClose={() => setActionModal(null)} />
        {viewing && ["children", "parents", "staff"].includes(moduleKey) ? <ProfileTabsModal record={viewing} kind={moduleKey} token={token} onClose={() => setViewing(null)} /> : viewing && <RecordViewModal record={viewing} moduleKey={moduleKey} token={token} title={meta.singular} onClose={() => setViewing(null)} />}
    </section>;
};

const EventsCalendar = ({ records, onView }) => {
    const [cursor, setCursor] = useState(() => new Date());
    const [view, setView] = useState("month");
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const first = new Date(year, month, 1); const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
    const count = view === "week" ? 7 : 42;
    const days = Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    const eventDay = (event) => event.date ? new Date(event.date).toLocaleDateString() : "";
    return <div className="p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button aria-label="Previous period" onClick={() => setCursor(new Date(year, month, cursor.getDate() - (view === "week" ? 7 : 30)))} className="rounded-lg border p-2 text-slate-600"><ChevronLeft size={17} /></button><button aria-label="Next period" onClick={() => setCursor(new Date(year, month, cursor.getDate() + (view === "week" ? 7 : 30)))} className="rounded-lg border p-2 text-slate-600"><ChevronRight size={17} /></button><button onClick={() => setCursor(new Date())} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600">Today</button><h3 className="ml-1 font-extrabold text-slate-800">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3></div><select aria-label="Calendar view" value={view} onChange={(event) => setView(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="month">Month</option><option value="week">Week</option><option value="list">List</option></select></div>{view === "list" ? <div className="divide-y divide-slate-100">{records.map((event) => <button key={event._id} onClick={() => onView(event)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-slate-50"><span><span className="block font-bold text-slate-800">{event.name}</span><span className="text-xs text-slate-500">{eventDay(event)} {event.startTime || ""} · {event.location || ""}</span></span><span className="text-xs capitalize text-indigo-700">{event.status}</span></button>)}</div> : <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="bg-slate-50 p-2 text-center text-[11px] font-bold text-slate-500">{day}</div>)}{days.map((day) => { const matches = records.filter((event) => event.date && new Date(event.date).toDateString() === day.toDateString()); return <div key={day.toISOString()} className={`min-h-24 border-t border-r border-slate-100 p-1.5 ${day.getMonth() !== month ? "bg-slate-50/60" : "bg-white"}`}><span className={`text-xs ${day.toDateString() === new Date().toDateString() ? "rounded-full bg-indigo-600 px-1.5 py-1 font-bold text-white" : "text-slate-500"}`}>{day.getDate()}</span><div className="mt-1 space-y-1">{matches.map((event) => <button key={event._id} onClick={() => onView(event)} title={event.name} className="block w-full truncate rounded bg-indigo-50 px-1.5 py-1 text-left text-[10px] font-semibold text-indigo-700">{event.startTime ? `${event.startTime} ` : ""}{event.name}</button>)}</div></div>; })}</div>}</div>;
};

const PaymentModal = ({ record, token, onClose, onSaved }) => {
    const remaining = Math.max(0, Number(record.amount || 0) - Number(record.paidAmount || 0));
    const formik = useFormik({ initialValues: { receivedAmount: "", paymentMethod: "cash", transactionReference: "", paidAt: new Date().toISOString().slice(0, 10) }, validationSchema: Yup.object({ receivedAmount: Yup.number().typeError("Enter a valid amount.").positive("Amount must be greater than zero.").max(remaining, `Amount cannot exceed Rs. ${remaining}.`).required("Amount is required."), paymentMethod: Yup.string().oneOf(["cash", "card", "bank", "jazzcash", "easypaisa", "other"]).required("Select a method."), transactionReference: Yup.string().max(120), paidAt: Yup.string().required("Payment date is required.") }), onSubmit: async (values, helpers) => {
        try { const paidAmount = Number(record.paidAmount || 0) + Number(values.receivedAmount); await updateManagementRecord("fees", record._id, { paidAmount, paymentMethod: values.paymentMethod, transactionReference: values.transactionReference.trim(), paidAt: values.paidAt }, token); toast.success("Payment recorded."); onSaved(); }
        catch (error) { toast.error(error.response?.data?.message || "Could not record payment."); helpers.setSubmitting(false); }
    } });
    return <ModalShell title="Record payment" subtitle={record.invoiceNumber || "Fee invoice"} onClose={onClose}><div className="mb-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900"><p>Invoice total: <b>Rs. {MONEY.format(record.amount || 0)}</b></p><p className="mt-1">Previously paid: <b>Rs. {MONEY.format(record.paidAmount || 0)}</b> · Remaining: <b>Rs. {MONEY.format(remaining)}</b></p></div><FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate className="space-y-4">{[["receivedAmount", "Amount received (Rs.)", "number"], ["paidAt", "Payment date", "date"], ["transactionReference", "Transaction reference (optional)", "text"]].map(([name, label, type]) => <label key={name} className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input name={name} type={type} min={type === "number" ? "0.01" : undefined} max={type === "number" ? remaining : undefined} step={type === "number" ? "0.01" : undefined} value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" />{formik.touched[name] && formik.errors[name] && <span className="mt-1 block text-xs text-rose-600">{formik.errors[name]}</span>}</label>)}<label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Payment method</span><select name="paymentMethod" value={formik.values.paymentMethod} onChange={formik.handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{["cash", "card", "bank", "jazzcash", "easypaisa", "other"].map((method) => <option key={method} value={method}>{method}</option>)}</select></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button disabled={formik.isSubmitting || remaining <= 0} type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{formik.isSubmitting ? "Saving…" : "Save payment"}</button></div></form></FormikProvider></ModalShell>;
};

const BulkAttendanceModal = ({ token, onClose, onSaved }) => {
    const [children, setChildren] = useState([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState("");
    useEffect(() => { let active = true; listManagementRecords("children", { page: 1, limit: 100, status: "active" }, token).then(({ data }) => { if (active) setChildren(data.records || []); }).catch((error) => { if (active) setLoadError(error.response?.data?.message || "Could not load active children."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [token]);
    const today = new Date(); const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const formik = useFormik({ initialValues: { childIds: [], date: localDate, status: "present", checkIn: "", checkOut: "", notes: "" }, validationSchema: Yup.object({ childIds: Yup.array().min(1, "Select at least one child."), date: Yup.string().required("Date is required."), status: Yup.string().oneOf(["present", "absent", "late", "excused"]).required() }), onSubmit: async (values, helpers) => {
        const results = await Promise.allSettled(values.childIds.map((child) => createManagementRecord("attendance", { child, date: values.date, status: values.status, ...(values.checkIn ? { checkIn: new Date(values.checkIn).toISOString() } : {}), ...(values.checkOut ? { checkOut: new Date(values.checkOut).toISOString() } : {}), notes: values.notes }, token)));
        const successCount = results.filter((result) => result.status === "fulfilled").length; const failedCount = results.length - successCount;
        if (successCount) { toast.success(`${successCount} attendance record${successCount === 1 ? "" : "s"} saved${failedCount ? `; ${failedCount} could not be saved` : ""}.`); onSaved(); }
        else { toast.error(results[0]?.reason?.response?.data?.message || "No attendance records could be saved."); helpers.setSubmitting(false); }
    } });
    return <ModalShell title="Bulk mark attendance" subtitle="Record attendance for several children at once." onClose={onClose}>{loading ? <p className="py-8 text-center text-sm text-slate-500">Loading children…</p> : loadError ? <p role="alert" className="py-5 text-sm text-rose-600">{loadError}</p> : <FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><FormField fieldMeta={{ name: "date", label: "Attendance date", type: "date", required: true }} formik={formik} /><FormField fieldMeta={{ name: "status", label: "Status", type: "select", options: ["present", "absent", "late", "excused"], required: true }} formik={formik} /><FormField fieldMeta={{ name: "checkIn", label: "Check-in (optional)", type: "datetime-local" }} formik={formik} /><FormField fieldMeta={{ name: "checkOut", label: "Check-out (optional)", type: "datetime-local" }} formik={formik} /></div><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">Children ({formik.values.childIds.length} selected)</h3><button type="button" onClick={() => formik.setFieldValue("childIds", formik.values.childIds.length === children.length ? [] : children.map((child) => child._id))} className="text-xs font-bold text-indigo-700">{formik.values.childIds.length === children.length ? "Clear selection" : "Select all"}</button></div><div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2">{children.length ? children.map((child) => <label key={child._id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={formik.values.childIds.includes(child._id)} onChange={(event) => formik.setFieldValue("childIds", event.target.checked ? [...formik.values.childIds, child._id] : formik.values.childIds.filter((id) => id !== child._id))} className="h-4 w-4 accent-indigo-600" />{child.name}</label>) : <p className="p-4 text-center text-sm text-slate-500">No active children available.</p>}</div>{formik.errors.childIds && <p role="alert" className="text-xs text-rose-600">{formik.errors.childIds}</p>}<label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Notes (optional)</span><textarea rows={2} name="notes" value={formik.values.notes} onChange={formik.handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={formik.isSubmitting || !children.length} type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{formik.isSubmitting ? "Saving…" : "Save attendance"}</button></div></form></FormikProvider>}</ModalShell>;
};

const ModalShell = ({ title, subtitle, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" className="my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><header className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Daycare management</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>{children}</section></div>;

const printFeeReceipt = (record) => {
    if (!(Number(record.paidAmount) > 0)) { toast.info("A receipt is available after a payment is recorded."); return; }
    const escape = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    const popup = window.open("", "_blank", "width=720,height=700");
    if (!popup) { toast.error("Allow pop-ups to print the receipt."); return; }
    const rows = [["Receipt", record.invoiceNumber], ["Parent", record.parent?.name], ["Child", record.child?.name], ["Description", record.description], ["Invoice amount", `Rs. ${record.amount}`], ["Amount paid", `Rs. ${record.paidAmount}`], ["Remaining", `Rs. ${Math.max(0, Number(record.amount) - Number(record.paidAmount))}`], ["Payment date", record.paidAt ? new Date(record.paidAt).toLocaleDateString() : "—"], ["Method", record.paymentMethod], ["Reference", record.transactionReference], ["Status", record.status]];
    popup.document.write(`<!doctype html><html><head><title>Payment receipt</title><style>body{font:15px Arial,sans-serif;padding:32px;color:#1e293b}h1{margin-bottom:4px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}td{border-bottom:1px solid #e2e8f0;padding:11px 8px}td:first-child{font-weight:bold;width:38%}@media print{button{display:none}}</style></head><body><h1>Payment receipt</h1><p>Daycare fee payment record</p><table>${rows.map(([label, value]) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`).join("")}</table><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
};

const IconAction = ({ children, label, onClick, tone = "default" }) => <button title={label} aria-label={label} onClick={onClick} className={`rounded-lg p-2 transition ${tone === "danger" ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600" : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"}`}>{children}</button>;
const CellValue = ({ value, status, field, record, moduleKey, token }) => {
    if (["profilePhoto", "photo", "image", "logo", "images"].includes(field)) {
        return value && record?._id && moduleKey
            ? <ManagementRecordPhoto moduleKey={moduleKey} record={record} field={field} token={token} />
            : null;
    }
    if (typeof value === "string" && (
        value.startsWith("private:") ||
        /^(?:https?:\/\/|\/|blob:|data:image\/).+\.(?:jpe?g|png|webp|gif|svg)(?:[?#].*)?$/i.test(value) ||
        /\/(?:photo|photos)(?:\/|\?|$)/i.test(value)
    )) return null;
    if (value == null || value === "") return <span className="text-slate-300">—</span>;
    if (typeof value === "boolean") return value ? <Check size={16} className="text-emerald-600" /> : <span className="text-slate-400">No</span>;
    if (Array.isArray(value)) return <span className="block max-w-52 truncate">{value.map((entry) => typeof entry === "object" ? entry.name || entry.fullName || entry._id : entry).join(", ") || "—"}</span>;
    if (typeof value === "object") return <span className="block max-w-52 truncate" title={value.name || value.fullName || value._id}>{value.name || value.fullName || value.email || value._id}</span>;
    if (status) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{String(value).replaceAll("-", " ")}</span>;
    if (typeof value === "string" && !Number.isNaN(Date.parse(value)) && value.includes("T")) return new Date(value).toLocaleDateString();
    return <span className="block max-w-56 truncate" title={String(value)}>{String(value)}</span>;
};

const EmptyState = ({ icon: Icon, title, detail, action }) => <div className="px-6 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon size={23} /></span><h3 className="mt-3 font-bold text-slate-800">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{detail}</p>{action}</div>;

const getRecordId = (value) => value && typeof value === "object" ? value._id : value;
const formatAge = (dateOfBirth) => {
    if (!dateOfBirth) return "—";
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime()) || birth > new Date()) return "—";
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return [years ? `${years}y` : "", remainingMonths ? `${remainingMonths}m` : ""].filter(Boolean).join(" ") || "Under 1m";
};
const formatInputValue = (fieldMeta, value) => {
    if (value == null) return fieldMeta.type === "checkbox" ? false : "";
    if (fieldMeta.type === "relation") return getRecordId(value) || "";
    if (fieldMeta.type === "date") return new Date(value).toISOString().slice(0, 10);
    if (fieldMeta.type === "datetime-local") { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    return value;
};

const RecordFormModal = ({ moduleKey, token, record, onClose, onSaved }) => {
    const meta = MODULE_META[moduleKey];
    const [lookups, setLookups] = useState({});
    const [saving, setSaving] = useState(false);
    const relationModules = useMemo(() => [...new Set(meta.fields.filter((item) => item.type === "relation").map((item) => item.related))], [meta.fields]);
    useEffect(() => {
        let active = true;
        if (!relationModules.length) return undefined;
        Promise.all(relationModules.map(async (related) => {
            const { data } = await listManagementRecords(related, { limit: 100, page: 1, status: "all" }, token);
            return [related, data.records || []];
        })).then((entries) => { if (active) setLookups(Object.fromEntries(entries)); })
            .catch(() => toast.error("Could not load form options."));
        return () => { active = false; };
    }, [relationModules, token]);

    const initialValues = useMemo(() => {
        const notificationDefaults = moduleKey === "notifications" ? { type: "general", audience: "all-parents", status: "sent" } : {};
        return Object.fromEntries(meta.fields.map((item) => [item.name, formatInputValue(item, record?.[item.name] ?? notificationDefaults[item.name])]));
    }, [meta.fields, moduleKey, record]);
    const validationSchema = useMemo(() => Yup.object(Object.fromEntries(meta.fields.map((item) => {
        let schema = item.type === "file" || item.type === "photo" ? Yup.mixed().nullable() : item.type === "number"
            ? Yup.number().transform((value, original) => original === "" ? undefined : value).typeError(`${item.label} must be a number.`).min(0, `${item.label} cannot be negative.`)
            : Yup.string();
        if (item.required) schema = schema.required(`${item.label} is required.`);
        return [item.name, item.type === "checkbox" ? Yup.boolean() : schema];
    }))), [meta.fields]);

    const formik = useFormik({ enableReinitialize: true, initialValues, validationSchema, validateOnChange: false, onSubmit: async (values) => {
        const payload = {};
        let savedRecord = record;
        for (const item of meta.fields) {
            let value = values[item.name];
            if (item.type === "file" || item.type === "photo") continue;
            if (item.type === "number") { if (value === "") continue; value = Number(value); }
            if (item.type === "relation" && !value) continue;
            if (item.type === "checkbox") value = Boolean(value);
            payload[item.name] = value;
        }
        if (moduleKey === "documents" && !record && !values.file) {
            formik.setFieldError("file", "Choose a document to upload.");
            return;
        }
        try {
            setSaving(true);
            if (moduleKey === "documents" && values.file) await uploadDaycareDocument(values.file, payload, token, record?._id);
            else if (record) await updateManagementRecord(moduleKey, record._id, payload, token);
            else {
                const { data } = await createManagementRecord(moduleKey, payload, token);
                savedRecord = data.record || data;
            }
            if (values.profilePhoto instanceof File || values.photo instanceof File) {
                const photoField = values.photo instanceof File ? "photo" : "profilePhoto";
                if (!savedRecord?._id) throw new Error("Save the record before uploading its photo.");
                await uploadManagementProfilePhoto(moduleKey, savedRecord._id, values[photoField], token);
            }
            toast.success(`${meta.singular} ${record ? "updated" : "created"}.`);
            onSaved();
        } catch (error) {
            toast.error(error.response?.data?.message || `Could not save ${meta.singular.toLowerCase()}.`);
        } finally { setSaving(false); }
    } });

    return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section role="dialog" aria-modal="true" className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{record ? "Update record" : "New record"}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{record ? `Edit ${meta.singular}` : `Add ${meta.singular}`}</h2></div><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></header>
            <FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">{meta.fields.map((item) => <FormField key={item.name} fieldMeta={item} formik={formik} moduleKey={moduleKey} record={record} token={token} options={item.type === "relation" ? lookups[item.related] || [] : []} />)}</div><footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : <><Check size={16} />Save record</>}</button></footer></form></FormikProvider>
        </section>
    </div>;
};

const ManagementRecordPhoto = ({ moduleKey, record, field, token }) => {
    const [src, setSrc] = useState("");
    useEffect(() => {
        let active = true;
        let objectUrl = "";
        const photo = record[field];
        if (!photo) { setSrc(""); return undefined; }
        if (!photo.startsWith("private:")) { setSrc(getAssetUrl(photo)); return undefined; }
        getManagementProfilePhoto(moduleKey, record._id, token).then(({ data }) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(data);
            setSrc(objectUrl);
        }).catch(() => { if (active) setSrc(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [moduleKey, record, field, token]);
    return src ? <img src={src} alt="Profile" className="h-9 w-9 rounded-full object-cover" /> : <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">—</span>;
};

const FormField = ({ fieldMeta, formik, moduleKey, record, token, options }) => {
    const { name, label, type, required } = fieldMeta;
    const error = formik.touched[name] && formik.errors[name];
    const opensPicker = ["date", "datetime-local", "time"].includes(type);
    const common = {
        id: name,
        name,
        onBlur: formik.handleBlur,
        onClick: opensPicker ? (event) => {
            if (typeof event.currentTarget.showPicker === "function") {
                try { event.currentTarget.showPicker(); } catch { /* The native picker may already be open. */ }
            }
        } : undefined,
        className: `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 ${opensPicker ? "cursor-pointer" : ""}`,
    };
    const value = formik.values[name];
    const wide = type === "textarea" || type === "photo";
    return <div className={`block ${wide ? "sm:col-span-2" : ""}`}>
        {type === "checkbox" ? <span className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"><input id={name} name={name} type="checkbox" checked={Boolean(value)} onChange={formik.handleChange} className="h-4 w-4 accent-indigo-600" />{label}</span> : <><label htmlFor={name} className="mb-1.5 block text-xs font-bold text-slate-600">{label}{required && <span className="ml-1 text-rose-500">*</span>}</label>{type === "photo" ? <PhotoUploadField name={name} value={value} moduleKey={moduleKey} record={record} token={token} formik={formik} /> : type === "file" ? <input id={name} name={name} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onBlur={formik.handleBlur} onChange={(event) => formik.setFieldValue(name, event.currentTarget.files?.[0] || null)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /> : type === "textarea" ? <textarea {...common} required={required} rows={3} value={value || ""} onChange={formik.handleChange} /> : type === "select" || type === "relation" ? <select {...common} required={required} value={value || ""} onChange={formik.handleChange}><option value="">Select {label.toLowerCase()}</option>{(type === "select" ? fieldMeta.options || [] : options.map((item) => ({ value: item._id, label: item.name || item.fullName || item.title || item.email || item._id }))).map((option) => <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>{typeof option === "string" ? option.replaceAll("-", " ") : option.label}</option>)}</select> : <input {...common} type={type} required={required} min={type === "number" ? "0" : undefined} value={value || ""} onChange={formik.handleChange} />}</>}
        {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </div>;
};

const PhotoUploadField = ({ name, value, moduleKey, record, token, formik }) => {
    const [preview, setPreview] = useState("");
    useEffect(() => {
        if (!(value instanceof File)) { setPreview(""); return undefined; }
        const url = URL.createObjectURL(value);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [value]);
    const field = name === "photo" ? "photo" : "profilePhoto";
    return <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {preview ? <img src={preview} alt="Selected photo preview" className="h-16 w-16 rounded-xl object-cover" /> : record?.[field] ? <ManagementRecordPhoto moduleKey={moduleKey} record={record} field={field} token={token} /> : <span className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No photo</span>}
            <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{preview ? "Choose another photo" : "Upload photo"}<input id={name} name={name} type="file" accept="image/jpeg,image/png,image/webp" onBlur={formik.handleBlur} onChange={(event) => formik.setFieldValue(name, event.currentTarget.files?.[0] || null)} className="sr-only" /></label>
            <span className="text-xs text-slate-500">JPG, PNG or WebP · up to 3 MB</span>
        </div>
        {value instanceof File && <button type="button" onClick={() => formik.setFieldValue(name, null)} className="text-xs font-semibold text-rose-600 hover:text-rose-800">Remove selected photo</button>}
    </div>;
};

const RecordViewModal = ({ record, moduleKey, token, title, onClose }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Record details</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{title}</h2></div><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">{Object.entries(record).filter(([key]) => !["_id", "__v", "createdBy", "markedBy", "uploadedBy", "updatedBy"].includes(key)).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-sm text-slate-700">{key === "photo" && value ? <ManagementRecordPhoto moduleKey={moduleKey} record={record} field={key} token={token} /> : <CellValue value={value} />}</p></div>)}</div><footer className="border-t border-slate-100 p-4 text-right"><button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Close</button></footer></section></div>;

const PROFILE_RELATIONS = {
    children: [
        { label: "Parent Information", fields: ["parentContact"] },
        { label: "Emergency Contacts", fields: ["emergencyContactName", "emergencyContactNumber", "emergencyMedicalInformation"] },
        { label: "Attendance History", module: "attendance", field: "child" },
        { label: "Fee / Payment History", module: "fees", field: "child" },
        { label: "Assigned Caregiver", fields: ["assignedCaregiver", "classGroup"] },
        { label: "Daily Activities", module: "dailyActivities", field: "child" },
        { label: "Medical Information", fields: ["bloodGroup", "medicalInformation", "allergies", "specialRequirements"] },
        { label: "Complaints / Notes", fields: ["specialNotes"] },
        { label: "Documents", module: "documents", field: "child" },
        { label: "Enrollment Information", fields: ["enrollmentDate", "status"] },
    ],
    parents: [
        { label: "Personal Information", fields: ["name", "status"] },
        { label: "Contact Information", fields: ["email", "phone"] },
        { label: "Address", fields: ["address"] },
        { label: "Emergency Contact", fields: ["emergencyContactName", "emergencyContactPhone"] },
        { label: "Children", module: "children", field: "parentContact" },
        { label: "Payment History", module: "fees", field: "parent" },
        { label: "Complaints", module: "complaints", field: "parent" },
        { label: "Requests", module: "requests", field: "parent" },
        { label: "Notifications", module: "notifications", field: "parent" },
    ],
    staff: [
        { label: "Personal Information", fields: ["fullName", "dateOfBirth", "gender", "address", "status"] },
        { label: "Contact Information", fields: ["email", "phone", "emergencyContactName", "emergencyContactPhone"] },
        { label: "Employment", fields: ["jobTitle", "role", "joiningDate", "qualification", "experienceYears", "assignedClass"] },
        { label: "Attendance", module: "staffAttendance", field: "staff" },
        { label: "Leave", module: "leave", field: "staff" },
        { label: "Documents", module: "documents", field: "staff" },
    ],
};
const ProfileTabsModal = ({ record, kind, token, onClose }) => {
    const tabs = PROFILE_RELATIONS[kind]; const [activeTab, setActiveTab] = useState(tabs[0]?.label || "Overview"); const [related, setRelated] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
    const section = tabs.find((tab) => tab.label === activeTab); const selectedId = record._id;
    useEffect(() => { let active = true; if (!section?.module) { setRelated([]); setError(""); return undefined; } setLoading(true); setError(""); const request = section.throughParent
        ? listManagementRecords("children", { page: 1, limit: 100, status: "all", parentContact: selectedId }, token).then(async ({ data }) => { const entries = await Promise.all((data.records || []).map((child) => listManagementRecords(section.module, { page: 1, limit: 100, status: "all", [section.field]: child._id }, token))); return entries.flatMap((entry) => entry.data.records || []); })
        : listManagementRecords(section.module, { page: 1, limit: 50, status: "all", [section.field]: selectedId }, token).then(({ data }) => data.records || []);
        request.then((rows) => { if (active) setRelated(rows); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load related records."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [section, selectedId, token]);
    const fields = kind === "children" ? ["name", "dateOfBirth", "gender", "bloodGroup", "parentContact", "assignedCaregiver", "classGroup", "enrollmentDate", "medicalInformation", "allergies", "emergencyContactName", "emergencyContactNumber", "specialRequirements", "specialNotes", "status"] : kind === "parents" ? ["name", "email", "phone", "address", "emergencyContactName", "emergencyContactPhone", "status"] : ["fullName", "email", "phone", "jobTitle", "role", "gender", "joiningDate", "qualification", "experienceYears", "assignedClass", "status"];
    const columns = section?.module ? MODULE_META[section.module].columns : [];
    const detailFields = section?.fields || fields;
    const detailRecords = detailFields.map((key) => [key, record[key]]).filter(([, value]) => value !== undefined && value !== "" && value !== null);
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{kind === "children" ? "Child" : kind === "parents" ? "Parent" : "Staff"} profile</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{record.name || record.fullName}</h2><p className="mt-1 text-sm text-slate-500">Review profile information and connected daycare records.</p></div><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></header><nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2">{tabs.map((tab) => <button key={tab.label} onClick={() => setActiveTab(tab.label)} className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold ${activeTab === tab.label ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{tab.label}</button>)}</nav>{!section?.module ? <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">{detailRecords.length ? detailRecords.map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-sm text-slate-700"><CellValue value={value} status={key === "status"} /></p></div>) : <p className="text-sm text-slate-500">No {activeTab.toLowerCase()} information is recorded yet.</p>}</div> : loading ? <p className="p-10 text-center text-sm text-slate-500">Loading {activeTab.toLowerCase()}…</p> : error ? <p role="alert" className="p-8 text-center text-sm text-rose-600">{error}</p> : related.length ? <div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{related.map((item) => <tr key={item._id}>{columns.map((column) => <td key={column} className="px-4 py-3 text-slate-600"><CellValue value={item[column]} status={column === "status"} /></td>)}</tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-slate-500">No {activeTab.toLowerCase()} records linked yet.</p>}<footer className="border-t border-slate-100 p-4 text-right"><button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Close</button></footer></section></div>;
};

const SETTING_FIELDS = [
    ["daycareName", "Daycare name", "text"], ["email", "Contact email", "email"], ["phone", "Phone", "tel"], ["alternatePhone", "Alternate phone", "tel"],
    ["address", "Street address", "text"], ["city", "City", "text"], ["province", "Province / state", "text"], ["country", "Country", "text"], ["postalCode", "Postal code", "text"],
    ["website", "Website", "url"], ["openingTime", "Opening time", "time"], ["closingTime", "Closing time", "time"],
    ["emergencyContact", "Emergency contact", "tel"], ["licenseNumber", "License number", "text"], ["defaultMonthlyFee", "Default monthly fee (Rs.)", "number"],
    ["registrationFee", "Registration fee (Rs.)", "number"], ["lateFee", "Late fee (Rs.)", "number"], ["attendanceGraceMinutes", "Attendance grace period (minutes)", "number"],
];
const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const SettingsPanel = ({ token, canEdit }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");
    const formik = useFormik({ enableReinitialize: true, initialValues: {
        ...Object.fromEntries(SETTING_FIELDS.map(([key]) => [key, settings?.[key] ?? ""])), logo: settings?.logo || "",
        description: settings?.description || "", workingDays: settings?.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        notifyParentsOnAttendance: settings?.notifyParentsOnAttendance ?? true,
    }, validationSchema: Yup.object({ daycareName: Yup.string().max(120).required("Daycare name is required."), email: Yup.string().email("Enter a valid email address."), website: Yup.string().url("Enter a valid URL.").nullable(), ...Object.fromEntries(["defaultMonthlyFee", "registrationFee", "lateFee", "attendanceGraceMinutes"].map((key) => [key, Yup.number().transform((value, original) => original === "" ? undefined : value).min(0, "Cannot be negative.").nullable()])) }), onSubmit: async (values) => {
        try { setSaving(true); const payload = { ...values, workingDays: values.workingDays }; const { data } = await saveDaycareSettings(payload, token); setSettings(data.settings); toast.success("Daycare settings saved."); }
        catch (error) { toast.error(error.response?.data?.message || "Could not save settings."); }
        finally { setSaving(false); }
    } });
    useEffect(() => { let active = true; getDaycareSettings(token).then(({ data }) => { if (active) setSettings(data.settings || {}); }).catch((error) => toast.error(error.response?.data?.message || "Could not load settings.")).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [token]);
    if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading daycare settings…</div>;
    const settingsTabs = [{ id: "profile", label: "Profile" }, { id: "operations", label: "Operations" }, { id: "billing", label: "Billing" }, { id: "notifications", label: "Notifications" }, { id: "security", label: "Security" }];
    const profileKeys = new Set(["daycareName", "email", "phone", "alternatePhone", "address", "city", "province", "country", "postalCode", "website", "emergencyContact", "licenseNumber"]);
    const feeKeys = new Set(["defaultMonthlyFee", "registrationFee", "lateFee"]);
    const visibleFields = activeTab === "profile" ? SETTING_FIELDS.filter(([key]) => profileKeys.has(key)) : activeTab === "operations" ? SETTING_FIELDS.filter(([key]) => ["openingTime", "closingTime", "attendanceGraceMinutes"].includes(key)) : activeTab === "billing" ? SETTING_FIELDS.filter(([key]) => feeKeys.has(key)) : [];
    return <div className="space-y-5"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Workspace setup</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Daycare settings</h2><p className="mt-1 text-sm text-slate-500">Manage this daycare’s workspace preferences.</p></div><nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2">{settingsTabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${activeTab === tab.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>{tab.label}</button>)}</nav>{activeTab === "security" ? <div className="p-5"><SecurityPanel token={token} /></div> : <FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{activeTab === "profile" && <><div className="sm:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-xs font-bold text-slate-600">Daycare logo</span><div className="flex flex-wrap items-center gap-4">{formik.values.logo && <img src={getAssetUrl(formik.values.logo)} alt="Daycare logo" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />}<label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{uploadingLogo ? "Uploading…" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingLogo} className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setUploadingLogo(true); const { data } = await uploadDaycarePhoto(file, token); formik.setFieldValue("logo", data.url); toast.success("Logo uploaded. Save settings to apply it."); } catch (error) { toast.error(error.response?.data?.message || "Could not upload logo."); } finally { setUploadingLogo(false); event.target.value = ""; } }} /></label><input aria-label="Logo URL" placeholder="Or paste a logo URL" name="logo" value={formik.values.logo} onChange={formik.handleChange} className="min-w-48 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div></div></>}{visibleFields.map(([name, label, type]) => <label key={name} className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input type={type} min={type === "number" ? "0" : undefined} name={name} value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" />{formik.touched[name] && formik.errors[name] && <span className="mt-1 block text-xs text-rose-600">{formik.errors[name]}</span>}</label>)}{activeTab === "profile" && <label className="block sm:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-xs font-bold text-slate-600">Description</span><textarea name="description" rows={3} value={formik.values.description} onChange={formik.handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>}{activeTab === "operations" && <fieldset className="sm:col-span-2 lg:col-span-3"><legend className="mb-2 text-xs font-bold text-slate-600">Working days</legend><div className="flex flex-wrap gap-2">{WEEK_DAYS.map((day) => <label key={day} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold capitalize ${formik.values.workingDays.includes(day) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}><input type="checkbox" className="sr-only" checked={formik.values.workingDays.includes(day)} onChange={(event) => formik.setFieldValue("workingDays", event.target.checked ? [...formik.values.workingDays, day] : formik.values.workingDays.filter((item) => item !== day))} />{day}</label>)}</div></fieldset>}{activeTab === "notifications" && <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3"><input type="checkbox" name="notifyParentsOnAttendance" checked={formik.values.notifyParentsOnAttendance} onChange={formik.handleChange} className="h-4 w-4 accent-indigo-600" />Notify parents when attendance is recorded</label>}</div><div className="flex justify-end border-t border-slate-100 p-5"><button disabled={!canEdit || saving || uploadingLogo} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : <><Check size={16} />Save settings</>}</button></div></form></FormikProvider>}</section></div>;
};

const SecurityPanel = ({ token }) => {
    const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
    const submit = async (values) => {
        try { await changeDaycarePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }, token); toast.success("Password changed successfully."); reset(); }
        catch (error) { toast.error(error.response?.data?.message || "Could not change password."); }
    };
    const fields = [["currentPassword", "Current password"], ["newPassword", "New password"], ["confirmPassword", "Confirm new password"]];
    return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Security</p><h3 className="mt-1 font-extrabold text-slate-900">Change password</h3></div><form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 p-5 sm:grid-cols-3">{fields.map(([name, label]) => <label key={name}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input type="password" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} {...register(name, { required: `${label} is required.`, ...(name === "newPassword" ? { minLength: { value: 8, message: "Use at least 8 characters." } } : {}), ...(name === "confirmPassword" ? { validate: (value) => value === watch("newPassword") || "Passwords must match." } : {}) })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" />{errors[name] && <span className="mt-1 block text-xs text-rose-600">{errors[name].message}</span>}</label>)}<div className="sm:col-span-3 flex justify-end"><button type="submit" disabled={isSubmitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{isSubmitting ? "Updating…" : "Update password"}</button></div></form></section>;
};

const REPORT_MODULES = ["children", "parents", "staff", "attendance", "staffAttendance", "fees", "leave", "complaints", "requests", "dailyActivities", "pickupPersons", "pickupLogs", "events", "documents"];
const REPORT_RELATIONS = { child: "children", parent: "parents", parentContact: "parents", staff: "staff", assignedStaff: "staff", classGroup: "classes" };
const REPORT_STATUSES = ["active", "inactive", "present", "absent", "late", "excused", "leave", "paid", "partially-paid", "pending", "overdue", "approved", "rejected", "in-progress", "resolved", "cancelled", "completed"];
const ReportsPanel = ({ token, overview }) => {
    const [report, setReport] = useState("children");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [filters, setFilters] = useState({ status: "all", child: "", parent: "", staff: "", assignedStaff: "", classGroup: "" });
    const [lookups, setLookups] = useState({});
    const [loadedRequestKey, setLoadedRequestKey] = useState("");
    const [rows, setRows] = useState([]);
    const [error, setError] = useState("");
    const reportFields = MODULE_META[report].fields.map((item) => item.name);
    const filterFields = ["child", "parent", "parentContact", "staff", "assignedStaff", "classGroup"].filter((field) => reportFields.includes(field));
    if (["attendance", "staffAttendance", "dailyActivities", "pickupLogs"].includes(report) && !filterFields.includes("classGroup")) filterFields.push("classGroup");
    const requestKey = JSON.stringify([report, token, dateFrom, dateTo, filters]);
    const loading = loadedRequestKey !== requestKey;
    useEffect(() => {
        let active = true;
        Promise.all(["children", "parents", "staff", "classes"].map(async (moduleName) => {
            const { data } = await listManagementRecords(moduleName, { page: 1, limit: 100, status: "all" }, token);
            return [moduleName, data.records || []];
        })).then((entries) => { if (active) setLookups(Object.fromEntries(entries)); })
            .catch(() => { if (active) toast.error("Some report filter options could not be loaded."); });
        return () => { active = false; };
    }, [token]);
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const all = []; let page = 1; let pages = 1;
                const params = { page: 1, limit: 100, from: dateFrom, to: dateTo, ...filters };
                do { const { data } = await listManagementRecords(report, { ...params, page }, token); all.push(...(data.records || [])); pages = data.pagination?.pages || 1; page += 1; } while (active && page <= pages && page <= 100);
                if (active) { setRows(all); setError(""); }
            } catch (requestError) { if (active) { setRows([]); setError(requestError.response?.data?.message || "Could not load this report."); } }
            finally { if (active) setLoadedRequestKey(requestKey); }
        };
        load();
        return () => { active = false; };
    }, [report, token, dateFrom, dateTo, filters, requestKey]);
    const download = () => {
        const columns = MODULE_META[report].columns;
        const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
        const content = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => { const value = row[column]; return escape(value && typeof value === "object" ? value.name || value.fullName || value.title || value.email || value._id : Array.isArray(value) ? value.join("; ") : value); }).join(","))].join("\r\n");
        const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `daycare-${report}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    };
    const printReport = () => {
        const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
        const columns = MODULE_META[report].columns;
        const cellText = (value) => value && typeof value === "object" ? value.name || value.fullName || value.title || value.email || value._id : Array.isArray(value) ? value.join(", ") : value;
        const table = `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(cellText(row[column]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        const popup = window.open("", "_blank", "width=1000,height=700");
        if (!popup) { toast.error("Allow pop-ups to print this report."); return; }
        popup.document.write(`<!doctype html><html><head><title>${escapeHtml(MODULE_META[report].title)} report</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:20px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;text-align:left;padding:8px}th{background:#f1f5f9}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(MODULE_META[report].title)} report</h1><p>${rows.length} records · Generated ${escapeHtml(new Date().toLocaleString())}</p>${table}<script>window.onload=()=>window.print()</script></body></html>`);
        popup.document.close();
    };
    const cards = [["Children", overview?.children], ["Parents", overview?.parents], ["Staff", overview?.staff], ["Pending fees", `Rs. ${MONEY.format(overview?.pendingFees || 0)}`], ["Collected fees", `Rs. ${MONEY.format(overview?.paidFees || 0)}`], ["Pending complaints", overview?.pendingComplaints]];
    return <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Insights</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Reports</h2><p className="mt-1 text-sm text-slate-500">Filter tenant-specific operational records, print or save a PDF, and export CSV.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-900">{value ?? 0}</p></div>)}</div></section><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Report type</span><select value={report} onChange={(event) => setReport(event.target.value)} className="min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400">{REPORT_MODULES.map((key) => <option key={key} value={key}>{MODULE_META[key].title}</option>)}</select></label><label className="block text-xs font-semibold text-slate-500">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-500">To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-500">Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="mt-1 block min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option>{REPORT_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label>{filterFields.map((fieldName) => { const moduleName = REPORT_RELATIONS[fieldName]; return <label key={fieldName} className="block text-xs font-semibold capitalize text-slate-500">{fieldName.replace(/([A-Z])/g, " $1")}<select value={filters[fieldName]} onChange={(event) => setFilters((current) => ({ ...current, [fieldName]: event.target.value }))} className="mt-1 block min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All {fieldName.replace(/([A-Z])/g, " $1")}</option>{(lookups[moduleName] || []).map((record) => <option key={record._id} value={record._id}>{record.name || record.fullName || record.email || "Record"}</option>)}</select></label>; })}<button onClick={() => { setDateFrom(""); setDateTo(""); setFilters({ status: "all", child: "", parent: "", staff: "", assignedStaff: "", classGroup: "" }); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Clear</button><button disabled={loading || !rows.length} onClick={printReport} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Print / Save PDF</button><button disabled={loading || !rows.length} onClick={download} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><ArrowDownToLine size={17} />Export CSV</button></div>{loading ? <p className="p-10 text-center text-sm text-slate-500">Preparing report…</p> : error ? <p role="alert" className="p-8 text-center text-sm text-rose-600">{error}</p> : <><div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">{rows.length} records available</div>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{MODULE_META[report].columns.map((column) => <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.slice(0, 20).map((row) => <tr key={row._id}>{MODULE_META[report].columns.map((column) => <td key={column} className="px-4 py-3"><CellValue value={row[column]} /></td>)}</tr>)}</tbody></table></div> : <EmptyState icon={FileText} title="No report records" detail="Records will appear here as your daycare uses the dashboard." />}</>}</section></div>;
};

const AccessPanel = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffLoading, setStaffLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [editingPermissions, setEditingPermissions] = useState(null);
    const [permissionDraft, setPermissionDraft] = useState({});
    const [actionModal, setActionModal] = useState(null);
    const initialValues = { staffId: "", name: "", email: "", phone: "", role: "caregiver", password: "" };
    const formik = useFormik({ initialValues, validationSchema: Yup.object({ staffId: Yup.string().required("Select a staff member."), name: Yup.string().trim().min(2).required("Name is required."), email: Yup.string().email().required("Email is required."), phone: Yup.string().trim().required("Phone is required."), role: Yup.string().oneOf(["manager", "caregiver"]).required(), password: Yup.string().min(8, "Use at least 8 characters.").required("Temporary password is required.") }), onSubmit: async (values, helpers) => {
        try { setSaving(true); await createDaycareUser(values, token); toast.success("Login created and linked to the staff profile."); helpers.resetForm(); setRefresh((item) => item + 1); }
        catch (error) { toast.error(error.response?.data?.message || "Could not create this account."); }
        finally { setSaving(false); }
    } });
    useEffect(() => { let active = true; Promise.all([listDaycareUsers(token), listManagementRecords("staff", { limit: 100, status: "active" }, token)]).then(([usersResult, staffResult]) => { if (!active) return; setUsers(usersResult.data.users || []); setStaffMembers((staffResult.data.records || []).filter((member) => !member.userAccount && ["manager", "caregiver"].includes(member.role))); }).catch((error) => toast.error(error.response?.data?.message || "Could not load staff accounts.")).finally(() => { if (active) { setLoading(false); setStaffLoading(false); } }); return () => { active = false; }; }, [token, refresh]);
    const changeUser = async (user, changes) => { try { await updateDaycareUser(user.user, changes, token); toast.success("Account updated."); setRefresh((item) => item + 1); return true; } catch (error) { toast.error(error.response?.data?.message || "Could not update account."); return false; } };
    const beginPermissions = (user) => {
        const defaults = user.role === "manager"
            ? Object.fromEntries(["dashboard", "children", "parents", "staff", "classes", "attendance", "staffAttendance", "dailyActivities", "fees", "leave", "complaints", "requests", "pickupPersons", "pickupLogs", "notifications", "announcements", "events", "documents", "activity", "reports", "settings"].map((key) => [key, key === "dashboard" || key === "reports" || key === "activity" || key === "settings" ? ["read"] : ["read", "create", "update", ...(key === "children" || key === "parents" || key === "staff" || key === "classes" || key === "dailyActivities" ? ["delete"] : [])]]))
            : { dashboard: ["read"], children: ["read"], attendance: ["read", "create", "update"], dailyActivities: ["read", "create", "update"], pickupPersons: ["read"], pickupLogs: ["read", "create"], events: ["read"], announcements: ["read"] };
        setPermissionDraft(user.permissions && Object.keys(user.permissions).length ? Object.fromEntries(Object.entries(user.permissions).map(([key, value]) => [key, [...value]])) : defaults);
        setEditingPermissions(user);
    };
    const togglePermission = (moduleKey, action) => setPermissionDraft((current) => {
        const actions = current[moduleKey] || [];
        return { ...current, [moduleKey]: actions.includes(action) ? actions.filter((item) => item !== action) : [...actions, action] };
    });
    const defaults = { manager: "Children, parents, staff, classes, attendance, fees, requests, reports and center operations", caregiver: "Assigned children, attendance, daily care and pickup records" };
    const fieldClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";
    return <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Staff access</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Users & permissions</h2><p className="mt-1 text-sm text-slate-500">Create tenant-bound manager and caregiver sign-ins. Permissions are checked by the API on every request.</p><div className="mt-4 grid gap-3 rounded-xl bg-indigo-50 p-4 sm:grid-cols-2"><div><p className="text-sm font-bold text-indigo-900">Manager</p><p className="mt-1 text-xs leading-5 text-indigo-800">{defaults.manager}</p></div><div><p className="text-sm font-bold text-indigo-900">Caregiver</p><p className="mt-1 text-xs leading-5 text-indigo-800">{defaults.caregiver}</p></div></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h3 className="font-extrabold text-slate-900">Add staff login</h3><p className="mt-1 text-sm text-slate-500">A matching staff profile is created in this daycare database.</p></div><FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Role</span><select className={fieldClass} name="role" value={formik.values.role} onChange={(event) => { formik.handleChange(event); formik.setFieldValue("staffId", ""); formik.setFieldValue("name", ""); formik.setFieldValue("email", ""); formik.setFieldValue("phone", ""); }}><option value="caregiver">Caregiver</option><option value="manager">Manager</option></select></label><label><span className={"mb-1.5 block text-xs font-bold text-slate-600"}>Full name</span><select className={fieldClass} name="staffId" value={formik.values.staffId} onChange={(event) => { const staff = staffMembers.find((member) => member._id === event.target.value); formik.setFieldValue("staffId", staff?._id || ""); formik.setFieldValue("name", staff?.fullName || ""); formik.setFieldValue("email", staff?.email || ""); formik.setFieldValue("phone", staff?.phone || ""); }}><option value="">{staffLoading ? "Loading staff..." : staffMembers.some((member) => member.role === formik.values.role) ? "Select a staff profile" : `No unlinked ${formik.values.role} profiles found`}</option>{staffMembers.filter((member) => member.role === formik.values.role).map((member) => <option key={member._id} value={member._id}>{member.fullName}</option>)}</select>{formik.touched.staffId && formik.errors.staffId && <span className="mt-1 block text-xs text-rose-600">{formik.errors.staffId}</span>}</label>{[["email", "Email", "email"], ["phone", "Phone", "tel"], ["password", "Temporary password", "password"]].map(([name, label, type]) => <label key={name}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input className={fieldClass} type={type} name={name} value={formik.values[name]} readOnly={name === "phone"} onChange={formik.handleChange} onBlur={formik.handleBlur} autoComplete="off" />{formik.touched[name] && formik.errors[name] && <span className="mt-1 block text-xs text-rose-600">{formik.errors[name]}</span>}</label>)}<div className="flex items-end"><button type="submit" disabled={saving || staffLoading || !formik.values.staffId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"><Plus size={16} />{saving ? "Creating…" : "Create staff login"}</button></div></form></FormikProvider></section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h3 className="font-extrabold text-slate-900">Daycare accounts</h3><p className="mt-1 text-sm text-slate-500">These accounts are linked only to this tenant.</p></div>{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading accounts…</p> : users.length ? <div className="divide-y divide-slate-100">{users.map((user) => <article key={user.user} className="flex flex-col gap-3 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><UserCog size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{user.email}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{user.role} · {user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleString()}` : "Never signed in"}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{defaults[user.role] || "Custom API permissions"}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.isActive ? "Active" : "Inactive"}</span><button onClick={() => beginPermissions(user)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Permissions</button><button onClick={() => changeUser(user, { isActive: !user.isActive })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{user.isActive ? "Deactivate" : "Activate"}</button><button onClick={() => setActionModal({ title: "Reset temporary password", description: `Enter a new temporary password for ${user.email}. Use at least 8 characters.`, inputLabel: "New temporary password", inputPlaceholder: "At least 8 characters", inputType: "password", minLength: 8, required: true, confirmLabel: "Update password", tone: "primary", onConfirm: async (password) => { const updated = await changeUser(user, { password }); if (updated) setActionModal(null); else throw new Error("Password update failed."); } })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset password</button></div></div>{editingPermissions?.user === user.user && <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Customize module access</p><button onClick={() => setEditingPermissions(null)} className="rounded p-1 text-slate-500 hover:bg-white" aria-label="Close permissions"><X size={16} /></button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[...NAV.filter((item) => !["users", "overview"].includes(item.key)), { ...NAV.find((item) => item.key === "overview"), key: "dashboard" }].map((item) => <div key={item.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"><span className="text-xs font-semibold text-slate-700">{item.label}</span><div className="flex gap-2">{["read", "create", "update", "delete"].map((action) => <label key={action} title={action} className="flex items-center gap-1 text-[10px] capitalize text-slate-500"><input type="checkbox" checked={(permissionDraft[item.key] || []).includes(action)} onChange={() => togglePermission(item.key, action)} className="accent-indigo-600" />{action[0]}</label>)}</div></div>)}</div><div className="mt-3 flex justify-end"><button onClick={async () => { if (await changeUser(user, { permissions: permissionDraft })) setEditingPermissions(null); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Save permissions</button></div></div>}</article>)}</div> : <EmptyState icon={UserCog} title="No staff accounts yet" detail="Create a manager or caregiver login to delegate access." />}</section><ActionModal open={Boolean(actionModal)} {...actionModal} onClose={() => setActionModal(null)} /></div>;
};

export default DaycareManagementDashboard;
