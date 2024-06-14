import React from 'react';
import logo from './logo.svg';
import './App.css';
import Liveview from './Liveview';
import { v4 as uuidv4 } from "uuid";
import mqtt from 'mqtt';
import * as CryptoJS from 'crypto-js';
import {
  Main,
  MainBody,
  Gradient,
} from '@kerberos-io/ui';

class App extends React.Component {

  // Kerberos Hub public key (demo user)
  hubKey = "your-hub-key-here";
  hubPrivateKey = "your-private-key-here";

  cameras = [
    'camera1',
    'camera2',
    // ... and more
  ]

  constructor() {
    super();
    this.state = {liveviews: []};

    var client = mqtt.connect('wss://mqtt.kerberos.io:8443/mqtt', {
      username: '',
      password: ''
    });

    // Make a connection to the MQTT broker, and subscribe to the relevant topic(s).
    client.on('connect', () => {
      console.log('Connected to mqtt broker');
      // Subscribe to the topic: kerberos/agent/{hubKey}
      client.subscribe(`kerberos/hub/${this.hubKey}`, (err) => {
        if (!err) {
          console.log(`Subscribed to topic:kerberos/hub/${this.hubKey}`);
        }
      });
    });

    // Handle incoming messages
    client.on('message', (topic, message) => {
      // message is a JSON object
      const msg = JSON.parse(message.toString());

      // Multiple cameras can be sending information to the same topic, so we can (if we want) filter the messages by device_id. 
      if (this.cameras.includes(msg.device_id)) {
        
        // Message can be encrypted, and/or hidden, or just plain-text.
        // We can use specific variables to know what to do.

        if (msg.encrypted) {
          // Message is encrypted, we need to decrypt it.
          // We can use the hubKey to decrypt the message.
          // msg.data = decrypt(msg.data, hubKey);
        } else if (msg.hidden) {
          // We can decrypt using the camera public key.
          const payload = msg.payload.hidden_value;
          if (this.hubPrivateKey !== "") {
            const decrypted = CryptoJS.AES.decrypt(payload, this.hubPrivateKey).toString(CryptoJS.enc.Utf8);
            msg.payload = JSON.parse(decrypted);
          }
        }

        // We can now process the message, and display the liveview.
        // First we'll check if the camera is already in the liveviews array.
        // If it is, we'll update the liveview, if not, we'll create a new liveview.
        // Please note that in practice you might know the camera_id in advance, and
        // you might want to display it on a specific HTML component.

        const camera_id = msg.device_id;
        const image = msg.payload.value.image;
        const liveviews = this.state.liveviews;
        const camera = liveviews.find((l) => l.camera_id === camera_id);
        if (camera) {
          // Update the existing liveview
          camera.image = image;
          camera.timestamp = msg.timestamp;
        } else {
          // Create a new liveview
          const liveview = {
            camera_id: camera_id,
            image: image,
            timestamp: msg.timestamp
          }
          liveviews.push(liveview);
        }
        this.setState({liveviews: [...liveviews]});
      }
    });

    // To start receiving messages, we need to send heartbeats to the topic: kerberos/agent/{hubKey}
    // This will wakeup the desired agents, and they will start sending JPEGS to the kerberos/hub/{hubKey} topic.
    setInterval(() => {
      // We'll make a seperate publish for each camera_id we are interested in.
      this.cameras.forEach((camera_id) => {
        const payload = {
          action: "request-sd-stream",
          device_id: camera_id,
          value: {
            timestamp: Math.floor(Date.now() / 1000),
          }
        };

        // We'll generate a hash of the payload to use as a fingerprint.
        const payload_hash = CryptoJS.SHA256(JSON.stringify(payload)).toString(CryptoJS.enc.Hex);

        // We'll add some metadata first.
        const message = {
          mid: uuidv4(),
          timestamp: Math.floor(Date.now() / 1000),
          hidden: true,
          encrypted: false,
          fingerprint: "",
          device_id: payload.device_id,
          payload,
          payload_hash,
        }

        // If we need to hide the value, we'll encrypt it with the hub private key.
         // depending on the settings in the Kerberos Agent we might need to hide the
         // message, this will make sure nobody can read the message.
         
        const hidden = true;
        if(hidden && this.hubPrivateKey !== "") {
          const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(message.payload),
            this.hubPrivateKey).toString();

          message.payload = {};
          message.hidden = true;
          message.payload.hidden_value = encrypted;
        }

        client.publish(`kerberos/agent/${this.hubKey}`, JSON.stringify(message));
      });
    }, 3000);
  }


  render() {
    const { liveviews } = this.state;
    return <div id="page-root">
    <Main>
      <Gradient />
      <MainBody>
        <Liveview liveviews={liveviews} />
      </MainBody>
    </Main>
  </div>;
  }
}


export default App;
