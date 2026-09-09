const API_BASE = "https://printshop-q8id.onrender.com";

let prices = { bw: 2, color: 10 };
let shopOnline = true;
let currentOrder = null;
let statusCheckInterval = null;

const $ = id => document.getElementById(id);

/* ---------------- 1. LOAD SETTINGS & PRICES ---------------- */

async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/api/settings?t=${Date.now()}`);
        const data = await res.json();

        if (data.success && data.settings) {
            prices.bw = Number(data.settings.bwPrice) || 2;
            prices.color = Number(data.settings.colorPrice) || 10;
            shopOnline = Boolean(data.settings.shopOnline);

            updatePriceDisplay();
            updateShopStatusDisplay();
            calculateTotal();
        }
    } catch (err) {
        console.error("Settings load error:", err);
    }
}

function updatePriceDisplay() {
    if ($("bwPriceLabel")) $("bwPriceLabel").textContent = `₹${prices.bw} / page`;
    if ($("colorPriceLabel")) $("colorPriceLabel").textContent = `₹${prices.color} / page`;
}

function updateShopStatusDisplay() {
    const badge = $("shopStatusBadge");
    if (!badge) return;

    if (shopOnline) {
        badge.textContent = "● Online";
        badge.style.background = "#e6f4ea";
        badge.style.color = "#137333";
    } else {
        badge.textContent = "● Offline";
        badge.style.background = "#fce8e6";
        badge.style.color = "#c5221f";
    }
}

/* ---------------- 2. AUTO PDF DETECTION + FILE-WISE COPIES/PAGES ---------------- */

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const fileInput = $("fileInput");
const fileDropArea = $("fileDropArea");
let selectedFiles = []; 

if (fileDropArea && fileInput) {
    fileDropArea.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
        const newRawFiles = Array.from(e.target.files);

        for (let file of newRawFiles) {
            // DUPLICATE CHECK
            const isDuplicate = selectedFiles.some(f => f.fileObject.name === file.name && f.fileObject.size === file.size);
            
            if (isDuplicate) {
                const sound = $("clickSound");
                if (sound) {
                    sound.currentTime = 0;
                    
                    // Sound promise play hone do phir 100ms baad alert dikhao
                    sound.play().then(() => {
                        setTimeout(() => {
                            alert(`"${file.name}" pehle se selected hai!`);
                        }, 100);
                    }).catch(err => {
                        console.log("Audio play error:", err);
                        alert(`"${file.name}" pehle se selected hai!`);
                    });
                } else {
                    alert(`"${file.name}" pehle se selected hai!`);
                }
                
                // Form input reset karein taaki same file dubara select karne par event triger ho
                e.target.value = "";
                continue;
            }

            let pageCount = 1;
            const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

            if (isPdf) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    pageCount = pdf.numPages;
                } catch (err) {
                    console.error("PDF page count error:", err);
                    pageCount = 1;
                }
            }

            selectedFiles.push({
                fileObject: file,
                isPdf: isPdf,
                pages: pageCount,
                copies: 1
            });
        }

        // Input value reset karein taaki user wahi file dubara click kare toh 'change' event ho
        e.target.value = "";
        updateFileInputAndUI();
    });
}


function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileInputAndUI();
} 

function updateFileProp(index, prop, value) {
    const val = Number(value);
    if (val >= 1) {
        selectedFiles[index][prop] = val;
        calculateTotal();
    }
} 

function updateFileInputAndUI() {
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach(item => dataTransfer.items.add(item.fileObject));
    fileInput.files = dataTransfer.files;

    if ($("fileNameDisplay")) {
        $("fileNameDisplay").textContent = selectedFiles.length > 0 
            ? `${selectedFiles.length} file(s) selected` 
            : "Upload File";
    }

    renderFilePreviews();
    calculateTotal();
}

function renderFilePreviews() {
    const container = $("fileListContainer");
    if (!container) return;

    container.innerHTML = "";

    selectedFiles.forEach((item, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";

        const isImage = item.fileObject.type.startsWith("image/");
        let thumbnailHTML = isImage 
            ? `<img src="${URL.createObjectURL(item.fileObject)}" class="file-thumbnail" alt="preview">`
            : `<div class="file-icon-placeholder">📄</div>`;

        let controlsHTML = "";
        
        if (item.isPdf) {
            controlsHTML = `
                <div class="file-controls-row">
                    <label>
                        <span>Pages:</span>
                        <input type="number" min="1" value="${item.pages}" 
                               oninput="updateFileProp(${index}, 'pages', this.value)">
                    </label>
                    <label>
                        <span>Copies:</span>
                        <input type="number" min="1" value="${item.copies}" 
                               oninput="updateFileProp(${index}, 'copies', this.value)">
                    </label>
                </div>
            `;
        } else {
            controlsHTML = `
                <div class="file-controls-row">
                    <span class="img-tag">Image</span>
                    <label>
                        <span>Copies:</span>
                        <input type="number" min="1" value="${item.copies}" 
                               oninput="updateFileProp(${index}, 'copies', this.value)">
                    </label>
                </div>
            `;
        }

        fileItem.innerHTML = `
            <div class="file-main-row">
                <div class="file-info">
                    ${thumbnailHTML}
                    <span class="file-name" title="${item.fileObject.name}">${item.fileObject.name}</span>
                </div>
                <button class="remove-file-btn" onclick="removeFile(${index})">✕</button>
            </div>
            ${controlsHTML}
        `;

        container.appendChild(fileItem);
    });
 }

function calculateTotal() {
    const isColor = $("typeColor")?.checked;
    const pricePerPage = isColor ? prices.color : prices.bw;

    let grandTotalPages = 0;
    selectedFiles.forEach(item => {
        grandTotalPages += (item.pages * item.copies);
    });

    if ($("totalPages")) $("totalPages").textContent = grandTotalPages;
    if ($("totalAmount")) $("totalAmount").textContent = `₹${grandTotalPages * pricePerPage}`;
}

$("typeBW")?.addEventListener("change", calculateTotal);
$("typeColor")?.addEventListener("change", calculateTotal);

/* ---------------- 3. SINGLE CONTINUE BUTTON LOGIC & SOUND ---------------- */

const orderBtn = $("orderBtn");

if (orderBtn) {
    orderBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // 1. HARD BLOCK: Agar 0 files uploaded hain -> SOUND PLAY + ALERT
        if (!selectedFiles || selectedFiles.length === 0) {
            const sound = $("clickSound");
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(err => console.log("Audio play error:", err));
            }
            alert("Kripya pehle kam se kam 1 file upload karein!");
            return false;
        }

        // 2. Offline check
        if (!shopOnline) {
            alert("Shop is currently offline!");
            return false;
        }

        // 3. File uploaded hai toh Direct Summary screen par jao (No Sound)
        goToSummaryScreen();
    });
}


function goToSummaryScreen() {
    const isColor = $("typeColor")?.checked;
    const printType = isColor ? "color" : "bw";

    let totalPagesSum = 0;
    selectedFiles.forEach(item => {
        totalPagesSum += (item.pages * item.copies);
    });

    const totalAmount = totalPagesSum * (isColor ? prices.color : prices.bw);
    const orderId = "PS-" + Math.random().toString(36).substr(2, 6).toUpperCase();

    currentOrder = {
        orderId,
        files: selectedFiles.map(f => ({ name: f.fileObject.name, pages: f.pages, copies: f.copies })),
        printType,
        totalPages: totalPagesSum,
        totalAmount
    };

    // Update Summary Screen UI
    if ($("summaryOrderId")) $("summaryOrderId").textContent = orderId;
    if ($("summaryFiles")) $("summaryFiles").textContent = `${selectedFiles.length} file(s)`;
    if ($("summaryPages")) $("summaryPages").textContent = totalPagesSum;
    if ($("summaryType")) $("summaryType").textContent = isColor ? "Colour" : "B/W";
    if ($("summaryTotal")) $("summaryTotal").textContent = `₹${totalAmount}`;

    $("mainFormCard")?.classList.add("hidden");
    $("orderBtn")?.classList.add("hidden");
    $("summary")?.classList.remove("hidden");
}

/* Edit Button Click */
$("editBtn")?.addEventListener("click", () => {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    if ($("orderStatusContainer")) $("orderStatusContainer").innerHTML = "";
    $("paymentButtonsGroup")?.classList.remove("hidden");

    $("summary")?.classList.add("hidden");
    $("mainFormCard")?.classList.remove("hidden");
    $("orderBtn")?.classList.remove("hidden");
});

/* ---------------- 4. ORDER CREATION & POLLING ---------------- */

async function submitOrder(paymentType) {
    if (!currentOrder) return;

    try {
        showWaitingUI();
        $("paymentButtonsGroup")?.classList.add("hidden");

        const payload = {
            ...currentOrder,
            status: paymentType === "cash" ? "CASH_PENDING" : "PENDING_PAYMENT"
        };

        const res = await fetch(`${API_BASE}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            startStatusPolling(currentOrder.orderId);
        } else {
            alert(data.message || "Failed to create order");
            $("paymentButtonsGroup")?.classList.remove("hidden");
            if ($("orderStatusContainer")) $("orderStatusContainer").innerHTML = "";
        }
    } catch (err) {
        console.error("Order submit error:", err);
        alert("Network error, please try again.");
        $("paymentButtonsGroup")?.classList.remove("hidden");
    }
}

