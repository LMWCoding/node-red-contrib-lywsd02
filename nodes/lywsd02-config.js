"use strict";

/**
 * Config node: holds the device MAC, timeouts and the path to the Python
 * interpreter that has `bleak` installed.
 */

module.exports = function (RED) {
    function LYWSD02ConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.mac = config.mac || "";
        this.connectTimeout = parseFloat(config.connectTimeout) || 10;
        this.notifyTimeout = parseFloat(config.notifyTimeout) || 15;
        this.python = config.python || "python3";
        this.name = config.name || "";
    }
    RED.nodes.registerType("lywsd02-config", LYWSD02ConfigNode, {
        category: "hardware",
        defaults: {
            name: { value: "" },
            mac: { value: "", required: true },
            connectTimeout: { value: 10 },
            notifyTimeout: { value: 15 },
            python: { value: "python3" }
        },
        credentials: {}
    });
};
