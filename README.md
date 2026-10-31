# node-red-contrib-lywsd02

Node-RED nodes to read **Xiaomi LYWSD02MMC** temperature/humidity sensors via a
reliable **BLE GATT connection** (not passive scanning).

## Why this palette?

Passive BLE scanning of the LYWSD02MMC is unreliable — the device advertises in
short bursts and you frequently miss readings. This palette establishes a real
GATT connection, subscribes to the data characteristic, and reads the battery
characteristic, giving you a consistent reading every time.

## How it works

The Node-RED nodes are written in **JavaScript**. For the low-level BLE I/O they
shell out to a bundled Python helper (`lib/ble-helper.py`) that uses
[`bleak`](https://github.com/hbldh/bleak). `bleak` talks to BlueZ over D-Bus,
which is the most reliable way to do BLE on Linux (the same layer `bluetoothctl`
uses). Pure-JS BLE libraries (e.g. `@abandonware/noble`) use raw HCI sockets and
are unreliable on many modern Linux/BlueZ setups.

## Installation

```
npm install node-red-contrib-lywsd02
```

### Prerequisites

1. **Python 3** with the `bleak` package:
   ```
   pip3 install bleak
   ```
   (or install into a virtualenv and point the node at that interpreter)

2. **Bluetooth** running on the host (`bluetooth` service active).

3. On Linux, the user running Node-RED should be in the `bluetooth` group:
   ```
   sudo usermod -aG bluetooth <user>
   ```
   (then restart Node-RED)

## Nodes

### `lywsd02-config` (config node)

| Field | Description |
|-------|-------------|
| Name | Friendly name, used as `msg.topic` |
| MAC Address | Device MAC, e.g. `E7:2E:00:31:10:B6` |
| Connect Timeout (s) | Seconds to wait for the GATT connection (default 10) |
| Notify Timeout (s) | Seconds to wait for a data notification (default 15) |
| Python Path | Path to a Python 3 interpreter with `bleak` (default `python3`) |

### `lywsd02-read` (function node)

Send **any** message to this node to trigger a read. The output is:

```
msg.payload = { temperature: 25.3, humidity: 60, battery: 85 }
msg.topic   = "<config name>"
msg.mac     = "<MAC>"
msg.error   = "<message>"   // only on failure
```

The node status shows the latest reading (green/yellow/red by battery level).

## Example

```
[inject: every 5 min] --> [lywsd02-read] --> [debug / ui-chart / ...]
```

See `examples/lywsd02-example.json` for an importable flow.

## Notes

- Only one GATT connection to a LYWSD02MMC is allowed at a time. The helper
  clears any stale connection before reading, so repeated reads are safe.
- A read takes roughly 2–5 seconds (connect + notify + battery read).

## License

MIT
