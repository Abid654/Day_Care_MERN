const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const daycareRoutes = require("./routes/daycareRoutes");
const daycareController = require("./controllers/daycareController");
const { connectDB } = require("./config/db");
const bootstrapAdmin = require("./services/adminBootstrap");



app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { dotfiles: "deny", index: false }));

// Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/daycare", daycareRoutes);
app.get("/daycares", daycareController.listDaycares);

app.get("/", (req, res) => {
    res.send("Online Daycare API is running");
});

const PORT = process.env.PORT || 3000;

connectDB().then(bootstrapAdmin).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((error) => {
    console.error("MongoDB startup failed:", error.message);
    process.exit(1);
});
