import mqtt, { type MqttClient } from "mqtt";
import { settingsRepository, vehiclesRepository } from "../db/repositories/index.js";

let client: MqttClient | null = null;

export async function connectMqtt(): Promise<void> {
  const enabled = settingsRepository.get("mqtt_enabled");
  if (enabled !== "true") return;

  const host = settingsRepository.get("mqtt_host");
  const port = settingsRepository.get("mqtt_port");
  const username = settingsRepository.get("mqtt_username");
  const password = settingsRepository.get("mqtt_password");
  if (!host) return;

  const url = `mqtt://${host}:${port ?? "1883"}`;
  client = mqtt.connect(url, { username: username ?? undefined, password: password ?? undefined });

  client.on("connect", async () => {
    console.log("[mqtt] Connected to broker");
    await publishDiscoveryConfigs();
  });

  client.on("error", (err) => {
    console.error("[mqtt] Error:", err.message);
  });
}

export function disconnectMqtt(): void {
  client?.end();
  client = null;
}

export async function testMqttConnection(
  host: string,
  port: number,
  username?: string,
  password?: string
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const url = `mqtt://${host}:${port}`;
    const c = mqtt.connect(url, {
      username: username || undefined,
      password: password || undefined,
      connectTimeout: 5000,
    });
    const timer = setTimeout(() => {
      c.end();
      resolve({ ok: false, message: "Connection timed out" });
    }, 5000);
    c.on("connect", () => {
      clearTimeout(timer);
      c.end();
      resolve({ ok: true, message: "Connected successfully" });
    });
    c.on("error", (err) => {
      clearTimeout(timer);
      c.end();
      resolve({ ok: false, message: err.message });
    });
  });
}

export async function publishMqttStatus(
  vin: string,
  snapshot: Record<string, unknown>
): Promise<void> {
  if (!client?.connected) return;
  const prefix = settingsRepository.get("mqtt_topic_prefix") ?? "psamate";
  const topic = `${prefix}/${vin}/status`;
  client.publish(topic, JSON.stringify(snapshot));

  if (snapshot.latitude && snapshot.longitude) {
    client.publish(
      `${prefix}/${vin}/location`,
      JSON.stringify({ latitude: snapshot.latitude, longitude: snapshot.longitude })
    );
  }
}

const SENSOR_DEFS = [
  { attr: "battery_level", name: "Battery Level", unit: "%", deviceClass: "battery", valueTemplate: "{{ value_json.batteryLevel }}" },
  { attr: "range_km", name: "Range", unit: "km", deviceClass: "distance", valueTemplate: "{{ value_json.rangeKm }}" },
  { attr: "mileage_km", name: "Mileage", unit: "km", deviceClass: "distance", valueTemplate: "{{ value_json.mileageKm }}" },
  { attr: "outside_temp_c", name: "Outside Temperature", unit: "°C", deviceClass: "temperature", valueTemplate: "{{ value_json.outsideTempC }}" },
  { attr: "speed_kmh", name: "Speed", unit: "km/h", deviceClass: null, valueTemplate: "{{ value_json.speedKmh }}" },
  { attr: "heading_deg", name: "Heading", unit: "°", deviceClass: null, valueTemplate: "{{ value_json.headingDeg }}" },
  { attr: "gps_signal_quality", name: "GPS Signal Quality", unit: null, deviceClass: null, valueTemplate: "{{ value_json.gpsSignalQuality }}" },
  { attr: "fix_status", name: "GPS Fix Status", unit: null, deviceClass: null, valueTemplate: "{{ value_json.fixStatus }}" },
  { attr: "ignition_state", name: "Ignition", unit: null, deviceClass: null, valueTemplate: "{{ value_json.ignitionState }}" },
  { attr: "charging_status", name: "Charging Status", unit: null, deviceClass: null, valueTemplate: "{{ value_json.chargingStatus }}" },
  { attr: "charging_mode", name: "Charging Mode", unit: null, deviceClass: null, valueTemplate: "{{ value_json.chargingMode }}" },
  { attr: "charging_rate", name: "Charging Rate", unit: null, deviceClass: null, valueTemplate: "{{ value_json.chargingRate }}" },
  { attr: "remaining_charge_minutes", name: "Remaining Charge Time", unit: "min", deviceClass: "duration", valueTemplate: "{{ value_json.remainingChargeMinutes }}" },
  { attr: "battery_capacity_wh", name: "Battery Capacity", unit: "Wh", deviceClass: null, valueTemplate: "{{ value_json.batteryCapacityWh }}" },
  { attr: "battery_residual_wh", name: "Battery Residual Energy", unit: "Wh", deviceClass: null, valueTemplate: "{{ value_json.batteryResidualWh }}" },
  { attr: "battery_health_percent", name: "Battery Health", unit: "%", deviceClass: null, valueTemplate: "{{ value_json.batteryHealthPercent }}" },
  { attr: "battery_12v_voltage", name: "12V Battery", unit: "%", deviceClass: "battery", valueTemplate: "{{ value_json.battery12vVoltage }}" },
  { attr: "privacy_state", name: "Privacy State", unit: null, deviceClass: null, valueTemplate: "{{ value_json.privacyState }}" },
  { attr: "service_type", name: "Service Type", unit: null, deviceClass: null, valueTemplate: "{{ value_json.serviceType }}" },
] as const;

