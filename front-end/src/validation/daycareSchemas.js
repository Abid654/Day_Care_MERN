import * as Yup from "yup";

const optionalCount = Yup.number().transform((value, originalValue) => originalValue === "" ? undefined : value)
    .min(0, "Enter zero or a positive number.")
    .integer("Enter a whole number.")
    .optional();

export const daycareStepSchemas = [
    Yup.object({
        daycareName: Yup.string().trim().max(100, "Name must be 100 characters or fewer.").required("Daycare name is required."),
        phone: Yup.string().trim().matches(/^\+?[\d\s()-]{7,20}$/, "Enter a valid contact number.").required("Contact phone is required."),
        address: Yup.string().trim().max(250, "Address must be 250 characters or fewer.").required("Address is required."),
        area: Yup.string().trim().max(100, "Area must be 100 characters or fewer.").required("Area or city is required."),
        description: Yup.string().max(1000, "Description must be 1000 characters or fewer."),
    }),
    Yup.object({
        experienceYears: optionalCount,
        qualifications: Yup.string().max(500, "Qualifications must be 500 characters or fewer."),
        training: Yup.string().max(500, "Training must be 500 characters or fewer."),
    }),
    Yup.object({
        services: Yup.array().of(Yup.string()).min(1, "Select at least one care service."),
        facilities: Yup.string().max(500, "Facilities must be 500 characters or fewer."),
        medicalStaffCount: optionalCount,
        nursingStaffCount: optionalCount,
    }),
    Yup.object({
        fee: Yup.number().transform((value, originalValue) => originalValue === "" ? undefined : value)
            .typeError("Monthly fee must be a number.")
            .min(0, "Monthly fee cannot be negative.")
            .required("Monthly fee is required."),
        paymentOptions: Yup.string().max(300, "Payment options must be 300 characters or fewer."),
    }),
];

export const daycareStepFields = [
    ["daycareName", "phone", "address", "area", "description"],
    ["experienceYears", "qualifications", "training"],
    ["services", "facilities", "medicalStaffCount", "nursingStaffCount"],
    ["fee", "paymentOptions"],
];
