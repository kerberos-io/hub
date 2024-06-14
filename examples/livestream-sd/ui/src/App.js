import React from 'react';
import logo from './logo.svg';
import './App.css';
import Liveview from './Liveview';

// import mqtt client library
import mqtt from 'mqtt';
import * as CryptoJS from 'crypto-js';  // AES encryption, symmetric


class App extends React.Component {

  // Kerberos Hub public key (demo user)
  hubKey = "AKIAJNFA77RNPAZVTT3Q";
  hubPrivateKey = "h9vWas0UxxxxxxxxSCAKamQoD";

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
  }
  render() {
    const { liveviews } = this.state;
    return <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <p>
        Kerberos.io - Live streaming SD example
      </p>
      <a
        className="App-link"
        href="https://kerberos.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more about Kerberos.io
      </a>
    </header>
    <Liveview liveviews={liveviews} />
  </div>;
  }
}


export default App;
