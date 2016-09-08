/* global $,MashupPlatform,TenantView,FIDASHRequests */
var Monitoring = (function () {
    "use strict";

    /***  AUTHENTICATION VARIABLES  ***/
    var productionUrl = "http://130.206.84.4:11027/usagedata/toptenants";
    var developmentUrl = "http://130.206.84.4:11030/usagedata/toptenants";
    var baseUrl = developmentUrl;

    /*****************************************************************
    *                     C O N S T R U C T O R                      *
    *****************************************************************/

    function Monitoring() {
        this.filtertext = "";
        this.options = {
            orderby: "",
            orderinc: "",
            data: {}
        };
        
        this.variables = {
            sort: MashupPlatform.widget.getVariable("sort"),
            closed: MashupPlatform.widget.getVariable("closed")
        };
        if (!isValidSortingPref(this.variables.sort.get())) {
            this.variables.sort.set("vmsActiveNum");
        }
    }

    /******************************************************************
     *                P R I V A T E   F U N C T I O N S               *
    ******************************************************************/

    function setEvents() {
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

        $(".sort").on("click", function (e) {
            var rawid = e.target.id;
            var id = rawid.replace(/Sort$/, "");
            var $btn = $('#' + rawid);
            var measure = $btn.data('measure');
            
            this.variables.sort.set(measure);
            $(".sort").removeClass("fa-sort-amount-desc");
            $btn.addClass("fa-sort-amount-desc");

            // Clear elements
            $(".vmChart").remove();
            // Request new elements
            getTopTenants.call(this);
        }.bind(this));
    }

/*    var sortTenants = function sortTenants() {
    	var by = this.options.orderby;
        var inc = this.options.orderinc;
        var data = this.options.data;

        if (inc === "") {
            return;
        }

        $(".vmChart").sort(function (a, b) {
        	var idA = a.id.substring(a.id.indexOf("-") + 1);  // IDs are" id-rank_tenantId
        	var idB = b.id.substring(b.id.indexOf("-") + 1);
            var dataA = data[idA].data,
                dataB = data[idB].data;
            var itemA = dataA[by],
                itemB = dataB[by];
            if (inc === "sort-asc") {
                return parseFloat(itemA) - parseFloat(itemB);
            }
            return parseFloat(itemB) - parseFloat(itemA);

            // var dataA = data[a.id],
            //     dataB = data[b.id];

            // return dataA.ranking - dataB.ranking;
        }).appendTo("#tenantContainer");
    };*/

    function handleVariables() {
        if (this.variables.closed.get() === "true") {
            $(".navbar").collapse("hide");
            $(".slidecontainer").removeClass("open").addClass("closed");
            $("#regionContainer").css("margin-top", "6px");
        } else {
            $(".slidecontainer").removeClass("closed").addClass("open");
            $("#regionContainer").css("margin-top", "93px");
        }

        // Modify appearance of sorting buttons according to sort measure
        var sort = this.variables.sort.get();
        $("button[data-measure='" + sort + "']").addClass("fa-sort-amount-desc");
    }

    var drawTenants = function drawTenants(tenants) {
    	var topValues = calculateTopValues(tenants);
        tenants.forEach(function (tenant) {
            var hdata = new TenantView().build(tenant, topValues, this.comparef, this.filtertext);
            this.options.data[hdata.id] = hdata;

        }.bind(this));
        //sortTenants.call(this);
    };


    var getTopTenants = function getTopTenants() {
        var sort = this.variables.sort.get();
        var url = baseUrl + (isValidSortingPref(sort) ? ("?sort=" +  sort) : "");

        FIDASHRequests.get(url, function (err, data) {
            if (err) {
                window.console.log(err);
                MashupPlatform.widget.log("The API seems down (Asking for Top Tennants): " + err.statusText);
                return;
            }
            drawTenants.call(this, data._embedded.tenants);
        }.bind(this));
    };

    function calculateTopValues (tenants) {
    	var topValues = {};
    	topValues.ram = 0;
    	topValues.ramPct = 0;
    	topValues.cpuPct = 0;
    	topValues.vcpu = 0;
    	topValues.vms = 0;

    	tenants.forEach(function (tenant) {
            this.ram = Math.max(this.ram,tenant.ramAllocatedTot);
            this.ramPct = Math.max(this.ramPct,tenant.ramUsedPct);
            this.cpuPct = Math.max(this.cpuPct,tenant.cpuUsedPct);
            this.vcpu = Math.max(this.vcpu,tenant.vcpuAllocatedTot);
            this.vms = Math.max(this.vms,tenant.vmsActiveNum);
    	}, topValues);

    	return topValues;
    }

    function isValidSortingPref (value) {
        return ["vmsActiveNum","ramAllocatedTot","vcpuAllocatedTot","ramUsedPct","cpuUsedPct"].indexOf(value) !== -1;
    }


    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    Monitoring.prototype = {
        init: function () {
            $(".navbar").collapse();
            handleVariables.call(this);

            setEvents.call(this);

            getTopTenants.call(this);
        }
    };

    return Monitoring;

})();
