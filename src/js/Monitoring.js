/* global $,MashupPlatform,TenantView,FIDASHRequests */
var Monitoring = (function () {
    "use strict";

    /***  AUTHENTICATION VARIABLES  ***/
    var url = "http://130.206.84.4:11027/usagedata/toptenants";

    var vmurl = "http://130.206.84.4:11030/monitoring/regions/";

    /*****************************************************************
    *                     C O N S T R U C T O R                      *
    *****************************************************************/

    function Monitoring() {
        this.torequest = [];

        this.view   = "region";
        this.vmId = $("#vm").val();
        this.vmsByRegion = {};
        this.filtertext = "";
        this.options = {
            orderby: "",
            orderinc: "",
            data: {}
        };
        this.measures_status = {
            cpu: true,
            ram: true
        };

        this.minvalues = {
            cpu: 0,
            ram: 0
        };

        this.variables = {
            cpuOn: MashupPlatform.widget.getVariable("cpuOn"),
            ramOn: MashupPlatform.widget.getVariable("ramOn"),
            closed: MashupPlatform.widget.getVariable("closed")
        };

        this.comparef = or;

        handlePreferences.call(this);
    }

    /******************************************************************
     *                P R I V A T E   F U N C T I O N S               *
    ******************************************************************/

    var or = function or() {
        var value = false;

        for (var i = 0; i < arguments.length; i++) {
            value = value || arguments[i];
        }

        return value;
    };

    var and = function and() {
        var value = true;

        for (var i = 0; i < arguments.length; i++) {
            value = value && arguments[i];
        }

        return value;
    };

    var updateHiddenVms = function updateHiddenVms() {
        // Use search bar?
        var mincpu = this.minvalues.cpu,
            minram = this.minvalues.ram;

        $(".vmChart").each(function (index, vm) {
            var id = vm.id; // $(vm).prop("id");
            var data = this.options.data[id];
            if (!data) {
                return;
            }

            var cpu = parseFloat(data.cpu);
            var ram = parseFloat(data.ram);

            var $elem = $(vm);
            if (this.comparef(cpu > mincpu, ram > minram)) {
                $elem.show();
            } else {
                $elem.hide();
            }
        }.bind(this));
    };

    var handlePreferences = function handlePreferences() {
        var checkValue = function checkValue(value, name) {
            if (Number.isNaN(value)) {
                MashupPlatform.widget.log("The preference for " + name + " is not a number.");
                return 0;
            }

            if (value < 0 || value > 100) {
                MashupPlatform.widget.log("The preference for " + name + " are not in the limits");
                return 0;
            }

            return value;
        };

        var cpu = checkValue(parseFloat(MashupPlatform.prefs.get("min-cpu")) || 0, "CPU");
        var ram = checkValue(parseFloat(MashupPlatform.prefs.get("min-ram")) || 0, "RAM");
        this.minvalues = {
            cpu: cpu,
            ram: ram
        };

        this.comparef = (parseInt(MashupPlatform.prefs.get("numbermin")) === 1) ? and : or;

        updateHiddenVms.call(this);
    };


    function setEvents() {
        $("#filterbox").keyup(function () {
            var text = $(arguments[0].target).val().toLowerCase();
            this.filtertext = text;
            if (text === "") {
                $(".filterhide").removeClass("filterhide");
            } else {
                $(".vmChart .regionTitle").each(function () {
                    var n = $(this).text();
                    var i = n.toLowerCase().indexOf(text);
                    if (i < 0) {
                        $("#" + n).addClass("filterhide");
                    } else {
                        $("#" + n).removeClass("filterhide");
                    }
                });
            }
        }.bind(this));

        $(".slidecontainer").click(function () {
            var closing = this.variables.closed.get() === "true";
            closing = !closing;
            this.variables.closed.set("" + closing);
            if (closing) {
                $(".navbar").collapse("hide");
                $(".slidecontainer").removeClass("open").addClass("closed");
                $("#regionContainer").css("margin-top", "6px");
            } else {
                $(".navbar").collapse("show");
                $(".slidecontainer").removeClass("closed").addClass("open");
                $("#regionContainer").css("margin-top", "93px");
            }

            return false;
        }.bind(this));

        $("input[type='checkbox']").on("switchChange.bootstrapSwitch", function (e) {
            var type = e.target.dataset.onText;
            type = type.toLowerCase();

            var newst = !this.measures_status[type];
            this.measures_status[type] = newst;
            this.variables[type + "On"].set(newst.toString());
            if (newst) {
                // $("." + type).removeClass("hide");
                $("." + type).removeClass("myhide");
            } else {
                // $("." + type).addClass("hide");
                $("." + type).addClass("myhide");
            }
        }.bind(this));
    }

    var sortTenants = function sortTenants() {
        var data = this.options.data;

        $(".vmChart").sort(function (a, b) {
            var dataA = data[a.id],
                dataB = data[b.id];

            return dataA.ranking - dataB.ranking;
        }).appendTo("#tenantContainer");
    };

    function handleSwitchVariable(name) {
        if (this.variables[name + "On"].get() === "") {
            this.variables[name + "On"].set("true");
        } else if (this.variables[name + "On"].get() !== "true") {
            this.measures_status[name] = false;
            $("." + name).addClass("myhide");
            $("#" + name + "Switch input[name='select-charts-region']").bootstrapSwitch("state", false, true);
        }
    }

    function handleVariables() {
        handleSwitchVariable.call(this, "cpu");
        handleSwitchVariable.call(this, "ram");

        if (this.variables.closed.get() === "true") {
            $(".navbar").collapse("hide");
            $(".slidecontainer").removeClass("open").addClass("closed");
            $("#regionContainer").css("margin-top", "6px");
        } else {
            $(".slidecontainer").removeClass("closed").addClass("open");
            $("#regionContainer").css("margin-top", "93px");
        }
    }

    var drawTenants = function drawTenants(tenants) {
        tenants.forEach(function (tenant) {
            var hdata = new TenantView().build(tenant, this.measures_status, this.minvalues, this.comparef, this.filtertext);
            this.options.data[hdata.id] = hdata;

        }.bind(this));
        sortTenants.call(this);
    };


    var getTopTenants = function getTopTenants() {
        FIDASHRequests.get(url, function (err, data) {
            if (err) {
                window.console.log(err);
                MashupPlatform.widget.log("The API seems down (Asking for regions): " + err.statusText);

                // The API are down, emulate
                data = {
                    "_links": {
                        "self": {
                            "href": "/usagedata/toptenants"
                        }
                    },
                    "_embedded": {
                        "tenants": [
                            {
                                "ranking": 0,
                                "tenantId": "MyId",
                                "vmsActiveNum": 10,
                                "ramAllocatedTot": 32,
                                "vcpuAllocatedTot": 43,
                                "ramUsedPct": 23,
                                "cpuUsedPct": 45
                            },
                            {
                                "ranking": 2,
                                "tenantId": "MyId3",
                                "vmsActiveNum": 8,
                                "ramAllocatedTot": 22,
                                "vcpuAllocatedTot": 33,
                                "ramUsedPct": 13,
                                "cpuUsedPct": 35
                            },
                            {
                                "ranking": 1,
                                "tenantId": "MyId2",
                                "vmsActiveNum": 8,
                                "ramAllocatedTot": 22,
                                "vcpuAllocatedTot": 33,
                                "ramUsedPct": 13,
                                "cpuUsedPct": 35
                            }
                        ]
                    }
                };

                drawTenants.call(this, data._embedded.tenants);
                return;
            }

            drawTenants.call(this, data._embedded.tenants);

        }.bind(this));
    };


    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    Monitoring.prototype = {
        init: function () {
            $(".navbar").collapse();
            handleVariables.call(this);

            setEvents.call(this);

            getTopTenants.call(this);

            // Initialize switchs
            $("[name='select-charts-region']").bootstrapSwitch();

            MashupPlatform.prefs.registerCallback(handlePreferences.bind(this));
        }
    };

    return Monitoring;

})();
