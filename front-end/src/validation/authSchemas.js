import * as Yup from "yup";

export const loginSchema = Yup.object({
    email: Yup.string().trim().email("Enter a valid email address.").required("Email is required."),
    password: Yup.string().required("Password is required."),
});

export const registerSchema = Yup.object({
    name: Yup.string().trim().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or fewer.").required("Name is required."),
    email: Yup.string().trim().email("Enter a valid email address.").required("Email is required."),
    phone: Yup.string().trim().matches(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number.").required("Phone number is required."),
    password: Yup.string().min(6, "Password must be at least 6 characters.").required("Password is required."),
    confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords must match.").required("Please confirm your password."),
    role: Yup.string().oneOf(["parent", "daycare"], "Choose a valid account type.").required("Choose an account type."),
});
