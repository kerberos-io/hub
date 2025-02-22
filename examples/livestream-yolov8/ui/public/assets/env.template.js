(function(window) {
    window["env"] = window["env"] || {};

    // Environment variables
    window["env"]["HUB_PUBLIC_KEY"] = "YOUR_HUB_PUBLIC_KEY";
    window["env"]["HUB_PRIVATE_KEY"] = "YOUR_HUB_PRIVATE_KEY";

    window["env"]["MQTT_URI"] = "YOUR_MQTT_URI";
    window["env"]["MQTT_USERNAME"] = "YOUR_MQTT_USERNAME";
    window["env"]["MQTT_PASSWORD"] = "YOUR_MQTT_PASSWORD";

    window["env"]["WEBRTC_USERNAME"] = "YOUR_WEBRTC_USERNAME";
    window["env"]["WEBRTC_PASSWORD"] = "YOUR_WEBRTC_PASSWORD";

    window["env"]["STUN_URI"] = "YOUR_STUN_URI";
    window["env"]["TURN_URI"] = "YOUR_TURN_URI";
})(this);