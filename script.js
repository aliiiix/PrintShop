const API_BASE = "https://printshop-q8id.onrender.com";

const prices = {
    bw: 2,
    color: 10
};

let shopOnline = true;
let selectedFiles = [];
let currentOrderId = null;
let statusTimer = null;


// ==========================
// ELEMENTS
// ==========================

const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const copiesInput = document.getElementById("copies");

const orderBtn = document.getElementById("orderBtn");
const summary = document.getElementById("summary");

const totalPagesEl = document.getElementById("totalPages");
const totalAmountEl = document.getElementById("totalAmount");

const cashBtn = document.getElementById("cashBtn");
const payBtn = document.getElementById("payBtn");
const editBtn = document.getElementById("editBtn");


// ==========================
// SHOP STATUS
// ==========================

const statusBox = document.createElement("div");

statusBox.style.textAlign = "center";
statusBox.style.fontWeight = "500";
statusBox.style.margin = "0 0 8px 0";

document.querySelector(".container").insertBefore(
    statusBox,
    document.querySelector(".container").children[1]
);


// ==========================
// ORDER STATUS
// ==========================

const orderStatus = document.createElement("div");

orderStatus.style.textAlign = "center";
orderStatus.style.margin = "10px 0";
orderStatus.style.fontWeight = "500";

if (summary) {
    summary.insertBefore(
        orderStatus,
        summary.firstChild
    );
}


// ==========================
// LOAD SETTINGS
// ==========================

async function loadSettings() {

    try {

        const response = await fetch(
            API_BASE + "/api/settings?time=" + Date.now()
        );

        const data = await response.json();

        if (!data.success) return;

        prices.bw = Number(data.settings.bwPrice);
        prices.color = Number(data.settings.colorPrice);

        shopOnline = Boolean(data.settings.shopOnline);

        updatePrices();
        updateShopStatus();
        calculateTotal();

    } catch (error) {

        console.log("Settings error:", error);

    }
}


// ==========================
// UPDATE PRICE ON WEBSITE
// ==========================

function updatePrices() {

    const bwRadio =
        document.querySelector(
            'input[name="printType"][value="bw"]'
        );

    const colorRadio =
        document.querySelector(
            'input[name="printType"][value="color"]'
        );

    if (bwRadio) {

        const small =
            bwRadio.closest("label")?.querySelector("small");

        if (small) {
            small.textContent =
                `₹${prices.bw} / page`;
        }
    }

    if (colorRadio) {

        const small =
            colorRadio.closest("label")?.querySelector("small");

        if (small) {
            small.textContent =
                `₹${prices.color} / page`;
        }
    }
}


// ==========================
// SHOP ONLINE / OFFLINE
// ==========================

function updateShopStatus() {

    if (shopOnline) {

        statusBox.textContent =
            "🟢 Shop Online";

        statusBox.style.color = "green";

        if (fileInput)
            fileInput.disabled = false;

        if (orderBtn)
            orderBtn.disabled =
                selectedFiles.length === 0;

    } else {

        statusBox.textContent =
            "🔴 Shop Offline";

        statusBox.style.color = "red";

        if (fileInput)
            fileInput.disabled = true;

        if (orderBtn)
            orderBtn.disabled = true;
    }
}


// ==========================
// FILE SELECT
// ==========================

fileInput.addEventListener(
    "change",
    async function () {

        selectedFiles =
            Array.from(this.files);

        await showFiles();

        calculateTotal();

        updateShopStatus();
    }
);


// ==========================
// SHOW FILES
// ==========================

async function showFiles() {

    fileList.innerHTML = "";

    for (const file of selectedFiles) {

        let pages = 1;

        if (
            file.type ===
            "application/pdf"
        ) {
            pages =
                await getPDFPages(file);
        }

        const div =
            document.createElement("div");

        div.textContent =
            `${file.name} — ${pages} page${pages > 1 ? "s" : ""}`;

        fileList.appendChild(div);
    }
}


// ==========================
// PDF PAGE COUNT
// ==========================

function getPDFPages(file) {

    return new Promise((resolve) => {

        const reader =
            new FileReader();

        reader.onload = function () {

            const text =
                new TextDecoder("latin1")
                    .decode(reader.result);

            const matches =
                text.match(
                    /\/Type\s*\/Page\b/g
                );

            resolve(
                matches?.length || 1
            );
        };

        reader.onerror =
            () => resolve(1);

        reader.readAsArrayBuffer(file);
    });
}


// ==========================
// CALCULATE TOTAL
// ==========================

