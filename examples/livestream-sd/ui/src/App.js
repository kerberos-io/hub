import logo from './logo.svg';
import './App.css';

// import mqtt client library
import mqtt from 'mqtt';


import * as CryptoJS from 'crypto-js';  // AES encryption, symmetric

function App() {

  // Kerberos Hub public key (demo user)
  const hubKey = "AKIAJNFA77RNPAZVTT3Q";
  const hubPrivateKey = "xxx";

  // Multiple cameras can be connected to the same hub, each camera has a unique key.
  const cameras = [
    'camera1',
    'camera2',
    // ... and more
  ]

  // Create a new mqtt client with the following options (credentials are empty for now).
  var client = mqtt.connect('wss://mqtt.kerberos.io:8443/mqtt', {
    username: '',
    password: ''
  });

  client.on('connect', function () {
    console.log('Connected to mqtt broker');

    // Subscribe to the topic: kerberos/agent/{hubKey}
    client.subscribe(`kerberos/hub/${hubKey}`, function (err) {
      if (!err) {
        console.log('Subscribed to topic: kerberos/agent/{hubKey}');
      }
    });
  });

  // Handle incoming messages
  client.on('message', function (topic, message) {
    // message is a JSON object
    const msg = JSON.parse(message.toString());

    // Multiple cameras can be sending information to the same topic, so we can (if we want) filter the messages by device_id.
    if (cameras.includes(msg.device_id)) {
      
      // Message can be encrypted, and/or hidden, or just plain-text.
      // We can use specific variables to know what to do.

      if (msg.encrypted) {
        // Message is encrypted, we need to decrypt it.
        // We can use the hubKey to decrypt the message.
        // msg.data = decrypt(msg.data, hubKey);
      } else if (msg.hidden) {
        // We can decrypt using the camera public key.
        const payload = msg.payload.hidden_value;
        if (hubPrivateKey !== "") {
          const decrypted = CryptoJS.AES.decrypt(payload, hubPrivateKey).toString(CryptoJS.enc.Utf8);
          msg.payload = JSON.parse(decrypted);
        }
      }
    }
  });
  

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Kerberos.io - Live streaming SD example
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