const BINARY_SENSOR_DEFS = [
  { attr: "is_charging", name: "Charging", deviceClass: "battery_charging", valueTemplate: "{{ 'ON' if value_json.isCharging else 'OFF' }}" },
  { attr: "is_moving", name: "Moving", deviceClass: "moving", valueTemplate: "{{ 'ON' if value_json.isMoving else 'OFF' }}" },
  { attr: "plugged_in", name: "Plugged In", deviceClass: "plug", valueTemplate: "{{ 'ON' if value_json.pluggedIn else 'OFF' }}" },
  { attr: "is_daytime", name: "Daylight", deviceClass: "light", valueTemplate: "{{ 'ON' if value_json.isDaytime else 'OFF' }}" },
  { attr: "doors_locked", name: "Doors Locked", deviceClass: "lock", valueTemplate: "{{ 'ON' if value_json.doorsLocked else 'OFF' }}" },
] as const;

async function publishDiscoveryConfigs(): Promise<void> {
  if (!client?.connected) return;
  const prefix = settingsRepository.get("mqtt_topic_prefix") ?? "psamate";
  const allVehicles = vehiclesRepository.findAll();

  for (const v of allVehicles) {
    const device = {
      identifiers: [`psamate_${v.vin}`],
      name: `PSAmate ${v.label}`,
      model: v.model ?? undefined,
    };
    const stateTopic = `${prefix}/${v.vin}/status`;

    for (const entity of SENSOR_DEFS) {
      const discoveryTopic = `homeassistant/sensor/psamate_${v.vin}_${entity.attr}/config`;
      const payload = {
        name: entity.name,
        unique_id: `psamate_${v.vin}_${entity.attr}`,
        state_topic: stateTopic,
        value_template: entity.valueTemplate,
        ...(entity.unit ? { unit_of_measurement: entity.unit } : {}),
        ...(entity.deviceClass ? { device_class: entity.deviceClass } : {}),
        device,
      };
      client.publish(discoveryTopic, JSON.stringify(payload), { retain: true });
    }

    for (const entity of BINARY_SENSOR_DEFS) {
      const discoveryTopic = `homeassistant/binary_sensor/psamate_${v.vin}_${entity.attr}/config`;
      const payload = {
        name: entity.name,
        unique_id: `psamate_${v.vin}_${entity.attr}`,
        state_topic: stateTopic,
        value_template: entity.valueTemplate,
        device_class: entity.deviceClass,
        device,
      };
      client.publish(discoveryTopic, JSON.stringify(payload), { retain: true });
    }

    const locationTopic = `homeassistant/device_tracker/psamate_${v.vin}/config`;
    client.publish(
      locationTopic,
      JSON.stringify({
        name: `${v.label} Location`,
        unique_id: `psamate_${v.vin}_location`,
        json_attributes_topic: `${prefix}/${v.vin}/location`,
        device,
      }),
      { retain: true }
    );
  }
}
