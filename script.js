const API_BASE = "https://printshop-q8id.onrender.com";

const prices = {
    bw: 2,
    color: 10
};

let selectedFiles = [];
let shopOnline = true;
let currentOrderId = null;
let statusTimer = null;


// ===============================
// ELEMENTS
// ===============================

const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");

const copiesInput = document.getElementById("copies");

const orderBtn = document.getElementById("orderBtn");
const cashBtn = document.getElementById("cashBtn");
const payBtn = document.getElementById("payBtn");
const editBtn = document.getElementById("editBtn");

const summary = document.getElementById("summary");

const totalPagesEl = document.getElementById("totalPages");
const totalAmountEl = document.getElementById("totalAmount");

const bwPriceLabel = document.getElementById("bwPriceLabel");
const colorPriceLabel = document.getElementById("colorPriceLabel");

const shopStatus = document.getElementById("shopStatus");
const orderStatusBox = document.getElementById("orderStatusBox");


// ===============================
// LOAD SHOP SETTINGS
// ===============================

async function loadShopSettings() {

    try {

        const response = await fetch(
            API_BASE + "/api/settings?time=" + Date.now()
        );

        const data = await response.json();

        if (!data.success) return;

        prices.bw = Number(data.settings.bwPrice);
        prices.color = Number(data.settings.colorPrice);

        shopOnline = Boolean(data.settings.shopOnline);

        updatePriceLabels();
        updateShopStatus();
        calculateTotal();

    } catch (error) {

        console.log("Settings error:", error);

    }
}


// ===============================
// PRICE LABELS
// ===============================

function updatePriceLabels() {

    bwPriceLabel.textContent =
        `₹${prices.bw} / page`;

    colorPriceLabel.textContent =
        `₹${prices.color} / page`;
}


// ===============================
// SHOP STATUS
// ===============================

function updateShopStatus() {

    if (shopOnline) {

        shopStatus.textContent = " Online";
        shopStatus.className = "shop-status online";

        fileInput.disabled = false;
        orderBtn.disabled = selectedFiles.length === 0;

    } else {

        shopStatus.textContent = " Offline";
        shopStatus.className = "shop-status offline";

        fileInput.disabled = true;
        orderBtn.disabled = true;

        cashBtn.disabled = true;
        payBtn.disabled = true;
    }
}


// ===============================
// FILE SELECT
// ===============================

fileInput.addEventListener("change", async function () {

    selectedFiles = Array.from(this.files);

    await renderFiles();

    calculateTotal();

    updateShopStatus();

});


// ===============================
// SHOW FILES
// ===============================

async function renderFiles() {

    fileList.innerHTML = "";

    for (const file of selectedFiles) {

        let pages = 1;

        if (file.type === "application/pdf") {

            pages = await getPDFPages(file);

        }

        const div = document.createElement("div");

        div.className = "file-item";

        div.innerHTML = `
            <span>${escapeHTML(file.name)}</span>
            <span>${pages} page${pages > 1 ? "s" : ""}</span>
        `;

        fileList.appendChild(div);
    }
}


// ===============================
// PDF PAGE COUNT
// ===============================

function getPDFPages(file) {

    return new Promise((resolve) => {

        const reader = new FileReader();

        reader.onload = function () {

            const text = new TextDecoder(
                "latin1"
            ).decode(reader.result);

            const matches = text.match(/\/Type\s*\/Page\b/g);

            resolve(
                matches && matches.length
                    ? matches.length
                    : 1
            );
        };

        reader.onerror = () => resolve(1);

        reader.readAsArrayBuffer(file);
    });
}


// ===============================
// TOTAL CALCULATION
// ===============================

async function calculateTotal() {

    let pages = 0;

    for (const file of selectedFiles) {

        if (file.type === "application/pdf") {

            pages += await getPDFPages(file);

        } else {

            pages += 1;

        }
    }

    const copies = Math.max(
        1,
        Number(copiesInput.value) || 1
    );

    const type =
        document.querySelector(
            'input[name="printType"]:checked'
        ).value;

    const price =
        type === "color"
            ? prices.color
            : prices.bw;

    const total =
        pages * copies * price;

    totalPagesEl.textContent =
        pages * copies;

    totalAmountEl.textContent =
        `₹${total}`;

    return {
        pages,
        copies,
        type,
        total
    };
}


// ===============================
// PRICE CHANGE
// ===============================

document
    .querySelectorAll('input[name="printType"]')
    .forEach((radio) => {

        radio.addEventListener(
            "change",
            calculateTotal
        );

    });

copiesInput.addEventListener(
    "input",
    calculateTotal
);


// ===============================
// CONTINUE
// ===============================

