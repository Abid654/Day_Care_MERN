import { useEffect, useMemo, useState } from "react";
import { FormikProvider, useFormik, useFormikContext } from "formik";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAssetUrl } from "../api/client";
import { getDaycareProfile, saveDaycareProfile, uploadDaycarePhoto } from "../api/daycareApi";
import { daycareStepFields, daycareStepSchemas } from "../validation/daycareSchemas";
import {
    Bell,
    CalendarDays,
    Camera,
    CheckCircle2,
    ChevronRight,
    Clock3,
    ClipboardCheck,
    LogOut,
    MapPin,
    Plus,
    ShieldCheck,
    Star,
    Users,
    Wallet,
} from "lucide-react";

const DaycareDashboard = () => {
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileStep, setProfileStep] = useState(0);
    const [profileSaving, setProfileSaving] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [listingStatus, setListingStatus] = useState("pending");
    const { user, token } = useMemo(() => {
        try {
            return { user: JSON.parse(localStorage.getItem("user") || "null"), token: localStorage.getItem("token") };
        } catch {
            return { user: null, token: null };
        }
    }, []);
    const formik = useFormik({
        initialValues: { daycareName: "", description: "", address: "", area: "", phone: "", fee: "", services: [], qualifications: "", training: "", facilities: "", paymentOptions: "", images: [], experienceYears: "", medicalStaffCount: "", nursingStaffCount: "", cctv: false, nursingFacilities: false },
        validationSchema: daycareStepSchemas[profileStep],
        validateOnChange: false,
        onSubmit: submitProfile,
    });
    const profile = formik.values;
    const { setValues } = formik;

    useEffect(() => {
        if (!token || user?.role !== "daycare") navigate("/", { replace: true });
    }, [navigate, token, user]);

    useEffect(() => {
        if (!token || user?.role !== "daycare") return;
        getDaycareProfile(token)
            .then(({ data }) => {
                if (data.profile) setValues((current) => ({ ...current, ...data.profile, fee: data.profile.fee ?? "", services: data.profile.services || [], qualifications: (data.profile.qualifications || []).join(", "), training: (data.profile.training || []).join(", "), facilities: (data.profile.facilities || []).join(", "), paymentOptions: (data.profile.paymentOptions || []).join(", "), images: data.profile.images || [] }));
                else setValues((current) => ({ ...current, daycareName: user.name || "", phone: user.phone || "" }));
                setListingStatus(data.listingStatus || "pending");
            })
            .catch(() => toast.error("Could not load your daycare profile."));
    }, [setValues, token, user]);

    if (!token || user?.role !== "daycare") return null;

    const firstName = user.name?.trim().split(/\s+/)[0] || "there";
    const initials = user.name?.trim().split(/\s+/).slice(0, 2)
        .map((part) => part[0]?.toUpperCase()).join("") || "D";
    const today = new Intl.DateTimeFormat("en", {
        weekday: "long", month: "long", day: "numeric",
    }).format(new Date());
    const showComingSoon = () => toast.info("Daycare management tools are coming soon.");
    const openProfile = () => { setProfileStep(0); formik.setTouched({}); formik.setErrors({}); setProfileOpen(true); };
    const updateProfileField = formik.handleChange;
    const updateProfileList = formik.handleChange;
    const addPhotos = (event) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 3 * 1024 * 1024);
        if (validFiles.length !== files.length) toast.error("Choose JPG, PNG, or WebP images under 3 MB each.");
        const remaining = Math.max(0, 10 - profile.images.length - selectedPhotos.length);
        if (validFiles.length > remaining) toast.info(`You can add ${remaining} more photo${remaining === 1 ? "" : "s"}.`);
        setSelectedPhotos((current) => [...current, ...validFiles.slice(0, remaining).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
        event.target.value = "";
    };
    const removeSelectedPhoto = (index) => setSelectedPhotos((current) => {
        URL.revokeObjectURL(current[index].preview);
        return current.filter((_, photoIndex) => photoIndex !== index);
    });
    const toggleService = (service) => formik.setFieldValue("services", profile.services.includes(service) ? profile.services.filter((item) => item !== service) : [...profile.services, service]);
    const nextProfileStep = async () => {
        const errors = await formik.validateForm();
        const currentStepFields = daycareStepFields[profileStep];
        formik.setTouched({ ...formik.touched, ...Object.fromEntries(currentStepFields.map((field) => [field, true])) }, false);
        if (currentStepFields.some((field) => errors[field])) return;
        setProfileStep((step) => Math.min(step + 1, 3));
    };
    async function submitProfile(values, { setValues }) {
        try {
            setProfileSaving(true);
            const toList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
            const newPhotos = await Promise.all(selectedPhotos.map(async ({ file }) => {
                const { data } = await uploadDaycarePhoto(file, token);
                return data.url;
            }));
            const profileData = { ...values, experienceYears: Number(values.experienceYears || 0), medicalStaffCount: Number(values.medicalStaffCount || 0), nursingStaffCount: Number(values.nursingStaffCount || 0), fee: Number(values.fee), qualifications: toList(values.qualifications), training: toList(values.training), facilities: toList(values.facilities), paymentOptions: toList(values.paymentOptions), images: [...values.images, ...newPhotos] };
            const { data } = await saveDaycareProfile(profileData, token);
            selectedPhotos.forEach(({ preview }) => URL.revokeObjectURL(preview));
            setSelectedPhotos([]);
            setValues((current) => ({ ...current, ...data.profile, fee: data.profile.fee, qualifications: (data.profile.qualifications || []).join(", "), training: (data.profile.training || []).join(", "), facilities: (data.profile.facilities || []).join(", "), paymentOptions: (data.profile.paymentOptions || []).join(", "), images: data.profile.images || [] }));
            setListingStatus("pending");
            setProfileOpen(false);
            toast.success(data.message);
        } catch (error) {
            const message = error.response?.data?.errors?.join(". ") || error.response?.data?.message || "Could not submit daycare profile.";
            toast.error(message);
        } finally {
            setProfileSaving(false);
        }
    }
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
            <header className="sticky top-0 z-20 border-b border-indigo-100/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                    <a href="#overview" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xl text-white shadow-md shadow-sky-200">🏠</div><div><p className="text-lg font-bold leading-tight">Online Daycare</p><p className="text-xs text-slate-500">Provider portal</p></div></a>
                    <nav className="hidden items-center gap-1 rounded-2xl bg-slate-50 p-1 text-sm font-semibold md:flex"><a className="rounded-xl bg-white px-4 py-2 text-indigo-700 shadow-sm" href="#overview">Overview</a><a className="rounded-xl px-4 py-2 text-slate-500 transition hover:bg-white hover:text-indigo-700" href="#attendance">Attendance</a><a className="rounded-xl px-4 py-2 text-slate-500 transition hover:bg-white hover:text-indigo-700" href="#reports">Reports</a></nav>
                    <div className="flex items-center gap-2 sm:gap-4"><button onClick={showComingSoon} aria-label="Notifications" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"><Bell size={19} /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{initials}</div><span className="hidden max-w-40 truncate text-sm font-semibold sm:block">{user.name}</span></div><button onClick={handleLogout} aria-label="Sign out" title="Sign out" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><LogOut size={18} /></button></div>
                </div>
            </header>

            <main id="overview" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                <section className="mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-100 sm:p-9">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center"><div><p className="mb-3 text-sm font-semibold text-sky-100">{today} · PROVIDER DASHBOARD</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, {firstName} <span aria-hidden="true">👋</span></h1><p className="mt-3 max-w-2xl leading-7 text-sky-50">Your daycare workspace for families, daily care, and centre operations.</p></div><button onClick={openProfile} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl lg:self-auto"><Plus size={18} /> {profile.daycareName ? "Edit daycare profile" : "Build your daycare profile"}</button></div>
                    <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><ClipboardCheck size={20} /></div><div className="min-w-48 flex-1"><div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold">Profile review</p><span className="text-xs text-sky-100">{profile.daycareName ? "Details submitted" : "Profile details needed"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25"><div className={`h-full rounded-full bg-white ${profile.daycareName ? "w-2/3" : "w-1/12"}`} /></div></div><span className="rounded-full bg-amber-300/20 px-3 py-1.5 text-xs font-bold capitalize text-amber-100">{listingStatus}</span></div>
                </section>

                <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard icon={<Users size={19} />} label="Children in care" value="—" detail="Attendance data will appear here" color="sky" />
                    <SummaryCard icon={<CalendarDays size={19} />} label="Upcoming visits" value="0" detail="No appointments scheduled" color="indigo" />
                    <SummaryCard icon={<Wallet size={19} />} label="Monthly income" value="—" detail="Add fee and payment details" color="emerald" />
                    <SummaryCard icon={<Star size={19} />} label="Parent reviews" value="—" detail="Reviews appear after feedback" color="amber" />
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
                    <div id="profile" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Get discovered</p><h2 className="mt-1 text-xl font-bold text-slate-900">Complete your daycare profile</h2><p className="mt-1 text-sm text-slate-500">Give families the details they need to choose care.</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><MapPin size={19} /></div></div>
                        <div className="space-y-3">
                            <ProfileStep icon={<MapPin size={18} />} title="Centre details & location" detail="Name, address, service area, and contact details" onClick={openProfile} />
                            <ProfileStep icon={<ShieldCheck size={18} />} title="Qualifications & experience" detail="Training, certifications, and childcare experience" onClick={openProfile} />
                            <ProfileStep icon={<Users size={18} />} title="Care, capacity & facilities" detail="Home or centre care, CCTV, and staff" onClick={openProfile} />
                            <ProfileStep icon={<Wallet size={18} />} title="Fees & payment options" detail="Set rates and explain how families can pay" onClick={openProfile} />
                            <ProfileStep icon={<Camera size={18} />} title="Facility photos" detail="Add photo URLs for your daycare" onClick={openProfile} />
                        </div>
                    </div>

                    <div id="attendance" className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Daily operations</p><h2 className="mt-1 text-xl font-bold text-slate-900">Today’s attendance</h2><p className="mt-1 text-sm text-slate-500">Track arrivals and pickups at your centre.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Clock3 size={19} /></div></div>
                        <div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">CHECKED IN</p><p className="mt-2 text-2xl font-extrabold text-emerald-800">—</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">EXPECTED</p><p className="mt-2 text-2xl font-extrabold text-amber-800">—</p></div></div>
                        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Users size={20} /></div><h3 className="font-semibold text-slate-800">Attendance list is empty</h3><p className="mt-1 max-w-xs text-sm leading-5 text-slate-500">Once children are enrolled, check-in and pickup activity will show here.</p></div>
                        <button onClick={showComingSoon} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-indigo-600">View attendance history <ChevronRight size={16} /></button>
                    </div>
                </section>

                <section id="reports" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Centre finances</p><h2 className="mt-1 text-xl font-bold text-slate-900">Income & expenses</h2><p className="mt-1 text-sm text-slate-500">Review centre performance by month or date range.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Wallet size={19} /></div></div><div className="grid gap-3 sm:grid-cols-2"><FinanceTile label="Income this month" value="—" accent="emerald" /><FinanceTile label="Expenses this month" value="—" accent="rose" /></div><button onClick={showComingSoon} className="mt-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700">View financial reports <ChevronRight size={15} className="ml-1 inline" /></button></div>
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Family feedback</p><h2 className="mt-1 text-xl font-bold text-slate-900">Reviews & child notes</h2><p className="mt-1 text-sm text-slate-500">Keep observations and family feedback organized.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Star size={19} /></div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400"><ClipboardCheck size={17} /></div><div><p className="font-semibold text-slate-800">No notes or reviews yet</p><p className="mt-1 text-sm leading-5 text-slate-500">Child observations and parent reviews will be available when families are connected.</p></div></div></div><button onClick={showComingSoon} className="mt-4 text-sm font-semibold text-sky-600 hover:text-indigo-600">Open care records <ChevronRight size={15} className="ml-1 inline" /></button></div>
                </section>

                <section className="mt-6 flex items-start gap-4 rounded-3xl border border-sky-100 bg-sky-50/70 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600"><ShieldCheck size={20} /></div><div><h2 className="font-bold text-slate-900">Provider account</h2><p className="mt-1 text-sm leading-6 text-slate-600">Signed in as {user.email}. Finish your centre profile to prepare it for review and help parents understand the care you offer.</p></div><CheckCircle2 size={19} className="ml-auto shrink-0 text-emerald-600" /></section>
            </main>
            {profileOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4">
                <FormikProvider value={formik}><form onSubmit={formik.handleSubmit} noValidate className="flex max-h-[calc(100vh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
                    <header className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Provider listing · Step {profileStep + 1} of 4</p><h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{["Centre details", "Experience & training", "Care & facilities", "Fees & photos"][profileStep]}</h2><p className="mt-1 text-sm text-slate-500">Complete your details for admin review.</p></div><button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100" aria-label="Close">×</button></div><div className="mt-4 flex gap-2">{[0, 1, 2, 3].map((step) => <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= profileStep ? "bg-sky-500" : "bg-slate-100"}`} />)}</div></header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                        {profileStep === 0 && <div className="grid gap-4 sm:grid-cols-2"><ProfileInput label="Daycare name" name="daycareName" value={profile.daycareName} onChange={updateProfileField} /><ProfileInput label="Contact phone" name="phone" value={profile.phone} onChange={updateProfileField} /><ProfileInput label="Address" name="address" value={profile.address} onChange={updateProfileField} /><ProfileInput label="Area / city" name="area" value={profile.area} onChange={updateProfileField} /><label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-slate-700">Description</span><textarea name="description" value={profile.description || ""} onChange={updateProfileField} onBlur={formik.handleBlur} rows="4" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" />{formik.touched.description && formik.errors.description && <FieldError>{formik.errors.description}</FieldError>}</label></div>}
                        {profileStep === 1 && <div className="grid gap-4 sm:grid-cols-2"><ProfileInput label="Experience (years)" name="experienceYears" type="number" min="0" value={profile.experienceYears || ""} onChange={updateProfileField} /><ProfileInput label="Qualifications (comma separated)" name="qualifications" value={profile.qualifications} onChange={updateProfileList} /><ProfileInput label="Training (comma separated)" name="training" value={profile.training} onChange={updateProfileList} /></div>}
                        {profileStep === 2 && <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">Services offered</span><div className="flex flex-wrap gap-5">{[["home", "Home based"], ["facility", "Daycare facility"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={profile.services.includes(value)} onChange={() => toggleService(value)} />{label}</label>)}</div>{formik.touched.services && formik.errors.services && <FieldError>{formik.errors.services}</FieldError>}</div><ProfileInput label="Facilities (comma separated)" name="facilities" value={profile.facilities} onChange={updateProfileList} /><ProfileInput label="Medical staff count" name="medicalStaffCount" type="number" min="0" value={profile.medicalStaffCount || ""} onChange={updateProfileField} /><ProfileInput label="Nursing staff count" name="nursingStaffCount" type="number" min="0" value={profile.nursingStaffCount || ""} onChange={updateProfileField} /><div className="flex flex-col gap-3 sm:justify-center"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={Boolean(profile.cctv)} onChange={(event) => formik.setFieldValue("cctv", event.target.checked)} /> CCTV available</label><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={Boolean(profile.nursingFacilities)} onChange={(event) => formik.setFieldValue("nursingFacilities", event.target.checked)} /> Nursing facilities</label></div></div>}
                        {profileStep === 3 && <div className="grid gap-5 sm:grid-cols-2"><ProfileInput label="Monthly fee (Rs.)" name="fee" type="number" min="0" value={profile.fee} onChange={updateProfileField} /><ProfileInput label="Payment options (comma separated)" name="paymentOptions" value={profile.paymentOptions} onChange={updateProfileList} /><div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Upload daycare photos <span className="font-normal text-slate-400">(up to 10, JPG/PNG/WebP, 3 MB each)</span></label><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} className="block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:font-semibold file:text-sky-700 hover:file:bg-sky-100" /><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{profile.images.map((image, index) => <div key={image} className="relative overflow-hidden rounded-xl border border-slate-200"><img src={getAssetUrl(image)} alt={`Daycare photo ${index + 1}`} className="h-28 w-full object-cover" /><span className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Uploaded</span></div>)}{selectedPhotos.map(({ preview, file }, index) => <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-sky-200"><img src={preview} alt={file.name} className="h-28 w-full object-cover" /><button type="button" onClick={() => removeSelectedPhoto(index)} className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white" aria-label="Remove photo">×</button></div>)}</div><p className="mt-2 text-xs text-slate-500">{profile.images.length + selectedPhotos.length} of 10 photos selected. They will be included in your parent listing after approval.</p></div></div>}
                    </div>
                    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7"><button type="button" onClick={() => profileStep === 0 ? setProfileOpen(false) : setProfileStep((step) => step - 1)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">{profileStep === 0 ? "Cancel" : "Back"}</button>{profileStep < 3 ? <button type="button" onClick={nextProfileStep} className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Continue</button> : <button type="submit" disabled={profileSaving} className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{profileSaving ? "Submitting…" : "Submit for review"}</button>}</footer>
                </form></FormikProvider>
            </div>}
        </div>
    );
};

