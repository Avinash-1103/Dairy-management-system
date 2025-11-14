// dashboard.js
// 🕒 Set today's date at load
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("rec_date_milk");
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;

    (async () => {
        try {
            await loadCurrentShift();
            await loadSummary();
            await loadRecords();
        } catch (err) {
            console.error("⚠️ Init error:", err);
        }

        bindUI();
        bindNavbar();
        bindFarmerPopup();
        bindAdvancePopup();
        bindReportsPopup();
        bindRatePopup();
        bindSalePopup();
        bindPasswordPopup();
        bindBillPopup();
        bindGenerateReportPopup();
        bindThemeToggle();
        bindShowAllButton();
        enableReportExportButtons();

    })();

    document.getElementById("fat").addEventListener("input", validateFatSnf);
    document.getElementById("snf").addEventListener("input", validateFatSnf);

    document.getElementById("litres").addEventListener("keydown", blockNegative);
    document.getElementById("litres").addEventListener("input", validateAllInputs);

    document.getElementById("fat").addEventListener("keydown", blockNegative);
    document.getElementById("fat").addEventListener("input", validateAllInputs);

    document.getElementById("snf").addEventListener("keydown", blockNegative);
    document.getElementById("snf").addEventListener("input", validateAllInputs);


});


function blockNegative(e) {
    if (e.key === "-" || e.key === "+") {
        e.preventDefault();
    }
}

function validateAllInputs() {
    const litres = parseFloat(document.getElementById("litres").value) || 0;
    const fat = parseFloat(document.getElementById("fat").value) || 0;
    const snf = parseFloat(document.getElementById("snf").value) || 0;
    const saveBtn = document.getElementById("saveBtn");

    let valid = true;

    // Litres validation
    if (litres <= 0) {
        document.getElementById("litres").classList.add("error");
        valid = false;
    } else {
        document.getElementById("litres").classList.remove("error");
    }

    // Fat validation
    if (fat < 2 || fat > 10) {
        document.getElementById("fat").classList.add("error");
        valid = false;
    } else {
        document.getElementById("fat").classList.remove("error");
    }

    // SNF validation
    if (snf < 6 || snf > 10) {
        document.getElementById("snf").classList.add("error");
        valid = false;
    } else {
        document.getElementById("snf").classList.remove("error");
    }

    saveBtn.disabled = !valid;
    saveBtn.style.opacity = valid ? "1" : "0.4";
}


// 🌓 Theme Toggle
function bindThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;

    // Load saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        btn.textContent = "☀️ Light Mode";
    }

    // Toggle on click
    btn.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        btn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });
}


function bindNavbar() {
    // 🔒 Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to logout?")) {
                window.location.href = "index.html"; // back to login
            }
        });
    }

    // 📊 Open Reports Popup (topbar button)
    const openReportsBtn = document.getElementById("openReportsBtn");
    if (openReportsBtn) {
        openReportsBtn.addEventListener("click", () => {
            const popup = document.getElementById("reportsPopup");
            popup.style.display = "block";
            const today = new Date().toISOString().slice(0, 10);
            document.getElementById("report_start").value = today;
            document.getElementById("report_end").value = today;
        });
    }

    // 🧾 Create Bill Popup (topbar button)
    const createBillBtn = document.getElementById("createMonthlyBtn");
    if (createBillBtn) {
        createBillBtn.addEventListener("click", () => {
            const popup = document.getElementById("billPopup");
            popup.style.display = "block";
            const today = new Date();
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            document.getElementById("bill_start").value = weekAgo.toISOString().slice(0, 10);
            document.getElementById("bill_end").value = today.toISOString().slice(0, 10);
        });
    }

    // 📤 Generate Report Popup (renamed topbar button)
    const openGenerateReportBtn = document.getElementById("openGenerateReportPopup");
    if (openGenerateReportBtn) {
        openGenerateReportBtn.addEventListener("click", () => {
            const popup = document.getElementById("generateReportPopup");
            popup.style.display = "block";
            const today = new Date().toISOString().slice(0, 10);
            document.getElementById("genReport_start").value = today;
            document.getElementById("genReport_end").value = today;
        });
    }

    console.log("✅ Navbar bindings active");
}


function bindUI() {
    document.getElementById("calcBtn").addEventListener("click", calculateAmount);
    document.getElementById("saveBtn").addEventListener("click", saveRecord);
    document.getElementById("farmerCode").addEventListener("blur", lookupFarmer);
    document.getElementById("showShift").addEventListener("change", async () => {
        await loadRecords();
    });

    // 🗓 Change listener for the new milk date field
    document.getElementById("rec_date_milk").addEventListener("change", async () => {
        await loadRecords();
    });

    // Tabs
    document.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", async () => {
            document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
            document.querySelectorAll(".tabcontent").forEach(x => x.classList.remove("active"));

            btn.classList.add("active");
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add("active");

            if (tabId === "milk") await loadRecords();
            else if (tabId === "adv") await loadAdvances();
            else if (tabId === "sales") await loadSales();
        });
    });
}



async function callApi(method, payload = {}) {
    try {
        const resp = await window.pywebview.api[method](JSON.stringify(payload));
        return JSON.parse(resp);
    } catch (err) {
        console.error("API error", err);
        return { success: false, message: "Backend error" };
    }
}

// 🟢 "Show All Records" toggle
function bindShowAllButton() {
    const btn = document.getElementById("showAllBtn");
    if (!btn) return;

    let showingAll = false;

    btn.addEventListener("click", async () => {
        showingAll = !showingAll;

        if (showingAll) {
            btn.textContent = "🔍 Show Filtered";
            console.log("📜 Loading ALL milk records (no date/shift filter)");
            const res = await callApi("fetch_records", {}); // no filters
            renderMilkTable(res);
        } else {
            btn.textContent = "📜 Show All";
            console.log("🔁 Loading filtered milk records");
            await loadRecords();
        }
    });
}

