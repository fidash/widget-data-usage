/* global MashupPlatform,ProgressBar,$ */

var TenantView = (function () {
    "use strict";

    /******************************************************************/
    /*                        V A R I A B L E S                       */
    /******************************************************************/

    var types = {
        cpu: {
            color: "#009EFF"
        },
        ram: {
            color: "#C971CC"
        }
    };

    /*****************************************************************
     *                     C O N S T R U C T O R                      *
     *****************************************************************/

    function TenantView() {}

    /******************************************************************/
    /*                P R I V A T E   F U N C T I O N S               */
    /******************************************************************/

    function drawChart(name, type, data, tooltip, show) {
        var id = "id-" + name + "-" + type; // Avoid CSS IDs starting with numbers
        var showC = (show) ? "" : "myhide";

        $("<div></div>")
            .prop("id", id)
            .addClass(type + " measure " + showC)
            .css("color", types[type].color)
            .appendTo("#" + name + "-container")
            .prop("title", tooltip)
            .tooltipster();

        var progress = new ProgressBar.Line("#" + id, {
            color: types[type].color,
            trailColor: "#ddd",
            strokeWidth: 5,
            svgStyle: {
                width: "100%"
            }
        });

        progress.animate(data);
    }

    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    TenantView.prototype.build = function (data, status, minvalues, comparef, filtertext) {
        var ranking = data.ranking;
        var id = data.tenantId;

        // parseFloat but fixed
        var cpuData = parseFloat(data.cpuUsedPct);
        var ramData = parseFloat(data.ramUsedPct);

        if (isNaN(cpuData) && isNaN(ramData)) {
            return {
                id: id,
                ranking: ranking,
                data: {
                    cpu: NaN,
                    ram: NaN
                }
            };
        }

        cpuData = (cpuData < 0 ? 0 : cpuData) || 0.0;
        ramData = (ramData < 0 ? 0 : ramData) || 0.0;

        // var uptime = measures.sysUptime.value;

        var cpuText = (100*cpuData).toFixed(2) + "% CPU load";
        var ramText = (100*ramData).toFixed(2) + "% RAM used";

        // If some of the data are greater than the min values, the vm will be showed, if not it will be hidden
        var hideVm = comparef(cpuData > minvalues.cpu, ramData > minvalues.ram) ? "" : "hide";
        var hideFilter = filtertext !== "" && id.toLowerCase().indexOf(filtertext) < 0 ? "filterhide" : "";

        var title = "Tenant " + data.tenantId + " with ranking " + ranking + ", " +
                data.vmsActiveNum + " vms active, " + data.ramAllocatedTot + " RAM allocated and " + data.vcpuAllocatedTot + " VCPU allocated.";

        $("<div></div>")
            .prop("id", id)
            .addClass("flexitem vmChart noselect " + hideVm + " " + hideFilter)
            .appendTo("#tenantContainer")
            .prop("title", title)
            .click(function () {
                var dataToSend = {
                    id: data.tenantId
                };

                MashupPlatform.wiring.pushEvent("tenant_id", JSON.stringify(dataToSend));
            })
            .tooltipster({
                position: "bottom"
            });
        $("<div>" + id + "</div>")
            .addClass("regionTitle")
            .appendTo("#" + id);
        $("<div></div>")
            .prop("id", id + "-container")
            .addClass("measures-container")
            .appendTo("#" + id);

        drawChart(id, "cpu", cpuData, cpuText, status.cpu);
        drawChart(id, "ram", ramData, ramText, status.ram);

        return {
            id: id,
            ranking: ranking,
            data: {
                cpu: cpuData,
                ram: ramData
            }
        };
    };

    return TenantView;

})();
