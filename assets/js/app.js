/* Common code for all pages: language, layout (header/footer/sidebar), helpers, demo forms.
   Page attributes on <body>:
     data-layout="public" | "admin" | "partner"
     data-root=""  or "../" for pages inside admin/ and partner/
     data-title="i18n key"   data-nav="active menu item" */
(function () {
    var LANGS = ["hy", "en", "ru"];
    var lang = localStorage.getItem("lang");
    if (LANGS.indexOf(lang) < 0) {
        lang = "hy";
    }
    var readyQueue = [];

    // ---------- Texts ----------
    function t(key) {
        var dict = window.I18N[lang] || {};
        var text = dict[key];
        if (text == null) {
            text = (window.I18N.hy || {})[key];
        }
        if (text == null) {
            return key;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        return text.replace(/\{(\d+)\}/g, function (m, i) {
            return args[i] != null ? args[i] : m;
        });
    }

    function applyI18n(root) {
        root = root || document;
        root.querySelectorAll("[data-i18n]").forEach(function (el) {
            el.textContent = t(el.getAttribute("data-i18n"));
        });
        root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
            el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
        });
        root.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
            el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
        });
    }

    function setLang(value) {
        localStorage.setItem("lang", value);
        location.reload();
    }

    // ---------- Formatting ----------
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function price(value) {
        return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + t("currencyAmd");
    }

    function fmtDate(d) {
        return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
    }

    function fmtDateTime(d) {
        return fmtDate(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function ymd(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function monthYear(d) {
        var locale = { hy: "hy-AM", en: "en-GB", ru: "ru-RU" }[lang];
        return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }

    function params() {
        var result = {};
        new URLSearchParams(location.search).forEach(function (v, k) {
            result[k] = v;
        });
        return result;
    }

    function statusBadge(status) {
        return '<span class="badge badge-' + status.toLowerCase() + '">' + esc(t("status_" + status)) + "</span>";
    }

    function dirLabel(direction) {
        return '<span class="dir dir-' + direction.toLowerCase() + '">' + esc(t("direction_" + direction)) + "</span>";
    }

    function stars(n) {
        return new Array(n + 1).join("★");
    }

    // Side-view icons for vehicle types
    function vehicleIcon(icon) {
        var wheels = function (a, b, y) {
            return '<circle cx="' + a + '" cy="' + y + '" r="6" fill="#1b2333"/><circle cx="' + a + '" cy="' + y + '" r="2.5" fill="#fff"/>' +
                '<circle cx="' + b + '" cy="' + y + '" r="6" fill="#1b2333"/><circle cx="' + b + '" cy="' + y + '" r="2.5" fill="#fff"/>';
        };
        var body;
        if (icon === "bus") {
            body = '<rect x="4" y="8" width="86" height="28" rx="6" fill="currentColor"/>' +
                '<g fill="#fff" opacity=".85"><rect x="10" y="13" width="12" height="10" rx="2"/><rect x="26" y="13" width="12" height="10" rx="2"/>' +
                '<rect x="42" y="13" width="12" height="10" rx="2"/><rect x="58" y="13" width="12" height="10" rx="2"/><rect x="74" y="13" width="11" height="16" rx="2"/></g>' +
                wheels(22, 72, 38);
        } else if (icon === "minivan") {
            body = '<path d="M8 34V20c0-5 3-9 8-10l18-2h28c6 0 10 3 14 8l8 8c3 1 5 3 5 6v4H8z" fill="currentColor"/>' +
                '<path d="M20 14l14-2v10H18zM38 12h14v10H38zM56 12h7c3 0 6 2 8 5l3 5H56z" fill="#fff" opacity=".85"/>' +
                wheels(26, 74, 36);
        } else {
            body = '<path d="M6 34v-7c0-3 2-5 5-6l12-3 10-7c2-1 4-2 7-2h18c3 0 5 1 7 3l8 7 11 2c4 1 6 3 6 7v6H6z" fill="currentColor"/>' +
                '<path d="M36 13c1-1 2-1 4-1h9v8H28zM53 12h5c2 0 3 1 4 2l6 6H53z" fill="#fff" opacity=".85"/>' +
                wheels(25, 73, 35);
        }
        return '<svg viewBox="0 0 96 48" width="96" height="48" aria-hidden="true">' + body + "</svg>";
    }

    function logo() {
        return '<svg class="logo-mark" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">' +
            '<rect width="32" height="32" rx="9" fill="currentColor"/>' +
            '<path d="M7 19.5l13.5-9.5 1.6 2.3-4.8 3.4 7.2 2.6-1 2.6-8.8-3.1-4.7 3.3z" fill="#fff"/>' +
            '<circle cx="11" cy="24" r="1.6" fill="#fff"/><circle cx="21" cy="24" r="1.6" fill="#fff"/></svg>';
    }

    function airportText(b) {
        var a = Data.airport(b.airportId);
        return t(a.nameKey) + " (" + a.code + ")";
    }

    function place(b) {
        return b.hotelName || b.address;
    }

    // Booking card used on confirmation, my booking, admin and partner pages
    function renderDetails(b) {
        var arrival = b.direction === "Arrival";
        var from = arrival ? airportText(b) : place(b);
        var fromSub = arrival ? b.flightNumber : b.address;
        var to = arrival ? place(b) : airportText(b);
        var toSub = arrival ? b.address : b.flightNumber;
        var row = function (label, value, wide) {
            return '<div class="' + (wide ? "span-2" : "") + '"><dt>' + esc(t(label)) + "</dt><dd>" + esc(value) + "</dd></div>";
        };

        return '<div class="card details">' +
            '<div class="details-head"><div><span class="muted small">' + esc(t("bookingCode")) + '</span>' +
            '<strong class="details-code">' + esc(b.code) + "</strong></div>" + statusBadge(b.status) + "</div>" +
            '<div class="route">' +
            '<div class="route-point"><span class="route-dot"></span><div><small>' + esc(t("from")) + "</small><strong>" + esc(from) + '</strong><span class="muted">' + esc(fromSub) + "</span></div></div>" +
            '<div class="route-point"><span class="route-dot route-dot-end"></span><div><small>' + esc(t("to")) + "</small><strong>" + esc(to) + '</strong><span class="muted">' + esc(toSub) + "</span></div></div>" +
            "</div>" +
            '<dl class="details-grid">' +
            row("direction", t("direction_" + b.direction)) +
            row(arrival ? "arrivalTime" : "pickupTimeLabel", fmtDateTime(b.pickupTime)) +
            row("flightNumber", b.flightNumber || "—") +
            row("zone", t(Data.zone(b.zoneId).nameKey)) +
            row("passengers", b.passengers) +
            row("luggage", b.luggage) +
            row("vehicle", t(Data.vehicle(b.vehicleId).nameKey)) +
            row("paymentMethod", t("payment_" + b.payment)) +
            row("fullName", b.customerName) +
            row("phone", b.phone) +
            row("email", b.email, true) +
            (b.comment ? row("comment", b.comment, true) : "") +
            "</dl>" +
            '<div class="details-total"><span>' + esc(t("total")) + "</span><strong>" + esc(price(b.price)) + "</strong></div>" +
            "</div>";
    }

    // ---------- Layout ----------
    function langSwitch() {
        return '<div class="lang-switch">' + LANGS.map(function (l) {
            return '<button type="button" class="' + (l === lang ? "active" : "") + '" data-lang="' + l + '">' + t("lang_" + l) + "</button>";
        }).join("") + "</div>";
    }

    function renderPublicLayout(root, active) {
        var link = function (href, key, name) {
            return '<a class="' + (active === name ? "active" : "") + '" href="' + root + href + '" data-i18n="' + key + '"></a>';
        };
        var home = root || "./";
        var header = document.createElement("header");
        header.className = "site-header";
        header.innerHTML =
            '<div class="container header-inner">' +
            '<a class="brand" href="' + home + '">' + logo() + '<span data-i18n="brandName"></span></a>' +
            '<button type="button" class="nav-toggle" data-nav-toggle data-i18n-aria="menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
            '<nav class="main-nav" data-nav>' +
            link("booking.html", "navBook", "book") +
            link("prices.html", "navPrices", "prices") +
            link("my-booking.html", "navMyBooking", "my") +
            link("about.html", "navAbout", "about") +
            link("faq.html", "navFaq", "faq") +
            link("contact.html", "navContact", "contact") +
            langSwitch() +
            "</nav></div>";
        document.body.insertBefore(header, document.body.firstChild);

        var footer = document.createElement("footer");
        footer.className = "site-footer";
        footer.innerHTML =
            '<div class="container footer-grid">' +
            '<div><a class="brand brand-light" href="' + home + '">' + logo() + '<span data-i18n="brandName"></span></a>' +
            '<p class="footer-text" data-i18n="footerText"></p></div>' +
            '<div><h4 data-i18n="footerServices"></h4>' +
            '<a href="' + root + 'booking.html" data-i18n="navBook"></a>' +
            '<a href="' + root + 'prices.html" data-i18n="navPrices"></a>' +
            '<a href="' + root + 'my-booking.html" data-i18n="navMyBooking"></a></div>' +
            '<div><h4 data-i18n="footerCompany"></h4>' +
            '<a href="' + root + 'about.html" data-i18n="navAbout"></a>' +
            '<a href="' + root + 'faq.html" data-i18n="navFaq"></a>' +
            '<a href="' + root + 'partner/" data-i18n="forHotels"></a>' +
            '<a href="' + root + 'admin/" data-i18n="adminPanel"></a></div>' +
            '<div><h4 data-i18n="navContact"></h4>' +
            '<a href="tel:' + t("contactPhoneValue").replace(/\s/g, "") + '" data-i18n="contactPhoneValue"></a>' +
            '<a href="mailto:' + t("contactEmailValue") + '" data-i18n="contactEmailValue"></a>' +
            '<span class="footer-text" data-i18n="support247"></span></div>' +
            "</div>" +
            '<div class="container footer-bottom">© ' + new Date().getFullYear() + ' <span data-i18n="brandName"></span>. <span data-i18n="allRightsReserved"></span></div>';
        document.body.appendChild(footer);
    }

    function renderPanelLayout(root, isAdmin, active) {
        var link = function (href, key, name) {
            return '<a class="' + (active === name ? "active" : "") + '" href="' + href + '" data-i18n="' + key + '"></a>';
        };
        var nav = isAdmin
            ? link("index.html", "dashboard", "dashboard") +
              link("bookings.html", "bookings", "bookings") +
              '<span class="panel-nav-title" data-i18n="settings"></span>' +
              link("zones.html", "zones", "zones") +
              link("tariffs.html", "tariffs", "tariffs") +
              link("vehicles.html", "vehicleTypes", "vehicles") +
              link("hotels.html", "hotels", "hotels")
            : link("create.html", "newBooking", "create") +
              link("index.html", "myBookings", "list");
        var userName = isAdmin ? t("demoDispatcher") : Data.hotel(Data.partnerHotelId).name;
        var main = document.querySelector("main");

        var panel = document.createElement("div");
        panel.className = "panel";
        panel.innerHTML =
            '<aside class="panel-sidebar" data-sidebar>' +
            '<a class="brand brand-light" href="' + (root || "./") + '">' + logo() + '<span data-i18n="brandName"></span></a>' +
            '<span class="panel-role" data-i18n="' + (isAdmin ? "adminPanel" : "partnerPanel") + '"></span>' +
            '<nav class="panel-nav">' + nav + "</nav>" +
            '<a class="panel-back" href="' + (root || "./") + '">← <span data-i18n="backToSite"></span></a>' +
            "</aside>" +
            '<div class="panel-overlay" data-sidebar-close></div>' +
            '<div class="panel-main">' +
            '<header class="panel-top">' +
            '<button type="button" class="nav-toggle panel-toggle" data-sidebar-toggle data-i18n-aria="menu"><span></span><span></span><span></span></button>' +
            '<h1 class="panel-title" data-panel-title></h1>' +
            '<div class="panel-top-right">' + langSwitch() +
            '<span class="user-chip"><span class="user-avatar">' + esc(userName.charAt(0)) + '</span><span class="user-name">' + esc(userName) + "</span></span>" +
            "</div></header>" +
            "</div>";
        document.body.insertBefore(panel, document.body.firstChild);
        panel.querySelector(".panel-main").appendChild(main);
        main.classList.add("panel-content");
        document.body.classList.add("panel-body");
    }

    // ---------- Toast & demo actions ----------
    var toastTimer;
    function toast(message) {
        var el = document.querySelector("[data-toast]");
        if (!el) {
            el = document.createElement("div");
            el.className = "toast";
            el.setAttribute("data-toast", "");
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.hidden = true;
        }, 2800);
    }

    function bindCommon() {
        document.addEventListener("click", function (e) {
            var langBtn = e.target.closest("[data-lang]");
            if (langBtn) {
                setLang(langBtn.getAttribute("data-lang"));
                return;
            }

            if (e.target.closest("[data-nav-toggle]")) {
                var nav = document.querySelector("[data-nav]");
                var open = nav.classList.toggle("open");
                e.target.closest("[data-nav-toggle]").setAttribute("aria-expanded", open);
                return;
            }

            if (e.target.closest("[data-sidebar-toggle]") || e.target.closest("[data-sidebar-close]")) {
                document.body.classList.toggle("sidebar-open");
                return;
            }

            if (e.target.closest("[data-print]")) {
                window.print();
                return;
            }

            var demo = e.target.closest("[data-demo-action]");
            if (demo) {
                var confirmKey = demo.getAttribute("data-demo-confirm");
                if (confirmKey && !window.confirm(t(confirmKey))) {
                    return;
                }
                toast(t(demo.getAttribute("data-demo-message")));
                return;
            }

            // Clickable table rows
            var row = e.target.closest("tr[data-href]");
            if (row && !e.target.closest("a, button")) {
                location.href = row.getAttribute("data-href");
            }
        });

        // Forms without backend: validate and show a message
        document.addEventListener("submit", function (e) {
            var form = e.target.closest("[data-demo-form]");
            if (!form) {
                return;
            }
            e.preventDefault();
            if (form.reportValidity()) {
                toast(t(form.getAttribute("data-demo-message")));
            }
        });
    }

    // ---------- Start ----------
    document.addEventListener("DOMContentLoaded", function () {
        var body = document.body;
        var root = body.getAttribute("data-root") || "";
        var layout = body.getAttribute("data-layout") || "public";
        var active = body.getAttribute("data-nav");
        var titleKey = body.getAttribute("data-title");

        document.documentElement.lang = lang;

        if (layout === "public") {
            renderPublicLayout(root, active);
        } else {
            renderPanelLayout(root, layout === "admin", active);
        }

        readyQueue.forEach(function (fn) {
            fn();
        });

        // Page title may be changed by page scripts through App.setTitle
        var title = App.pageTitle || (titleKey ? t(titleKey) : "");
        var panelTitle = document.querySelector("[data-panel-title]");
        if (panelTitle) {
            panelTitle.textContent = title;
        }
        document.title = title + " — " + t(layout === "public" ? "brandName" : (layout === "admin" ? "adminPanel" : "partnerPanel"));

        applyI18n(document);
        bindCommon();
    });

    window.App = {
        lang: lang,
        t: t,
        applyI18n: applyI18n,
        esc: esc,
        price: price,
        fmtDate: fmtDate,
        fmtDateTime: fmtDateTime,
        ymd: ymd,
        monthYear: monthYear,
        params: params,
        statusBadge: statusBadge,
        dirLabel: dirLabel,
        stars: stars,
        vehicleIcon: vehicleIcon,
        airportText: airportText,
        place: place,
        renderDetails: renderDetails,
        toast: toast,
        pageTitle: null,
        setTitle: function (text) {
            App.pageTitle = text;
        },
        ready: function (fn) {
            readyQueue.push(fn);
        }
    };
})();