// 🧩 Helper: render milk records into table
function renderMilkTable(res) {
    const tbody = document.querySelector("#recordsTable tbody");
    tbody.innerHTML = "";

    if (res.success && res.records.length > 0) {
        let shiftCount = {};
        res.records.forEach(r => {
            const sh = r.shift || "Unknown";
            if (!shiftCount[sh]) shiftCount[sh] = 0;
            shiftCount[sh]++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.id} <span class="shift-id">(${sh} #${shiftCount[sh]})</span></td>
                <td>${r.rec_date}</td>
                <td>${r.farmer_code || ""}</td>
                <td>${r.farmer_name || ""}</td>
                <td>${r.category || ""}</td>
                <td>${r.shift || ""}</td>
                <td>${Number(r.litres || 0).toFixed(2)}</td>
                <td>${r.fat || ""}</td>
                <td>${r.snf || ""}</td>
                <td>${Number(r.rate || 0).toFixed(2)}</td>
                <td>${Number(r.amount || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="11">${res.message || "No records found"}</td></tr>`;
    }
}


async function loadSummary() {
    const rec_date = document.getElementById("rec_date").value;
    const shift = document.getElementById("showShift").value;
    const res = await callApi("get_summary", { date: rec_date, shift });
    if (res.success) {
        document.getElementById("farmersCount").textContent = `Farmers: ${res.farmers_count}`;
        document.getElementById("milkToday").textContent = `Milk Today (${shift}): ${Number(res.total_litres).toFixed(2)} L (None)`;
        document.getElementById("amountToday").textContent = `Amount Today: ₹${Number(res.total_amount).toFixed(2)}`;
        document.getElementById("totalRecords").textContent = `Total Records: ${res.total_records}`;
    } else {
        console.warn(res.message);
    }
}

async function loadRecords() {
    const rec_date = document.getElementById("rec_date_milk").value?.trim();
    const shift = document.getElementById("showShift").value?.trim();

    console.log("Loading records for:", rec_date, shift);

    const res = await callApi("fetch_records", { date: rec_date, shift });
    console.log("Fetched records:", res);

    const tbody = document.querySelector("#recordsTable tbody");
    tbody.innerHTML = "";

    if (res.success && res.records.length > 0) {
        let shiftCount = {};
        res.records.forEach(r => {
            const sh = r.shift || "Unknown";
            if (!shiftCount[sh]) shiftCount[sh] = 0;
            shiftCount[sh]++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.id} <span class="shift-id">(${sh} #${shiftCount[sh]})</span></td>
                <td>${r.rec_date}</td>
                <td>${r.farmer_code || ""}</td>
                <td>${r.farmer_name || ""}</td>
                <td>${r.category || ""}</td>
                <td>${r.shift || ""}</td>
                <td>${Number(r.litres || 0).toFixed(2)}</td>
                <td>${r.fat || ""}</td>
                <td>${r.snf || ""}</td>
                <td>${Number(r.rate || 0).toFixed(2)}</td>
                <td>${Number(r.amount || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="11">${res.message || "No records found"}</td></tr>`;
    }
}


async function loadFarmers() {
    const tbody = document.querySelector("#farmerTable tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5">Loading farmers...</td></tr>`;
    const res = await callApi("get_all_farmers");

    tbody.innerHTML = "";

    if (!res.success || !res.farmers?.length) {
        tbody.innerHTML = `<tr><td colspan="5">No farmers found</td></tr>`;
        return;
    }

    res.farmers.forEach(f => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${f.id}</td>
            <td>${f.code}</td>
            <td><input value="${f.name}" id="fname_${f.id}" /></td>
            <td><input value="${f.category}" id="fcat_${f.id}" /></td>
            <td>
                <button onclick="updateFarmer(${f.id})" class="btn-small">💾</button>
                <button onclick="deleteFarmer(${f.id})" class="btn-small danger">🗑️</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

async function loadAdvances() {
    const tbody = document.querySelector("#advanceTable tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6">Loading advances...</td></tr>`;
    const res = await callApi("get_all_advances");

    tbody.innerHTML = "";

    if (!res.success || !res.advances?.length) {
        tbody.innerHTML = `<tr><td colspan="6">No advances found</td></tr>`;
        return;
    }

    res.advances.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.id}</td>
            <td>${a.farmer_code}</td>
            <td>${a.date}</td>
            <td>₹${Number(a.amount).toFixed(2)}</td>
            <td>${a.remarks || ""}</td>
            <td><button class="btn-small danger" onclick="deleteAdvance(${a.id})">🗑️</button></td>`;
        tbody.appendChild(tr);
    });
}

async function loadSales() {
    const tbody = document.querySelector("#salesTable tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7">Loading sales...</td></tr>`;
    const res = await callApi("get_all_sales");

    tbody.innerHTML = "";

    if (!res.success || !res.sales?.length) {
        tbody.innerHTML = `<tr><td colspan="7">No sales found</td></tr>`;
        document.getElementById("salesTotalLitres").textContent = "Total Litres: 0 L";
        document.getElementById("salesTotalAmount").textContent = "Total Sales: ₹0.00";
        return;
    }

    let totalLitres = 0, totalAmount = 0;
    res.sales.forEach(s => {
        totalLitres += Number(s.litres);
        totalAmount += Number(s.amount);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${s.id}</td>
            <td>${s.sale_date}</td>
            <td>${s.customer}</td>
            <td>${Number(s.litres).toFixed(2)}</td>
            <td>₹${Number(s.rate).toFixed(2)}</td>
            <td>₹${Number(s.amount).toFixed(2)}</td>
            <td><button class="btn-small danger" onclick="deleteSale(${s.id})">🗑️</button></td>`;
        tbody.appendChild(tr);
    });

    document.getElementById("salesTotalLitres").textContent = `Total Litres: ${totalLitres.toFixed(2)} L`;
    document.getElementById("salesTotalAmount").textContent = `Total Sales: ₹${totalAmount.toFixed(2)}`;
}



async function lookupFarmer() {
    const code = document.getElementById("farmerCode").value.trim();
    if (!code) return;
    const res = await callApi("get_farmer_by_code", code);
    if (res.success) {
        const f = res.farmer;
        document.getElementById("category").value = f.category || "";
        // optionally set farmer name into hidden field or reuse farmer_name input
    } else {
        // not found
        // optional: show a small message
    }
}

async function updateFarmer(id) {
    const name = document.getElementById(`fname_${id}`).value.trim();
    const category = document.getElementById(`fcat_${id}`).value.trim();

    if (!name || !category) {
        alert("Name and category required!");
        return;
    }

    const res = await callApi("update_farmer", { id, name, category });
    if (res.success) {
        alert("✅ Farmer updated!");
        loadFarmers(); // refresh table
    } else {
        alert("❌ " + res.message);
    }
}


function calculateAmount() {
    const litres = parseFloat(document.getElementById("litres").value || 0);
    const rate = parseFloat(document.getElementById("rate").value || 0);
    const amount = litres * rate;
    document.getElementById("amount").value = amount.toFixed(2);
}

function validateMilkInputs() {
    const fat = parseFloat(document.getElementById("fat").value);
    const snf = parseFloat(document.getElementById("snf").value);

    if (isNaN(fat) || isNaN(snf)) {
        alert("⚠️ Please enter valid numeric values for Fat & SNF.");
        return false;
    }
    if (fat < 2.0 || fat > 8.0) {
        alert("⚠️ Fat must be between 2.0 and 8.0");
        return false;
    }
    if (snf < 7.0 || snf > 9.5) {
        alert("⚠️ SNF must be between 7.0 and 9.5");
        return false;
    }
    return true;
}

function validateFatSnf() {
    const fatInput = document.getElementById("fat");
    const snfInput = document.getElementById("snf");
    const saveBtn = document.getElementById("saveBtn");

    const fat = parseFloat(fatInput.value);
    const snf = parseFloat(snfInput.value);

    let valid = true;

    // FAT validation (2.0 - 8.0)
    if (isNaN(fat) || fat < 2.0 || fat > 8.0) {
        fatInput.classList.add("invalid");
        valid = false;
    } else {
        fatInput.classList.remove("invalid");
    }

    // SNF validation (7.0 - 9.5)
    if (isNaN(snf) || snf < 7.0 || snf > 9.5) {
        snfInput.classList.add("invalid");
        valid = false;
    } else {
        snfInput.classList.remove("invalid");
    }

    // Enable/Disable Save button
    saveBtn.disabled = !valid;
}



async function saveRecord() {

    if (!validateMilkInputs()) return;

    const payload = {
        rec_date: document.getElementById("rec_date").value,
        farmer_code: document.getElementById("farmerCode").value.trim(),
        farmer_name: "", // optional: add name field later
        category: document.getElementById("category").value,
        shift: document.getElementById("shift").value,
        litres: document.getElementById("litres").value,
        fat: document.getElementById("fat").value,
        snf: document.getElementById("snf").value,
        rate: document.getElementById("rate").value,
        amount: document.getElementById("amount").value
    };

    if (!payload.farmer_code) {
        alert("Please enter Farmer Code");
        return;
    }

    // 🧠 Auto-fill rate if empty
    if (!payload.rate) {
        const resRate = await callApi("get_rate_for_category", { category: payload.category });
        if (resRate.success) {
            payload.rate = resRate.rate;
        } else {
            alert(`No rate found for category '${payload.category}'`);
            return;
        }
    }

    // Auto-calculate amount if not filled
    if (!payload.amount && payload.litres && payload.rate) {
        payload.amount = (parseFloat(payload.litres) * parseFloat(payload.rate)).toFixed(2);
        document.getElementById("amount").value = payload.amount;
    }

    // ---- Now save ----
    const res = await callApi("save_record", payload);

    if (res.success) {
        alert("✅ Record saved successfully!");

        const tbody = document.querySelector("#recordsTable tbody");
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>—</td>
      <td>${payload.rec_date}</td>
      <td>${payload.farmer_code}</td>
      <td>${payload.farmer_name || ""}</td>
      <td>${payload.category || ""}</td>
      <td>${payload.shift}</td>
      <td>${Number(payload.litres || 0).toFixed(2)}</td>
      <td>${payload.fat || ""}</td>
      <td>${payload.snf || ""}</td>
      <td>${Number(payload.rate || 0).toFixed(2)}</td>
      <td>${Number(payload.amount || 0).toFixed(2)}</td>
    `;

        if (tbody.firstChild) tbody.insertBefore(tr, tbody.firstChild);
        else tbody.appendChild(tr);

        await loadSummary();
        ["litres", "fat", "snf", "rate", "amount"].forEach(id => document.getElementById(id).value = "");
    } else {
        alert("❌ Failed to save record: " + (res.message || "Unknown error"));
    }
}


// -------------------------------
// Farmer Popup Logic
// -------------------------------

function bindFarmerPopup() {
    const popup = document.getElementById("farmerPopup");
    const closeBtn = document.getElementById("closeFarmerPopup");
    const addBtn = document.getElementById("addFarmerBtn");

    // Open popup when Manage Farmers is clicked
    document.getElementById("manageFarmersBtn").addEventListener("click", async () => {
        popup.style.display = "block";
        await loadFarmers();
    });

    // Close popup
    closeBtn.addEventListener("click", () => {
        popup.style.display = "none";
    });

    // Click outside to close
    window.addEventListener("click", (e) => {
        if (e.target === popup) {
            popup.style.display = "none";
        }
    });

    // Add farmer
    addBtn.addEventListener("click", async () => {
        const code = document.getElementById("f_code").value.trim();
        const name = document.getElementById("f_name").value.trim();
        const category = document.getElementById("f_category").value.trim();

        if (!code || !name || !category) {
            alert("All fields required!");
            return;
        }

        const res = await callApi("add_farmer", { code, name, category });
        alert(res.message);
        if (res.success) {
            document.getElementById("f_code").value = "";
            document.getElementById("f_name").value = "";
            document.getElementById("f_category").value = "";
            loadFarmers();
        }
    });
}

// Load farmers into table
async function loadFarmers() {
    const res = await callApi("get_all_farmers");
    const tbody = document.querySelector("#farmerTable tbody");
    tbody.innerHTML = "";

    if (res.success) {
        res.farmers.forEach(f => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${f.id}</td>
        <td>${f.code}</td>
        <td><input id="fname_${f.id}" value="${f.name}"></td>
        <td><input id="fcat_${f.id}" value="${f.category}"></td>
        <td>
          <button onclick="updateFarmer(${f.id})">💾</button>
          <button onclick="deleteFarmer(${f.id})">🗑️</button>
        </td>
      `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="5">${res.message}</td></tr>`;
    }
}

async function updateFarmer(id) {
    const name = document.getElementById(`fname_${id}`).value.trim();
    const category = document.getElementById(`fcat_${id}`).value.trim();
    const res = await callApi("update_farmer", { id, name, category });
    alert(res.message);
    if (res.success) loadFarmers();
}

async function deleteFarmer(id) {
    if (!confirm("Delete this farmer?")) return;
    const res = JSON.parse(await window.pywebview.api.delete_farmer(id));
    alert(res.message);
    if (res.success) loadFarmers();
}

// -------------------------------
// RATE TABLE POPUP
// -------------------------------
function bindRatePopup() {
    const popup = document.getElementById("ratePopup");
    const closeBtn = document.getElementById("closeRatePopup");
    const addBtn = document.getElementById("addRateBtn");

    // Open popup
    document.getElementById("rateTableBtn").addEventListener("click", async () => {
        popup.style.display = "block";
        await loadRates();
    });

    // Close popup
    closeBtn.addEventListener("click", () => popup.style.display = "none");
    window.addEventListener("click", e => { if (e.target === popup) popup.style.display = "none"; });

    // Add / Update Rate
    addBtn.addEventListener("click", async () => {
        const category = document.getElementById("r_category").value.trim();
        const base = document.getElementById("r_base").value.trim();
        const fat_rate = document.getElementById("r_fat").value.trim();
        const snf_rate = document.getElementById("r_snf").value.trim();

        if (!category) {
            alert("Please enter category name");
            return;
        }

        const res = await callApi("add_rate", { category, base, fat_rate, snf_rate });
        alert(res.message);

        if (res.success) {
            // ✅ Clear input fields
            ["r_category", "r_base", "r_fat", "r_snf"].forEach(id => document.getElementById(id).value = "");

            // ✅ Wait for backend to commit and reload table
            await loadRates();  // make sure this line has "await"
        }
    });

    async function loadRates() {
        const res = await callApi("get_rates");
        const tbody = document.querySelector("#rateTable tbody");
        tbody.innerHTML = "";

        if (res.success && res.rates.length > 0) {
            res.rates.forEach(r => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
        <td>${r.category}</td>
        <td>${Number(r.base).toFixed(2)}</td>
        <td>${Number(r.fat_rate).toFixed(2)}</td>
        <td>${Number(r.snf_rate).toFixed(2)}</td>
        <td><button onclick="deleteRate('${r.category}')">🗑️</button></td>
      `;
                tbody.appendChild(tr);
            });
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5" style="text-align:center;color:#777;">No rates defined yet</td>`;
            tbody.appendChild(tr);
        }
    }

}

async function deleteRate(category) {
    if (!confirm(`Delete rate for ${category}?`)) return;
    const res = await callApi("delete_rate", { category });
    alert(res.message);
    if (res.success) loadRates();
}

async function autoCalculateRate() {
    const category = document.getElementById("category").value.trim();
    const fat = parseFloat(document.getElementById("fat").value || 0);
    const snf = parseFloat(document.getElementById("snf").value || 0);

    if (!category || (!fat && !snf)) return;

    const res = await callApi("calculate_rate", { category, fat, snf });
    if (res.success) {
        document.getElementById("rate").value = res.rate.toFixed(2);
        document.getElementById("amount").value = (res.rate * (document.getElementById("litres").value || 0)).toFixed(2);
    }
}

// Trigger whenever category, fat, or snf changes
["category", "fat", "snf"].forEach(id => {
    document.getElementById(id).addEventListener("change", autoCalculateRate);
});

function bindPasswordPopup() {
    const popup = document.getElementById("passwordPopup");
    const openBtn = document.getElementById("changePasswordBtn");
    const closeBtn = document.getElementById("closePasswordPopup");
    const saveBtn = document.getElementById("changePassBtn");

    // 🟢 Check if openBtn exists before attaching event
    if (!openBtn) {
        console.warn("Change Password button not found in DOM!");
        return;
    }

    // Open popup
    openBtn.addEventListener("click", () => {
        popup.style.display = "block";
    });

    // Close popup
    closeBtn.addEventListener("click", () => popup.style.display = "none");
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    // Save password
    saveBtn.addEventListener("click", async () => {
        const oldPass = document.getElementById("oldPass").value.trim();
        const newPass = document.getElementById("newPass").value.trim();
        if (!oldPass || !newPass) return alert("Both fields required!");
        const res = await callApi("change_password", { oldPass, newPass });
        alert(res.message);
        if (res.success) popup.style.display = "none";
    });
}


async function bindStartShiftBtn() {
    const btn = document.getElementById("startShiftBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        if (!confirm("Start new shift? This will toggle between Morning/Evening.")) return;
        const res = await callApi("start_new_shift");
        if (res.success) {
            alert(res.message);
            document.getElementById("shift").value = res.shift;
            updateShiftInfo(res.shift, new Date().toISOString().slice(0, 10));
            await loadSummary(); // refresh totals for new shift
        } else {
            alert("❌ Failed to start new shift: " + res.message);
        }
    });
}

function updateShiftInfo(shift, date) {
    const bar = document.getElementById("shiftInfoBar");
    document.getElementById("shiftLabel").textContent = shift;
    document.getElementById("dateLabel").textContent = date;

    bar.classList.add("flash");
    setTimeout(() => bar.classList.remove("flash"), 600);
}

async function loadCurrentShift() {
    const res = await callApi("get_current_shift");
    if (res.success) {
        document.getElementById("shift").value = res.shift;
        document.getElementById("rec_date").value = res.date;
        updateShiftInfo(res.shift, res.date);
    } else {
        console.warn("⚠️ Failed to load shift:", res.message);
    }
}

window.addEventListener("scroll", () => {
    const bar = document.getElementById("shiftInfoBar");
    if (window.scrollY > 40) bar.classList.add("is-sticky");
    else bar.classList.remove("is-sticky");
});

function bindAdvancePopup() {
    const popup = document.getElementById("advancePopup");
    const closeBtn = document.getElementById("closeAdvancePopup");
    const addBtn = document.getElementById("addAdvanceBtn");
    const farmerInput = document.getElementById("adv_farmer_code");

    // 🟣 Open popup when "Record Advance" button is clicked
    document.getElementById("recordAdvanceBtn").addEventListener("click", async () => {
        popup.style.display = "block";
        await loadPopupAdvances();
        document.getElementById("adv_date").value = new Date().toISOString().slice(0, 10);
    });

    // 🔒 Close popup
    closeBtn.addEventListener("click", () => (popup.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    // 💰 Add new advance record
    addBtn.addEventListener("click", async () => {
        const farmer_code = farmerInput.value.trim();
        const date = document.getElementById("adv_date").value;
        const amount = document.getElementById("adv_amount").value;
        const remarks = document.getElementById("adv_remarks").value.trim();

        if (!farmer_code || !amount) {
            alert("⚠️ Farmer code and amount are required!");
            return;
        }

        const res = await callApi("add_advance", { farmer_code, date, amount, remarks });
        alert(res.message);

        if (res.success) {
            ["adv_farmer_code", "adv_amount", "adv_remarks"].forEach(
                (id) => (document.getElementById(id).value = "")
            );
            await loadPopupAdvances();
        }
    });

    // 🧠 OPTIONAL: Auto-check farmer name when typing code (fast confirmation)
    farmerInput.addEventListener("blur", async () => {
        const code = farmerInput.value.trim();
        if (!code) return;

        const res = await callApi("get_farmer_by_code", code);
        const remarksField = document.getElementById("adv_remarks");

        if (res.success) {
            remarksField.placeholder = `Farmer: ${res.farmer.name}`;
        } else {
            remarksField.placeholder = "Farmer not found!";
        }
    });
}

async function loadPopupAdvances() {
    const tbody = document.querySelector("#advancePopupTable tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6">Loading advances...</td></tr>`;
    const res = await callApi("get_all_advances");

    tbody.innerHTML = "";

    if (!res.success || !res.advances?.length) {
        tbody.innerHTML = `<tr><td colspan="6">No advances found</td></tr>`;
        return;
    }

    res.advances.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.id}</td>
            <td>${a.farmer_code}</td>
            <td>${a.date}</td>
            <td>₹${Number(a.amount).toFixed(2)}</td>
            <td>${a.remarks || ""}</td>
            <td><button class="btn-small danger" onclick="deleteAdvance(${a.id})">🗑️</button></td>`;
        tbody.appendChild(tr);
    });
}

async function loadAdvances() {
    const res = await callApi("get_all_advances");
    const tbody = document.querySelector("#advanceTable tbody");
    tbody.innerHTML = "";

    if (res.success && res.advances.length > 0) {
        res.advances.forEach((a) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.farmer_code}</td>
        <td>${a.date}</td>
        <td>₹${Number(a.amount).toFixed(2)}</td>
        <td>${a.remarks || ""}</td>
        <td>
          <button onclick="deleteAdvance(${a.id})" class="btn-small danger">🗑</button>
        </td>
      `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;color:#777;">No advance records found</td></tr>
    `;
    }
}

async function deleteAdvance(id) {
    if (!confirm("Delete this advance record?")) return;
    const res = await callApi("delete_advance", { id });
    alert(res.message);
    if (res.success) await loadAdvances();
}

function bindSalePopup() {
    const popup = document.getElementById("salePopup");
    const closeBtn = document.getElementById("closeSalePopup");
    const addBtn = document.getElementById("addSaleBtn");

    // 🟣 Open popup
    document.getElementById("recordSaleBtn").addEventListener("click", async () => {
        popup.style.display = "block";
        await loadSales();
        document.getElementById("sale_date").value = new Date().toISOString().slice(0, 10);
    });

    // 🔒 Close popup
    closeBtn.addEventListener("click", () => (popup.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    // 💰 Auto-calculate amount
    ["sale_litres", "sale_rate"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
            const litres = parseFloat(document.getElementById("sale_litres").value) || 0;
            const rate = parseFloat(document.getElementById("sale_rate").value) || 0;
            document.getElementById("sale_amount").value = (litres * rate).toFixed(2);
        });
    });

    // 💾 Add sale
    addBtn.addEventListener("click", async () => {
        const customer = document.getElementById("sale_customer").value.trim();
        const sale_date = document.getElementById("sale_date").value;
        const litres = document.getElementById("sale_litres").value;
        const rate = document.getElementById("sale_rate").value;

        if (!customer || !litres || !rate) {
            alert("Please fill all required fields!");
            return;
        }

        const res = await callApi("add_sale", { sale_date, customer, litres, rate });
        alert(res.message);

        if (res.success) {
            ["sale_customer", "sale_litres", "sale_rate", "sale_amount"].forEach(id => document.getElementById(id).value = "");
            await loadSales();
        }
    });
}

async function loadSales() {
    const res = await callApi("get_all_sales");

    const mainTbody = document.querySelector("#salesTable tbody");
    const popupTbody = document.querySelector("#salesPopupTable tbody"); // 👈 add this if popup exists

    const totalLitresEl = document.getElementById("salesTotalLitres");
    const totalAmountEl = document.getElementById("salesTotalAmount");

    // Clear both tables first
    if (mainTbody) mainTbody.innerHTML = "";
    if (popupTbody) popupTbody.innerHTML = "";

    let totalLitres = 0;
    let totalAmount = 0;

    if (res.success && res.sales.length > 0) {
        res.sales.forEach((s) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${s.sale_date}</td>
                <td>${s.customer}</td>
                <td>${Number(s.litres).toFixed(2)}</td>
                <td>₹${Number(s.rate).toFixed(2)}</td>
                <td>₹${Number(s.amount).toFixed(2)}</td>
                <td><button onclick="deleteSale(${s.id})" class="btn-small danger">🗑</button></td>
            `;

            // Append row to both tables if they exist
            if (mainTbody) mainTbody.appendChild(tr.cloneNode(true));
            if (popupTbody) popupTbody.appendChild(tr.cloneNode(true));

            totalLitres += Number(s.litres);
            totalAmount += Number(s.amount);
        });
    } else {
        const emptyRow = `<tr><td colspan="7" style="text-align:center;color:#777;">No sales found</td></tr>`;
        if (mainTbody) mainTbody.innerHTML = emptyRow;
        if (popupTbody) popupTbody.innerHTML = emptyRow;
    }

    // 🧮 Update summary in main table only
    if (totalLitresEl) totalLitresEl.textContent = `Total Litres: ${totalLitres.toFixed(2)} L`;
    if (totalAmountEl) totalAmountEl.textContent = `Total Sales: ₹${totalAmount.toFixed(2)}`;
}


async function deleteSale(id) {
    if (!confirm("Delete this sale record?")) return;
    const res = await callApi("delete_sale", { id });
    alert(res.message);
    if (res.success) await loadSales();
}


function bindReportsPopup() {
    const popup = document.getElementById("reportsPopup");
    const closeBtn = document.getElementById("closeReportsPopup");
    const generateBtn = document.getElementById("generateReportBtn");

    // 🟣 Open popup
    document.getElementById("openReportsBtn").addEventListener("click", () => {
        popup.style.display = "block";
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById("report_start").value = today;
        document.getElementById("report_end").value = today;
    });

    // 🔒 Close popup
    closeBtn.addEventListener("click", () => (popup.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    // 📊 Generate report
    generateBtn.addEventListener("click", async () => {
        const start_date = document.getElementById("report_start").value;
        const end_date = document.getElementById("report_end").value;

        const res = await callApi("get_reports_summary", { start_date, end_date });

        if (res.success) {
            document.getElementById("rMilkLitres").textContent = `${res.milk_litres.toFixed(2)} L`;
            document.getElementById("rMilkAmount").textContent = res.milk_amount.toFixed(2);
            document.getElementById("rSaleLitres").textContent = `${res.sale_litres.toFixed(2)} L`;
            document.getElementById("rSaleAmount").textContent = res.sale_amount.toFixed(2);
            document.getElementById("rAdvanceAmount").textContent = res.total_advances.toFixed(2);
            document.getElementById("rNetIncome").textContent = res.net_income.toFixed(2);
        } else {
            alert("Failed to fetch report: " + res.message);
        }
    });
}


function bindBillPopup() {
    const popup = document.getElementById("billPopup");
    const closeBtn = document.getElementById("closeBillPopup");
    const generateBtn = document.getElementById("generateBillBtn");

    // 🟣 Open popup
    document.getElementById("createMonthlyBtn").addEventListener("click", () => {
        popup.style.display = "block";
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        document.getElementById("bill_start").value = weekAgo.toISOString().slice(0, 10);
        document.getElementById("bill_end").value = today.toISOString().slice(0, 10);
    });

    // 🔒 Close popup
    closeBtn.addEventListener("click", () => (popup.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    document.getElementById("farmerSearchInput").addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll("#billTable tbody tr").forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
        });
    });


    // 🧾 Generate Bill
    generateBtn.addEventListener("click", async () => {
        const start_date = document.getElementById("bill_start").value;
        const end_date = document.getElementById("bill_end").value;
        const bill_type = document.querySelector('input[name="billType"]:checked').value;

        const res = await callApi("generate_bill", { start_date, end_date, bill_type });

        if (res.success && res.bills.length > 0) {
            renderBillTable(res.bills, bill_type);
        } else {
            document.getElementById("billSummaryContainer").innerHTML =
                `<p style='text-align:center;color:#777;'>No records found for selected period.</p>`;
        }
    });
}


function renderBillTable(bills, bill_type) {
    let html = `
    <h4>${bill_type === "weekly" ? "Weekly" : "Monthly"} Bill Summary</h4>
    <table>
      <thead>
        <tr>
          <th>Farmer Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Total Litres</th>
          <th>Amount</th>
          <th>Advance</th>
          <th>Net Payable</th>
        </tr>
      </thead>
      <tbody>
  `;

    bills.forEach(b => {
        html += `
      <tr>
        <td>${b.code}</td>
        <td>${b.name}</td>
        <td>${b.category}</td>
        <td>${Number(b.litres).toFixed(2)}</td>
        <td>₹${Number(b.amount).toFixed(2)}</td>
        <td>₹${Number(b.advance).toFixed(2)}</td>
        <td><b>₹${Number(b.net).toFixed(2)}</b></td>
      </tr>
    `;
    });

    html += "</tbody></table>";
    document.getElementById("billSummaryContainer").innerHTML = html;
}


function renderBillTable(bills, bill_type) {
    let html = `
    <h4>${bill_type === "weekly" ? "Weekly" : "Monthly"} Bill Summary</h4>
    <div style="max-height:350px; overflow-y:auto;"> 
    <table id="billTable">
      <thead>
        <tr>
          <th>Farmer Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Total Litres</th>
          <th>Amount</th>
          <th>Advance</th>
          <th>Net Payable</th>
        </tr>
      </thead>
      <tbody id="billTableBody">
    `;

    bills.forEach(b => {
        html += `
        <tr class="bill-row" data-code="${b.code}" data-name="${b.name}" data-category="${b.category}">
            <td>${b.code}</td>
            <td>${b.name}</td>
            <td>${b.category}</td>
            <td>${Number(b.litres).toFixed(2)}</td>
            <td>₹${Number(b.amount).toFixed(2)}</td>
            <td>₹${Number(b.advance).toFixed(2)}</td>
            <td><b>₹${Number(b.net).toFixed(2)}</b></td>
        </tr>`;
    });

    html += `</tbody></table></div>`;

    document.getElementById("billSummaryContainer").innerHTML = html;
    document.getElementById("billExportButtons").style.display = "block";

    // Enable click on farmer row
    document.querySelectorAll(".bill-row").forEach(row => {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            openIndividualBill(row.dataset.code, row.dataset.name, row.dataset.category);
        });
    });

    window.generatedBills = bills;
    window.generatedBillType = bill_type;
}

async function openIndividualBill(code, name, category) {
    const start_date = document.getElementById("bill_start").value;
    const end_date = document.getElementById("bill_end").value;

    const res = await callApi("get_individual_bill", { code, start_date, end_date });

    if (!res.success) {
        alert("Failed to load bill: " + res.message);
        return;
    }

    const data = res.data;
    let recordsHTML = "";

    data.records.forEach(r => {
        recordsHTML += `
        <tr>
            <td>${r.rec_date}</td>
            <td>${r.shift}</td>
            <td>${Number(r.litres).toFixed(2)}</td>
            <td>${Number(r.fat).toFixed(1)}</td>
            <td>${Number(r.snf).toFixed(1)}</td>
            <td>₹${Number(r.rate).toFixed(2)}</td>
            <td>₹${Number(r.amount).toFixed(2)}</td>
        </tr>`;
    });

    const html = `
    <div style="margin:20px;">
        <h2 style="text-align:center;">Varad Dairy</h2>
        <h3 style="text-align:center;">Farmer Milk Bill</h3>
        <p style="text-align:center;">Period: ${start_date} → ${end_date}</p>

        <p><b>Farmer Code:</b> ${code}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Category:</b> ${category}</p>

        <table border="1" cellspacing="0" cellpadding="6" style="width:100%; margin-top:15px; border-collapse:collapse; text-align:center;">
            <tr><th>Date</th><th>Shift</th><th>Litres</th><th>Fat</th><th>SNF</th><th>Rate</th><th>Amount</th></tr>
            ${recordsHTML}
            <tr style="font-weight:bold;background:#f3e9ff;">
                <td colspan="2">Total</td>
                <td>${data.total_litres.toFixed(2)} L</td>
                <td colspan="2"></td>
                <td colspan="2">₹${data.total_amount.toFixed(2)}</td>
            </tr>
            <tr style="font-weight:bold;background:#f3e9ff;">
                <td colspan="5">Advance Deducted</td>
                <td colspan="2">₹${data.total_advance.toFixed(2)}</td>
            </tr>
            <tr style="font-weight:bold;background:#e8d7ff;">
                <td colspan="5">Net Payable</td>
                <td colspan="2">₹${data.net.toFixed(2)}</td>
            </tr>
        </table>

        <p style="text-align:center;margin-top:20px;">Generated on: ${new Date().toLocaleString()}</p>
    </div>`;

    printIndividualBillIframe(html);
}


function printIndividualBillIframe(htmlContent) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #999; padding: 8px; text-align: center; }
                th { background: #f3e9ff; color: #4B0082; }
                h2, h3 { text-align:center; margin: 5px; color: #4B0082; }
            </style>
        </head>
        <body>${htmlContent}</body>
        </html>
    `);
    doc.close();

    iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
    };
}


function renderIndividualBill(data, info) {
    let milkRows = "";
    data.milk.forEach(m => {
        milkRows += `
        <tr>
            <td>${m.rec_date}</td>
            <td>${m.litres.toFixed(2)}</td>
            <td>${m.fat}</td>
            <td>${m.snf}</td>
            <td>${m.rate.toFixed(2)}</td>
            <td>${m.amount.toFixed(2)}</td>
        </tr>`;
    });

    let advRows = "";
    data.advances.forEach(a => {
        advRows += `
        <tr>
            <td>${a.date}</td>
            <td>${a.remarks}</td>
            <td>${a.amount.toFixed(2)}</td>
        </tr>`;
    });

    document.getElementById("billSummaryContainer").innerHTML = `
        <h3 style="text-align:center;">Farmer Bill</h3>
        <p style="text-align:center;"><b>${info.name} (${info.code})</b> | Category: ${info.category}</p>
        <p style="text-align:center;">Period: ${info.start_date} to ${info.end_date}</p>
        
        <h4>Milk Records</h4>
        <table class="scrollTable">
            <thead><tr>
                <th>Date</th><th>Litres</th><th>Fat</th><th>SNF</th><th>Rate</th><th>Amount</th>
            </tr></thead>
            <tbody>${milkRows}</tbody>
        </table>

        <h4>Advance Records</h4>
        <table class="scrollTable">
            <thead><tr>
                <th>Date</th><th>Remarks</th><th>Amount</th>
            </tr></thead>
            <tbody>${advRows}</tbody>
        </table>

        <h4 style="margin-top:15px;">Totals</h4>
        <p>Total Litres: <b>${data.total_litres.toFixed(2)}</b> L</p>
        <p>Total Amount: <b>₹${data.total_amount.toFixed(2)}</b></p>
        <p>Total Advances: <b>₹${data.total_advances.toFixed(2)}</b></p>
        <p style="font-size:18px;font-weight:bold;">Net Payable: <b>₹${data.net.toFixed(2)}</b></p>
    `;

    document.getElementById("billExportButtons").style.display = "block";
    window.generatedBillData = data;
    window.generatedBillInfo = info;

    // document.getElementById("billExportButtons").style.display = "block";

}

document.getElementById("exportPDFBtn").addEventListener("click", () => {
    if (!window.generatedBillData) {
        alert("No individual bill to export!");
        return;
    }

    const d = window.generatedBillData;
    const p = window.generatedBillInfo;

    let milkRows = "";
    d.milk.forEach(m => {
        milkRows += `<tr>
            <td>${m.rec_date}</td>
            <td>${m.litres.toFixed(2)}</td>
            <td>${m.fat}</td>
            <td>${m.snf}</td>
            <td>${m.rate}</td>
            <td>${m.amount.toFixed(2)}</td>
        </tr>`;
    });

    let advRows = "";
    d.advances.forEach(a => {
        advRows += `<tr>
            <td>${a.date}</td>
            <td>${a.remarks}</td>
            <td>${a.amount.toFixed(2)}</td>
        </tr>`;
    });

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>Bill - ${p.name} (${p.code})</title>
        <style>
          body { font-family: Arial; margin: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top:10px; }
          th, td { border: 1px solid #999; padding: 8px; text-align: center; }
          th { background: #eee; }
          h3, h2 { text-align:center; }
        </style>
      </head>
      <body>
        <h2>Shree Ganesh Dairy</h2>
        <h3>Farmer Bill Report</h3>
        <p style="text-align:center;">${p.name} (${p.code}) | ${p.category}</p>
        <p style="text-align:center;">Period: <b>${p.start_date}</b> to <b>${p.end_date}</b></p>

        <h4>Milk Records</h4>
        <table>
          <tr><th>Date</th><th>Litres</th><th>Fat</th><th>SNF</th><th>Rate</th><th>Amount</th></tr>
          ${milkRows}
        </table>

        <h4>Advance Records</h4>
        <table>
          <tr><th>Date</th><th>Remarks</th><th>Amount</th></tr>
          ${advRows}
        </table>

        <h3 style="margin-top:20px;">Totals</h3>
        <p>Total Litres: <b>${d.total_litres.toFixed(2)}</b> L</p>
        <p>Total Amount: <b>₹${d.total_amount.toFixed(2)}</b></p>
        <p>Total Advances: <b>₹${d.total_advances.toFixed(2)}</b></p>
        <p><b>Net Payable:</b> <b>₹${d.net.toFixed(2)}</b></p>

        <p style="margin-top:40px;text-align:center;">Generated on: ${new Date().toLocaleString()}</p>
      </body>
      </html>
    `);

    win.document.close();
    win.print();
});



function bindGenerateReportPopup() {
    const popup = document.getElementById("generateReportPopup");
    const closeBtn = document.getElementById("closeGenerateReportPopup");
    const viewBtn = document.getElementById("viewReportBtn");

    // 🟣 Open popup
    document.getElementById("openGenerateReportPopup").addEventListener("click", () => {
        popup.style.display = "block";
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById("genReport_start").value = today;
        document.getElementById("genReport_end").value = today;
    });

    // 🔒 Close popup
    closeBtn.addEventListener("click", () => (popup.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === popup) popup.style.display = "none";
    });

    // 📊 View Report Summary
    viewBtn.addEventListener("click", async () => {
        const start_date = document.getElementById("genReport_start").value;
        const end_date = document.getElementById("genReport_end").value;

        const res = await callApi("get_reports_summary", { start_date, end_date });

        if (res.success) {
            renderGeneratedReport(res, start_date, end_date);
        } else {
            alert("❌ Failed to generate report: " + res.message);
        }
    });
}

function renderGeneratedReport(data, start_date, end_date) {
    const html = `
    <h4 style="text-align:center;color:#4B0082;">Dairy Summary Report</h4>
    <p style="text-align:center;">Period: ${start_date} → ${end_date}</p>
    <table>
      <tr><th>🥛 Milk Collected</th><td>${data.milk_litres.toFixed(2)} L</td><td>₹${data.milk_amount.toFixed(2)}</td></tr>
      <tr><th>💵 Sales</th><td>${data.sale_litres.toFixed(2)} L</td><td>₹${data.sale_amount.toFixed(2)}</td></tr>
      <tr><th>💰 Advances</th><td colspan="2">₹${data.total_advances.toFixed(2)}</td></tr>
      <tr style="font-weight:bold;background:#f3e9ff;"><th>🧾 Net Income</th><td colspan="2">₹${data.net_income.toFixed(2)}</td></tr>
    </table>
  `;

    const container = document.getElementById("generatedReportContainer");
    container.innerHTML = html;
    document.getElementById("reportExportButtons").style.display = "block";

    // store current report data
    window.generatedReportData = data;
    window.generatedReportPeriod = { start_date, end_date };
}

// function enableReportExportButtons() {
//     document.getElementById("reportExportButtons").style.display = "block";
//     document.getElementById("exportReportPDFBtn").disabled = false;
// }

document.getElementById("exportReportPDFBtn").addEventListener("click", () => {
    if (!window.generatedReportData) {
        alert("No report generated yet!");
        return;
    }

    const p = window.generatedReportPeriod;
    const reportHTML = document.getElementById("generatedReportContainer").innerHTML.trim();

    const finalHTML = `
        <html>
        <head>
            <title>Dairy Report</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
                h2, h3 { text-align:center; }
                table { width:100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #888; padding: 8px; text-align:center; }
                th { background:#efe1ff; color:#4B0082; font-weight:bold; }
            </style>
        </head>
        <body>
            <h2>Shree Ganesh Dairy</h2>
            <h3>📊 Dairy Summary Report</h3>
            <p style="text-align:center;">Period: <b>${p.start_date}</b> to <b>${p.end_date}</b></p>

            ${reportHTML}

            <p style="text-align:center;margin-top:20px;">
                Generated: ${new Date().toLocaleString()}
            </p>
        </body>
        </html>
    `;

    // Create hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow || iframe.contentDocument;
    iframeDoc.document.open();
    iframeDoc.document.write(finalHTML);
    iframeDoc.document.close();

    iframe.onload = function () {
        iframeDoc.focus();
        iframeDoc.print();
        setTimeout(() => document.body.removeChild(iframe), 1500);
    };
});



