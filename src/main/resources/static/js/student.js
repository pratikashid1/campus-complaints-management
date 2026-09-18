(function () {
    "use strict";

    const page = document.body.dataset.page;
    const feedback = document.querySelector("[data-feedback]");

    function showError(message) {
        if (feedback) {
            feedback.textContent = message;
            feedback.hidden = false;
        }
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
            day: "2-digit", month: "short", year: "numeric"
        });
    }

    function locationName(location) {
        if (!location) return "—";
        return [location.buildingName, location.floor ? "Floor " + location.floor : null, location.roomNumber ? "Room " + location.roomNumber : null]
            .filter(Boolean).join(" · ") || location.description || "—";
    }

    function categoryName(category) {
        return category && category.name ? category.name : "—";
    }

    function statusLabel(status) {
        return (status || "UNKNOWN").replaceAll("_", " ");
    }

    function badge(value, type) {
        const safeValue = value || "UNKNOWN";
        return '<span class="' + type + '-badge badge-' + safeValue.toLowerCase().replaceAll("_", "-") + '">' + statusLabel(safeValue) + "</span>";
    }

    async function api(url, options) {
        const response = await fetch(url, Object.assign({
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"}
        }, options || {}));
        let data = {};
        try {
            data = await response.json();
        } catch (ignored) {
            data = {};
        }
        if (response.status === 401) {
            window.location.assign("/login");
            throw new Error("Your session has expired.");
        }
        if (response.status === 403) throw new Error("You do not have permission to view this page.");
        if (response.status === 404) throw new Error(data.message || "The requested item was not found.");
        if (response.status >= 500) throw new Error("The server could not complete your request. Please try again.");
        if (!response.ok) throw new Error(data.message || "Please check your information and try again.");
        return data;
    }

    async function currentUser() {
        return api("/api/auth/me", {method: "GET"});
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = value || "—";
    }

    function setupNavigation() {
        document.querySelectorAll("[data-logout]").forEach(function (button) {
            button.addEventListener("click", async function () {
                button.disabled = true;
                try {
                    await api("/api/auth/logout", {method: "POST", headers: {}});
                } finally {
                    window.location.assign("/login");
                }
            });
        });
        const toggle = document.querySelector("[data-menu-toggle]");
        const sidebar = document.querySelector(".app-sidebar");
        if (toggle && sidebar) toggle.addEventListener("click", function () {
            sidebar.classList.toggle("is-open");
        });
    }

    async function loadUser() {
        const user = await currentUser();
        document.querySelectorAll("[data-user-name]").forEach(function (element) {
            element.textContent = user.name || "there";
        });
        setText('[data-profile="name"]', user.name);
        setText('[data-profile="email"]', user.email);
        setText('[data-profile="role"]', user.role);
        const initials = document.querySelector("[data-profile-initials]");
        if (initials) initials.textContent = (user.name || "U").split(/\s+/).map(function (part) {
            return part[0];
        }).join("").slice(0, 2).toUpperCase();
        return user;
    }

    function renderRecent(complaints) {
        const list = document.querySelector("[data-recent-list]");
        const empty = document.querySelector("[data-empty]");
        const loading = document.querySelector("[data-loading]");
        if (loading) loading.hidden = true;
        if (!complaints.length) {
            if (empty) empty.hidden = false;
            return;
        }
        list.innerHTML = complaints.slice(0, 5).map(function (complaint) {
            return '<a class="complaint-row" href="/student/complaints/' + complaint.id + '">' +
                '<span class="complaint-row-main"><strong>' + escapeHtml(complaint.title) + '</strong><small>' + escapeHtml(complaint.complaintNumber) + " · " + formatDate(complaint.createdAt) + "</small></span>" +
                badge(complaint.status, "status") + '<span class="row-arrow">→</span></a>';
        }).join("");
    }

    function renderStats(complaints) {
        const count = function (statuses) {
            return complaints.filter(function (complaint) {
                return statuses.includes(complaint.status);
            }).length;
        };
        setText('[data-stat="total"]', complaints.length.toString());
        setText('[data-stat="submitted"]', count(["SUBMITTED"]).toString());
        setText('[data-stat="in-progress"]', count(["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"]).toString());
        setText('[data-stat="resolved"]', count(["RESOLVED"]).toString());
        setText('[data-stat="closed"]', count(["CLOSED"]).toString());
    }

    async function loadDashboard() {
        const user = await loadUser();
        const complaints = await api("/api/complaints/user/" + user.id);
        renderStats(complaints);
        renderRecent(complaints);
        await loadNotifications(user);
    }

    async function loadNotifications(user) {
        const notifications = await api("/api/notifications/user/" + encodeURIComponent(user.id) + "/unread");
        const panel = document.querySelector("[data-notifications]");
        const list = document.querySelector("[data-notification-list]");
        if (!panel || !notifications.length) return;
        panel.hidden = false;
        list.innerHTML = notifications.map(function (item) {
            return '<div class="notification-row"><strong>' + escapeHtml(item.title || "Notification") + '</strong><p>' +
                escapeHtml(item.message || "") + '</p><small>' + formatDate(item.createdAt) + "</small></div>";
        }).join("");
    }

    function renderComplaintRows(complaints) {
        const rows = document.querySelector("[data-complaint-rows]");
        const loading = document.querySelector("[data-loading]");
        const empty = document.querySelector("[data-empty]");
        if (loading) loading.hidden = true;
        const count = document.querySelector("[data-count]");
        if (count) count.textContent = complaints.length + (complaints.length === 1 ? " complaint" : " complaints");
        if (!complaints.length) {
            if (empty) empty.hidden = false;
            return;
        }
        rows.innerHTML = complaints.map(function (complaint) {
            return "<tr><td><strong>" + escapeHtml(complaint.complaintNumber) + '</strong><small>' + escapeHtml(complaint.title) + "</small></td>" +
                "<td>" + escapeHtml(categoryName(complaint.category)) + "</td><td>" + escapeHtml(locationName(complaint.location)) + "</td>" +
                "<td>" + badge(complaint.priority, "priority") + "</td><td>" + badge(complaint.status, "status") + "</td>" +
                "<td>" + formatDate(complaint.createdAt) + '</td><td><a class="table-action" href="/student/complaints/' + complaint.id + '">View details →</a></td></tr>';
        }).join("");
    }

    async function loadComplaints() {
        const user = await loadUser();
        const complaints = await api("/api/complaints/user/" + user.id);
        renderComplaintRows(complaints);
    }

    async function loadOptions() {
        const categorySelect = document.getElementById("complaint-category");
        const locationSelect = document.getElementById("complaint-location");
        const results = await Promise.all([api("/api/categories/active"), api("/api/locations/active")]);
        categorySelect.innerHTML = '<option value="">Select a category</option>' + results[0].map(function (category) {
            return '<option value="' + category.id + '">' + escapeHtml(category.name) + "</option>";
        }).join("");
        locationSelect.innerHTML = '<option value="">Select a location</option>' + results[1].map(function (location) {
            return '<option value="' + location.id + '">' + escapeHtml(locationName(location)) + "</option>";
        }).join("");
    }

    function formError(form, field, message) {
        const error = form.querySelector('[data-error-for="' + field + '"]');
        if (error) error.textContent = message || "";
        const input = form.querySelector('[name="' + field + '"]');
        if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validateComplaintForm(form) {
        let valid = true;
        ["title", "description", "categoryId", "locationId"].forEach(function (field) {
            formError(form, field, "");
            if (!form[field].value.trim()) {
                formError(form, field, "This field is required.");
                valid = false;
            }
        });
        return valid;
    }

    async function submitComplaint() {
        const form = document.getElementById("complaint-form");
        const button = form.querySelector("button[type='submit']");
        const success = document.querySelector("[data-success]");
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!validateComplaintForm(form)) return;
            button.disabled = true;
            button.classList.add("is-loading");
            try {
                const user = await currentUser();
                const complaint = await api("/api/complaints", {
                    method: "POST",
                    body: JSON.stringify({
                        userId: user.id,
                        categoryId: Number(form.categoryId.value),
                        locationId: Number(form.locationId.value),
                        title: form.title.value.trim(),
                        description: form.description.value.trim(),
                        priority: form.priority.value
                    })
                });
                success.textContent = "Complaint " + complaint.complaintNumber + " submitted successfully.";
                success.hidden = false;
                window.setTimeout(function () {
                    window.location.assign("/student/complaints/" + complaint.id);
                }, 900);
            } catch (error) {
                showError(error.message);
            } finally {
                button.disabled = false;
                button.classList.remove("is-loading");
            }
        });
    }

    async function loadDetails() {
        const id = window.location.pathname.split("/").pop();
        const complaint = await api("/api/complaints/" + encodeURIComponent(id));
        const history = await api("/api/complaints/" + encodeURIComponent(id) + "/history");
        document.querySelector("[data-loading]").hidden = true;
        document.querySelector("[data-details]").hidden = false;
        document.querySelector("[data-history-panel]").hidden = false;
        setText('[data-detail="title"]', complaint.title);
        setText('[data-detail="complaintNumber"]', complaint.complaintNumber);
        setText('[data-detail="category"]', categoryName(complaint.category));
        setText('[data-detail="location"]', locationName(complaint.location));
        setText('[data-detail="createdAt"]', formatDate(complaint.createdAt));
        setText('[data-detail="updatedAt"]', formatDate(complaint.updatedAt));
        setText('[data-detail="description"]', complaint.description);
        const status = document.querySelector("[data-detail-status]");
        status.outerHTML = badge(complaint.status, "status").replace(">", ' data-detail-status>');
        const priority = document.querySelector("[data-detail-priority]");
        priority.outerHTML = badge(complaint.priority, "priority");
        const timeline = document.querySelector("[data-status-timeline]");
        const progression = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
        const active = complaint.status === "CANCELLED" ? ["SUBMITTED", "CANCELLED"] : progression;
        const reached = history.map(function (item) { return item.newStatus; });
        timeline.innerHTML = active.map(function (item, index) {
            const historyItem = history.find(function (entry) { return entry.newStatus === item; });
            const done = reached.includes(item);
            return '<div class="timeline-item ' + (done ? "is-complete" : "") + '">' +
                '<span class="timeline-dot">' + (done ? "✓" : "") + "</span><div><strong>" + statusLabel(item) + "</strong>" +
                (historyItem ? "<small>" + formatDate(historyItem.changedAt) + (historyItem.remarks ? " · " + escapeHtml(historyItem.remarks) : "") + "</small>" : "") +
                "</div></div>" + (index < active.length - 1 ? '<span class="timeline-line"></span>' : "");
        }).join("");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[character];
        });
    }

    setupNavigation();
    (async function () {
        try {
            if (page === "student-dashboard") await loadDashboard();
            if (page === "student-complaints") await loadComplaints();
            if (page === "student-new-complaint") {
                await loadUser();
                await loadOptions();
                await submitComplaint();
            }
            if (page === "student-complaint-details") {
                await loadUser();
                await loadDetails();
            }
            if (page === "student-profile") await loadUser();
        } catch (error) {
            showError(error.message);
            const loading = document.querySelector("[data-loading]");
            if (loading) loading.hidden = true;
        }
    })();
})();
