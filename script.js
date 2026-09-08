const fileInput = document.getElementById("pdfFile");
const fileInfo = document.getElementById("fileInfo");
const filePreview = document.getElementById("filePreview");

const copiesInput = document.getElementById("copies");
const totalPrice = document.getElementById("totalPrice");
const orderBtn = document.getElementById("orderBtn");

const summarySection = document.getElementById("summarySection");
const summaryFiles = document.getElementById("summaryFiles");
const summaryPages = document.getElementById("summaryPages");
const summaryType = document.getElementById("summaryType");
const summaryCopies = document.getElementById("summaryCopies");
const summaryTotal = document.getElementById("summaryTotal");

const orderId = document.getElementById("orderId");

const payBtn = document.getElementById("payBtn");
const backBtn = document.getElementById("backBtn");

let selectedFiles = [];
let totalPages = 0;

const prices = {
    bw: 2,
    color: 10
};


// ===============================
// FILE SELECTION
// ===============================

fileInput.addEventListener("change", async function () {

    const newFiles = Array.from(this.files);

    if (newFiles.length === 0) {
        return;
    }

    const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const invalid = newFiles.find(
        file => !allowed.includes(file.type)
    );

    if (invalid) {
        alert("Only PDF, JPG, PNG and WebP files are allowed.");
        fileInput.value = "";
        return;
    }


    // Add new files
    selectedFiles = [...selectedFiles, ...newFiles];


    // Clear input so same file can be selected again
    fileInput.value = "";


    fileInfo.textContent = "⏳ Reading files...";

    totalPages = 0;


    // Calculate total pages
    for (const file of selectedFiles) {

        if (file.type === "application/pdf") {
            totalPages += await getPDFPageCount(file);
        } else {
            totalPages += 1;
        }

    }


    // Update information
    fileInfo.innerHTML =
        `📁 <b>${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected</b><br>
         📄 <b>${totalPages} total pages</b>`;


    renderPreview();

    calculatePrice();

});


// ===============================
// PDF PAGE COUNT
// ===============================

async function getPDFPageCount(file) {

    try {

        const buffer = await file.arrayBuffer();

        const text = new TextDecoder("latin1").decode(buffer);

        const matches = text.match(/\/Type\s*\/Page\b/g);

        return matches ? matches.length : 1;

    } catch (error) {

        return 1;

    }

}


// ===============================
// FILE PREVIEW
// ===============================

function renderPreview() {

    filePreview.innerHTML = "";


    selectedFiles.forEach((file, index) => {

        const item = document.createElement("div");

        item.className = "preview-item";


        // Image thumbnail
        if (file.type.startsWith("image/")) {

            const img = document.createElement("img");

            img.className = "preview-thumb";

            img.src = URL.createObjectURL(file);

            item.appendChild(img);

        }

        // PDF icon
        else {

            const icon = document.createElement("div");

            icon.className = "preview-icon";

            icon.textContent = "📄";

            item.appendChild(icon);

        }


        // File name
        const name = document.createElement("div");

        name.className = "preview-name";

        name.textContent = file.name;

        item.appendChild(name);


        // Remove button
        const removeBtn = document.createElement("button");

        removeBtn.className = "remove-file";

        removeBtn.textContent = "✕";

        removeBtn.type = "button";


        removeBtn.addEventListener("click", async function () {

            selectedFiles.splice(index, 1);


            // Recalculate pages
            totalPages = 0;

            for (const file of selectedFiles) {

                if (file.type === "application/pdf") {
                    totalPages += await getPDFPageCount(file);
                } else {
                    totalPages += 1;
                }

            }


            if (selectedFiles.length === 0) {

                fileInfo.textContent = "";

                filePreview.innerHTML = "";

            } else {

                fileInfo.innerHTML =
                    `📁 <b>${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected</b><br>
                     📄 <b>${totalPages} total pages</b>`;

                renderPreview();

            }


            calculatePrice();

        });


        item.appendChild(removeBtn);

        filePreview.appendChild(item);

    });

}


// ===============================
// PRINT TYPE
// ===============================

document
    .querySelectorAll('input[name="printType"]')
    .forEach(radio => {

        radio.addEventListener("change", calculatePrice);

    });


// ===============================
// COPIES
// ===============================

copiesInput.addEventListener(
    "input",
    calculatePrice
);


// ===============================
// PRICE CALCULATION
// ===============================

function calculatePrice() {

    const type =
        document.querySelector(
            'input[name="printType"]:checked'
        ).value;


    const copies =
        Math.max(
            1,
            Number(copiesInput.value) || 1
        );


    const total =
        totalPages *
        copies *
        prices[type];


    totalPrice.textContent =
        "₹" + total;

}


