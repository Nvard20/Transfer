/* Page renderers. Each page sets <body data-page="..."> and gets its dynamic parts from Data. */
(function () {
    var t = App.t;
    var esc = App.esc;

    function el(id) {
        return document.getElementById(id);
    }

    function selectOptions(list, selected, text) {
        return list.map(function (x) {
            return '<option value="' + x.id + '"' + (String(x.id) === String(selected) ? " selected" : "") + ">" + esc(text(x)) + "</option>";
        }).join("");
    }

    function airportName(a) {
        return t(a.nameKey) + " (" + a.code + ")";
    }

    function minPrice(filter) {
        return Math.min.apply(null, Data.tariffs.filter(filter).map(function (x) { return x.price; }));
    }

    function airportTabs(target, current, page) {
        el(target).innerHTML = Data.airports.map(function (a) {
            return '<a class="tab' + (a.id === current ? " active" : "") + '" href="' + page + "?airport=" + a.id + '">' + esc(airportName(a)) + "</a>";
        }).join("");
    }

    function tariffTable(airportId, editable) {
        var head = '<th data-i18n="zone"></th>' + Data.vehicles.map(function (v) {
            return '<th class="num">' + esc(t(v.nameKey)) + (editable ? "" : ' <small class="muted">' + esc(t("upToPassengers", v.passengers)) + "</small>") + "</th>";
        }).join("");
        var rows = Data.zones.map(function (z) {
            return "<tr><td><strong>" + esc(t(z.nameKey)) + "</strong></td>" + Data.vehicles.map(function (v) {
                var p = Data.getPrice(airportId, z.id, v.id);
                var text = p ? App.price(p) : (editable ? "+" : "—");
                return '<td class="num">' + (editable
                    ? '<a class="cell-link" href="tariff.html?airport=' + airportId + "&zone=" + z.id + "&vehicle=" + v.id + '">' + esc(text) + "</a>"
                    : esc(text)) + "</td>";
            }).join("") + "</tr>";
        }).join("");
        return '<table class="table"><thead><tr>' + head + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    // Booking table for admin pages
    function bookingTable(list) {
        if (!list.length) {
            return '<div class="empty" data-i18n="noBookings"></div>';
        }
        var rows = list.map(function (b) {
            var a = Data.airport(b.airportId);
            return '<tr data-href="booking.html?id=' + b.code + '">' +
                '<td><a class="strong-link" href="booking.html?id=' + b.code + '">' + esc(b.code) + "</a></td>" +
                '<td class="nowrap">' + App.fmtDateTime(b.pickupTime) + "</td>" +
                "<td>" + App.dirLabel(b.direction) + "</td>" +
                '<td><span class="route-inline">' + esc(a.code) + " → " + esc(App.place(b)) + "</span>" +
                (b.flightNumber ? '<small class="muted">' + esc(b.flightNumber) + "</small>" : "") + "</td>" +
                '<td class="num">' + b.passengers + "</td>" +
                "<td>" + esc(t(Data.vehicle(b.vehicleId).nameKey)) + "</td>" +
                "<td>" + esc(b.customerName) + "</td>" +
                '<td class="num nowrap">' + App.price(b.price) + "</td>" +
                "<td>" + App.statusBadge(b.status) + "</td></tr>";
        }).join("");
        return '<div class="table-wrap"><table class="table table-hover"><thead><tr>' +
            '<th data-i18n="bookingCode"></th><th data-i18n="dateTime"></th><th data-i18n="direction"></th><th data-i18n="route"></th>' +
            '<th class="num" data-i18n="passengersShort"></th><th data-i18n="vehicle"></th><th data-i18n="customer"></th>' +
            '<th class="num" data-i18n="price"></th><th data-i18n="status"></th>' +
            "</tr></thead><tbody>" + rows + "</tbody></table></div>";
    }

    function activeBadge(on) {
        return '<span class="badge ' + (on ? "badge-confirmed" : "badge-cancelled") + '" data-i18n="' + (on ? "active" : "inactive") + '"></span>';
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    var pages = {
        // ---------- Public ----------
        home: function () {
            el("qAirport").innerHTML = selectOptions(Data.airports, 1, airportName);
            el("qHotel").innerHTML = '<option value="" data-i18n="selectHotel"></option>' +
                selectOptions(Data.hotels, "", function (h) { return h.name; }) +
                '<option value="0" data-i18n="otherAddress"></option>';
            el("qDate").value = App.ymd(new Date(Date.now() + 86400000));
            el("qDate").min = App.ymd(new Date());
            el("qFrom").textContent = t("pricesFrom", App.price(minPrice(function () { return true; })));

            el("fleet").innerHTML = Data.vehicles.map(function (v) {
                return '<div class="card fleet-card">' +
                    '<span class="vehicle-icon vehicle-' + v.icon + '">' + App.vehicleIcon(v.icon) + "</span>" +
                    '<h3 data-i18n="' + v.nameKey + '"></h3>' +
                    '<p class="muted" data-i18n="' + v.descKey + '"></p>' +
                    '<div class="vehicle-meta"><span>' + esc(t("upToPassengers", v.passengers)) + "</span><span>" + esc(t("upToLuggage", v.luggage)) + "</span></div>" +
                    '<strong class="fleet-price">' + esc(t("pricesFrom", App.price(minPrice(function (x) { return x.vehicleId === v.id; })))) + "</strong>" +
                    "</div>";
            }).join("");

            el("zones").innerHTML = Data.zones.map(function (z) {
                return '<a class="zone-card" href="booking.html?HotelId=0&ZoneId=' + z.id + '">' +
                    '<span class="zone-name" data-i18n="' + z.nameKey + '"></span>' +
                    '<span class="zone-price">' + esc(t("pricesFrom", App.price(minPrice(function (x) { return x.zoneId === z.id; })))) + "</span></a>";
            }).join("");
        },

        prices: function () {
            var airportId = Number(App.params().airport) || 1;
            airportTabs("airportTabs", airportId, "prices.html");
            el("pricesTable").innerHTML = tariffTable(airportId, false);
            el("bookLink").href = "booking.html?AirportId=" + airportId;
        },

        confirmation: function () {
            var p = App.params();
            if (!p.VehicleTypeId) {
                location.replace("booking.html");
                return;
            }
            var b = Data.buildBooking(p, "Website");
            el("confirmLead").textContent = t("bookingReceivedLead", b.email);
            el("confirmCode").textContent = b.code;
            el("details").innerHTML = App.renderDetails(b);
        },

        myBooking: function () {
            var p = App.params();
            el("alert").hidden = p.notFound !== "1";
            el("code").value = p.code || "";
            el("email").value = p.email || "";
        },

        bookingDetails: function () {
            var p = App.params();
            var b = Data.findBooking(p.code, p.email);
            if (!b) {
                location.replace("my-booking.html?notFound=1&code=" + encodeURIComponent(p.code || "") + "&email=" + encodeURIComponent(p.email || ""));
                return;
            }
            el("details").innerHTML = App.renderDetails(b);
            var canChange = b.status === "New" || b.status === "Confirmed";
            el("manageOpen").hidden = !canChange;
            el("manageClosed").hidden = canChange;
        },

        // ---------- Admin ----------
        dashboard: function () {
            var today = new Date();
            var tomorrow = new Date(Date.now() + 86400000);
            var active = Data.bookings.filter(function (b) { return b.status !== "Cancelled"; });
            var todayList = active.filter(function (b) { return sameDay(b.pickupTime, today); });
            var tomorrowList = active.filter(function (b) { return sameDay(b.pickupTime, tomorrow); });
            var revenue = active.filter(function (b) {
                return b.pickupTime.getMonth() === today.getMonth() && b.pickupTime.getFullYear() === today.getFullYear();
            }).reduce(function (sum, b) { return sum + b.price; }, 0);

            el("statToday").textContent = todayList.length;
            el("statTodayDate").textContent = App.fmtDate(today);
            el("statTomorrow").textContent = tomorrowList.length;
            el("statTomorrowDate").textContent = App.fmtDate(tomorrow);
            el("statNew").textContent = Data.bookings.filter(function (b) { return b.status === "New"; }).length;
            el("statRevenue").textContent = App.price(revenue);
            el("statMonth").textContent = App.monthYear(today);
            el("todayTable").innerHTML = bookingTable(todayList);
            el("tomorrowTable").innerHTML = bookingTable(tomorrowList);
            el("todayAll").href = "bookings.html?from=" + App.ymd(today) + "&to=" + App.ymd(today);
            el("tomorrowAll").href = "bookings.html?from=" + App.ymd(tomorrow) + "&to=" + App.ymd(tomorrow);
        },

        bookings: function () {
            var p = App.params();
            el("fStatus").innerHTML = '<option value="" data-i18n="allStatuses"></option>' + Data.statuses.map(function (s) {
                return '<option value="' + s + '"' + (p.status === s ? " selected" : "") + ' data-i18n="status_' + s + '"></option>';
            }).join("");
            el("fFrom").value = p.from || "";
            el("fTo").value = p.to || "";
            el("fSearch").value = p.q || "";

            var q = (p.q || "").trim().toLowerCase();
            var list = Data.bookings.filter(function (b) {
                var d = App.ymd(b.pickupTime);
                return (!p.from || d >= p.from) &&
                    (!p.to || d <= p.to) &&
                    (!p.status || b.status === p.status) &&
                    (!q || (b.code + " " + b.customerName + " " + App.place(b)).toLowerCase().indexOf(q) >= 0);
            });
            el("foundCount").textContent = t("foundCount", list.length);
            el("bookingsTable").innerHTML = bookingTable(list);
        },

        adminBooking: function () {
            var b = Data.findBooking(App.params().id);
            if (!b) {
                el("details").innerHTML = '<div class="card empty" data-i18n="notFound"></div>';
                el("side").hidden = true;
                return;
            }
            App.setTitle(t("booking") + " " + b.code);
            el("details").innerHTML = App.renderDetails(b);
            el("status").innerHTML = Data.statuses.map(function (s) {
                return '<option value="' + s + '"' + (b.status === s ? " selected" : "") + ' data-i18n="status_' + s + '"></option>';
            }).join("");
            el("customerName").textContent = b.customerName;
            el("customerPhone").textContent = b.phone;
            el("customerPhone").href = "tel:" + b.phone.replace(/\s/g, "");
            el("customerEmail").textContent = b.email;
            el("customerEmail").href = "mailto:" + b.email;
            el("metaSource").textContent = t("source_" + b.source);
            el("metaCreated").textContent = App.fmtDateTime(b.createdAt);
        },

        zones: function () {
            el("zonesBody").innerHTML = Data.zones.map(function (z) {
                return "<tr><td>" + z.id + "</td><td><strong>" + esc(t(z.nameKey)) + "</strong></td><td>" + activeBadge(z.active) + "</td>" +
                    '<td class="actions"><a class="btn btn-ghost btn-sm" href="zone.html?id=' + z.id + '" data-i18n="edit"></a></td></tr>';
            }).join("");
        },

        zone: function () {
            var z = Data.zone(App.params().id);
            App.setTitle(t(z ? "editZone" : "addZone"));
            el("formTitle").textContent = t(z ? "editZone" : "addZone");
            if (z) {
                el("nameHy").value = I18N.hy[z.nameKey];
                el("nameEn").value = I18N.en[z.nameKey];
                el("nameRu").value = I18N.ru[z.nameKey];
                el("isActive").checked = z.active;
            }
        },

        tariffs: function () {
            var airportId = Number(App.params().airport) || 1;
            airportTabs("airportTabs", airportId, "tariffs.html");
            el("tariffTable").innerHTML = tariffTable(airportId, true);
            el("addTariff").href = "tariff.html?airport=" + airportId;
        },

        tariff: function () {
            var p = App.params();
            var airportId = Number(p.airport) || 1;
            var exists = p.zone && p.vehicle && Data.getPrice(airportId, p.zone, p.vehicle) > 0;
            App.setTitle(t(exists ? "editTariff" : "addTariff"));
            el("formTitle").textContent = t(exists ? "editTariff" : "addTariff");
            el("airport").innerHTML = selectOptions(Data.airports, airportId, airportName);
            el("zone").innerHTML = selectOptions(Data.zones, p.zone || 1, function (z) { return t(z.nameKey); });
            el("vehicle").innerHTML = selectOptions(Data.vehicles, p.vehicle || 1, function (v) { return t(v.nameKey); });
            el("price").value = exists ? Data.getPrice(airportId, p.zone, p.vehicle) : "";
            el("priceLabel").textContent = t("price") + " (" + t("currencyAmd") + ")";
            el("backLink").href = "tariffs.html?airport=" + airportId;
            el("cancelLink").href = "tariffs.html?airport=" + airportId;
        },

        vehicles: function () {
            el("vehiclesBody").innerHTML = Data.vehicles.map(function (v) {
                return '<tr><td><span class="vehicle-icon vehicle-icon-sm vehicle-' + v.icon + '">' + App.vehicleIcon(v.icon) + "</span></td>" +
                    "<td><strong>" + esc(t(v.nameKey)) + '</strong><br><small class="muted">' + esc(t(v.descKey)) + "</small></td>" +
                    '<td class="num">' + v.passengers + '</td><td class="num">' + v.luggage + '</td><td class="num">× ' + v.factor + "</td>" +
                    "<td>" + activeBadge(v.active) + "</td>" +
                    '<td class="actions"><a class="btn btn-ghost btn-sm" href="vehicle.html?id=' + v.id + '" data-i18n="edit"></a></td></tr>';
            }).join("");
        },

        vehicle: function () {
            var v = Data.vehicle(App.params().id);
            App.setTitle(t(v ? "editVehicle" : "addVehicle"));
            el("formTitle").textContent = t(v ? "editVehicle" : "addVehicle");
            if (v) {
                el("nameHy").value = I18N.hy[v.nameKey];
                el("nameEn").value = I18N.en[v.nameKey];
                el("nameRu").value = I18N.ru[v.nameKey];
                el("pax").value = v.passengers;
                el("bags").value = v.luggage;
                el("factor").value = v.factor;
                el("isActive").checked = v.active;
            }
        },

        hotels: function () {
            el("hotelsBody").innerHTML = Data.hotels.map(function (h) {
                return "<tr><td><strong>" + esc(h.name) + '</strong><br><small class="muted">' + esc(h.email) + "</small></td>" +
                    "<td>" + esc(t(Data.zone(h.zoneId).nameKey)) + "</td><td>" + esc(h.address) + "</td>" +
                    '<td class="nowrap stars">' + App.stars(h.stars) + "</td>" +
                    "<td>" + (h.partner ? '<span class="badge badge-confirmed" data-i18n="partner"></span>' : '<span class="muted">—</span>') + "</td>" +
                    '<td class="actions"><a class="btn btn-ghost btn-sm" href="hotel.html?id=' + h.id + '" data-i18n="edit"></a></td></tr>';
            }).join("");
        },

        hotel: function () {
            var h = Data.hotel(App.params().id);
            App.setTitle(t(h ? "editHotel" : "addHotel"));
            el("formTitle").textContent = t(h ? "editHotel" : "addHotel");
            el("zone").innerHTML = selectOptions(Data.zones, h ? h.zoneId : 1, function (z) { return t(z.nameKey); });
            el("stars").innerHTML = [1, 2, 3, 4, 5].map(function (s) {
                return '<option value="' + s + '"' + ((h ? h.stars : 3) === s ? " selected" : "") + ">" + App.stars(s) + "</option>";
            }).join("");
            if (h) {
                el("name").value = h.name;
                el("address").value = h.address;
                el("phone").value = h.phone;
                el("hotelEmail").value = h.email;
                el("isPartner").checked = h.partner;
            }
        },

        // ---------- Partner ----------
        partnerList: function () {
            var h = Data.hotel(Data.partnerHotelId);
            var list = Data.bookings.filter(function (b) { return b.hotelId === h.id; }).slice().reverse();
            var now = new Date();
            now.setHours(0, 0, 0, 0);

            el("hotelName").textContent = h.name;
            el("hotelAddress").textContent = h.address;
            el("totalCount").textContent = list.length;
            el("upcomingCount").textContent = list.filter(function (b) { return b.pickupTime >= now && b.status !== "Cancelled"; }).length;

            if (!list.length) {
                el("partnerTable").innerHTML = '<div class="empty" data-i18n="noBookings"></div>';
                return;
            }
            el("partnerTable").innerHTML = '<div class="table-wrap"><table class="table"><thead><tr>' +
                '<th data-i18n="bookingCode"></th><th data-i18n="dateTime"></th><th data-i18n="direction"></th><th data-i18n="guest"></th>' +
                '<th class="num" data-i18n="passengersShort"></th><th data-i18n="vehicle"></th><th class="num" data-i18n="price"></th><th data-i18n="status"></th>' +
                "</tr></thead><tbody>" + list.map(function (b) {
                    return "<tr><td><strong>" + esc(b.code) + '</strong></td><td class="nowrap">' + App.fmtDateTime(b.pickupTime) + "</td>" +
                        "<td>" + App.dirLabel(b.direction) + "</td>" +
                        "<td>" + esc(b.customerName) + '<br><small class="muted">' + esc(b.phone) + "</small></td>" +
                        '<td class="num">' + b.passengers + "</td><td>" + esc(t(Data.vehicle(b.vehicleId).nameKey)) + "</td>" +
                        '<td class="num nowrap">' + App.price(b.price) + "</td><td>" + App.statusBadge(b.status) + "</td></tr>";
                }).join("") + "</tbody></table></div>";
        },

        partnerConfirmation: function () {
            var p = App.params();
            if (!p.VehicleTypeId) {
                location.replace("create.html");
                return;
            }
            p.HotelId = Data.partnerHotelId;
            var b = Data.buildBooking(p, "Partner");
            el("confirmLead").textContent = t("partnerBookingLead", b.customerName);
            el("confirmCode").textContent = b.code;
            el("details").innerHTML = App.renderDetails(b);
        }
    };

    App.ready(function () {
        var name = document.body.getAttribute("data-page");
        if (pages[name]) {
            pages[name]();
        }
    });
})();
