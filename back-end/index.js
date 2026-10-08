const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const daycareRoutes = require("./routes/daycareRoutes");
const parentRoutes = require("./routes/parentRoutes");
const daycareController = require("./controllers/daycareController");
const { connectDB } = require("./config/db");
const bootstrapAdmin = require("./services/adminBootstrap");
const { attachRealtime } = require("./services/realtime");

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || true, methods: ["GET", "POST"] },
});
app.set("io", io);



app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { dotfiles: "deny", index: false }));

// Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/daycare", daycareRoutes);
app.use("/parent", parentRoutes);
app.get("/daycares", daycareController.listDaycares);
app.get("/daycares/:tenantId", daycareController.getPublicDaycare);

app.get("/", (req, res) => {
    res.send("Online Daycare API is running");
});

const PORT = process.env.PORT || 3000;

connectDB().then(bootstrapAdmin).then(() => {
    attachRealtime(io);
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((error) => {
    console.error("MongoDB startup failed:", error.message);
    process.exit(1);
});
