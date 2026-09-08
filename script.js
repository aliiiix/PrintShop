const API_BASE = "https://printshop-q8id.onrender.com";

let prices = {
    bw: 2,
    color: 10
};

async function loadPrices() {
    try {
        const res = await fetch("https://printshop-q8id.onrender.com/api/settings");
        const settings = await res.json();

        prices.bw = Number(settings.bwPrice);
        prices.color = Number(settings.colorPrice);

        document.getElementById("bwPriceLabel").textContent =
            `₹${prices.bw} / page`;

        document.getElementById("colorPriceLabel").textContent =
            `₹${prices.color} / page`;

        calculateTotal();
    } catch (error) {
        console.log("Price load error:", error);
    }
}

loadPrices();
setInterval(loadPrices, 5000);

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

const statusBox = document.getElementById("shopStatus");


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

        statusBox.textContent = "Online";

        statusBox.style.display = "block";
        statusBox.style.textAlign = "center";
        statusBox.style.fontWeight = "bold";
        statusBox.style.fontSize = "20px";
        statusBox.style.padding = "14px";
        statusBox.style.margin = "10px 0 20px";
        statusBox.style.borderRadius = "15px";
        statusBox.style.background = "#e8f8ee";
        statusBox.style.color = "#16833b";

        fileInput.disabled = false;

        orderBtn.disabled =
            selectedFiles.length === 0;

    } else {

        statusBox.textContent = "Offline";

        statusBox.style.display = "block";
        statusBox.style.textAlign = "center";
        statusBox.style.fontWeight = "bold";
        statusBox.style.fontSize = "20px";
        statusBox.style.padding = "14px";
        statusBox.style.margin = "10px 0 20px";
        statusBox.style.borderRadius = "15px";
        statusBox.style.background = "#ffe8e8";
        statusBox.style.color = "#d62828";

        fileInput.disabled = true;
        orderBtn.disabled = true;
    }
}


// ==========================
// FILE SELECT + MULTIPLE FILES
// ==========================

fileInput.addEventListener("change", async function () {

    const newFiles = Array.from(this.files);

    // PURANE FILES DELETE NAHI HONGE
    selectedFiles = [...selectedFiles, ...newFiles];

    // duplicate same file hatao
    selectedFiles = selectedFiles.filter(
        (file, index, arr) =>
            index === arr.findIndex(
                f =>
                    f.name === file.name &&
                    f.size === file.size &&
                    f.lastModified === file.lastModified
            )
    );

    await showFiles();

    calculateTotal();
    updateShopStatus();

    // input reset — next time same file bhi select ho sake
    this.value = "";
});


// ==========================
// FILE LIST + THUMBNAIL
// ==========================

async function showFiles() {

    fileList.innerHTML = "";

    for (let index = 0; index < selectedFiles.length; index++) {

        const file = selectedFiles[index];

        let pages = 1;

        if (file.type === "application/pdf") {
            pages = await getPDFPages(file);
        }

        const item = document.createElement("div");

        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "10px";
        item.style.marginTop = "8px";


        // THUMBNAIL
        const thumb = document.createElement("div");

        thumb.style.width = "55px";
        thumb.style.height = "55px";
        thumb.style.minWidth = "55px";
        thumb.style.borderRadius = "8px";
        thumb.style.overflow = "hidden";
        thumb.style.background = "#f1f1f1";
        thumb.style.display = "flex";
        thumb.style.alignItems = "center";
        thumb.style.justifyContent = "center";

        if (file.type.startsWith("image/")) {

            const img = document.createElement("img");

            img.src = URL.createObjectURL(file);

            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";

            thumb.appendChild(img);

        } else {

            thumb.textContent = "📄";
            thumb.style.fontSize = "28px";
        }


        // FILE INFO
        const info = document.createElement("div");

        info.style.flex = "1";
        info.style.minWidth = "0";

        const name = document.createElement("div");

        name.textContent = file.name;

        name.style.whiteSpace = "nowrap";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";

        const page = document.createElement("small");

        page.textContent =
            `${pages} page${pages > 1 ? "s" : ""}`;

        info.appendChild(name);
        info.appendChild(page);


        // REMOVE BUTTON
        const remove = document.createElement("button");

        remove.type = "button";
        remove.textContent = "✕";

        remove.style.width = "30px";
        remove.style.height = "30px";
        remove.style.border = "none";
        remove.style.borderRadius = "50%";
        remove.style.background = "#eee";
        remove.style.color = "red";
        remove.style.fontWeight = "bold";

        remove.onclick = async function () {

            selectedFiles.splice(index, 1);

            await showFiles();

            calculateTotal();
            updateShopStatus();
        };


        item.appendChild(thumb);
        item.appendChild(info);
        item.appendChild(remove);

        fileList.appendChild(item);
    }
}


// ==========================
// SHOW FILES
// ==========================

async function showFiles() {

    fileList.innerHTML = "";

    for (let index = 0; index < selectedFiles.length; index++) {

        const file = selectedFiles[index];

        let pages = 1;

        if (file.type === "application/pdf") {
            pages = await getPDFPages(file);
        }

        const item = document.createElement("div");

        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "10px";
        item.style.marginTop = "10px";

        // THUMBNAIL
        const thumb = document.createElement("div");

        thumb.style.width = "55px";
        thumb.style.height = "55px";
        thumb.style.minWidth = "55px";
        thumb.style.borderRadius = "8px";
        thumb.style.overflow = "hidden";
        thumb.style.background = "#eee";
        thumb.style.display = "flex";
        thumb.style.alignItems = "center";
        thumb.style.justifyContent = "center";

        if (file.type.startsWith("image/")) {

            const img = document.createElement("img");

            img.src = URL.createObjectURL(file);

            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";

            thumb.appendChild(img);

        } else {

            thumb.textContent = "📄";
            thumb.style.fontSize = "28px";
        }


        // FILE NAME + PAGES
        const info = document.createElement("div");

        info.style.flex = "1";
        info.style.minWidth = "0";

        const name = document.createElement("div");

        name.textContent = file.name;

        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";

        const page = document.createElement("small");

        page.textContent =
            `${pages} page${pages > 1 ? "s" : ""}`;

        info.appendChild(name);
        info.appendChild(page);


        // REMOVE
        const remove = document.createElement("button");

        remove.type = "button";
        remove.textContent = "✕";

        remove.style.border = "none";
        remove.style.background = "#eee";
        remove.style.color = "red";
        remove.style.borderRadius = "50%";
        remove.style.width = "30px";
        remove.style.height = "30px";

        remove.onclick = function () {

            selectedFiles.splice(index, 1);

            const dt = new DataTransfer();

            selectedFiles.forEach(file => {
                dt.items.add(file);
            });

            fileInput.files = dt.files;

            showFiles();
            calculateTotal();
            updateShopStatus();
        };


        item.appendChild(thumb);
        item.appendChild(info);
        item.appendChild(remove);

        fileList.appendChild(item);
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