orderBtn.addEventListener(
    "click",
    async function () {

        if (!shopOnline) {

            alert(
                "🔴 Shop is currently offline."
            );

            return;
        }

        if (selectedFiles.length === 0) {

            alert("Please select a file.");

            return;
        }

        const data =
            await calculateTotal();

        const orderId =
            "PS-" +
            Date.now().toString(36).toUpperCase();

        currentOrderId = orderId;

        document.getElementById(
            "orderId"
        ).textContent = orderId;

        document.getElementById(
            "summaryFiles"
        ).textContent =
            selectedFiles
                .map(file => file.name)
                .join(", ");

        document.getElementById(
            "summaryPages"
        ).textContent =
            data.pages;

        document.getElementById(
            "summaryType"
        ).textContent =
            data.type === "color"
                ? "Colour"
                : "Black & White";

        document.getElementById(
            "summaryCopies"
        ).textContent =
            data.copies;

        document.getElementById(
            "summaryTotal"
        ).textContent =
            data.total;

        orderStatusBox.textContent =
            "🟡 Order Ready — choose payment";

        summary.classList.remove(
            "hidden"
        );

        orderBtn.disabled = true;

        cashBtn.disabled = false;
        payBtn.disabled = false;

        summary.scrollIntoView({
            behavior: "smooth"
        });
    }
);


// ===============================
// CASH ORDER
// ===============================

cashBtn.addEventListener(
    "click",
    async function () {

        if (!shopOnline) {

            alert(
                "🔴 Shop is currently offline."
            );

            return;
        }

        const data =
            await calculateTotal();

        cashBtn.disabled = true;

        try {

            const response = await fetch(
                API_BASE + "/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        orderId: currentOrderId,

                        files: selectedFiles.map(
                            file => ({
                                name: file.name,
                                pages: 1
                            })
                        ),

                        printType: data.type,

                        copies: data.copies,

                        totalPages: data.pages,

                        totalAmount: data.total,

                        status: "CASH_PENDING"
                    })
                }
            );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Order failed"
                );
            }

            orderStatusBox.textContent =
                "🟡 Cash Pending — Show this Order ID at the shop";

            localStorage.setItem(
                "printshop_order_id",
                currentOrderId
            );

            startOrderStatus();

        } catch (error) {

            cashBtn.disabled = false;

            alert(
                error.message ||
                "Unable to place order."
            );
        }
    }
);


// ===============================
// ONLINE PAYMENT
// ===============================

payBtn.addEventListener(
    "click",
    function () {

        alert(
            "💳 Online payment will be added soon."
        );

    }
);


// ===============================
// EDIT ORDER
// ===============================

editBtn.addEventListener(
    "click",
    function () {

        summary.classList.add(
            "hidden"
        );

        orderBtn.disabled =
            !shopOnline ||
            selectedFiles.length === 0;

        cashBtn.disabled = false;
        payBtn.disabled = false;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


// ===============================
// ORDER STATUS
// ===============================

function startOrderStatus() {

    if (statusTimer) {

        clearInterval(statusTimer);

    }

    checkOrderStatus();

    statusTimer = setInterval(
        checkOrderStatus,
        5000
    );
}


async function checkOrderStatus() {

    if (!currentOrderId) return;

    try {

        const response = await fetch(
            API_BASE +
            "/api/orders/" +
            encodeURIComponent(
                currentOrderId
            ) +
            "?time=" +
            Date.now()
        );

        if (!response.ok) return;

        const data =
            await response.json();

        if (!data.success || !data.order) {
            return;
        }

        updateOrderStatus(
            data.order.status
        );

    } catch (error) {

        console.log(
            "Status error:",
            error
        );
    }
}


// ===============================
// STATUS UI
// ===============================

function updateOrderStatus(status) {

    const statuses = {

        CASH_PENDING:
            "🟡 Cash Pending — Show Order ID at shop",

        PENDING_PAYMENT:
            "🟡 Payment Pending",

        PAID:
            "💰 Payment Received",

        ACCEPTED:
            "✅ Order Accepted",

        PRINTING:
            "🖨️ Your Order is Printing",

        COMPLETED:
            "🎉 Order Completed — Collect your prints",

        REJECTED:
            "❌ Order Rejected"
    };

    orderStatusBox.textContent =
        statuses[status] ||
        "🟡 Order Pending";

    if (
        status === "COMPLETED" ||
        status === "REJECTED"
    ) {

        if (statusTimer) {

            clearInterval(statusTimer);

            statusTimer = null;
        }
    }
}


// ===============================
// RESTORE ORDER
// ===============================

const savedOrder =
    localStorage.getItem(
        "printshop_order_id"
    );

if (savedOrder) {

    currentOrderId =
        savedOrder;

    document.getElementById(
        "orderId"
    ).textContent =
        savedOrder;

    summary.classList.remove(
        "hidden"
    );

    startOrderStatus();
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ===============================
// START
// ===============================

loadShopSettings();

setInterval(
    loadShopSettings,
    5000
);