function startStatusPolling(orderId) {
    if (statusCheckInterval) clearInterval(statusCheckInterval);

    statusCheckInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderId)}`);
            const data = await res.json();

            if (data.success && data.order) {
                const status = data.order.status;

                if (status === "ACCEPTED" || status === "PRINTING") {
                    clearInterval(statusCheckInterval);
                    showAcceptedUI();
                } else if (status === "REJECTED") {
                    clearInterval(statusCheckInterval);
                    showRejectedUI();
                }
            }
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 2500);
}

function showWaitingUI() {
    const container = $("orderStatusContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="status-card waiting">
            <div class="spinner"></div>
            <p style="margin: 0; font-weight: 600; font-size: 14px;">Rukk ja bhai 😭...</p>
        </div>
    `;
}

function showAcceptedUI() {
    const container = $("orderStatusContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="status-card accepted">
            <div class="printer-animated">🖨️</div>
            <h4 style="margin: 6px 0 2px; font-size: 16px;">Order Accepted!</h4>
            <p style="margin: 0; font-size: 13px;">Your document is printing now...</p>
        </div>
    `;
}

function showRejectedUI() {
    const container = $("orderStatusContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="status-card rejected">
            <p style="margin: 0; font-weight: 600;">❌ Order Rejected by Shopkeeper</p>
        </div>
    `;
}

$("payBtn")?.addEventListener("click", () => submitOrder("online"));
$("cashBtn")?.addEventListener("click", () => submitOrder("cash"));

/* ---------------- INITIALIZATION ---------------- */

loadSettings();
setInterval(loadSettings, 5000);
    
