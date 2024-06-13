# Example: live streaming SD

Kerberos Hub provides two types of live view: a low resolution live view and a high resolution  (on demand) live view. Depending on the situation you might leverage one over the other, or, both. Below we will explain the differences, and how to open and negotiate a low resolution live view event with the agent. It's important to understand that live view is an on-demand action, which requires a negotiation between the requesting client (Kerberos Hub or your application) and the remote agent. This negotiation will setup a live view sessions between the client and the agent, for a short amount of time. Once the client closes the connection, the agent will stop forwarding the live view.

## Low resolution

Kerberos Hub and Kerberos Agent provides a low resolution live view, which includes a low frames-per-second (FPS) stream of JPEGs. Depending on the key frame interval of the underlaying camera, an agent will retrieve key frames and forward them over MQTT (TCP and WSS) to the client application. Please see below graphic for more details.

![Livestreaming SD](./livestreaming-sd.svg)

The negotiation of a live view is a multi-step approach, we'll detail each step below.

1. Setup connection: before moving on your app should be able to communicate and authenticate with MQTT message broker, using the relevant credentials of your MQTT broker.
2. Request for stream: Your application will reach out to MQTT message broker (e.g. Vernemq or Mosquitto) by repeatedly sending a specific "keep-alive" payload to an unique MQTT topic. This topic includes the `hubKey`, indicating the Kerberos Hub user account to which the camera belongs. 

   - Publish to `kerberos/agent/{hubKey} topic, this is what the Kerberos Agent is listening to.
   - The payload of the message is of following format, and send to previously mentioned `topic`. 
   - The agent will receive the payload on the expected `hubKey` and validates the `device_id` to verify the message receiver.
   - Once validated the agent, will validate the action `request-sd-stream` and execute the desired function. In this case the decode and transferring of JPEGs.

            const payload = {
                mid: "xxxx",
                timestamp: "xxxx",
                device_id: this.deviceKey,
                hidden: false,
                payload: {
                    action: "request-sd-stream",
                    device_id: this.deviceKey,
                    value: {
                        timestamp: Math.floor(Date.now() / 1000),
                    }
                }
            };
  
3. Receive stream: once the message is received and validated by the agent, it will start forwarding a stream of MJPEGs (encoded key frames) to following topic `kerberos/hub/{hubKey}`, with a similar payload as previously mentioned but with a different `action` and `value`.

    -  Following payload will be send to `kerberos/hub/{hubKey}`.
  
            const payload = {
                mid: "xxxx",
                timestamp: "xxxx",
                device_id: this.deviceKey,
                hidden: false,
                payload: {
                    action: "receive-sd-stream",
                    device_id: this.deviceKey,
                    value: {
                        image: "/3223535--base64-encode-string....--ewgewg/"
                    }
                }
            };
  
    -  The payload of the consumed messages will include a base64 encoded image, which can be visualised through embedding in a `<img>` HTML component.
   
4. Close stream: your application stops sending "keep-alive" request for stream (1), the targetted agent will stop sending JPEGs to the relative MQTT topic (2), for which the live view is closed.

