(function () {
    "use strict";
    const page = document.body.dataset.page;
    const feedback = document.querySelector("[data-feedback]");
    let user;
    let assignments = [];
    let complaint;

    function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]; }); }
    function date(value, time) {
        if (!value) return "—";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, time ? {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"} : {day:"2-digit",month:"short",year:"numeric"});
    }
    function label(value) { return (value || "UNKNOWN").replaceAll("_", " "); }
    function badge(value, type) {
        const safe = value || "UNKNOWN";
        return '<span class="' + type + '-badge badge-' + safe.toLowerCase().replaceAll("_", "-") + '">' + esc(label(safe)) + "</span>";
    }
    function locationName(value) { return value ? [value.buildingName, value.floor ? "Floor " + value.floor : null, value.roomNumber ? "Room " + value.roomNumber : null].filter(Boolean).join(" · ") || value.description || "—" : "—"; }
    function categoryName(value) { return value && value.name ? value.name : "—"; }
    function text(selector, value) { const element = document.querySelector(selector); if (element) element.textContent = value == null || value === "" ? "—" : value; }
    function error(message) { if (feedback) { feedback.textContent = message; feedback.hidden = false; } }
    function success(message) { const element = document.querySelector("[data-success]"); if (element) { element.textContent = message; element.hidden = false; } }

    async function api(url, options) {
        const response = await fetch(url, Object.assign({credentials:"same-origin", headers:{"Content-Type":"application/json"}}, options || {}));
        let data = {};
        try { data = await response.json(); } catch (ignored) { data = {}; }
        if (response.status === 401) { window.location.assign("/login"); throw new Error("Your session has expired."); }
        if (response.status === 403) throw new Error(data.message || "You do not have permission to access this page.");
        if (!response.ok) throw new Error(data.message || "The server could not complete your request.");
        return data;
    }
    function navigation() {
        document.querySelectorAll("[data-logout]").forEach(function (button) { button.addEventListener("click", async function () { button.disabled = true; try { await api("/api/auth/logout", {method:"POST", headers:{}}); } finally { window.location.assign("/login"); } }); });
        const toggle = document.querySelector("[data-menu-toggle]");
        const sidebar = document.querySelector(".app-sidebar");
        if (toggle && sidebar) toggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
    }
    async function loadUser() {
        user = await api("/api/auth/me", {method:"GET"});
        document.querySelectorAll("[data-user-name]").forEach(function (element) { element.textContent = user.name || "there"; });
        text('[data-profile="name"]', user.name); text('[data-profile="email"]', user.email); text('[data-profile="role"]', user.role);
        text('[data-profile="active"]', user.isActive === false ? "Inactive" : "Active");
        const initials = document.querySelector("[data-profile-initials]");
        if (initials) initials.textContent = (user.name || "U").split(/\s+/).map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase();
        return user;
    }
    async function loadAssignments() {
        assignments = await api("/api/assignments/worker/" + encodeURIComponent(user.id), {method:"GET"});
        assignments.sort(function (a, b) { return new Date((b.assignedAt || (b.complaint && b.complaint.createdAt)) || 0) - new Date((a.assignedAt || (a.complaint && a.complaint.createdAt)) || 0); });
        return assignments;
    }
    function complaintOf(assignment) { return assignment.complaint || {}; }
    function renderStats() {
        const count = function (status) { return assignments.filter(function (item) { return complaintOf(item).status === status; }).length; };
        text('[data-stat="total"]', assignments.length);
        text('[data-stat="assigned"]', count("ASSIGNED"));
        text('[data-stat="in-progress"]', count("IN_PROGRESS"));
        text('[data-stat="resolved"]', count("RESOLVED"));
    }
    function renderRecent() {
        const loading = document.querySelector("[data-loading]");
        const empty = document.querySelector("[data-empty]");
        const list = document.querySelector("[data-recent-list]");
        if (loading) loading.hidden = true;
        if (!assignments.length) { if (empty) empty.hidden = false; return; }
        list.innerHTML = assignments.slice(0, 6).map(function (item) {
            const value = complaintOf(item);
            return '<a class="complaint-row" href="/worker/complaints/' + encodeURIComponent(value.id) + '"><span class="complaint-row-main"><strong>' + esc(value.title) + '</strong><small>' + esc(value.complaintNumber) + " · Assigned " + date(item.assignedAt) + "</small></span>" + badge(value.status, "status") + '<span class="row-arrow">→</span></a>';
        }).join("");
    }
    async function loadNotifications() {
        const notifications = await api("/api/notifications/user/" + encodeURIComponent(user.id) + "/unread", {method:"GET"});
        const panel = document.querySelector("[data-notifications]");
        const list = document.querySelector("[data-notification-list]");
        if (!panel || !notifications.length) return;
        panel.hidden = false;
        list.innerHTML = notifications.map(function (item) { return '<div class="notification-row"><strong>' + esc(item.title || "Notification") + '</strong><p>' + esc(item.message || item.content || "") + '</p><small>' + date(item.createdAt, true) + "</small></div>"; }).join("");
    }
    async function dashboard() { await loadUser(); await loadAssignments(); renderStats(); renderRecent(); await loadNotifications(); }
    function renderRows() {
        const rows = document.querySelector("[data-complaint-rows]");
        const empty = document.querySelector("[data-empty]");
        document.querySelector("[data-loading]").hidden = true;
        text("[data-count]", assignments.length + (assignments.length === 1 ? " complaint" : " complaints"));
        empty.hidden = assignments.length !== 0;
        rows.innerHTML = assignments.map(function (item) {
            const value = complaintOf(item);
            return "<tr><td><strong>" + esc(value.complaintNumber) + "</strong><small>" + esc(value.title) + "</small></td><td>" + esc(categoryName(value.category)) + "</td><td>" + esc(locationName(value.location)) + "</td><td>" + badge(value.priority, "priority") + "</td><td>" + badge(value.status, "status") + "</td><td>" + date(item.assignedAt) + '</td><td><a class="table-action" href="/worker/complaints/' + encodeURIComponent(value.id) + '">View details →</a></td></tr>';
        }).join("");
    }
    async function complaintsPage() { await loadUser(); await loadAssignments(); renderRows(); }
    function renderHistory(history) {
        const rows = document.querySelector("[data-status-history]");
        rows.innerHTML = history.length ? history.map(function (item) { return "<tr><td>" + esc(label(item.oldStatus) || "Initial") + "</td><td>" + badge(item.newStatus, "status") + "</td><td>" + esc(item.changedBy ? item.changedBy.name : "—") + "</td><td>" + esc(item.remarks || "—") + "</td><td>" + date(item.changedAt, true) + "</td></tr>"; }).join("") : '<tr><td colspan="5">No status history available.</td></tr>';
    }
    function renderAssignments(items) {
        const rows = document.querySelector("[data-assignment-history]");
        const panel = document.querySelector("[data-assignment-panel]");
        panel.hidden = false;
        rows.innerHTML = items.length ? items.map(function (item) { return "<tr><td>" + esc(item.worker ? item.worker.name : "—") + "</td><td>" + esc(item.assignedBy ? item.assignedBy.name : "—") + "</td><td>" + date(item.assignedAt, true) + "</td><td>" + date(item.completedAt || item.acceptedAt, true) + "</td><td>" + esc(item.remarks || "—") + "</td></tr>"; }).join("") : '<tr><td colspan="5">No assignment history available.</td></tr>';
    }
    function nextStatuses(status) { return {ASSIGNED:["IN_PROGRESS"], IN_PROGRESS:["RESOLVED"]}[status] || []; }
    async function detailsPage() {
        await loadUser();
        const id = window.location.pathname.split("/").pop();
        const results = await Promise.all([api("/api/complaints/" + encodeURIComponent(id), {method:"GET"}), api("/api/complaints/" + encodeURIComponent(id) + "/history", {method:"GET"}), api("/api/assignments/complaint/" + encodeURIComponent(id), {method:"GET"})]);
        complaint = results[0];
        const own = results[2].some(function (item) { return item.worker && item.worker.id === user.id; });
        if (!own) throw new Error("This complaint is not assigned to you.");
        document.querySelector("[data-loading]").hidden = true; document.querySelector("[data-details]").hidden = false; document.querySelector("[data-actions]").hidden = false; document.querySelector("[data-history-panel]").hidden = false;
        text('[data-detail="title"]', complaint.title); text('[data-detail="number"]', complaint.complaintNumber); text('[data-detail="category"]', categoryName(complaint.category)); text('[data-detail="location"]', locationName(complaint.location)); text('[data-detail="created"]', date(complaint.createdAt)); text('[data-detail="description"]', complaint.description); text('[data-detail="student"]', complaint.user && complaint.user.name); text('[data-detail="email"]', complaint.user && complaint.user.email);
        const assignment = results[2].find(function (item) { return item.worker && item.worker.id === user.id; }) || results[2][0];
        text('[data-detail="assigned"]', assignment && date(assignment.assignedAt));
        document.querySelector("[data-detail-status]").outerHTML = '<span data-detail-status class="status-badge large badge-' + (complaint.status || "unknown").toLowerCase().replaceAll("_", "-") + '">' + esc(label(complaint.status)) + "</span>";
        document.querySelector("[data-detail-priority]").outerHTML = badge(complaint.priority, "priority");
        renderHistory(results[1]); renderAssignments(results[2]);
        const select = document.getElementById("worker-status"); const options = nextStatuses(complaint.status);
        select.innerHTML = options.length ? '<option value="">Select next status</option>' + options.map(function (value) { return '<option value="' + value + '">' + esc(label(value)) + "</option>"; }).join("") : '<option value="">No worker status update available</option>';
        document.querySelector("[data-update-status]").disabled = !options.length;
        document.querySelector("[data-update-status]").addEventListener("click", updateStatus);
    }
    async function updateStatus() {
        const status = document.getElementById("worker-status").value;
        if (!status || !window.confirm("Change this complaint to " + label(status) + "?")) return;
        const button = document.querySelector("[data-update-status]"); button.disabled = true;
        try {
            await api("/api/complaints/" + complaint.id + "/status", {method:"PUT", body:JSON.stringify({newStatus:status, changedByUserId:user.id, remarks:document.getElementById("worker-remarks").value.trim()})});
            success("Complaint status updated successfully."); window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (exception) { error(exception.message); button.disabled = false; }
    }
    navigation();
    (async function () { try { if (page === "worker-dashboard") await dashboard(); if (page === "worker-complaints") await complaintsPage(); if (page === "worker-complaint-details") await detailsPage(); if (page === "worker-profile") await loadUser(); } catch (exception) { error(exception.message); const loading = document.querySelector("[data-loading]"); if (loading) loading.hidden = true; } })();
})();
