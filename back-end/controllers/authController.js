// const bcrypt = require("bcryptjs");
// const User = require("../models/User");
// const validateRegisterData = require("../utils/validateUser");


// const registerUser = async (req, res) => {
//     try {
//         const {
//             name,
//             email,
//             password,
//             confirmPassword,
//             phone,
//             role,
//         } = req.body;

//         // Required fields validation
//         if (!name || !email || !password || !confirmPassword || !phone || !role) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required",
//             });
//         }

//         // Password confirmation
//         if (password !== confirmPassword) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Passwords do not match",
//             });
//         }

//         // Check existing email
//         const existingUser = await User.findOne({
//             email: email.toLowerCase(),
//         });

//         if (existingUser) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered",
//             });
//         }

//         // Hash password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Create user
//         const user = await User.create({
//             name,
//             email: email.toLowerCase(),
//             password: hashedPassword,
//             phone,
//             role,
//         });

//         // Response without password
//         return res.status(201).json({
//             success: true,
//             message: "Account created successfully",
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 phone: user.phone,
//                 role: user.role,
//                 isActive: user.isActive,
//             },
//         });

//     } catch (error) {
//         console.error("Register Error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         });
//     }
// };

// module.exports = {
//     registerUser,
// };

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const validateRegisterData = require("../utils/validateUser");

// Register
const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            confirmPassword,
            phone,
            role,
        } = req.body;

        const validation = validateRegisterData(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors,
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match",
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phone: phone.trim(),
            role,
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
            },
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// Login
const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET
);

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive",
            });
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Encrypted JWT
        const token = await new SignJWT({
            userId: user._id.toString(),
            role: user.role,
        })
            .setProtectedHeader({
                alg: "dir",
                enc: "A256GCM",
            })
            .setIssuedAt()
            .setExpirationTime("1d")
            .encrypt(secretKey);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
            },
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


module.exports = {
    registerUser,
    loginUser,
};