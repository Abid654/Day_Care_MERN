import { useState } from "react";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { register } from "../api/authApi";
import { registerSchema } from "../validation/authSchemas";

const Register = () => {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    const formik = useFormik({
        initialValues: { name: "", email: "", password: "", confirmPassword: "", phone: "", role: "parent" },
        validationSchema: registerSchema,
        onSubmit: async (values, { resetForm }) => {

        try {
            setLoading(true);

            const response = await register(values);

            console.log("Register Response:", response.data);

            // Show success message
            toast.success(
                response.data.message || "Account created successfully!"
            );

            resetForm();
            setRegistrationComplete(true);

            // Wait 2 seconds, then navigate to Login page
            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (error) {
            console.error("Register Error:", error);

            if (error.response) {
                toast.error(
                    error.response.data.message || "Registration failed"
                );
            } else {
                toast.error(
                    "Unable to connect to server. Please try again."
                );
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
                <div className="hidden md:flex relative bg-gradient-to-br from-sky-500 to-indigo-600 p-8 text-white flex-col justify-between overflow-hidden">

                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />

                    <div className="absolute -bottom-24 -left-20 w-72 h-72 bg-white/10 rounded-full" />

                    <div className="relative z-10">

                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl mb-4">
                            🧸
                        </div>

                        <h1 className="text-3xl font-bold leading-tight">
                            Welcome to
                            <br />
                            Online Daycare
                        </h1>

                        <p className="mt-4 text-sky-100 leading-relaxed">
                            A safe and trusted platform connecting parents
                            with professional daycare providers.
                        </p>

                    </div>

                    <div className="relative z-10 space-y-3">

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                ✓
                            </div>

                            <span className="text-sm">
                                Trusted daycare providers
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                ✓
                            </div>

                            <span className="text-sm">
                                Easy booking & management
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
                <div className="p-6 sm:p-8">

                    <div className="mb-5">

                        <p className="text-xs font-semibold text-sky-600 mb-1">
                            GET STARTED
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Create your account
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            Join our daycare community today.
                        </p>

                    </div>

                    <form
                        onSubmit={formik.handleSubmit}
                        className="space-y-3.5"
                    >

                        {/* Name */}
                        <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Full Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                            {formik.touched.name && formik.errors.name && <p className="mt-1 text-xs font-medium text-rose-600">{formik.errors.name}</p>}

                        </div>

                        {/* Email + Phone */}
                        <div className="grid sm:grid-cols-2 gap-3">

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />
                                {formik.touched.email && formik.errors.email && <p className="mt-1 text-xs font-medium text-rose-600">{formik.errors.email}</p>}

                            </div>

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Phone Number
                                </label>

                                <input
                                    type="text"
                                    name="phone"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="0300 1234567"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                />
                                {formik.touched.phone && formik.errors.phone && <p className="mt-1 text-xs font-medium text-rose-600">{formik.errors.phone}</p>}

                            </div>

                        </div>

                        {/* Password + Confirm Password */}
                        <div className="grid sm:grid-cols-2 gap-3">

                            {/* Password */}
                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Password
                                </label>

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
                                        placeholder="Create password"
                                        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>

                                </div>
                                {formik.touched.password && formik.errors.password && <p className="mt-1 text-xs font-medium text-rose-600">{formik.errors.password}</p>}

                            </div>

                            {/* Confirm Password */}
                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Confirm Password
                                </label>

                                <div className="relative">

                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="confirmPassword"
                                        value={formik.values.confirmPassword}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="Confirm password"
                                        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>

                                </div>
                                {formik.touched.confirmPassword && formik.errors.confirmPassword && <p className="mt-1 text-xs font-medium text-rose-600">{formik.errors.confirmPassword}</p>}

                            </div>

                        </div>

                        {/* Role */}
                        <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                I want to register as
                            </label>

                            <div className="grid grid-cols-2 gap-3">

                                {/* Parent */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        formik.setFieldValue("role", "parent")
                                    }
                                    className={`p-3 rounded-xl border-2 text-left transition ${
                                        formik.values.role === "parent"
                                            ? "border-sky-500 bg-sky-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >

                                    <div className="text-xl mb-1">
                                        👨‍👩‍👧
                                    </div>

                                    <p className="font-semibold text-sm text-gray-800">
                                        Parent
                                    </p>

                                    <p className="text-xs text-gray-500">
                                        Find daycare
                                    </p>

                                </button>

                                {/* Daycare */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        formik.setFieldValue("role", "daycare")
                                    }
                                    className={`p-3 rounded-xl border-2 text-left transition ${
                                        formik.values.role === "daycare"
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >

                                    <div className="text-xl mb-1">
                                        🏡
                                    </div>

                                    <p className="font-semibold text-sm text-gray-800">
                                        Daycare
                                    </p>

                                    <p className="text-xs text-gray-500">
                                        Provide childcare
                                    </p>

                                </button>

                            </div>

                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || registrationComplete}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold shadow-lg shadow-sky-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading && <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" />}
                            {loading
                                ? "Creating Account..."
                                : "Create Account →"}
                        </button>

                        {registrationComplete && (
                            <p className="mt-3 text-center text-sm font-medium text-emerald-600">
                                Account created successfully. Redirecting to sign in...
                            </p>
                        )}

                    </form>

                    {/* Login Link */}
                    <p className="text-center text-sm text-gray-500 mt-4">

                        Already have an account?{" "}

                        <Link
                            to="/"
                            className="font-semibold text-sky-600 hover:text-sky-700"
                        >
                            Sign in
                        </Link>

                    </p>

                </div>

            </div>

        </div>
    );
};

export default Register;
