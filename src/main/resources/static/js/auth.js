(function () {
    "use strict";

    const page = document.body.dataset.page;
    const feedback = document.querySelector("[data-feedback]");
    const success = document.querySelector("[data-success]");

    function showMessage(element, message) {
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
    }

    function clearMessages() {
        if (feedback) {
            feedback.textContent = "";
            feedback.hidden = true;
        }
        if (success) {
            success.textContent = "";
            success.hidden = true;
        }
    }

    function setFieldError(field, message) {
        const error = document.querySelector('[data-error-for="' + field + '"]');
        const input = document.querySelector('[name="' + field + '"]');
        if (error) error.textContent = message || "";
        if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function clearFieldErrors(form) {
        form.querySelectorAll(".field-error").forEach(function (element) {
            element.textContent = "";
        });
        form.querySelectorAll("input").forEach(function (input) {
            input.removeAttribute("aria-invalid");
        });
    }

    function setLoading(form, loading) {
        const button = form.querySelector("button[type='submit']");
        if (!button) return;
        button.disabled = loading;
        button.classList.toggle("is-loading", loading);
    }

    async function request(url, options) {
        const response = await fetch(url, Object.assign({
            credentials: "same-origin",
            headers: {"Content-Type": "application/json"}
        }, options));
        let data = {};
        try {
            data = await response.json();
        } catch (ignored) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data.message || "Something went wrong. Please try again.");
        }
        return data;
    }

    function validateLogin(form) {
        let valid = true;
        const email = form.email.value.trim();
        const password = form.password.value;
        clearFieldErrors(form);
        if (!email) {
            setFieldError("email", "Email is required.");
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError("email", "Enter a valid email address.");
            valid = false;
        }
        if (!password) {
            setFieldError("password", "Password is required.");
            valid = false;
        }
        return valid;
    }

    function validateRegister(form) {
        let valid = true;
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        clearFieldErrors(form);
        if (!name) {
            setFieldError("name", "Full name is required.");
            valid = false;
        }
        if (!email) {
            setFieldError("email", "Email is required.");
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError("email", "Enter a valid email address.");
            valid = false;
        }
        if (!password) {
            setFieldError("password", "Password is required.");
            valid = false;
        } else if (password.length < 6) {
            setFieldError("password", "Password must be at least 6 characters.");
            valid = false;
        }
        if (!confirmPassword) {
            setFieldError("confirmPassword", "Please confirm your password.");
            valid = false;
        } else if (password !== confirmPassword) {
            setFieldError("confirmPassword", "Passwords do not match.");
            valid = false;
        }
        return valid;
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearMessages();
            if (!validateLogin(loginForm)) return;
            setLoading(loginForm, true);
            try {
                const user = await request("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: loginForm.email.value.trim(),
                        password: loginForm.password.value
                    })
                });
                if (user.role === "STUDENT") {
                    window.location.assign("/student/dashboard");
                } else if (user.role === "ADMIN") {
                    window.location.assign("/admin/dashboard");
                } else if (user.role === "STAFF") {
                    window.location.assign("/staff/dashboard");
                } else if (user.role === "WORKER") {
                    window.location.assign("/worker/dashboard");
                } else {
                    window.location.assign("/dashboard");
                }
            } catch (error) {
                showMessage(feedback, error.message);
            } finally {
                setLoading(loginForm, false);
            }
        });
    }

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearMessages();
            if (!validateRegister(registerForm)) return;
            setLoading(registerForm, true);
            try {
                await request("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name: registerForm.name.value.trim(),
                        email: registerForm.email.value.trim(),
                        password: registerForm.password.value
                    })
                });
                registerForm.reset();
                showMessage(success, "Account created successfully. Redirecting to login...");
                window.setTimeout(function () {
                    window.location.assign("/login");
                }, 900);
            } catch (error) {
                showMessage(feedback, error.message);
            } finally {
                setLoading(registerForm, false);
            }
        });
    }

    if (page === "dashboard") {
        request("/api/auth/me", {method: "GET"})
            .then(function (user) {
                const name = document.querySelector("[data-user-name]");
                if (name) name.textContent = user.name || "there";
            })
            .catch(function () {
                window.location.assign("/login");
            });

        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", async function () {
                logoutButton.disabled = true;
                try {
                    await request("/api/auth/logout", {method: "POST", headers: {}});
                } finally {
                    window.location.assign("/login");
                }
            });
        }
    }
})();
