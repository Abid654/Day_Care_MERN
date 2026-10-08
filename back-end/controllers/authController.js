const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validateRegisterData = require("../utils/validateUser");
const { getMainModels, getTenantConnection, getTenantModels, initializeTenantDatabase } = require("../config/db");

const registerUser = async (req, res) => {
  let tenant = null;
  try {
    const { name, email, password, confirmPassword, phone, role } = req.body;
    const validation = validateRegisterData(req.body);
    if (!validation.isValid) return res.status(400).json({ success: false, message: "Validation failed", errors: validation.errors });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });
    const cleanEmail = email.toLowerCase().trim();
    const mainModels = getMainModels();
    if (await mainModels.User.exists({ email: cleanEmail }) || await mainModels.Tenant.exists({ ownerEmail: cleanEmail })) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    const userId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const userDocument = { _id: userId, name: name.trim(), email: cleanEmail, password: hashedPassword, phone: phone.trim(), role };

    if (role === "parent") {
      const user = await mainModels.User.create(userDocument);
      return res.status(201).json({ success: true, message: "Account created successfully", user: publicUser(user) });
    }

    const databaseName = `daycare_${new mongoose.Types.ObjectId().toString()}_db`;
    tenant = await mainModels.Tenant.create({ name: name.trim(), ownerEmail: cleanEmail, ownerUserId: userId, databaseName, status: "provisioning" });
    try {
      const { models } = await initializeTenantDatabase(databaseName);
      const user = await models.User.create(userDocument);
      tenant.status = "active";
      await tenant.save();
      return res.status(201).json({ success: true, message: "Account created successfully", user: publicUser(user) });
    } catch (error) {
      tenant.status = "failed";
      await tenant.save();
      throw error;
    }
  } catch (error) {
    console.error("Register Error:", error.message);
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Email already registered" });
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const portal = req.body.portal || "standard";
    if (!["admin", "standard"].includes(portal)) return res.status(400).json({ success: false, message: "Invalid login portal" });
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    const cleanEmail = email.toLowerCase().trim();
    const mainModels = getMainModels();
    let user = await mainModels.User.findOne({ email: cleanEmail });
    let tenant = null;
    let models = mainModels;

    if (!user) {
      tenant = await mainModels.Tenant.findOne({ ownerEmail: cleanEmail, status: "active" }).lean();
      if (tenant) {
        const connection = getTenantConnection(tenant.databaseName);
        models = getTenantModels(connection);
        user = await models.User.findOne({ email: cleanEmail, role: "daycare" });
      }
    }
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if ((portal === "admin" && user.role !== "admin") || (portal === "standard" && user.role === "admin")) {
      return res.status(403).json({ success: false, message: portal === "admin" ? "Admin account required" : "Administrators must sign in at /admin" });
    }
    if (user.role === "daycare" && !tenant) return res.status(403).json({ success: false, message: "Daycare tenant is unavailable" });
    const token = jwt.sign({ userId: user._id.toString(), role: user.role, ...(tenant ? { tenantId: tenant._id.toString() } : {}) }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.status(200).json({ success: true, message: "Login successful", token, user: publicUser(user) });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(503).json({ success: false, message: "Authentication service temporarily unavailable" });
  }
};

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive };
}

module.exports = { registerUser, loginUser };