// ===============================
// ORDER ID GENERATOR
// ===============================

function generateOrderId() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let id = "PS-";


    for (let i = 0; i < 6; i++) {

        id += characters.charAt(
            Math.floor(
                Math.random() * characters.length
            )
        );

    }


    return id;

}


// ===============================
// CONTINUE → ORDER SUMMARY
// ===============================

orderBtn.addEventListener("click", function () {
    if (selectedFiles.length === 0) {
        alert("Please select files first.");
        return;
    }

    const type = document.querySelector('input[name="printType"]:checked').value;
    const copies = Math.max(1, Number(copiesInput.value) || 1);
    const total = totalPages * copies * prices[type];

    orderId.textContent = generateOrderId();

    summaryFiles.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");

        item.style.padding = "10px";
        item.style.marginBottom = "8px";
        item.style.background = "#f5f5f5";
        item.style.borderRadius = "10px";
        item.style.fontSize = "14px";

        item.textContent = `📄 ${index + 1}. ${file.name}`;

        summaryFiles.appendChild(item);
    });

    summaryPages.textContent = totalPages;
    summaryType.textContent =
        type === "bw" ? "⚫ B/W" : "🌈 Colour";
    summaryCopies.textContent = copies;
    summaryTotal.textContent = "₹" + total;

    document.getElementById("uploadCard").style.display = "none";
    summarySection.style.display = "block";

    summarySection.scrollIntoView({
        behavior: "smooth"
    });
});



// ===============================
// ← EDIT ORDER
// ===============================

backBtn.addEventListener(
    "click",
    function () {

        summarySection.style.display =
            "none";


        document
            .getElementById("uploadCard")
            .style.display = "block";


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


// ===============================
// CONFIRM & PAY
// ===============================

payBtn.addEventListener(
    "click",
    function () {

        alert(
            "Payment system coming next! 💳\n\n" +
            "Order ID: " +
            orderId.textContent +
            "\n" +
            "Total: " +
            summaryTotal.textContent
        );

    }
);
const cashBtn = document.getElementById("cashBtn");

cashBtn.addEventListener("click", async function () {
    const type = document.querySelector('input[name="printType"]:checked').value;
    const copies = Math.max(1, Number(copiesInput.value) || 1);
    const total = totalPages * copies * prices[type];

    const currentOrderId = orderId.textContent;

    try {
        const response = await fetch(
            "https://printshop-q8id.onrender.com/api/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    orderId: currentOrderId,
                    files: selectedFiles.map(file => ({
                        name: file.name,
                        pages: file.type === "application/pdf" ? 0 : 1
                    })),
                    printType: type,
                    copies: copies,
                    totalPages: totalPages,
                    totalAmount: total,
                    status: "CASH_PENDING"
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Order failed");
        }

        alert(
            "✅ Order placed successfully!\n\n" +
            "Order ID: " + currentOrderId + "\n" +
            "Amount: ₹" + total + "\n\n" +
            "💵 Pay at the shop when you collect your prints."
        );

    } catch (error) {
        console.error(error);
        alert("❌ Order save nahi hua. Please try again.");
    }
});
const cashBtn = document.getElementById("cashBtn");

cashBtn.addEventListener("click", async function () {

    const type = document.querySelector(
        'input[name="printType"]:checked'
    ).value;

    const copies = Math.max(
        1,
        Number(copiesInput.value) || 1
    );

    const total = totalPages * copies * prices[type];

    const currentOrderId = orderId.textContent;

    cashBtn.disabled = true;
    cashBtn.textContent = "⏳ Placing Order...";

    try {
        const response = await fetch(
            "https://printshop-q8id.onrender.com/api/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    orderId: currentOrderId,

                    files: selectedFiles.map(file => ({
                        name: file.name,
                        pages: file.type === "application/pdf" ? 0 : 1
                    })),

                    printType: type,
                    copies: copies,
                    totalPages: totalPages,
                    totalAmount: total,

                    status: "CASH_PENDING"
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Order could not be created"
            );
        }

        alert(
            "✅ Order Confirmed!\n\n" +
            "🆔 Order ID: " + currentOrderId + "\n" +
            "💰 Amount: ₹" + total + "\n\n" +
            "💵 Please pay at the shop when collecting your prints."
        );

        cashBtn.textContent = "✅ Order Confirmed";
        cashBtn.disabled = true;

    } catch (error) {

        console.error("Cash order error:", error);

        alert(
            "❌ Order save nahi hua.\n\n" +
            "Please try again."
        );

        cashBtn.disabled = false;
        cashBtn.textContent = "💵 Pay Cash at Shop";
    }
});
