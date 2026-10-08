const mongoose = require("mongoose");

let mainConnection;
let mainModels;
const tenantModelCache = new WeakMap();
const DB_NAME_PATTERN = /^daycare_[a-f0-9]{24}_db$/;

async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  mainConnection = await mongoose.createConnection(process.env.MONGO_URI, {
    dbName: "main_db",
    autoIndex: true,
  }).asPromise();
  mainModels = buildModels(mainConnection, { includeTenant: true });
  await mainModels.Tenant.init();
  await mainModels.User.init();
  console.log("MongoDB main_db connected");
  return mainConnection;
}

function buildModels(connection, { includeTenant = false } = {}) {
  const models = {};
  const names = includeTenant
    ? ["User", "Tenant"]
    : ["User", "Attendance", "Booking", "Child", "DaycareApplication", "DaycareProfile", "Expense", "Notification", "ParentProfile", "Payment", "Review"];
  for (const name of names) {
    const schema = require(`../models/${name}`);
    models[name] = connection.models[name] || connection.model(name, schema);
  }
  return models;
}

function getMainConnection() {
  if (!mainConnection) throw new Error("Main database is not connected");
  return mainConnection;
}

function getMainModels() {
  if (!mainModels) throw new Error("Main database models are not ready");
  return mainModels;
}

function getTenantConnection(databaseName) {
  if (!DB_NAME_PATTERN.test(databaseName)) throw new Error("Invalid tenant database mapping");
  // useDb gives each tenant a distinct Connection/model namespace and reuses the main MongoClient pool.
  return getMainConnection().useDb(databaseName, { useCache: true });
}

function getTenantModels(connection) {
  let models = tenantModelCache.get(connection);
  if (!models) {
    models = buildModels(connection);
    tenantModelCache.set(connection, models);
  }
  return models;
}

async function initializeTenantDatabase(databaseName) {
  const connection = getTenantConnection(databaseName);
  const models = getTenantModels(connection);
  await Promise.all(Object.values(models).map((model) => model.init()));
  return { connection, models };
}

function closeDB() {
  return mainConnection?.close();
}

module.exports = { connectDB, getMainConnection, getMainModels, getTenantConnection, getTenantModels, initializeTenantDatabase, DB_NAME_PATTERN, closeDB };
