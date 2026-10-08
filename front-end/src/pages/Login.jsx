// import { useState } from "react";
// import { Link } from "react-router-dom";
// import { Eye, EyeOff } from "lucide-react";

// const Login = () => {
//     const [formData, setFormData] = useState({
//         email: "",
//         password: "",
//     });

//     const [showPassword, setShowPassword] = useState(false);

//     const handleChange = (e) => {
//         const { name, value } = e.target;

//         setFormData((prev) => ({
//             ...prev,
//             [name]: value,
//         }));
//     };

//     const handleSubmit = (e) => {
//         e.preventDefault();

//         console.log(formData);
//     };

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 flex items-center justify-center p-3">

//             <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">

//                 {/* Left Side */}
//                 <div className="hidden md:flex relative bg-gradient-to-br from-indigo-600 to-sky-500 p-8 text-white flex-col justify-between overflow-hidden">

//                     {/* Decorative circles */}
//                     <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />

//                     <div className="absolute -bottom-24 -left-20 w-72 h-72 bg-white/10 rounded-full" />

//                     <div className="relative z-10">

//                         <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl mb-4">
//                             🧸
//                         </div>

//                         <h1 className="text-3xl font-bold leading-tight">
//                             Welcome Back
//                         </h1>

//                         <p className="mt-4 text-indigo-100 leading-relaxed">
//                             Sign in to manage your daycare activities,
//                             bookings, children, and more.
//                         </p>

//                     </div>

//                     <div className="relative z-10 space-y-3">

//                         <div className="flex items-center gap-3">

//                             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
//                                 ✓
//                             </div>

//                             <span className="text-sm">
//                                 Manage your daycare easily
//                             </span>

//                         </div>

//                         <div className="flex items-center gap-3">

//                             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
//                                 ✓
//                             </div>

//                             <span className="text-sm">
//                                 Track bookings & attendance
//                             </span>

//                         </div>

//                         <div className="flex items-center gap-3">

//                             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
//                                 ✓
//                             </div>

//                             <span className="text-sm">
//                                 Safe & secure platform
//                             </span>

//                         </div>

//                     </div>

//                 </div>

//                 {/* Right Side */}
//                 <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center">

//                     <div className="mb-7">

//                         <p className="text-xs font-semibold text-sky-600 mb-1">
//                             WELCOME BACK
//                         </p>

//                         <h2 className="text-3xl font-bold text-gray-900">
//                             Sign in to your account
//                         </h2>

//                         <p className="text-sm text-gray-500 mt-2">
//                             Enter your details to continue.
//                         </p>

//                     </div>

//                     <form
//                         onSubmit={handleSubmit}
//                         className="space-y-5"
//                     >

//                         {/* Email */}
//                         <div>

//                             <label className="block text-sm font-semibold text-gray-700 mb-2">
//                                 Email Address
//                             </label>

//                             <input
//                                 type="email"
//                                 name="email"
//                                 value={formData.email}
//                                 onChange={handleChange}
//                                 placeholder="you@example.com"
//                                 className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
//                             />

//                         </div>

//                         {/* Password */}
//                         <div>

//                             <div className="flex items-center justify-between mb-2">

//                                 <label className="text-sm font-semibold text-gray-700">
//                                     Password
//                                 </label>

//                                 <button
//                                     type="button"
//                                     className="text-xs font-semibold text-sky-600 hover:text-sky-700"
//                                 >
//                                     Forgot Password?
//                                 </button>

//                             </div>

//                             <div className="relative">

//                                 <input
//                                     type={
//                                         showPassword
//                                             ? "text"
//                                             : "password"
//                                     }
//                                     name="password"
//                                     value={formData.password}
//                                     onChange={handleChange}
//                                     placeholder="Enter your password"
//                                     className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
//                                 />

//                                 {/* Eye Icon */}
//                                 <button
//                                     type="button"
//                                     onClick={() =>
//                                         setShowPassword(
//                                             !showPassword
//                                         )
//                                     }
//                                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
//                                 >
//                                     {showPassword ? (
//                                         <EyeOff size={20} />
//                                     ) : (
//                                         <Eye size={20} />
//                                     )}
//                                 </button>

//                             </div>

//                         </div>

//                         {/* Remember Me */}
//                         <div className="flex items-center gap-2">

//                             <input
//                                 type="checkbox"
//                                 id="remember"
//                                 className="w-4 h-4 accent-sky-500"
//                             />

//                             <label
//                                 htmlFor="remember"
//                                 className="text-sm text-gray-600"
//                             >
//                                 Remember me
//                             </label>

//                         </div>

//                         {/* Login Button */}
//                         <button
//                             type="submit"
//                             className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-sky-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
//                         >
//                             Sign In →
//                         </button>

//                     </form>

//                     {/* Create an Account */}
//                     <p className="text-center text-sm text-gray-500 mt-7">

