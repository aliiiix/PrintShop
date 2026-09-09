const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// CORS Setup
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.static(__dirname));


// =========================
// ORDER MODEL (Schema Validation Fixed)
// =========================

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },

    files: [{
        name: String,
        pages: Number
    }],

    printType: {
        type: String,
        required: true
    },

    copies: {
        type: Number,
        default: 1
    },

    totalPages: {
        type: Number,
        default: 1
    },

    totalAmount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        default: "PENDING_PAYMENT"
    }
}, {
    timestamps: true
});

const Order = mongoose.model("Order", orderSchema);


// =========================
// SHOP SETTINGS MODEL
// =========================

const settingsSchema = new mongoose.Schema({
    shopOnline: {
        type: Boolean,
        default: true
    },

    bwPrice: {
        type: Number,
        default: 2
    },

    colorPrice: {
        type: Number,
        default: 10
    }
}, {
    timestamps: true
});

const ShopSettings = mongoose.model("ShopSettings", settingsSchema);


// =========================
// GET SETTINGS
// =========================

app.get("/api/settings", async (req, res) => {
    try {
        let settings = await ShopSettings.findOne();

        if (!settings) {
            settings = await ShopSettings.create({
                shopOnline: true,
                bwPrice: 2,
                colorPrice: 10
            });
        }

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Get settings error:", error);

        res.status(500).json({
            success: false,
            message: "Could not get settings"
        });
    }
});


// =========================
// UPDATE SETTINGS
// =========================

app.post("/api/settings", async (req, res) => {
    try {
        const bwPrice = Math.max(
            0,
            Number(req.body.bwPrice) || 0
        );

        const colorPrice = Math.max(
            0,
            Number(req.body.colorPrice) || 0
        );

        const shopOnline = Boolean(req.body.shopOnline);

        const settings = await ShopSettings.findOneAndUpdate(
            {},
            {
                shopOnline,
                bwPrice,
                colorPrice
            },
            {
                new: true,
                upsert: true
            }
        );

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Update settings error:", error);

        res.status(500).json({
            success: false,
            message: "Could not update settings"
        });
    }
});


// =========================
// HEALTH
// =========================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "PrintShop backend is running 🚀"
    });
});


// =========================
// CREATE ORDER (Fixed Request Mapping)
// =========================

app.post("/api/orders", async (req, res) => {
    try {
        const settings = await ShopSettings.findOne();

        // If shop is offline, don't accept new orders
        if (settings && !settings.shopOnline) {
            return res.status(403).json({
                success: false,
                message: "Shop is currently offline"
            });
        }

        // Auto mapping frontend keys to database fields
        const payload = {
            orderId: req.body.orderId || req.body.id || `PS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            files: req.body.files || [],
            printType: req.body.printType || "bw",
            copies: Number(req.body.copies) || 1,
            totalPages: Number(req.body.totalPages || req.body.pages) || 1,
            totalAmount: Number(req.body.totalAmount || req.body.total) || 0,
            status: req.body.status || (req.body.paymentType === 'cash' ? 'CASH_PENDING' : 'PENDING_PAYMENT')
        };

        const order = await Order.create(payload);

        console.log("Order created successfully ✅:", order.orderId);

        res.status(201).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Create order error detailed:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not create order",
            error: error.message
        });
    }
});


// =========================
// GET ALL ORDERS
// =========================

app.get("/api/orders", async (req, res) => {
    try {
        const orders = await Order
            .find()
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error("Get orders error:", error);

        res.status(500).json({
            success: false,
            message: "Could not get orders"
        });
    }
});


// =========================
// GET SINGLE ORDER
// =========================

app.get("/api/orders/:orderId", async (req, res) => {
    try {
        const order = await Order.findOne({
            orderId: req.params.orderId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Get single order error:", error);

        res.status(500).json({
            success: false,
            message: "Could not get order"
        });
    }
});


// =========================
// UPDATE ORDER STATUS
// =========================

app.post("/api/orders/:orderId/status", async (req, res) => {
    try {
        const { status } = req.body;

        const order = await Order.findOneAndUpdate(
            {
                orderId: req.params.orderId
            },
            {
                status
            },
            {
                new: true
            }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Update order error:", error);

        res.status(500).json({
            success: false,
            message: "Could not update order"
        });
    }
});


// =========================
// HOME
// =========================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// =========================
// START SERVER
// =========================

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected ✅");

        app.listen(PORT, () => {
            console.log(
                `PrintShop running on port ${PORT} 🚀`
            );
        });

    } catch (error) {
        console.error(
            "MongoDB connection failed ❌",
            error
        );

        process.exit(1);
    }
}

startServer();
                        
