(function () {
    "use strict";
    const page = document.body.dataset.page;
    const feedback = document.querySelector("[data-feedback]");
    let currentUser = null;
    let currentComplaint = null;

    function esc(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[c];
        });
    }
    function label(value) { return String(value || "UNKNOWN").replaceAll("_", " "); }
    function formatDate(value, time) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return esc(value);
        return date.toLocaleString(undefined, time ? {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"} : {day: "2-digit", month: "short", year: "numeric"});
    }
    function badge(value, type) {
        const safe = value || "UNKNOWN";
        return '<span class="' + type + '-badge badge-' + safe.toLowerCase().replaceAll("_", "-") + '">' + esc(label(safe)) + "</span>";
    }
    function status(value) { return badge(value, "status"); }
    function active(value) { return value ? '<span class="status-badge badge-resolved">Active</span>' : '<span class="status-badge badge-cancelled">Inactive</span>'; }
    function showError(message) { if (feedback) { feedback.textContent = message; feedback.hidden = false; } }
    function showSuccess(message) { const element = document.querySelector("[data-success]"); if (element) { element.textContent = message; element.hidden = false; } }
    async function api(url, options) {
        const response = await fetch(url, Object.assign({credentials: "same-origin", headers: {"Content-Type": "application/json"}}, options || {}));
        let data = {};
        try { data = await response.json(); } catch (ignored) { data = {}; }
        if (response.status === 401) { window.location.assign("/login"); throw new Error("Your session has expired."); }
        if (response.status === 403) throw new Error(data.message || "You do not have permission to access this page.");
        if (!response.ok) throw new Error(data.message || "The server could not complete your request.");
        return data;
    }
    function setupNavigation() {
        document.querySelectorAll("[data-logout]").forEach(function (button) {
            button.addEventListener("click", async function () {
                button.disabled = true;
                try { await api("/api/auth/logout", {method: "POST", headers: {}}); } finally { window.location.assign("/login"); }
            });
        });
        const toggle = document.querySelector("[data-menu-toggle]");
        const sidebar = document.querySelector(".app-sidebar");
        if (toggle && sidebar) toggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
    }
    async function loadUser() {
        const user = await api("/api/auth/me", {method: "GET"});
        currentUser = user;
        document.querySelectorAll("[data-user-name]").forEach(function (element) { element.textContent = user.name || "there"; });
        document.querySelectorAll("[data-profile]").forEach(function (element) { const key = element.dataset.profile; element.textContent = user[key] || "—"; });
        const activeElement = document.querySelector("[data-profile-active]");
        if (activeElement) activeElement.outerHTML = active(user.isActive);
        const initials = document.querySelector("[data-profile-initials]");
        if (initials) initials.textContent = (user.name || "A").split(/\s+/).map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase();
        return user;
    }
    async function loadDashboard() {
        const user = await loadUser();
        const stats = await api("/api/admin/stats", {method: "GET"});
        Object.keys(stats).forEach(function (key) { const element = document.querySelector('[data-stat="' + key + '"]'); if (element) element.textContent = stats[key]; });
        ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"].forEach(function (key) {
            const element = document.querySelector('[data-stat="' + key + '"]'); if (element && element.textContent === "—") element.textContent = "0";
        });
        await loadNotifications(user);
    }

    async function loadNotifications(user) {
        const notifications = await api("/api/notifications/user/" + encodeURIComponent(user.id) + "/unread", {method: "GET"});
        const panel = document.querySelector("[data-notifications]");
        const list = document.querySelector("[data-notification-list]");
        if (!panel || !notifications.length) return;
        panel.hidden = false;
        list.innerHTML = notifications.map(function (item) {
            return '<div class="notification-row"><strong>' + esc(item.title || "Notification") + '</strong><p>' +
                esc(item.message || "") + '</p><small>' + formatDate(item.createdAt, true) + "</small></div>";
        }).join("");
    }
    let users = [];
    async function loadUsers() {
        users = await api("/api/admin/users", {method: "GET"});
        const render = function () {
            const role = document.getElementById("user-role-filter").value;
            const activeFilter = document.getElementById("user-active-filter").value;
            const filtered = users.filter(function (item) { return (!role || item.role === role) && (activeFilter === "" || String(item.isActive) === activeFilter); });
            document.querySelector("[data-loading]").hidden = true;
            document.querySelector("[data-count]").textContent = filtered.length + (filtered.length === 1 ? " user" : " users");
            document.querySelector("[data-empty]").hidden = filtered.length !== 0;
            document.querySelector("[data-user-rows]").innerHTML = filtered.map(function (item) {
                const action = item.role === "ADMIN" && item.isActive ? '<span class="table-muted">Protected</span>' : '<button class="table-button" data-toggle-user="' + item.id + '" data-next-active="' + (!item.isActive) + '">' + (item.isActive ? "Deactivate" : "Activate") + "</button>";
                return "<tr><td>" + item.id + "</td><td><strong>" + esc(item.name) + "</strong></td><td>" + esc(item.email) + "</td><td>" + badge(item.role, "role") + "</td><td>" + active(item.isActive) + "</td><td>" + formatDate(item.createdAt) + "</td><td>" + action + "</td></tr>";
            }).join("");
            document.querySelectorAll("[data-toggle-user]").forEach(function (button) {
                button.addEventListener("click", function () { toggleUser(Number(button.dataset.toggleUser), button.dataset.nextActive === "true"); });
            });
        };
        document.getElementById("user-role-filter").addEventListener("change", render);
        document.getElementById("user-active-filter").addEventListener("change", render);
        render();
    }
    async function toggleUser(id, nextActive) {
        const user = users.find(function (item) { return item.id === id; });
        if (!window.confirm((nextActive ? "Activate " : "Deactivate ") + (user ? user.name : "this user") + "?")) return;
        try { await api("/api/admin/users/" + id + "/active", {method: "PUT", body: JSON.stringify({active: nextActive})}); showSuccess("User status updated."); await loadUsers(); }
        catch (error) { showError(error.message); }
    }
    async function createUser(event) {
        event.preventDefault();
        try {
            await api("/api/admin/users", {method: "POST", body: JSON.stringify({name: document.getElementById("user-name").value.trim(), email: document.getElementById("user-email").value.trim(), password: document.getElementById("user-password").value, role: document.getElementById("user-role").value})});
            showSuccess("Account created successfully.");
            event.target.reset();
        } catch (error) { showError(error.message); }
    }
    let complaints = [];
    function locationName(location) { return location ? [location.buildingName, location.floor ? "Floor " + location.floor : null, location.roomNumber ? "Room " + location.roomNumber : null].filter(Boolean).join(" · ") || location.description || "—" : "—"; }
    async function loadComplaintFilters() {
        const results = await Promise.all([api("/api/categories", {method: "GET"}), api("/api/locations", {method: "GET"})]);
        document.getElementById("complaint-category-filter").innerHTML += results[0].map(function (item) { return '<option value="' + item.id + '">' + esc(item.name) + "</option>"; }).join("");
        document.getElementById("complaint-location-filter").innerHTML += results[1].map(function (item) { return '<option value="' + item.id + '">' + esc(locationName(item)) + "</option>"; }).join("");
    }
    async function loadComplaints() {
        complaints = await api("/api/complaints", {method: "GET"});
        await loadComplaintFilters();
        const render = function () {
            const selectedStatus = document.getElementById("complaint-status-filter").value;
            const selectedPriority = document.getElementById("complaint-priority-filter").value;
            const category = document.getElementById("complaint-category-filter").value;
            const location = document.getElementById("complaint-location-filter").value;
            const filtered = complaints.filter(function (item) { return (!selectedStatus || item.status === selectedStatus) && (!selectedPriority || item.priority === selectedPriority) && (!category || String(item.category && item.category.id) === category) && (!location || String(item.location && item.location.id) === location); });
            document.querySelector("[data-loading]").hidden = true;
            document.querySelector("[data-count]").textContent = filtered.length + (filtered.length === 1 ? " complaint" : " complaints");
            document.querySelector("[data-empty]").hidden = filtered.length !== 0;
            document.querySelector("[data-complaint-rows]").innerHTML = filtered.map(function (item) { return "<tr><td><strong>" + esc(item.complaintNumber) + "</strong><small>" + esc(item.title) + "</small></td><td>" + esc(item.category && item.category.name) + "</td><td>" + esc(locationName(item.location)) + "</td><td>" + esc(item.user && item.user.name) + "</td><td>" + badge(item.priority, "priority") + "</td><td>" + status(item.status) + "</td><td>" + formatDate(item.createdAt) + '</td><td><a class="table-action" href="/admin/complaints/' + item.id + '">View →</a></td></tr>'; }).join("");
        };
        ["complaint-status-filter", "complaint-priority-filter", "complaint-category-filter", "complaint-location-filter"].forEach(function (id) { document.getElementById(id).addEventListener("change", render); });
        render();
    }
    async function loadDetails() {
        const id = window.location.pathname.split("/").pop();
        const results = await Promise.all([api("/api/complaints/" + id, {method: "GET"}), api("/api/complaints/" + id + "/history", {method: "GET"}), api("/api/assignments/complaint/" + id, {method: "GET"})]);
        const complaint = results[0];
        currentComplaint = complaint;
        document.querySelector("[data-loading]").hidden = true;
        document.querySelector("[data-details]").hidden = false;
        document.querySelector("[data-actions]").hidden = false;
        document.querySelector("[data-history-panel]").hidden = false;
        document.querySelector("[data-assignment-panel]").hidden = false;
        function setDetail(key, value) { const element = document.querySelector('[data-detail="' + key + '"]'); if (element) element.textContent = value || "—"; }
        setDetail("title", complaint.title); setDetail("complaintNumber", complaint.complaintNumber); setDetail("category", complaint.category && complaint.category.name); setDetail("location", locationName(complaint.location)); setDetail("student", complaint.user && complaint.user.name); setDetail("studentEmail", complaint.user && complaint.user.email); setDetail("createdAt", formatDate(complaint.createdAt)); setDetail("updatedAt", formatDate(complaint.updatedAt)); setDetail("description", complaint.description);
        const statusElement = document.querySelector("[data-detail-status]");
        if (statusElement) {
            statusElement.outerHTML = status(complaint.status).replace("status-badge", "status-badge large");
        }
        const priorityElement = document.querySelector("[data-detail-priority]");
        if (priorityElement) {
            priorityElement.outerHTML = badge(complaint.priority, "priority");
        }
        document.querySelector("[data-status-history]").innerHTML = results[1].length ? results[1].map(function (item) { return "<tr><td>" + esc(label(item.oldStatus) === "UNKNOWN" ? "Initial" : label(item.oldStatus)) + "</td><td>" + status(item.newStatus) + "</td><td>" + esc(item.changedBy && item.changedBy.name) + "</td><td>" + esc(item.remarks || "—") + "</td><td>" + formatDate(item.changedAt, true) + "</td></tr>"; }).join("") : '<tr><td colspan="5">No status history available.</td></tr>';
        document.querySelector("[data-assignment-history]").innerHTML = results[2].length ? results[2].map(function (item) { return "<tr><td><strong>" + esc(item.worker && item.worker.name) + "</strong><small>" + esc(item.worker && item.worker.email) + "</small></td><td>" + esc(item.assignedBy && item.assignedBy.name) + "</td><td>" + formatDate(item.assignedAt, true) + "</td><td>" + formatDate(item.completedAt || item.acceptedAt, true) + "</td><td>" + esc(item.remarks || "—") + "</td></tr>"; }).join("") : '<tr><td colspan="5">No assignment history available.</td></tr>';
        await setupWorkflow();
    }

    function validNextStatuses(value) {
        return {SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["ASSIGNED"],
            ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["RESOLVED"], RESOLVED: ["CLOSED"]}[value] || [];
    }

    async function setupWorkflow() {
        const statusSelect = document.getElementById("admin-status-update");
        const nextStatuses = validNextStatuses(currentComplaint.status);
        statusSelect.innerHTML = nextStatuses.length
            ? '<option value="">Select next status</option>' + nextStatuses.map(function (value) {
                return '<option value="' + value + '">' + esc(label(value)) + "</option>";
            }).join("")
            : '<option value="">No valid next status</option>';
        document.querySelector("[data-status-update]").disabled = !nextStatuses.length;
        if (currentComplaint.status === "UNDER_REVIEW") {
            const workers = (await api("/api/users/role/WORKER", {method: "GET"}))
                .filter(function (worker) { return worker.isActive === true; });
            const select = document.getElementById("admin-worker-select");
            select.innerHTML = workers.length
                ? '<option value="">Select a worker</option>' + workers.map(function (worker) {
                    return '<option value="' + worker.id + '">' + esc(worker.name) + " · " + esc(worker.email) + "</option>";
                }).join("")
                : '<option value="">No active workers available</option>';
            document.querySelector("[data-assignment-box]").hidden = false;
            document.querySelector("[data-assign-worker]").disabled = !workers.length;
        }
        document.querySelector("[data-status-update]").onclick = updateStatus;
        document.querySelector("[data-assign-worker]").onclick = assignWorker;
    }

    async function updateStatus() {
        const statusSelect = document.getElementById("admin-status-update");
        if (!statusSelect.value || !window.confirm("Change this complaint to " + label(statusSelect.value) + "?")) return;
        const button = document.querySelector("[data-status-update]");
        button.disabled = true;
        try {
            await api("/api/complaints/" + currentComplaint.id + "/status", {
                method: "PUT",
                body: JSON.stringify({
                    newStatus: statusSelect.value,
                    changedByUserId: currentUser.id,
                    remarks: document.getElementById("admin-status-remarks").value.trim()
                })
            });
            showSuccess("Complaint status updated successfully.");
            window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (error) {
            showError(error.message);
            button.disabled = false;
        }
    }

    async function assignWorker() {
        const workerId = document.getElementById("admin-worker-select").value;
        if (!workerId || !window.confirm("Assign this complaint to the selected worker?")) return;
        const button = document.querySelector("[data-assign-worker]");
        button.disabled = true;
        try {
            await api("/api/assignments", {
                method: "POST",
                body: JSON.stringify({
                    complaintId: currentComplaint.id,
                    workerId: Number(workerId),
                    assignedByUserId: currentUser.id,
                    remarks: document.getElementById("admin-assignment-remarks").value.trim()
                })
            });
            showSuccess("Worker assigned successfully.");
            window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (error) {
            showError(error.message);
            button.disabled = false;
        }
    }
    async function loadCategories() {
        const categories = await api("/api/categories", {method: "GET"});
        document.querySelector("[data-loading]").hidden = true; document.querySelector("[data-empty]").hidden = categories.length !== 0;
        document.querySelector("[data-category-rows]").innerHTML = categories.map(function (item) { return "<tr><td><strong>" + esc(item.name) + "</strong></td><td>" + esc(item.description || "—") + "</td><td>" + active(item.isActive) + '</td><td>' + formatDate(item.createdAt) + '</td><td><button class="table-button" data-edit-category="' + item.id + '">Edit</button> <button class="table-button" data-category-active="' + item.id + '" data-next-active="' + (!item.isActive) + '">' + (item.isActive ? "Deactivate" : "Activate") + "</button></td></tr>"; }).join("");
        document.querySelectorAll("[data-edit-category]").forEach(function (button) { button.addEventListener("click", function () { editCategory(categories.find(function (item) { return item.id === Number(button.dataset.editCategory); })); }); });
        document.querySelectorAll("[data-category-active]").forEach(function (button) { button.addEventListener("click", function () { updateCategory(categories.find(function (item) { return item.id === Number(button.dataset.categoryActive); }), button.dataset.nextActive === "true"); }); });
    }
    async function updateCategory(item, nextActive) {
        if (!item) return;
        const name = window.prompt("Category name", item.name); if (name === null) return;
        const description = window.prompt("Description", item.description || ""); if (description === null) return;
        try { await api("/api/categories/" + item.id, {method: "PUT", body: JSON.stringify({name: name.trim(), description: description.trim(), isActive: nextActive === undefined ? item.isActive : nextActive})}); showSuccess("Category updated."); await loadCategories(); } catch (error) { showError(error.message); }
    }
    function editCategory(item) { updateCategory(item, item.isActive); }
    async function loadLocations() {
        const locations = await api("/api/locations", {method: "GET"});
        document.querySelector("[data-loading]").hidden = true; document.querySelector("[data-empty]").hidden = locations.length !== 0;
        document.querySelector("[data-location-rows]").innerHTML = locations.map(function (item) { return "<tr><td><strong>" + esc(item.buildingName) + "</strong></td><td>" + esc(item.floor || "—") + "</td><td>" + esc(item.roomNumber || "—") + "</td><td>" + esc(item.description || "—") + "</td><td>" + active(item.isActive) + '</td><td>' + formatDate(item.createdAt) + '</td><td><button class="table-button" data-edit-location="' + item.id + '">Edit</button> <button class="table-button" data-location-active="' + item.id + '" data-next-active="' + (!item.isActive) + '">' + (item.isActive ? "Deactivate" : "Activate") + "</button></td></tr>"; }).join("");
        document.querySelectorAll("[data-edit-location]").forEach(function (button) { button.addEventListener("click", function () { editLocation(locations.find(function (item) { return item.id === Number(button.dataset.editLocation); })); }); });
        document.querySelectorAll("[data-location-active]").forEach(function (button) { button.addEventListener("click", function () { updateLocation(locations.find(function (item) { return item.id === Number(button.dataset.locationActive); }), button.dataset.nextActive === "true"); }); });
    }
    async function updateLocation(item, nextActive) {
        if (!item) return;
        const buildingName = window.prompt("Building name", item.buildingName); if (buildingName === null) return;
        const floor = window.prompt("Floor", item.floor || ""); if (floor === null) return;
        const roomNumber = window.prompt("Room number", item.roomNumber || ""); if (roomNumber === null) return;
        const description = window.prompt("Description", item.description || ""); if (description === null) return;
        try { await api("/api/locations/" + item.id, {method: "PUT", body: JSON.stringify({buildingName: buildingName.trim(), floor: floor.trim(), roomNumber: roomNumber.trim(), description: description.trim(), isActive: nextActive === undefined ? item.isActive : nextActive})}); showSuccess("Location updated."); await loadLocations(); } catch (error) { showError(error.message); }
    }
    function editLocation(item) { updateLocation(item, item.isActive); }
    async function createCategory(event) { event.preventDefault(); try { await api("/api/categories", {method: "POST", body: JSON.stringify({name: document.getElementById("category-name").value.trim(), description: document.getElementById("category-description").value.trim(), isActive: true})}); showSuccess("Category added."); event.target.reset(); await loadCategories(); } catch (error) { showError(error.message); } }
    async function createLocation(event) { event.preventDefault(); try { await api("/api/locations", {method: "POST", body: JSON.stringify({buildingName: document.getElementById("location-building").value.trim(), floor: document.getElementById("location-floor").value.trim(), roomNumber: document.getElementById("location-room").value.trim(), description: document.getElementById("location-description").value.trim(), isActive: true})}); showSuccess("Location added."); event.target.reset(); await loadLocations(); } catch (error) { showError(error.message); } }
    setupNavigation();
    (async function () {
        try {
            if (page === "admin-dashboard") await loadDashboard();
            if (page === "admin-users") await loadUsers();
            if (page === "admin-user-form") document.querySelector("[data-user-form]").addEventListener("submit", createUser);
            if (page === "admin-complaints") await loadComplaints();
            if (page === "admin-complaint-details") { await loadUser(); await loadDetails(); }
            if (page === "admin-categories") { document.querySelector("[data-category-form]").addEventListener("submit", createCategory); await loadCategories(); }
            if (page === "admin-locations") { document.querySelector("[data-location-form]").addEventListener("submit", createLocation); await loadLocations(); }
            if (page === "admin-profile") await loadUser();
        } catch (error) { showError(error.message); const loading = document.querySelector("[data-loading]"); if (loading) loading.hidden = true; }
    }());
}());