const colorStyles = { sky: "bg-sky-50 text-sky-600", indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" };
const SummaryCard = ({ icon, label, value, detail, color }) => <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[color]}`}>{icon}</span></div><p className="text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
const ProfileStep = ({ icon, title, detail, onClick }) => <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p></div><Plus size={17} className="shrink-0 text-slate-300 transition group-hover:text-sky-600" /></button>;
const ProfileInput = ({ label, name, value, onChange, type = "text", ...props }) => {
    const { handleBlur, touched, errors } = useFormikContext();
    return <label><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span><input name={name} type={type} value={value ?? ""} onChange={onChange} onBlur={handleBlur} {...props} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-400" />{touched[name] && errors[name] && <FieldError>{errors[name]}</FieldError>}</label>;
};
const FieldError = ({ children }) => <span className="mt-1.5 block text-xs font-medium text-rose-600">{children}</span>;
const FinanceTile = ({ label, value, accent }) => <div className={`rounded-2xl p-4 ${accent === "emerald" ? "bg-emerald-50" : "bg-rose-50"}`}><p className={`text-xs font-semibold ${accent === "emerald" ? "text-emerald-700" : "text-rose-700"}`}>{label}</p><p className={`mt-2 text-2xl font-extrabold ${accent === "emerald" ? "text-emerald-800" : "text-rose-800"}`}>{value}</p><p className="mt-1 text-xs text-slate-500">No report data yet</p></div>;

export default DaycareDashboard;

