(function () {
    "use strict";

    const page = document.body.dataset.page;
    const feedback = document.querySelector("[data-feedback]");
    let complaints = [];
    let currentUser = null;
    let currentComplaint = null;

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[character];
        });
    }

    function showError(message) {
        if (feedback) {
            feedback.textContent = message;
            feedback.hidden = false;
        }
    }

    function showSuccess(message) {
        const element = document.querySelector("[data-success]");
        if (element) {
            element.textContent = message;
            element.hidden = false;
        }
    }

    function formatDate(value, includeTime) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString(undefined, includeTime ? {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        } : {day: "2-digit", month: "short", year: "numeric"});
    }

    function label(value) {
        return (value || "UNKNOWN").replaceAll("_", " ");
    }

    function badge(value, type) {
        const safe = value || "UNKNOWN";
        return '<span class="' + type + '-badge badge-' + safe.toLowerCase().replaceAll("_", "-") + '">' + escapeHtml(label(safe)) + "</span>";
    }

    function categoryName(category) {
        return category && category.name ? category.name : "—";
    }

    function locationName(location) {
        if (!location) return "—";
        return [location.buildingName, location.floor ? "Floor " + location.floor : null, location.roomNumber ? "Room " + location.roomNumber : null]
            .filter(Boolean).join(" · ") || location.description || "—";
    }

    async function api(url, options) {
        const response = await fetch(url, Object.assign({
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"}
        }, options || {}));
        let data = {};
        try { data = await response.json(); } catch (ignored) { data = {}; }
        if (response.status === 401) {
            window.location.assign("/login");
            throw new Error("Your session has expired.");
        }
        if (response.status === 403) throw new Error(data.message || "You do not have permission to access this page.");
        if (!response.ok) throw new Error(data.message || "The server could not complete your request.");
        return data;
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = value == null || value === "" ? "—" : value;
    }

    function setupNavigation() {
        document.querySelectorAll("[data-logout]").forEach(function (button) {
            button.addEventListener("click", async function () {
                button.disabled = true;
                try { await api("/api/auth/logout", {method: "POST", headers: {}}); }
                finally { window.location.assign("/login"); }
            });
        });
        const toggle = document.querySelector("[data-menu-toggle]");
        const sidebar = document.querySelector(".app-sidebar");
        if (toggle && sidebar) toggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
    }

    async function loadUser() {
        currentUser = await api("/api/auth/me", {method: "GET"});
        document.querySelectorAll("[data-user-name]").forEach(function (element) {
            element.textContent = currentUser.name || "there";
        });
        setText('[data-profile="name"]', currentUser.name);
        setText('[data-profile="email"]', currentUser.email);
        setText('[data-profile="role"]', currentUser.role);
        const initials = document.querySelector("[data-profile-initials]");
        if (initials) initials.textContent = (currentUser.name || "U").split(/\s+/).map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase();
        return currentUser;
    }

    async function loadAllComplaints() {
        complaints = await api("/api/complaints", {method: "GET"});
        complaints.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
        return complaints;
    }

    function renderStats() {
        const count = function (status) { return complaints.filter(function (item) { return item.status === status; }).length; };
        setText('[data-stat="total"]', complaints.length);
        ["submitted", "under-review", "assigned", "in-progress", "resolved"].forEach(function (status) {
            setText('[data-stat="' + status + '"]', count(status.toUpperCase().replace("-", "_")));
        });
    }

    function renderRecent() {
        const list = document.querySelector("[data-recent-list]");
        const empty = document.querySelector("[data-empty]");
        const loading = document.querySelector("[data-loading]");
        if (loading) loading.hidden = true;
        if (!complaints.length) { if (empty) empty.hidden = false; return; }
        list.innerHTML = complaints.slice(0, 6).map(function (item) {
            return '<a class="complaint-row" href="/staff/complaints/' + encodeURIComponent(item.id) + '">' +
                '<span class="complaint-row-main"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.complaintNumber) + " · " + formatDate(item.createdAt) + " · " + escapeHtml(item.user ? item.user.name : "Unknown user") + "</small></span>" +
                badge(item.status, "status") + '<span class="row-arrow">→</span></a>';
        }).join("");
    }

    async function loadDashboard() {
        await loadUser();
        await loadAllComplaints();
        renderStats();
        renderRecent();
        await loadNotifications();
    }

    async function loadNotifications() {
        const notifications = await api("/api/notifications/user/" + encodeURIComponent(currentUser.id) + "/unread", {method: "GET"});
        const panel = document.querySelector("[data-notifications]");
        const list = document.querySelector("[data-notification-list]");
        if (!panel || !notifications.length) return;
        panel.hidden = false;
        list.innerHTML = notifications.map(function (item) {
            return '<div class="notification-row"><strong>' + escapeHtml(item.title || "Notification") + '</strong><p>' +
                escapeHtml(item.message || "") + '</p><small>' + formatDate(item.createdAt, true) + "</small></div>";
        }).join("");
    }

    function renderComplaintRows() {
        const rows = document.querySelector("[data-complaint-rows]");
        const empty = document.querySelector("[data-empty]");
        const status = document.getElementById("status-filter").value;
        const priority = document.getElementById("priority-filter").value;
        const filtered = complaints.filter(function (item) {
            return (!status || item.status === status) && (!priority || item.priority === priority);
        });
        document.querySelector("[data-loading]").hidden = true;
        document.querySelector("[data-count]").textContent = filtered.length + (filtered.length === 1 ? " complaint" : " complaints");
        empty.hidden = filtered.length !== 0;
        rows.innerHTML = filtered.map(function (item) {
            return "<tr><td><strong>" + escapeHtml(item.complaintNumber) + '</strong><small>' + escapeHtml(item.title) + "</small></td>" +
                "<td>" + escapeHtml(categoryName(item.category)) + "</td><td>" + escapeHtml(locationName(item.location)) + "</td>" +
                "<td><strong>" + escapeHtml(item.user ? item.user.name : "—") + "</strong><small>" + escapeHtml(item.user ? item.user.email : "") + "</small></td>" +
                "<td>" + badge(item.priority, "priority") + "</td><td>" + badge(item.status, "status") + "</td>" +
                "<td>" + formatDate(item.createdAt) + '</td><td><a class="table-action" href="/staff/complaints/' + encodeURIComponent(item.id) + '">Review →</a></td></tr>';
        }).join("");
    }

    async function loadComplaints() {
        await loadUser();
        await loadAllComplaints();
        document.getElementById("status-filter").addEventListener("change", renderComplaintRows);
        document.getElementById("priority-filter").addEventListener("change", renderComplaintRows);
        renderComplaintRows();
    }

    function renderHistory(history) {
        const rows = document.querySelector("[data-status-history]");
        rows.innerHTML = history.length ? history.map(function (item) {
            return "<tr><td>" + escapeHtml(label(item.oldStatus) || "Initial") + "</td><td>" + badge(item.newStatus, "status") +
                "</td><td>" + escapeHtml(item.changedBy ? item.changedBy.name : "—") + "</td><td>" + escapeHtml(item.remarks || "—") +
                "</td><td>" + formatDate(item.changedAt, true) + "</td></tr>";
        }).join("") : '<tr><td colspan="5">No status history available.</td></tr>';
    }

    function renderAssignments(assignments) {
        const panel = document.querySelector("[data-assignment-panel]");
        const rows = document.querySelector("[data-assignment-history]");
        panel.hidden = false;
        rows.innerHTML = assignments.length ? assignments.map(function (item) {
            return "<tr><td><strong>" + escapeHtml(item.worker ? item.worker.name : "—") + "</strong><small>" + escapeHtml(item.worker ? item.worker.email : "") +
                "</small></td><td>" + escapeHtml(item.assignedBy ? item.assignedBy.name : "—") + "</td><td>" + formatDate(item.assignedAt, true) +
                "</td><td>" + formatDate(item.completedAt || item.acceptedAt, true) + "</td><td>" + escapeHtml(item.remarks || "—") + "</td></tr>";
        }).join("") : '<tr><td colspan="5">No assignment history available.</td></tr>';
    }

    function validNextStatuses(status) {
        return {SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["ASSIGNED"], ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["RESOLVED"], RESOLVED: ["CLOSED"]}[status] || [];
    }

    async function loadWorkers() {
        const users = await api("/api/users/role/WORKER", {method: "GET"});
        return users.filter(function (user) { return user.isActive === true; });
    }

    async function loadDetails() {
        await loadUser();
        const id = window.location.pathname.split("/").pop();
        const results = await Promise.all([
            api("/api/complaints/" + encodeURIComponent(id), {method: "GET"}),
            api("/api/complaints/" + encodeURIComponent(id) + "/history", {method: "GET"}),
            api("/api/assignments/complaint/" + encodeURIComponent(id), {method: "GET"})
        ]);
        currentComplaint = results[0];
        document.querySelector("[data-loading]").hidden = true;
        document.querySelector("[data-details]").hidden = false;
        document.querySelector("[data-actions]").hidden = false;
        document.querySelector("[data-history-panel]").hidden = false;
        setText('[data-detail="title"]', currentComplaint.title);
        setText('[data-detail="complaintNumber"]', currentComplaint.complaintNumber);
        setText('[data-detail="category"]', categoryName(currentComplaint.category));
        setText('[data-detail="location"]', locationName(currentComplaint.location));
        setText('[data-detail="createdAt"]', formatDate(currentComplaint.createdAt));
        setText('[data-detail="updatedAt"]', formatDate(currentComplaint.updatedAt));
        setText('[data-detail="description"]', currentComplaint.description);
        setText('[data-detail="student"]', currentComplaint.user && currentComplaint.user.name);
        setText('[data-detail="studentEmail"]', currentComplaint.user && currentComplaint.user.email);
        const statusElement = document.querySelector("[data-detail-status]");
        const statusClass = (currentComplaint.status || "UNKNOWN").toLowerCase().replaceAll("_", "-");
        statusElement.outerHTML = '<span data-detail-status class="status-badge large badge-' + statusClass + '">' + escapeHtml(label(currentComplaint.status)) + "</span>";
        const priorityElement = document.querySelector("[data-detail-priority]");
        priorityElement.outerHTML = badge(currentComplaint.priority, "priority");
        renderHistory(results[1]);
        renderAssignments(results[2]);
        setupWorkflow();
    }

    async function setupWorkflow() {
        const statusSelect = document.getElementById("status-update");
        const nextStatuses = validNextStatuses(currentComplaint.status);
        statusSelect.innerHTML = nextStatuses.length ? '<option value="">Select next status</option>' + nextStatuses.map(function (item) {
            return '<option value="' + item + '">' + escapeHtml(label(item)) + "</option>";
        }).join("") : '<option value="">No valid next status</option>';
        document.querySelector("[data-status-update]").disabled = !nextStatuses.length;
        if (currentComplaint.status === "UNDER_REVIEW") {
            const box = document.querySelector("[data-assignment-box]");
            box.hidden = false;
            const workers = await loadWorkers();
            const select = document.getElementById("worker-select");
            select.innerHTML = workers.length ? '<option value="">Select a worker</option>' + workers.map(function (worker) {
                return '<option value="' + worker.id + '">' + escapeHtml(worker.name) + " · " + escapeHtml(worker.email) + "</option>";
            }).join("") : '<option value="">No active workers available</option>';
            document.querySelector("[data-assign-worker]").disabled = !workers.length;
        }
        document.querySelector("[data-status-update]").onclick = updateStatus;
        document.querySelector("[data-assign-worker]").onclick = assignWorker;
    }

    async function updateStatus() {
        const select = document.getElementById("status-update");
        if (!select.value) return;
        if (!window.confirm("Change this complaint to " + label(select.value) + "?")) return;
        const button = document.querySelector("[data-status-update]");
        button.disabled = true;
        try {
            await api("/api/complaints/" + currentComplaint.id + "/status", {
                method: "PUT",
                body: JSON.stringify({newStatus: select.value, changedByUserId: currentUser.id, remarks: document.getElementById("status-remarks").value.trim()})
            });
            showSuccess("Complaint status updated successfully.");
            window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (error) {
            showError(error.message);
            button.disabled = false;
        }
    }

    async function assignWorker() {
        const workerId = document.getElementById("worker-select").value;
        if (!workerId) { showError("Select an active worker before assigning."); return; }
        if (!window.confirm("Assign this complaint to the selected worker?")) return;
        const button = document.querySelector("[data-assign-worker]");
        button.disabled = true;
        try {
            await api("/api/assignments", {
                method: "POST",
                body: JSON.stringify({complaintId: currentComplaint.id, workerId: Number(workerId), assignedByUserId: currentUser.id, remarks: document.getElementById("assignment-remarks").value.trim()})
            });
            showSuccess("Worker assigned successfully. The complaint is now assigned.");
            window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (error) {
            showError(error.message);
            button.disabled = false;
        }
    }

    setupNavigation();
    (async function () {
        try {
            if (page === "staff-dashboard") await loadDashboard();
            if (page === "staff-complaints") await loadComplaints();
            if (page === "staff-complaint-details") await loadDetails();
            if (page === "staff-profile") await loadUser();
        } catch (error) {
            showError(error.message);
            const loading = document.querySelector("[data-loading]");
            if (loading) loading.hidden = true;
        }
    })();
})();
