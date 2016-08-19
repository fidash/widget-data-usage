/* global MashupPlatform,ProgressBar,$ */

var TenantView = (function () {
    "use strict";

    /******************************************************************/
    /*                        V A R I A B L E S                       */
    /******************************************************************/

    var types = {
        vms: { color: "#60d868" },
        ram: { color: "#C971CC" },
        vcpu: { color: "#009EFF" },
        ramPct: { color: "#d9534f" },
        cpuPct: { color: "#cc9b5e" }
    };

    /*****************************************************************
     *                     C O N S T R U C T O R                      *
     *****************************************************************/

    function TenantView() {}

    /******************************************************************/
    /*                P R I V A T E   F U N C T I O N S               */
    /******************************************************************/

    function drawChart(name, type, data, tooltip, show, max) {
        var htmlId = "id-" + name + "-" + type; // Avoid HTML IDs starting with numbers
        var showC = (show) ? "" : "myhide";
        var scaledValue = (max === 0) ? data : data/max;

        $("<div></div>")
            .prop("id", htmlId)
            .addClass(type + " measure " + showC)
            .css("color", types[type].color)
            .appendTo("#id-" + name + "-container")  // Parent ID has been added 'id-' and '-container'
            .prop("title", tooltip)
            .tooltipster();

        var progress = new ProgressBar.Line("#" + htmlId, {
            color: types[type].color,
            trailColor: "#ddd",
            strokeWidth: 5,
            svgStyle: {
                width: "100%"
            }
        });

        progress.animate(scaledValue);
        //progress.animate(data);
    }

    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    //TenantView.prototype.build = function (data, status, minvalues, comparef, filtertext, topValues) {
    TenantView.prototype.build = function (data, status, topValues, comparef, filtertext) {
        var ranking = data.ranking;
        var id =  ranking + "_" + data.tenantId;    // Avoid duplicated IDs adding the ranking
        var tenantId = data.tenantId;
        var htmlId = "id-" + id;                    // Avoid HTML IDs starting with numbers
        
        // parseFloat but fixed
        var ramData = parseFloat(data.ramAllocatedTot);   // Received in MB
        var cpuPctData = parseFloat(data.cpuUsedPct);     // % as float 0-100
        var ramPctData = parseFloat(data.ramUsedPct);     // % as float 0-100
        var vcpuData = parseFloat(data.vcpuAllocatedTot); // Absolute number
        var vmsData = parseFloat(data.vmsActiveNum);      // Absolute number

        if (isNaN(ramData) && 
            isNaN(cpuPctData) && 
            isNaN(ramPctData) && 
            isNaN(vcpuData) && 
            isNaN(vmsData)) {
            return {
                id: id,
                ranking: ranking,
                data: {
                    vms: NaN,
                    ram: NaN,
                    vcpu: NaN,
                    ramPct: NaN,
                    cpuPct: NaN
                }
            };
        }

        // Normalizing
        ramData = (ramData < 0 ? 0 : ramData) || 0.0;
        cpuPctData = (cpuPctData < 0 ? 0 : cpuPctData) || 0.0;
        ramPctData = (ramPctData < 0 ? 0 : ramPctData) || 0.0;
        vcpuData = (vcpuData < 0 ? 0 : vcpuData) || 0.0;
        vmsData = (vmsData < 0 ? 0 : vmsData) || 0.0;

        var ramText = (ramData/1000).toFixed(2) + "GBs of RAM allocated";
        var vcpuText = vcpuData + " vCPUs allocated";
        var ramPctText = ramPctData.toFixed(2) + "% of RAM used (average on last 24 hours)";
        var cpuPctText = cpuPctData.toFixed(2) + "% of CPU used (average on last 24 hours)";
        var vmsText = vmsData + " instantiated VMs";

        var title = "#" + ranking + " Tenant " + tenantId + ": " + 
                vmsText + ", " + ramText + ", " + vcpuText + ", " + ramPctText + ", " + cpuPctText;

        $("<div></div>")
            .prop("id", htmlId)
            .addClass("flexitem vmChart noselect ")
            .appendTo("#tenantContainer")
            .prop("title", title)
            .click(function () {
                var dataToSend = {
                    id: id.substring(id.indexOf("_") + 1)  // Remove the rank at the beginning of the ID
                };

                MashupPlatform.wiring.pushEvent("tenant_id", JSON.stringify(dataToSend));
            })
            .tooltipster({
                position: "bottom"
            });
        $("<div>" + "#" + data.ranking + "</div>")  
            .addClass("tenantRank")
            .appendTo("#" + htmlId);
        $("<div>" + tenantId + "</div>")  
            .addClass("tenantTitle")
            .appendTo("#" + htmlId);
        $("<div></div>")
            .prop("id", htmlId + "-container")
            .addClass("measures-container")
            .appendTo("#" + htmlId);

        drawChart(id, "vms", vmsData, vmsText, status.vms, topValues.vms);
        drawChart(id, "ram", ramData, ramText, status.ram, topValues.ram);
        drawChart(id, "vcpu", vcpuData, vcpuText, status.vcpu, topValues.vcpu);
        drawChart(id, "ramPct", ramPctData, ramPctText, status.ramPct, topValues.ramPct);  // Change to 1 if 100% is never surpassed
        drawChart(id, "cpuPct", cpuPctData, cpuPctText, status.cpuPct, topValues.cpuPct);  // Change to 1 if 100% is never surpassed

        return {
            id: tenantId,
            ranking: ranking,
            data: {
                vms: vmsData,
                ram: ramData,
                vcpu: vcpuData,
                ramPct: ramPctData,
                cpuPct: cpuPctData
            }
        };
    };

    return TenantView;

})();
