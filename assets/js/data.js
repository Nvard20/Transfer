/* Mock data for the frontend stage. Nothing is saved.
   Later this file is replaced by API calls to the backend. */
(function () {
    var airports = [
        { id: 1, code: "EVN", nameKey: "airport_EVN" },
        { id: 2, code: "LWN", nameKey: "airport_LWN" }
    ];

    var zones = [
        { id: 1, nameKey: "zone_YerevanCenter", active: true },
        { id: 2, nameKey: "zone_YerevanOuter", active: true },
        { id: 3, nameKey: "zone_Tsaghkadzor", active: true },
        { id: 4, nameKey: "zone_Sevan", active: true },
        { id: 5, nameKey: "zone_Dilijan", active: true },
        { id: 6, nameKey: "zone_Gyumri", active: true }
    ];

    var vehicles = [
        { id: 1, nameKey: "vehicle_Sedan", descKey: "vehicle_SedanDesc", icon: "sedan", passengers: 3, luggage: 3, factor: 1, active: true },
        { id: 2, nameKey: "vehicle_Minivan", descKey: "vehicle_MinivanDesc", icon: "minivan", passengers: 7, luggage: 7, factor: 1.6, active: true },
        { id: 3, nameKey: "vehicle_Bus", descKey: "vehicle_BusDesc", icon: "bus", passengers: 18, luggage: 18, factor: 3, active: true }
    ];

    function hotel(id, name, zoneId, address, stars, partner) {
        return {
            id: id,
            name: name,
            zoneId: zoneId,
            address: address,
            stars: stars,
            partner: partner,
            phone: "+374 10 " + (500000 + id * 1111),
            email: "info@" + name.toLowerCase().replace(/\s/g, "") + ".example"
        };
    }

    var hotels = [
        hotel(1, "Republic Square Suites", 1, "Amiryan 4, Yerevan", 5, true),
        hotel(2, "Cascade Boutique Hotel", 1, "Tamanyan 12, Yerevan", 4, true),
        hotel(3, "Kentron Plaza", 1, "Abovyan 30, Yerevan", 4, false),
        hotel(4, "Ararat View Hotel", 2, "Davtashen 3rd district 8, Yerevan", 3, false),
        hotel(5, "Tsaghkadzor Pines Resort", 3, "Orbeli 21, Tsaghkadzor", 4, true),
        hotel(6, "Sevan Shore Hotel", 4, "Sevan peninsula, Sevan", 4, false),
        hotel(7, "Dilijan Forest Lodge", 5, "Getapnya 15, Dilijan", 4, false),
        hotel(8, "Gyumri Old Town Inn", 6, "Rustaveli 40, Gyumri", 3, true)
    ];

    // Base price per airport and zone (AMD) × vehicle factor
    var basePrices = {
        1: [6000, 8000, 22000, 25000, 35000, 50000],
        2: [50000, 52000, 60000, 62000, 55000, 5000]
    };
    var tariffs = [];
    airports.forEach(function (a) {
        zones.forEach(function (z) {
            vehicles.forEach(function (v) {
                tariffs.push({
                    airportId: a.id,
                    zoneId: z.id,
                    vehicleId: v.id,
                    price: Math.round(basePrices[a.id][z.id - 1] * v.factor / 500) * 500
                });
            });
        });
    });

    function byId(list, id) {
        id = Number(id);
        return list.find(function (x) { return x.id === id; }) || null;
    }

    function getPrice(airportId, zoneId, vehicleId) {
        var t = tariffs.find(function (x) {
            return x.airportId === Number(airportId) && x.zoneId === Number(zoneId) && x.vehicleId === Number(vehicleId);
        });
        return t ? t.price : 0;
    }

    // Builds a booking object from form fields (as in the query string)
    function buildBooking(p, source, code) {
        var airport = byId(airports, p.AirportId) || airports[0];
        var h = Number(p.HotelId) > 0 ? byId(hotels, p.HotelId) : null;
        var zone = byId(zones, h ? h.zoneId : (p.ZoneId || 1)) || zones[0];
        var vehicle = byId(vehicles, p.VehicleTypeId) || vehicles[0];
        var date = p.Date || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        var time = p.Time || "12:00";

        return {
            code: code || "TRF-" + (2000 + Math.floor(Math.random() * 8000)),
            direction: p.Direction === "Departure" ? "Departure" : "Arrival",
            airportId: airport.id,
            hotelId: h ? h.id : null,
            hotelName: h ? h.name : "",
            address: h ? h.address : (p.Address || ""),
            zoneId: zone.id,
            pickupTime: new Date(date + "T" + time),
            flightNumber: p.FlightNumber || "",
            passengers: Number(p.Passengers) || 1,
            luggage: Number(p.Luggage) || 0,
            vehicleId: vehicle.id,
            price: getPrice(airport.id, zone.id, vehicle.id),
            customerName: p.CustomerName || "",
            email: p.Email || "",
            phone: p.Phone || "",
            comment: p.Comment || "",
            payment: p.PaymentMethod === "Card" ? "Card" : "Cash",
            status: "New",
            source: source || "Website",
            createdAt: new Date()
        };
    }

    // Seeded random so the mock list is the same on every page
    function seeded(seed) {
        return function () {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
    }

    var bookings = [];
    (function seed() {
        var names = ["Anna Petrosyan", "John Smith", "Maria Ivanova", "Lukas Becker", "Sofia Rossi", "Armen Hakobyan", "Emily Clark", "Davit Sargsyan"];
        var flights = ["SU 1860", "FZ 711", "W6 4561", "QR 2071", "LO 731", "A9 251", "OS 641", "TK 380"];
        var statuses = ["New", "Confirmed", "Confirmed", "InProgress", "Completed", "Cancelled"];
        var rnd = seeded(7);
        var pick = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var i = 0; i < 28; i++) {
            var dayOffset = (i % 10) - 4;
            var h = pick(hotels);
            var pax = 1 + Math.floor(rnd() * 8);
            var v = vehicles.find(function (x) { return x.passengers >= pax; });
            var name = names[i % names.length];
            var d = new Date(today.getTime() + dayOffset * 86400000);
            var hh = String(Math.floor(rnd() * 24)).padStart(2, "0");
            var mm = String(Math.floor(rnd() * 4) * 15).padStart(2, "0");
            var status = dayOffset < 0 ? (i % 7 === 0 ? "Cancelled" : "Completed") : pick(statuses);

            var b = buildBooking({
                Direction: i % 3 === 0 ? "Departure" : "Arrival",
                AirportId: h.zoneId === 6 && rnd() < 0.5 ? 2 : 1,
                HotelId: h.id,
                Date: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"),
                Time: hh + ":" + mm,
                FlightNumber: pick(flights),
                Passengers: pax,
                Luggage: pax,
                VehicleTypeId: v.id,
                CustomerName: name,
                Email: name.toLowerCase().replace(" ", ".") + "@mail.example",
                Phone: "+374 9" + (1 + Math.floor(rnd() * 8)) + " " + (100000 + Math.floor(rnd() * 899999)),
                PaymentMethod: rnd() < 0.5 ? "Cash" : "Card"
            }, h.partner && i % 2 === 0 ? "Partner" : "Website", "TRF-" + (1001 + i));

            b.status = status;
            b.createdAt = new Date(b.pickupTime.getTime() - (1 + Math.floor(rnd() * 19)) * 86400000);
            bookings.push(b);
        }
        bookings.sort(function (a, b) { return a.pickupTime - b.pickupTime; });
    })();

    window.Data = {
        airports: airports,
        zones: zones,
        vehicles: vehicles,
        hotels: hotels,
        tariffs: tariffs,
        bookings: bookings,
        statuses: ["New", "Confirmed", "InProgress", "Completed", "Cancelled"],
        partnerHotelId: 1,
        airport: function (id) { return byId(airports, id); },
        zone: function (id) { return byId(zones, id); },
        vehicle: function (id) { return byId(vehicles, id); },
        hotel: function (id) { return byId(hotels, id); },
        getPrice: getPrice,
        buildBooking: buildBooking,
        findBooking: function (code, email) {
            if (!code) {
                return null;
            }
            var b = bookings.find(function (x) { return x.code.toLowerCase() === String(code).trim().toLowerCase(); });
            if (b && email != null && b.email.toLowerCase() !== String(email).trim().toLowerCase()) {
                return null;
            }
            return b || null;
        }
    };
})();
