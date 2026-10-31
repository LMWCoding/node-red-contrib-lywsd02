"use strict";

/**
 * Read node: on each input message, runs the bundled Python BLE helper to
 * connect to the LYWSD02MMC and read temperature, humidity and battery.
 *
 * Output: msg.payload = { temperature, humidity, battery }
 *         msg.topic   = config name (or "LYWSD02")
 *         msg.mac     = device MAC
 *         msg.error   = set on failure (payload still present)
 */

const { execFile } = require("child_process");
const path = require("path");

module.exports = function (RED) {
    function LYWSD02ReadNode(config) {
        RED.nodes.createNode(this, config);

        const configNode = RED.nodes.getNode(config.device);
        if (!configNode) {
            this.error(new Error("Missing LYWSD02 config node"));
            this.status({ fill: "red", shape: "dot", text: "No config" });
            return;
        }

        const mac = (configNode.mac || "").trim();
        const connectTimeout = configNode.connectTimeout || 10;
        const notifyTimeout = configNode.notifyTimeout || 15;
        const python = configNode.python || "python3";
        const label = configNode.name || "LYWSD02";

        // Path to the bundled helper script
        const helperPath = path.join(__dirname, "..", "lib", "ble-helper.py");

        // Overall safety timeout (connect + notify + margin)
        const overallTimeout = (connectTimeout + notifyTimeout + 10) * 1000;

        this.status({ fill: "grey", shape: "dot", text: "idle" });

        this.on("input", (msg) => {
            if (!mac) {
                this.error(new Error("No MAC address configured"));
                this.status({ fill: "red", shape: "dot", text: "No MAC" });
                return;
            }

            this.status({ fill: "blue", shape: "dot", text: "reading..." });

            const args = [helperPath, mac, String(connectTimeout), String(notifyTimeout)];

            const child = execFile(python, args, { timeout: overallTimeout }, (error, stdout, stderr) => {
                let data;
                try {
                    data = JSON.parse(stdout.trim().split("\n").pop() || "{}");
                } catch (e) {
                    data = { error: "Failed to parse helper output: " + (stdout || stderr || e.message) };
                }

                if (error && !data.temperature && !data.error) {
                    data.error = "Helper exited with code " + error.code + (stderr ? ": " + stderr.trim() : "");
                }

                if (data.error) {
                    this.status({ fill: "red", shape: "dot", text: "Error" });
                    msg.payload = data;
                    msg.topic = label;
                    msg.mac = mac;
                    msg.error = data.error;
                    this.send(msg);
                    this.warn(data.error);
                    return;
                }

                const fill = data.battery > 15 ? "green" : data.battery > 5 ? "yellow" : "red";
                const text = "Temp: " + data.temperature + "\u00b0C, Hum: " + data.humidity + "%, Bat: " + data.battery + "%";
                this.status({ fill: fill, shape: "dot", text: text });

                msg.payload = data;
                msg.topic = label;
                msg.mac = mac;
                this.send(msg);
            });
        });

        this.on("close", () => {
            this.status({ fill: "grey", shape: "dot", text: "stopped" });
        });
    }

    RED.nodes.registerType("lywsd02-read", LYWSD02ReadNode, {
        category: "hardware",
        in: 1,
        out: 1,
        defaults: {
            name: { value: "" },
            device: { value: "", type: "lywsd02-config", required: true }
        },
        icon: "font-awesome/fa-thermometer-half",
        label: function () {
            return this.name || "LYWSD02 read";
        },
        labelStyle: function () {
            return this.name ? "" : "node_label_italic";
        }
    });
};
