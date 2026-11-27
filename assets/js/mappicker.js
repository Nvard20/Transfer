/* Map pickers (Leaflet + OpenStreetMap, loaded from CDN only when a map is first shown).
   MapPicker.attach(el, { lat, lng, onPick, onAddress })  — one pickup point.
       onPick({ lat, lng, zoneId, address }) right away, onAddress(text) when the street address arrives.
   MapPicker.attachRoute(el, { from, to, onChange })       — two points: A (from) and B (to).
       from/to = { lat, lng, address } to restore; onChange({ from, to }) after every change.
   Both return { show(), showError() } plus hasPoint() / isComplete(). Call show() after the map is un-hidden. */
(function () {
    var t = App.t;
    var esc = App.esc;
    var LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/";
    var YEREVAN = [40.1811, 44.5136];
    var loading = null;

    function loadLeaflet() {
        if (window.L) {
            return Promise.resolve();
        }
        if (loading) {
            return loading;
        }
        var file = function (tag, attrs) {
            return new Promise(function (resolve, reject) {
                var el = document.createElement(tag);
                Object.keys(attrs).forEach(function (k) {
                    el[k] = attrs[k];
                });
                el.onload = resolve;
                el.onerror = reject;
                document.head.appendChild(el);
            });
        };
        loading = Promise.all([
            file("link", { rel: "stylesheet", href: LEAFLET + "leaflet.css" }),
            file("script", { src: LEAFLET + "leaflet.js" })
        ]).then(function () {
            L.Icon.Default.prototype.options.imagePath = LEAFLET + "images/";
        }, function (err) {
            loading = null;
            throw err;
        });
        return loading;
    }

    function coordsText(lat, lng) {
        return lat.toFixed(5) + ", " + lng.toFixed(5);
    }

    function reverseGeocode(lat, lng) {
        var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=" + lat + "&lon=" + lng +
            "&accept-language=" + App.lang;
        return fetch(url)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { return d && d.display_name ? d.display_name : coordsText(lat, lng); })
            .catch(function () { return coordsText(lat, lng); });
    }

    function createMap(canvas, onClick) {
        var map = L.map(canvas).setView(YEREVAN, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);
        map.on("click", function (e) {
            onClick(e.latlng.lat, e.latlng.lng);
        });
        return map;
    }

    // Shared frame: toolbar, map canvas, status line
    function frame(root, toolbar) {
        root.innerHTML =
            '<div class="map-picker-toolbar">' + toolbar +
            '<button type="button" class="btn btn-ghost btn-sm" data-my-location>' + esc(t("useMyLocation")) + "</button>" +
            "</div>" +
            '<div class="map-picker-canvas"></div>' +
            '<div class="map-picker-status hint" data-map-status></div>';

        var status = root.querySelector("[data-map-status]");
        return {
            canvas: root.querySelector(".map-picker-canvas"),
            setStatus: function (text, isError) {
                status.textContent = text || "";
                status.classList.toggle("map-picker-error", !!isError);
            },
            onMyLocation: function (setStatus, done) {
                root.querySelector("[data-my-location]").addEventListener("click", function () {
                    if (!navigator.geolocation) {
                        setStatus(t("geoFailed"), true);
                        return;
                    }
                    setStatus(t("geoLocating"));
                    navigator.geolocation.getCurrentPosition(function (p) {
                        done(p.coords.latitude, p.coords.longitude);
                    }, function () {
                        setStatus(t("geoFailed"), true);
                    }, { enableHighAccuracy: true, timeout: 10000 });
                });
            }
        };
    }

    // ---------- One point ----------
    function attach(root, options) {
        options = options || {};
        var ui = frame(root, '<span class="hint">' + esc(t("mapHint")) + "</span>");
        var map = null;
        var marker = null;

        function pick(lat, lng, zoom) {
            if (!map) {
                return;
            }
            var pos = [lat, lng];
            if (marker) {
                marker.setLatLng(pos);
            } else {
                marker = L.marker(pos, { draggable: true }).addTo(map);
                marker.on("dragend", function () {
                    var p = marker.getLatLng();
                    pick(p.lat, p.lng);
                });
            }
            map.setView(pos, zoom || Math.max(map.getZoom(), 14));

            var zone = Data.zoneByPoint(lat, lng);
            ui.setStatus(t("mapZoneDetected", t(zone.nameKey)));
            if (options.onPick) {
                options.onPick({ lat: lat, lng: lng, zoneId: zone.id, address: coordsText(lat, lng) });
            }
            reverseGeocode(lat, lng).then(function (address) {
                // Ignore an old answer if the marker was moved again
                var cur = marker.getLatLng();
                if (cur.lat === lat && cur.lng === lng && options.onAddress) {
                    options.onAddress(address);
                }
            });
        }

        ui.onMyLocation(ui.setStatus, function (lat, lng) {
            pick(lat, lng, 16);
        });

        return {
            show: function () {
                return loadLeaflet().then(function () {
                    if (map) {
                        map.invalidateSize();
                        return;
                    }
                    map = createMap(ui.canvas, pick);
                    if (options.lat && options.lng) {
                        pick(Number(options.lat), Number(options.lng), 15);
                    }
                }).catch(function () {
                    ui.setStatus(t("mapLoadFailed"), true);
                });
            },
            hasPoint: function () {
                return !!marker;
            },
            showError: function () {
                ui.setStatus(t("mapPointRequired"), true);
                root.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };
    }

    // ---------- Route: A (from) → B (to) ----------
    function pinIcon(letter) {
        return L.divIcon({
            className: "map-pin map-pin-" + letter.toLowerCase(),
            html: "<span>" + letter + "</span>",
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }

    function attachRoute(root, options) {
        options = options || {};
        var ui = frame(root,
            '<div class="map-route-switch">' +
            '<button type="button" class="active" data-route-point="from"><b>A</b> ' + esc(t("from")) + "</button>" +
            '<button type="button" data-route-point="to"><b>B</b> ' + esc(t("to")) + "</button>" +
            "</div>");
        var addresses = document.createElement("dl");
        addresses.className = "map-route-addresses";
        root.appendChild(addresses);

        var map = null;
        var line = null;
        var active = "from";
        var points = { from: null, to: null };   // { lat, lng, address, marker }

        function setActive(name) {
            active = name;
            root.querySelectorAll("[data-route-point]").forEach(function (b) {
                b.classList.toggle("active", b.getAttribute("data-route-point") === name);
            });
        }

        function data(p) {
            return p ? { lat: p.lat, lng: p.lng, address: p.address } : null;
        }

        function render() {
            addresses.innerHTML = ["from", "to"].map(function (name) {
                var p = points[name];
                return "<div><dt>" + (name === "from" ? "A" : "B") + " · " + esc(t(name)) + "</dt><dd>" +
                    (p ? esc(p.address) : '<span class="muted">' + esc(t("routeNotSet")) + "</span>") + "</dd></div>";
            }).join("");

            if (line) {
                line.remove();
                line = null;
            }
            if (points.from && points.to) {
                var a = [points.from.lat, points.from.lng];
                var b = [points.to.lat, points.to.lng];
                line = L.polyline([a, b], { color: "#0E46A1", weight: 3, dashArray: "6 6" }).addTo(map);
                map.fitBounds(L.latLngBounds([a, b]), { padding: [40, 40], maxZoom: 15 });
                ui.setStatus(t("routeDistance", Data.routeKm(points.from, points.to)));
            } else {
                ui.setStatus(t(points.from ? "routeMarkTo" : "routeHint"));
            }
            if (options.onChange) {
                options.onChange({ from: data(points.from), to: data(points.to) });
            }
        }

        function place(name, lat, lng, address) {
            var p = points[name];
            if (p) {
                p.marker.setLatLng([lat, lng]);
            } else {
                p = points[name] = { marker: L.marker([lat, lng], { draggable: true, icon: pinIcon(name === "from" ? "A" : "B") }).addTo(map) };
                p.marker.on("dragend", function () {
                    var ll = p.marker.getLatLng();
                    place(name, ll.lat, ll.lng);
                });
            }
            p.lat = lat;
            p.lng = lng;
            p.address = address || coordsText(lat, lng);
            render();

            if (!address) {
                reverseGeocode(lat, lng).then(function (text) {
                    if (p.lat === lat && p.lng === lng) {
                        p.address = text;
                        render();
                    }
                });
            }
        }

        function clickMap(lat, lng) {
            var name = active;
            place(name, lat, lng);
            // After A is set, the next click sets B
            if (name === "from" && !points.to) {
                setActive("to");
            }
            if (!points.from || !points.to) {
                map.setView([lat, lng], Math.max(map.getZoom(), 13));
            }
        }

        root.querySelectorAll("[data-route-point]").forEach(function (b) {
            b.addEventListener("click", function () {
                setActive(b.getAttribute("data-route-point"));
            });
        });

        // "My location" is the start point
        ui.onMyLocation(ui.setStatus, function (lat, lng) {
            setActive("from");
            clickMap(lat, lng);
        });

        return {
            show: function () {
                return loadLeaflet().then(function () {
                    if (map) {
                        map.invalidateSize();
                        return;
                    }
                    map = createMap(ui.canvas, clickMap);
                    ["from", "to"].forEach(function (name) {
                        var p = options[name];
                        if (p && p.lat && p.lng) {
                            place(name, Number(p.lat), Number(p.lng), p.address);
                        }
                    });
                    setActive(points.from && !points.to ? "to" : "from");
                    render();
                }).catch(function () {
                    ui.setStatus(t("mapLoadFailed"), true);
                });
            },
            isComplete: function () {
                return !!(points.from && points.to);
            },
            showError: function () {
                ui.setStatus(t("routePointsRequired"), true);
                root.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };
    }

    window.MapPicker = { attach: attach, attachRoute: attachRoute };
})();
