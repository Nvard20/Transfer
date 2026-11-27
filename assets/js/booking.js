/* Booking stepper: 1) route & flight  2) car  3) contact & payment.
   Usage: <div data-booking-root data-action="confirmation.html" [data-fixed-hotel="1"]></div>
   The form is sent with GET to the action page, which reads the query string. */
(function () {
    var t = App.t;
    var esc = App.esc;

    function options(list, selected, text) {
        return list.map(function (x) {
            return '<option value="' + x.id + '"' + (String(x.id) === String(selected) ? " selected" : "") + ">" + esc(text(x)) + "</option>";
        }).join("");
    }

    function hotelOptions(selected) {
        var html = '<option value="" data-i18n="selectHotel"></option>';
        Data.zones.forEach(function (z) {
            var list = Data.hotels.filter(function (h) { return h.zoneId === z.id; });
            if (!list.length) {
                return;
            }
            html += '<optgroup label="' + esc(t(z.nameKey)) + '">' + options(list, selected, function (h) { return h.name; }) + "</optgroup>";
        });
        html += '<option value="0"' + (selected === "0" ? " selected" : "") + ' data-i18n="otherAddress"></option>';
        html += '<option value="map"' + (selected === "map" ? " selected" : "") + ' data-i18n="pickOnMap"></option>';
        return html;
    }

    function markup(p, fixedHotel) {
        // "Route" (any A → B on the map) is only for the public form, not for partner hotels
        var modes = fixedHotel ? ["Arrival", "Departure", "Tour"] : ["Arrival", "Departure", "Route", "Tour"];
        var mode = modes.indexOf(p.Direction) >= 0 ? p.Direction : "Arrival";
        var radio = function (value) {
            return '<label><input type="radio" name="Direction" value="' + value + '"' + (mode === value ? " checked" : "") +
                '><span data-i18n="direction_' + value + '"></span></label>';
        };
        var today = App.ymd(new Date());
        var tomorrow = App.ymd(new Date(Date.now() + 86400000));
        var isMap = !fixedHotel && p.HotelId === "map";
        var isOther = !fixedHotel && (p.HotelId === "0" || isMap);
        var pax = Number(p.Passengers) || 1;
        var selectedVehicle = p.VehicleTypeId || (Data.vehicles.find(function (v) { return v.passengers >= pax; }) || Data.vehicles[0]).id;

        var routeField = fixedHotel ? "" :
            '<div class="field span-2" data-mode-only="route"><label data-i18n="route"></label>' +
            '<div class="map-picker" data-route-picker></div>' +
            '<small class="hint" data-i18n="routePriceHint"></small>' +
            ["FromLat", "FromLng", "FromAddress", "ToLat", "ToLng", "ToAddress"].map(function (name) {
                return '<input type="hidden" name="' + name + '" value="' + esc(p[name] || "") + '">';
            }).join("") + "</div>";

        var hotelField = fixedHotel
            ? '<div class="field" data-mode-only="airport tour"><label data-i18n="hotel"></label>' +
              '<div class="field-static"><strong>' + esc(fixedHotel.name) + "</strong><small>" + esc(fixedHotel.address) + "</small></div>" +
              '<input type="hidden" id="HotelId" name="HotelId" value="' + fixedHotel.id + '"></div>'
            : '<div class="field" data-mode-only="airport tour"><label for="HotelId" data-i18n="hotel"></label>' +
              '<select id="HotelId" name="HotelId" required data-hotel-select>' + hotelOptions(p.HotelId || "") + "</select></div>" +
              '<div class="field span-2" data-map-field' + (isMap ? "" : " hidden") + '><label data-i18n="pickupPoint"></label>' +
              '<div class="map-picker" data-map-picker></div>' +
              '<input type="hidden" name="Lat" value="' + esc(p.Lat || "") + '">' +
              '<input type="hidden" name="Lng" value="' + esc(p.Lng || "") + '"></div>' +
              '<div class="field" data-address-field' + (isOther ? "" : " hidden") + '><label for="Address" data-i18n="address"></label>' +
              '<input type="text" id="Address" name="Address" value="' + esc(p.Address || "") + '" data-i18n-placeholder="addressPlaceholder"></div>' +
              '<div class="field" data-address-field' + (isOther ? "" : " hidden") + '><label for="ZoneId" data-i18n="zone"></label>' +
              '<select id="ZoneId" name="ZoneId">' + options(Data.zones, p.ZoneId, function (z) { return t(z.nameKey); }) + "</select></div>";

        var vehicles = Data.vehicles.filter(function (v) { return v.active; }).map(function (v) {
            return '<label class="vehicle-card" data-capacity="' + v.passengers + '" data-luggage="' + v.luggage + '" data-vehicle="' + v.id + '">' +
                '<input type="radio" name="VehicleTypeId" value="' + v.id + '" required' + (String(v.id) === String(selectedVehicle) ? " checked" : "") + ">" +
                '<span class="vehicle-icon vehicle-' + v.icon + '">' + App.vehicleIcon(v.icon) + "</span>" +
                '<span class="vehicle-info"><strong data-i18n="' + v.nameKey + '"></strong>' +
                '<span class="muted small" data-i18n="' + v.descKey + '"></span>' +
                '<span class="vehicle-meta"><span>' + esc(t("upToPassengers", v.passengers)) + "</span><span>" + esc(t("upToLuggage", v.luggage)) + "</span></span>" +
                '<span class="vehicle-warning" data-i18n="vehicleTooSmall"></span></span>' +
                '<span class="vehicle-price" data-price>—</span>' +
                "</label>";
        }).join("");

        return '<div class="booking-main">' +
            '<ol class="stepper">' +
            '<li class="stepper-item active" data-step-nav="1"><span class="stepper-num">1</span><span class="stepper-label" data-i18n="stepRoute"></span></li>' +
            '<li class="stepper-item" data-step-nav="2"><span class="stepper-num">2</span><span class="stepper-label" data-i18n="stepVehicle"></span></li>' +
            '<li class="stepper-item" data-step-nav="3"><span class="stepper-num">3</span><span class="stepper-label" data-i18n="stepContact"></span></li>' +
            "</ol>" +

            // Step 1
            '<section class="card step-panel" data-step="1">' +
            '<h2 class="step-title" data-dir-label="stepRouteTitle|stepRouteTitle|tourRouteTitle|routeTitle"></h2>' +
            '<div class="segmented">' + modes.map(radio).join("") + "</div>" +
            '<div class="form-grid">' +
            '<div class="field" data-mode-only="airport"><label for="AirportId" data-i18n="airport"></label>' +
            '<select id="AirportId" name="AirportId" required>' + options(Data.airports, p.AirportId || 1, function (a) { return t(a.nameKey) + " (" + a.code + ")"; }) + "</select></div>" +
            hotelField +
            routeField +
            '<div class="field" data-mode-only="tour"><label for="TourId" data-i18n="tour"></label>' +
            '<select id="TourId" name="TourId" required>' + options(Data.tours, p.TourId || 1, function (x) { return t(x.nameKey); }) + "</select>" +
            '<small class="hint" data-i18n="tourHint"></small></div>' +
            '<div class="field"><label for="Date" data-dir-label="arrivalDate|pickupDate|tourDate|date"></label>' +
            '<input type="date" id="Date" name="Date" value="' + esc(p.Date || tomorrow) + '" min="' + today + '" required></div>' +
            '<div class="field"><label for="Time" data-dir-label="arrivalTime|pickupTimeLabel|pickupTimeLabel|routeTime"></label>' +
            '<input type="time" id="Time" name="Time" value="' + esc(p.Time || "") + '" required></div>' +
            '<div class="field" data-mode-only="airport"><label for="FlightNumber" data-i18n="flightNumber"></label>' +
            '<input type="text" id="FlightNumber" name="FlightNumber" value="' + esc(p.FlightNumber || "") + '" data-i18n-placeholder="flightNumberPlaceholder">' +
            '<small class="hint" data-dir-label="flightHintArrival|flightHintDeparture"></small></div>' +
            '<div class="field field-pair">' +
            '<div><label for="Passengers" data-i18n="passengers"></label><input type="number" id="Passengers" name="Passengers" value="' + pax + '" min="1" max="18" required></div>' +
            '<div data-mode-only="airport route"><label for="Luggage" data-i18n="luggage"></label><input type="number" id="Luggage" name="Luggage" value="' + esc(p.Luggage || pax) + '" min="0" max="18" required></div>' +
            "</div>" +
            "</div>" +
            '<div class="step-actions"><button type="button" class="btn btn-primary" data-next data-i18n="next"></button></div>' +
            "</section>" +

            // Step 2
            '<section class="card step-panel" data-step="2" hidden>' +
            '<h2 class="step-title" data-i18n="stepVehicleTitle"></h2>' +
            '<p class="muted" data-i18n="stepVehicleHint"></p>' +
            '<div class="vehicle-list">' + vehicles + "</div>" +
            '<div class="step-actions"><button type="button" class="btn btn-ghost" data-prev data-i18n="back"></button>' +
            '<button type="button" class="btn btn-primary" data-next data-i18n="next"></button></div>' +
            "</section>" +

            // Step 3
            '<section class="card step-panel" data-step="3" hidden>' +
            '<h2 class="step-title" data-i18n="' + (fixedHotel ? "guestDetails" : "stepContactTitle") + '"></h2>' +
            '<div class="form-grid">' +
            '<div class="field"><label for="CustomerName" data-i18n="fullName"></label><input type="text" id="CustomerName" name="CustomerName" autocomplete="name" required></div>' +
            '<div class="field"><label for="Phone" data-i18n="phone"></label><input type="tel" id="Phone" name="Phone" autocomplete="tel" data-i18n-placeholder="phonePlaceholder" required></div>' +
            '<div class="field span-2"><label for="Email" data-i18n="email"></label><input type="email" id="Email" name="Email" autocomplete="email" required>' +
            '<small class="hint" data-i18n="emailHint"></small></div>' +
            '<div class="field span-2"><label for="Comment" data-i18n="comment"></label><textarea id="Comment" name="Comment" rows="3" data-i18n-placeholder="commentPlaceholder"></textarea></div>' +
            "</div>" +
            '<h3 class="field-title" data-i18n="paymentMethod"></h3>' +
            '<div class="choice-list">' +
            '<label class="choice"><input type="radio" name="PaymentMethod" value="Cash" checked><span><strong data-i18n="payment_Cash"></strong><small class="muted" data-i18n="paymentCashHint"></small></span></label>' +
            '<label class="choice"><input type="radio" name="PaymentMethod" value="Card"><span><strong data-i18n="payment_Card"></strong><small class="muted" data-i18n="paymentCardHint"></small></span></label>' +
            "</div>" +
            '<label class="checkbox"><input type="checkbox" required><span data-i18n="agreeTerms"></span></label>' +
            '<div class="step-actions"><button type="button" class="btn btn-ghost" data-prev data-i18n="back"></button>' +
            '<button type="submit" class="btn btn-accent" data-i18n="confirmBooking"></button></div>' +
            "</section>" +
            "</div>" +

            // Live summary
            '<aside class="card booking-summary">' +
            '<h3 data-i18n="yourTrip"></h3>' +
            '<dl class="summary-list">' +
            '<div><dt data-i18n="direction"></dt><dd data-sum="direction">—</dd></div>' +
            '<div><dt data-i18n="from"></dt><dd data-sum="from">—</dd></div>' +
            '<div><dt data-i18n="to"></dt><dd data-sum="to">—</dd></div>' +
            '<div><dt data-i18n="dateTime"></dt><dd data-sum="datetime">—</dd></div>' +
            '<div><dt data-i18n="passengers"></dt><dd data-sum="passengers">—</dd></div>' +
            '<div><dt data-i18n="vehicle"></dt><dd data-sum="vehicle">—</dd></div>' +
            "</dl>" +
            '<div class="summary-total"><span data-i18n="total"></span><strong data-sum="price">—</strong></div>' +
            '<p class="muted small" data-i18n="priceIncludes"></p>' +
            "</aside>";
    }

    function mount(root) {
        var p = App.params();
        var fixedId = root.getAttribute("data-fixed-hotel");
        var fixedHotel = fixedId ? Data.hotel(fixedId) : null;
        if (fixedHotel && !p.Direction) {
            p.Direction = "Departure";
        }

        var form = document.createElement("form");
        form.className = "booking";
        form.method = "get";
        form.action = root.getAttribute("data-action");
        form.noValidate = true;
        form.innerHTML = markup(p, fixedHotel);
        root.appendChild(form);

        var step = 1;
        var $ = function (sel) { return form.querySelector(sel); };
        var $$ = function (sel) { return Array.prototype.slice.call(form.querySelectorAll(sel)); };
        var val = function (name) {
            var el = form.elements[name];
            return el ? el.value : "";
        };
        var direction = function () {
            var el = $('input[name="Direction"]:checked');
            return el ? el.value : "Arrival";
        };

        // HotelId: hotel id, "0" = typed address, "map" = point picked on the map
        function isCustomPlace() {
            var hotelId = val("HotelId");
            return hotelId === "0" || hotelId === "map";
        }

        function zoneId() {
            var hotelId = val("HotelId");
            if (isCustomPlace()) {
                return Number(val("ZoneId"));
            }
            return hotelId ? Data.hotel(hotelId).zoneId : null;
        }

        function placeText() {
            var hotelId = val("HotelId");
            if (isCustomPlace()) {
                return val("Address") || t(Data.zone(val("ZoneId")).nameKey);
            }
            return hotelId ? Data.hotel(hotelId).name : "—";
        }

        // Map picker: fills Lat/Lng, zone and address from the clicked point
        var pickerRoot = $("[data-map-picker]");
        var picker = pickerRoot ? MapPicker.attach(pickerRoot, {
            lat: p.Lat,
            lng: p.Lng,
            onPick: function (point) {
                form.elements.Lat.value = point.lat.toFixed(6);
                form.elements.Lng.value = point.lng.toFixed(6);
                form.elements.ZoneId.value = point.zoneId;
                form.elements.Address.value = point.address;
                refresh();
            },
            onAddress: function (address) {
                form.elements.Address.value = address;
                refresh();
            }
        }) : null;
        var mapShown = false;

        // Route picker (Direction = Route): A and B points go to From*/To* hidden fields
        var routeRoot = $("[data-route-picker]");
        var routePicker = routeRoot ? MapPicker.attachRoute(routeRoot, {
            from: { lat: p.FromLat, lng: p.FromLng, address: p.FromAddress },
            to: { lat: p.ToLat, lng: p.ToLng, address: p.ToAddress },
            onChange: function (r) {
                ["from", "to"].forEach(function (name) {
                    var prefix = name === "from" ? "From" : "To";
                    var point = r[name];
                    form.elements[prefix + "Lat"].value = point ? point.lat.toFixed(6) : "";
                    form.elements[prefix + "Lng"].value = point ? point.lng.toFixed(6) : "";
                    form.elements[prefix + "Address"].value = point ? point.address : "";
                });
                refresh();
            }
        }) : null;
        var routeShown = false;

        // Labels that depend on direction: data-dir-label="arrivalKey|departureKey|tourKey|routeKey"
        // Fields only for some directions: data-mode-only="airport" | "tour" | "route" (space separated list)
        function updateDirection() {
            var mode = direction();
            var index = { Arrival: 0, Departure: 1, Tour: 2, Route: 3 }[mode];
            var group = mode === "Tour" ? "tour" : (mode === "Route" ? "route" : "airport");
            $$("[data-dir-label]").forEach(function (el) {
                var keys = el.getAttribute("data-dir-label").split("|");
                el.textContent = t(keys[index] || keys[1]);
            });
            $$("[data-mode-only]").forEach(function (el) {
                var show = el.getAttribute("data-mode-only").split(" ").indexOf(group) >= 0;
                el.hidden = !show;
                el.querySelectorAll("input, select").forEach(function (f) {
                    f.disabled = !show;
                });
            });
            if (routePicker && isRoute() && !routeShown) {
                routePicker.show();
            }
            routeShown = isRoute();
        }

        function isTour() {
            return direction() === "Tour";
        }

        function isRoute() {
            return direction() === "Route";
        }

        // Estimated km of the A → B route, or 0 while a point is missing
        function routeKm() {
            if (!val("FromLat") || !val("ToLat")) {
                return 0;
            }
            return Data.routeKm({ lat: val("FromLat"), lng: val("FromLng") }, { lat: val("ToLat"), lng: val("ToLng") });
        }

        function priceFor(vehicleId) {
            if (isTour()) {
                return Data.tourPrice(val("TourId"), vehicleId);
            }
            if (isRoute()) {
                return Data.routePrice(routeKm(), vehicleId);
            }
            var z = zoneId();
            return z ? Data.getPrice(val("AirportId"), z, vehicleId) : 0;
        }

        function tourName() {
            return t(Data.tour(val("TourId")).nameKey);
        }

        function updateAddress() {
            var select = $("[data-hotel-select]");
            if (!select) {
                return;
            }
            // In Route mode the hotel select is hidden, so its address fields are hidden too
            var other = !isRoute() && isCustomPlace();
            var onMap = !isRoute() && select.value === "map";
            $$("[data-address-field]").forEach(function (el) {
                el.hidden = !other;
            });
            $("#Address").required = other;

            $("[data-map-field]").hidden = !onMap;
            form.elements.Lat.disabled = !onMap;
            form.elements.Lng.disabled = !onMap;
            if (onMap && !mapShown) {
                picker.show();
            }
            mapShown = onMap;
        }

        function updateVehicles() {
            var pax = Number(val("Passengers")) || 1;
            var bags = isTour() ? 0 : Number(val("Luggage")) || 0;

            $$(".vehicle-card").forEach(function (card) {
                var radio = card.querySelector("input");
                var tooSmall = pax > Number(card.getAttribute("data-capacity")) || bags > Number(card.getAttribute("data-luggage"));
                card.classList.toggle("disabled", tooSmall);
                radio.disabled = tooSmall;
                if (tooSmall && radio.checked) {
                    radio.checked = false;
                }
                var p = priceFor(radio.value);
                card.querySelector("[data-price]").textContent = p ? App.price(p) : "—";
            });

            // Pick the first car that fits if nothing is selected
            if (!$('input[name="VehicleTypeId"]:checked')) {
                var first = $('input[name="VehicleTypeId"]:not(:disabled)');
                if (first) {
                    first.checked = true;
                }
            }
        }

        function updateSummary() {
            var airport = Data.airport(val("AirportId"));
            var airportName = t(airport.nameKey) + " (" + airport.code + ")";
            var arrival = direction() === "Arrival";
            var vehicle = $('input[name="VehicleTypeId"]:checked');
            var set = function (key, text) {
                $('[data-sum="' + key + '"]').textContent = text;
            };

            var tour = isTour();
            var price = vehicle ? priceFor(vehicle.value) : 0;

            set("direction", t("direction_" + direction()));
            if (isRoute()) {
                var km = routeKm();
                set("from", val("FromAddress") || "—");
                set("to", (val("ToAddress") || "—") + (km ? " (" + t("kmValue", km) + ")" : ""));
            } else {
                set("from", arrival ? airportName : placeText());
                set("to", tour ? tourName() : (arrival ? placeText() : airportName));
            }
            set("datetime", val("Date") ? val("Date").split("-").reverse().join(".") + (val("Time") ? " " + val("Time") : "") : "—");
            set("passengers", tour ? val("Passengers") : val("Passengers") + " / " + t("luggage").toLowerCase() + ": " + val("Luggage"));
            set("vehicle", vehicle ? t(Data.vehicle(vehicle.value).nameKey) : "—");
            set("price", price ? App.price(price) : "—");
        }

        function refresh() {
            updateDirection();
            updateAddress();
            updateVehicles();
            updateSummary();
        }

        function validStep(n) {
            if (n === 1 && isRoute() && routePicker && !routePicker.isComplete()) {
                routePicker.showError();
                return false;
            }
            if (n === 1 && !isRoute() && picker && val("HotelId") === "map" && !picker.hasPoint()) {
                picker.showError();
                return false;
            }
            var fields = $$('[data-step="' + n + '"] input, [data-step="' + n + '"] select, [data-step="' + n + '"] textarea');
            for (var i = 0; i < fields.length; i++) {
                var f = fields[i];
                if (f.type === "hidden" || f.closest("[hidden]")) {
                    continue;
                }
                if (!f.checkValidity()) {
                    f.reportValidity();
                    return false;
                }
            }
            return true;
        }

        function goTo(n) {
            step = n;
            $$(".step-panel").forEach(function (panel) {
                panel.hidden = Number(panel.getAttribute("data-step")) !== n;
            });
            $$(".stepper-item").forEach(function (item) {
                var s = Number(item.getAttribute("data-step-nav"));
                item.classList.toggle("active", s === n);
                item.classList.toggle("done", s < n);
            });
            form.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        form.addEventListener("click", function (e) {
            if (e.target.closest("[data-next]") && validStep(step)) {
                goTo(step + 1);
            }
            if (e.target.closest("[data-prev]")) {
                goTo(step - 1);
            }
            var nav = e.target.closest(".stepper-item.done");
            if (nav) {
                goTo(Number(nav.getAttribute("data-step-nav")));
            }
        });

        form.addEventListener("input", refresh);
        form.addEventListener("change", refresh);

        form.addEventListener("submit", function (e) {
            if (!validStep(3)) {
                e.preventDefault();
            }
        });

        refresh();
    }

    App.ready(function () {
        document.querySelectorAll("[data-booking-root]").forEach(mount);
    });
})();
