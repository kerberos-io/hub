import mqtt from 'mqtt';
import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from "uuid";

export default class MQTT {

  constructor(options) {
    this.connect = this.connect.bind(this);
    this.on = this.on.bind(this);
    // Spread the options object into the class.
    const { hubPublicKey, hubPrivateKey, mqttURI, mqttUsername, mqttPassword } = options;
    this.hubPublicKey = hubPublicKey;
    this.hubPrivateKey = hubPrivateKey
    this.mqttURI = mqttURI;
    this.mqttUsername = mqttUsername;
    this.mqttPassword = mqttPassword;

  }

  on(deviceId, callback) {
    return this.client.on('message', (topic, message) => {
      const jsonMessage = JSON.parse(message.toString());
      // Check if the message is for the device we are interested in.
      if(jsonMessage.device_id === deviceId) {
        const decomposedMessage = this.decompose(jsonMessage);
        callback(topic, decomposedMessage);
      }
    });
  }

  publish(message) {
    message = this.compose(message);
    this.client.publish(`kerberos/agent/${this.hubPublicKey}`, JSON.stringify(message));
  }

  compose(message){
    // We'll generate a hash of the payload to use as a fingerprint.
    const messageString = JSON.stringify(message)
    const payload_hash = CryptoJS.SHA256(messageString).toString(CryptoJS.enc.Hex);

    // We'll add some metadata first.
    message = {
        mid: uuidv4(),
        timestamp: Math.floor(Date.now() / 1000),
        hidden: true,
        encrypted: false,
        fingerprint: "",
        device_id: message.device_id,
        payload: message,
        payload_hash,
    }

    // If we need to hide the value, we'll encrypt it with the hub private key.
    // depending on the settings in the Kerberos Agent we might need to hide the
    // message, this will make sure nobody can read the message.
    const hidden = true;
    if(hidden && this.hubPrivateKey !== "") {
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(message.payload), 
          this.hubPrivateKey
        ).toString();

        message.payload = {};
        message.hidden = true;
        message.payload.hidden_value = encrypted;
    }
    return message;
  }

  decompose(message) {
    if (message.encrypted) {
      // Message is encrypted with a custom encryption key.
      // msg.data = decrypt(msg.data, hubKey);
    } else if (message.hidden) {
      const payload = message.payload.hidden_value;
      if (this.hubPrivateKey !== "") {
        // Decrypt the message using the hubPrivateKey.
        const decrypted = CryptoJS.AES.decrypt(payload, this.hubPrivateKey).toString(CryptoJS.enc.Utf8);
        // Overwrite the message payload with the decrypted message.
        message.payload = JSON.parse(decrypted);
      }
    }
    return message;
  }
  
  connect(callback) {
    // Make a connection to the MQTT broker.
    this.client = mqtt.connect(this.mqttURI, {
      username: this.mqttUsername,
      password: this.mqttPassword
    });

    this.client.setMaxListeners(30);
    // Try to connect to the MQTT broker, and subscribe to the relevant topics.
    callback(this.client.connected);
    this.client.on('connect', () => {
      callback(this.client.connected);
      this.client.subscribe(`kerberos/hub/${this.hubPublicKey}`, (err) => {});
    });
  }
}