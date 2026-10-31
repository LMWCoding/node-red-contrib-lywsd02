#!/usr/bin/env python3
"""
BLE helper for the node-red-contrib-lywsd02 palette.

Reads temperature, humidity and battery from a Xiaomi LYWSD02MMC via a real
BLE GATT connection (using bleak / BlueZ D-Bus, which is reliable on Linux).

Usage:
    python3 ble-helper.py <MAC> [connect_timeout] [notify_timeout]

Outputs a single JSON line to stdout:
    {"temperature": 25.3, "humidity": 60, "battery": 85}
On failure:
    {"error": "<message>"}
Exit code 0 on success, 1 on failure.
"""

import asyncio
import json
import struct
import subprocess
import sys

from bleak import BleakClient

# LYWSD02MMC GATT UUIDs
UUID_DATA = "EBE0CCC1-7A0A-4B0C-8A1A-6FF2997DA3A6"    # 3 bytes, NOTIFY
UUID_BATTERY = "EBE0CCC4-7A0A-4B0C-8A1A-6FF2997DA3A6"  # 1 byte, READ


def force_disconnect(mac):
    """Drop any stale GATT link so a fresh connect can succeed."""
    try:
        subprocess.run(
            ["bluetoothctl", "--timeout", "5", "disconnect", mac],
            capture_output=True, timeout=10,
        )
    except Exception:
        pass
    import time
    time.sleep(1)


def parse_sensor_data(data):
    temperature, humidity = struct.unpack_from("<hB", data)
    temperature /= 100.0
    return temperature, humidity


async def read_sensor(mac, connect_timeout, notify_timeout):
    result = {"temperature": None, "humidity": None, "battery": None}
    data_received = asyncio.Event()

    def on_notify(characteristic, data):
        try:
            temp, humi = parse_sensor_data(bytes(data))
            result["temperature"] = temp
            result["humidity"] = humi
        except Exception as e:
            print(f"parse error: {e}", file=sys.stderr)
        data_received.set()

    async with BleakClient(mac, timeout=connect_timeout) as client:
        await client.start_notify(UUID_DATA, on_notify)
        try:
            batt = await client.read_gatt_char(UUID_BATTERY)
            result["battery"] = batt[0]
        except Exception as e:
            print(f"battery read failed: {e}", file=sys.stderr)
        try:
            await asyncio.wait_for(data_received.wait(), timeout=notify_timeout)
        except asyncio.TimeoutError:
            pass
    return result


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: ble-helper.py <MAC> [connect_timeout] [notify_timeout]"}))
        sys.exit(1)
    mac = sys.argv[1]
    connect_timeout = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
    notify_timeout = float(sys.argv[3]) if len(sys.argv) > 3 else 15.0
    try:
        force_disconnect(mac)
        data = asyncio.run(read_sensor(mac, connect_timeout, notify_timeout))
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
