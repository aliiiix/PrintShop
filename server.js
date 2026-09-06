const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

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
      default: "PENDING_PAYMENT"
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model("Order", orderSchema);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PrintShop backend is running 🚀"
  });
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = await Order.create(req.body);

    res.status(201).json({
      success: true,
      order
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not create order"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected ✅");

    app.listen(PORT, () => {
      console.log(`PrintShop running on port ${PORT} 🚀`);
    });
  } catch (error) {
    console.error("MongoDB connection failed ❌", error);
    process.exit(1);
  }
}

startServer();