//                         Don't have an account?{" "}

//                         <Link
//                             to="/register"
//                             className="font-semibold text-sky-600 hover:text-sky-700"
//                         >
//                             Create Account
//                         </Link>

//                     </p>

//                 </div>

//             </div>

//         </div>
//     );
// };

// export default Login;



import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { login } from "../api/authApi";
import { loginSchema } from "../validation/authSchemas";

const Login = ({ adminOnly = false }) => {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const formik = useFormik({
        initialValues: { email: "", password: "" },
        validationSchema: loginSchema,
        onSubmit: async (values) => {

        try {
            setLoading(true);

            const response = await login({ ...values, portal: adminOnly ? "admin" : "standard" });

            const role = response.data.user.role;
            if ((adminOnly && role !== "admin") || (!adminOnly && role === "admin")) {
                toast.error(adminOnly ? "This sign-in page is for administrators only." : "Administrators must sign in at /admin.");
                return;
            }

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            toast.success(response.data.message);

            // Role based redirect
            if (role === "parent") {
                navigate("/parent/dashboard");
            } else if (role === "daycare") {
                navigate("/daycare/dashboard");
            } else if (role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/");
            }

        } catch (error) {
            console.error("Login Error:", error);

            if (error.response) {
                toast.error(
                    error.response.data.message || "Login failed"
                );
            } else {
                toast.error("Unable to connect to server");
            }
        } finally {
            setLoading(false);
        }
        },
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 flex items-center justify-center p-3">

            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">

                {/* Left Side */}
                <div className="hidden md:flex relative bg-gradient-to-br from-indigo-600 to-sky-500 p-8 text-white flex-col justify-between overflow-hidden">

                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />

                    <div className="absolute -bottom-24 -left-20 w-72 h-72 bg-white/10 rounded-full" />

                    <div className="relative z-10">

                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl mb-4">
                            🧸
                        </div>

                        <h1 className="text-3xl font-bold leading-tight">
                            {adminOnly ? "Administrator access" : "Welcome Back"}
                        </h1>

                        <p className="mt-4 text-indigo-100 leading-relaxed">
                            {adminOnly ? "Sign in to manage platform activity and registered daycare providers." : "Sign in to manage your daycare activities, bookings, children, and more."}
                        </p>

                    </div>

                    <div className="relative z-10 space-y-3">

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                ✓
                            </div>

                            <span className="text-sm">
                                Manage your daycare easily
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                ✓
                            </div>

                            <span className="text-sm">
                                Track bookings & attendance
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                ✓
                            </div>

                            <span className="text-sm">
                                Safe & secure platform
                            </span>
                        </div>

                    </div>

                </div>

                {/* Right Side */}
                <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center">

                    <div className="mb-7">

                        <p className="text-xs font-semibold text-sky-600 mb-1">
                            {adminOnly ? "ADMIN PORTAL" : "WELCOME BACK"}
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900">
                            {adminOnly ? "Administrator sign in" : "Sign in to your account"}
                        </h2>

                        <p className="text-sm text-gray-500 mt-2">
                        {adminOnly ? "Use your platform administrator account to continue." : "Enter your details to continue."}
                        </p>

                    </div>

                    <form
                        onSubmit={formik.handleSubmit}
                        className="space-y-5"
                    >

                        {/* Email */}
                        <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                            {formik.touched.email && formik.errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{formik.errors.email}</p>}

                        </div>

                        {/* Password */}
                        <div>

                            <div className="flex items-center justify-between mb-2">

                                <label className="text-sm font-semibold text-gray-700">
                                    Password
                                </label>

                                <button
                                    type="button"
                                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                                >
                                    Forgot Password?
                                </button>

                            </div>

                            <div className="relative">

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}
                                </button>

                            </div>
                            {formik.touched.password && formik.errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{formik.errors.password}</p>}

                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2">

                            <input
                                type="checkbox"
                                id="remember"
                                className="w-4 h-4 accent-sky-500"
                            />

                            <label
                                htmlFor="remember"
                                className="text-sm text-gray-600"
                            >
                                Remember me
                            </label>

                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-sky-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading ? "Signing In..." : "Sign In →"}
                        </button>

                    </form>

                    {/* Create Account */}
                    <p className="text-center text-sm text-gray-500 mt-7">

                        {adminOnly ? "Not an administrator? " : "Don't have an account? "}

                        <Link
                            to={adminOnly ? "/" : "/register"}
                            className="font-semibold text-sky-600 hover:text-sky-700"
                        >
                            {adminOnly ? "Regular sign in" : "Create Account"}
                        </Link>

                    </p>
                    {!adminOnly && <p className="mt-3 text-center text-xs text-gray-400"><Link to="/admin" className="hover:text-sky-600">Administrator sign in</Link></p>}

                </div>

            </div>

        </div>
    );
};

export default Login;
