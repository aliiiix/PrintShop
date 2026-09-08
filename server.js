const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.static(__dirname));

/* ---------------- ORDER MODEL ---------------- */

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true
        },

        files: [
            {
                name: String,
                pages: Number
            }
        ],

        printType: {
            type: String,
            enum: ["bw", "color"],
            required: true
        },

        copies: {
            type: Number,
            required: true
        },

        totalPages: {
            type: Number,
            required: true
        },

        totalAmount: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: [
                "CASH_PENDING",
                "PENDING_PAYMENT",
                "PAID",
                "ACCEPTED",
                "PRINTING",
                "COMPLETED",
                "REJECTED"
            ],
            default: "PENDING_PAYMENT"
        }
    },
    {
        timestamps: true
    }
);

const Order = mongoose.model("Order", orderSchema);

/* ---------------- SHOP SETTINGS ---------------- */

const settingsSchema = new mongoose.Schema(
    {
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
    },
    {
        timestamps: true
    }
);

const ShopSettings =
    mongoose.model("ShopSettings", settingsSchema);


/* GET SHOP SETTINGS */

app.get("/api/settings", async (req, res) => {
    try {

        let settings =
            await ShopSettings.findOne();

        if (!settings) {
            settings =
                await ShopSettings.create({});
        }

        res.json({
            success: true,
            settings
        });

    } catch (error) {

        console.error(
            "Get settings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not get settings"
        });
    }
});


/* UPDATE SHOP SETTINGS */

app.post("/api/settings", async (req, res) => {
    try {

        const {
            shopOnline,
            bwPrice,
            colorPrice
        } = req.body;

        const settings =
            await ShopSettings.findOneAndUpdate(
                {},
                {
                    shopOnline:
                        Boolean(shopOnline),

                    bwPrice:
                        Math.max(
                            0,
                            Number(bwPrice) || 0
                        ),

                    colorPrice:
                        Math.max(
                            0,
                            Number(colorPrice) || 0
                        )
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

        console.error(
            "Update settings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not update settings"
        });
    }
});

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "PrintShop backend is running 🚀"
    });
});

/* ---------------- CREATE ORDER ---------------- */

app.post("/api/orders", async (req, res) => {
    try {
        const order = await Order.create(req.body);

        res.status(201).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Create order error:", error);

        res.status(500).json({
            success: false,
            message: "Could not create order"
        });
    }
});

/* ---------------- GET ORDERS ---------------- */

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

/* ---------------- UPDATE ORDER STATUS ---------------- */

app.post("/api/orders/:orderId/status", async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "CASH_PENDING",
            "PENDING_PAYMENT",
            "PAID",
            "ACCEPTED",
            "PRINTING",
            "COMPLETED",
            "REJECTED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status: status },
            { new: true }
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

/* ---------------- FRONTEND ---------------- */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* ---------------- START SERVER ---------------- */

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