async function calculateTotal() {

    let pages = 0;

    for (const file of selectedFiles) {

        if (
            file.type ===
            "application/pdf"
        ) {
            pages +=
                await getPDFPages(file);
        } else {
            pages += 1;
        }
    }

    const copies =
        Math.max(
            1,
            Number(copiesInput.value) || 1
        );

    const type =
        document.querySelector(
            'input[name="printType"]:checked'
        )?.value || "bw";

    const price =
        type === "color"
            ? prices.color
            : prices.bw;

    const total =
        pages * copies * price;

    if (totalPagesEl)
        totalPagesEl.textContent =
            pages * copies;

    if (totalAmountEl)
        totalAmountEl.textContent =
            `₹${total}`;

    return {
        pages,
        copies,
        type,
        total
    };
}


// ==========================
// PRINT TYPE CHANGE
// ==========================

document
    .querySelectorAll(
        'input[name="printType"]'
    )
    .forEach((radio) => {

        radio.addEventListener(
            "change",
            calculateTotal
        );

    });


// ==========================
// COPIES CHANGE
// ==========================

copiesInput.addEventListener(
    "input",
    calculateTotal
);


// ==========================
// CONTINUE
// ==========================

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

            alert(
                "Please select a file."
            );

            return;
        }

        const data =
            await calculateTotal();

        currentOrderId =
            "PS-" +
            Date.now()
                .toString(36)
                .toUpperCase();

        document.getElementById(
            "orderId"
        ).textContent =
            currentOrderId;

        document.getElementById(
            "summaryFiles"
        ).textContent =
            selectedFiles
                .map(f => f.name)
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

        orderStatus.textContent =
            "🟡 Order Pending";

        summary.classList.remove(
            "hidden"
        );

        orderBtn.disabled = true;

        summary.scrollIntoView({
            behavior: "smooth"
        });
    }
);


// ==========================
// CASH ORDER
// ==========================

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

            const response =
                await fetch(
                    API_BASE +
                    "/api/orders",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            orderId:
                                currentOrderId,

                            files:
                                selectedFiles.map(
                                    file => ({
                                        name:
                                            file.name,
                                        pages: 1
                                    })
                                ),

                            printType:
                                data.type,

                            copies:
                                data.copies,

                            totalPages:
                                data.pages,

                            totalAmount:
                                data.total,

                            status:
                                "CASH_PENDING"
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

            localStorage.setItem(
                "printshop_order_id",
                currentOrderId
            );

            orderStatus.textContent =
                "🟡 Cash Pending — Show Order ID at shop";

            startStatusChecking();

        } catch (error) {

            cashBtn.disabled = false;

            alert(
                error.message ||
                "Unable to place order."
            );
        }
    }
);


// ==========================
// ONLINE PAY
// ==========================

payBtn.addEventListener(
    "click",
    function () {

        alert(
            "💳 Online payment will be added soon."
        );

    }
);


// ==========================
// EDIT ORDER
// ==========================

editBtn.addEventListener(
    "click",
    function () {

        summary.classList.add(
            "hidden"
        );

        orderBtn.disabled =
            !shopOnline ||
            selectedFiles.length === 0;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


// ==========================
// CHECK ORDER STATUS
// ==========================

function startStatusChecking() {

    if (statusTimer) {
        clearInterval(statusTimer);
    }

    checkOrderStatus();

    statusTimer =
        setInterval(
            checkOrderStatus,
            5000
        );
}


async function checkOrderStatus() {

    if (!currentOrderId) return;

    try {

        const response =
            await fetch(
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

        if (
            !data.success ||
            !data.order
        ) return;

        showOrderStatus(
            data.order.status
        );

    } catch (error) {

        console.log(
            "Status error:",
            error
        );
    }
}


// ==========================
// STATUS TEXT
// ==========================

function showOrderStatus(status) {

    const statusText = {

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
            "🎉 Completed — Collect your prints",

        REJECTED:
            "❌ Order Rejected"
    };

    orderStatus.textContent =
        statusText[status] ||
        "🟡 Order Pending";

    if (
        status === "COMPLETED" ||
        status === "REJECTED"
    ) {

        clearInterval(statusTimer);

        statusTimer = null;
    }
}


// ==========================
// RESTORE OLD ORDER
// ==========================

const savedOrder =
    localStorage.getItem(
        "printshop_order_id"
    );

if (savedOrder) {

    currentOrderId =
        savedOrder;

    startStatusChecking();
}


// ==========================
// START
// ==========================

loadSettings();

setInterval(
    loadSettings,
    5000
);

calculateTotal();
