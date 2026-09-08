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

    if (newFiles.length === 0) return;

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

    selectedFiles = [...selectedFiles, ...newFiles];

    fileInput.value = "";

    fileInfo.textContent = "⏳ Reading files...";

    totalPages = 0;

    for (const file of selectedFiles) {

        if (file.type === "application/pdf") {
            totalPages += await getPDFPageCount(file);
        } else {
            totalPages += 1;
        }

    }

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


        if (file.type.startsWith("image/")) {

            const img = document.createElement("img");

            img.className = "preview-thumb";

            img.src = URL.createObjectURL(file);

            item.appendChild(img);

        } else {

            const icon = document.createElement("div");

            icon.className = "preview-icon";

            icon.textContent = "📄";

            item.appendChild(icon);

        }


        const name = document.createElement("div");

        name.className = "preview-name";

        name.textContent = file.name;

        item.appendChild(name);


        const removeBtn = document.createElement("button");

        removeBtn.className = "remove-file";

        removeBtn.textContent = "✕";

        removeBtn.type = "button";


        removeBtn.addEventListener("click", async function () {

            selectedFiles.splice(index, 1);

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
// PRICE
// ===============================

function calculatePrice() {

    const selectedType =
        document.querySelector(
            'input[name="printType"]:checked'
        );

    const type = selectedType
        ? selectedType.value
        : "bw";

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
// ORDER ID
// ===============================

function generateOrderId() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let id = "PS-";

    for (let i = 0; i < 6; i++) {

        id += characters.charAt(
            Math.floor(
                Math.random() *
                characters.length
            )
        );

    }

    return id;

}


// ===============================
// CONTINUE → SUMMARY
// ===============================

orderBtn.addEventListener(
    "click",
    function () {

        if (selectedFiles.length === 0) {

            alert("Please select files first.");

            return;

        }


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


        orderId.textContent =
            generateOrderId();


        summaryFiles.innerHTML = "";


        selectedFiles.forEach(
            (file, index) => {

                const item =
                    document.createElement("div");

                item.style.padding = "10px";

                item.style.marginBottom = "8px";

                item.style.background = "#f5f5f5";

                item.style.borderRadius = "10px";

                item.style.fontSize = "14px";

                item.textContent =
                    `📄 ${index + 1}. ${file.name}`;

                summaryFiles.appendChild(item);

            }
        );


        summaryPages.textContent =
            totalPages;

        summaryType.textContent =
            type === "bw"
                ? "⚫ B/W"
                : "🌈 Colour";

        summaryCopies.textContent =
            copies;

        summaryTotal.textContent =
            "₹" + total;


        document
            .getElementById("uploadCard")
            .style.display = "none";

        summarySection.style.display =
            "block";


        summarySection.scrollIntoView({
            behavior: "smooth"
        });

    }
);


// ===============================
// EDIT ORDER
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
// ONLINE PAYMENT PLACEHOLDER
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
