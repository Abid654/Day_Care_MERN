const bcrypt = require("bcryptjs");
const { getMainModels } = require("../config/db");

async function bootstrapAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;
  const values = [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE];
  if (values.every((value) => !value)) {
    console.log("Admin bootstrap skipped (ADMIN_* variables are not configured)");
    return false;
  }
  if (values.some((value) => !value)) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PHONE together");
  }
  if (ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const { User, Tenant } = getMainModels();
  const existing = await User.findOne({ email }).select("role").lean();
  if (existing) {
    if (existing.role !== "admin") throw new Error("ADMIN_EMAIL is already used by a non-admin account");
    console.log("Admin account already exists; existing credentials were left unchanged");
    return false;
  }
  if (await Tenant.exists({ ownerEmail: email })) throw new Error("ADMIN_EMAIL is already registered as a daycare owner");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: passwordHash,
    phone: ADMIN_PHONE.trim(),
    role: "admin",
    isActive: true,
  });
  console.log("Admin account created in main_db");
  return true;
}

module.exports = bootstrapAdmin;
