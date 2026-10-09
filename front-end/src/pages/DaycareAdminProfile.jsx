import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ArrowLeft, Camera, Check, UserRound, X } from "lucide-react";
import { deleteDaycareAccountPhoto, getDaycareAccountPhoto, getDaycareAccountProfile, updateDaycareAccountProfile, uploadDaycareAccountPhoto } from "../api/managementApi";
import { clearCredentials, selectAuth, updateUser } from "../redux/slices/authSlice";
import { getDaycareDashboardPath } from "../utils/daycareRoutes";

const DaycareAdminProfile = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { token, user: authUser } = useSelector(selectAuth);
    const photoInput = useRef(null);
    const [profile, setProfile] = useState(authUser || {});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [photoSaving, setPhotoSaving] = useState(false);
    const [photoUrl, setPhotoUrl] = useState("");

    useEffect(() => {
        let active = true;
        getDaycareAccountProfile(token).then(({ data }) => {
            if (!active) return;
            setProfile(data.user);
            dispatch(updateUser(data.user));
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...storedUser, ...data.user }));
        }).catch((error) => {
            toast.error(error.response?.data?.message || "Could not load your account profile.");
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [dispatch, token]);

    useEffect(() => {
        let active = true;
        let objectUrl = "";
        if (!profile.profilePhoto) { setPhotoUrl(""); return undefined; }
        getDaycareAccountPhoto(token).then(({ data }) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(data);
            setPhotoUrl(objectUrl);
        }).catch(() => { if (active) setPhotoUrl(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [profile.profilePhoto, token]);

    const commitProfile = (updated) => {
        setProfile((current) => ({ ...current, ...updated }));
        dispatch(updateUser(updated));
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...storedUser, ...updated }));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const { data } = await updateDaycareAccountProfile({ name: profile.name, phone: profile.phone }, token);
            commitProfile(data.user);
            toast.success("Admin profile saved.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save your profile.");
        } finally { setSaving(false); }
    };

    const uploadPhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 3 * 1024 * 1024) {
            toast.error("Choose a JPG, PNG, or WebP image up to 3 MB.");
            return;
        }
        setPhotoSaving(true);
        try {
            const { data } = await uploadDaycareAccountPhoto(file, token);
            commitProfile({ profilePhoto: data.profilePhoto });
            toast.success("Profile photo uploaded.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not upload your profile photo.");
        } finally { setPhotoSaving(false); }
    };

    const removePhoto = async () => {
        setPhotoSaving(true);
        try {
            await deleteDaycareAccountPhoto(token);
            commitProfile({ profilePhoto: "" });
            toast.success("Profile photo removed.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not remove your profile photo.");
        } finally { setPhotoSaving(false); }
    };

    const initials = (profile.name || "D").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(clearCredentials());
        navigate("/", { replace: true });
    };

    return <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3"><button type="button" onClick={() => navigate(getDaycareDashboardPath(authUser?.role))} aria-label="Back to daycare workspace" className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"><ArrowLeft size={19} /></button><div><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Daycare account</p><h1 className="text-lg font-extrabold text-slate-900">{authUser?.role === "daycare" ? "Admin profile" : `${authUser?.role || "Staff"} profile`}</h1></div></div>
                <button onClick={logout} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700">Log out</button>
            </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <section className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8"><p className="text-xs font-bold uppercase tracking-wider text-sky-100">Your account</p><h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Manage your administrator profile</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50">These details belong to your daycare login. Daycare information and public listing details are managed separately in workspace settings.</p></section>
            {loading ? <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-500">Loading profile…</div> : <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
                <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Profile photo</p><div className="mt-5 flex flex-col items-center text-center"><div className="relative flex h-36 w-36 items-center justify-center overflow-visible rounded-full bg-indigo-50 text-3xl font-extrabold text-indigo-700 ring-4 ring-indigo-50">{photoUrl ? <img src={photoUrl} alt={`${profile.name} profile`} className="h-full w-full rounded-full object-cover" /> : initials || <UserRound size={40} />}{profile.profilePhoto && <button type="button" onClick={removePhoto} disabled={photoSaving} aria-label="Remove profile photo" title="Remove profile photo" className="absolute right-0 top-0 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 disabled:opacity-60"><span aria-hidden="true" className="block text-2xl font-bold leading-none">{"\u00d7"}</span></button>}</div><p className="mt-4 text-lg font-bold text-slate-900">{profile.name}</p><p className="mt-1 text-sm capitalize text-slate-500">{profile.role === "daycare" ? "Daycare administrator" : profile.role}</p><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="sr-only" /><button type="button" onClick={() => photoInput.current?.click()} disabled={photoSaving} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"><Camera size={16} />{photoSaving ? "Uploading…" : profile.profilePhoto ? "Change photo" : "Upload photo"}</button><p className="mt-2 text-xs text-slate-400">JPG, PNG or WebP. Maximum 3 MB.</p></div></section>
                <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Account details</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Administrator information</h2><p className="mt-1 text-sm text-slate-500">Update your personal contact information used by this account.</p></div><form onSubmit={saveProfile} className="space-y-5">
                    <label className="block text-sm font-semibold text-slate-700">Full name<input required minLength={2} maxLength={50} value={profile.name || ""} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
                    <label className="block text-sm font-semibold text-slate-700">Contact number<input required maxLength={30} value={profile.phone || ""} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /></label>
                    <label className="block text-sm font-semibold text-slate-700">Login email<input readOnly value={profile.email || ""} className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-normal text-slate-500" /><span className="mt-1 block text-xs font-normal text-slate-400">The email used to sign in cannot be changed here.</span></label>
                    <label className="block text-sm font-semibold text-slate-700">Account role<input readOnly value={profile.role === "daycare" ? "Daycare administrator" : profile.role || ""} className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-normal capitalize text-slate-500" /></label>
                    <div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : <><Check size={17} />Save profile</>}</button></div>
                </form></section>
            </div>}
        </main>
    </div>;
};

export default DaycareAdminProfile;
