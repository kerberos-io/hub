# High definition (WebRTC) live streaming

Hub provides two types of live view: a low resolution live view and a high resolution (on demand) live view. Depending on the application you might leverage one over the other, or, both. Below we will explain the differences, and how to open and negotiate a high resolution live view with the Agent using the concepts of WebRTC. It's important to understand that live view is an on-demand action, which requires a negotiation between the requesting client (Hub or this example application) and the remote Agent. This negotiation will setup a sessions between the client and the Agent, for a short amount of time. Once the client closes the connection or the web page, the Agent will also stop forwarding the live view.

## Architecture

Hub and Agent provide a high resolution live view, which includes a full frames per second (FPS) stream. To enable this functionality, the WebRTC protocol is used for negotiating the channels (ICE candidates) and forwarding the RTP packets. We will describe the communication flow in detail below.

![Livestreaming HD](./livestream-hd.svg)

The negotiation of a WebRTC stream is a multi-step approach, we'll detail each step below. If you need more background about WebRTC, we advise to read through the [WebRTC for the curious book](https://github.com/webrtc-for-the-curious/webrtc-for-the-curious).

## 1. Play WebRTC

An user opens the application, and either activates the WebRTC stream or the application automatically loads the WebRTC stream without any user interaction (for example video wall behaviour).

## 2. Create and send offer

The WebRTC flow is initiated, and starts with the initial step: the `offer` creation. This so called `offer` includes all the necessary information about the client application (codecs and much more), which the receiving peer (our Agent) needs to know to successfully setup a real-time connection in the next steps. If you want more information about the technicalities of the `offer`, we advise the go through WebRTC for the curious book.

    return this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true,
    }).then(offer => {
        return this.peerConnection.setLocalDescription(offer);
    }).then(() => {
        this.sendOffer();
    }).catch(error => console.log(error));

Once the `offer` is successfully created, it's encrypted using the `Hub private key` and send over the Agent through MQTT.

## 3. Create and send answer

The `offer` is received by the Agent, in a response the Agent will generate an `answer`, which is similar to the `offer`; it includes media codec information and more.

The whole idea about `offer` and `answer` is just like sharing phone numbers when you meet someone for the first time. You'll find the corresponding code in the [`kerberos-io\agent` repository](https://github.com/kerberos-io/agent/blob/master/machinery/src/webrtc/main.go#L210-L215)

    answer, err := peerConnection.CreateAnswer(nil)
    if err != nil {
        log.Log.Error("webrtc.main.InitializeWebRTCConnection(): something went wrong while creating answer: " + err.Error())
    } else if err = peerConnection.SetLocalDescription(answer); err != nil {
        log.Log.Error("webrtc.main.InitializeWebRTCConnection(): something went wrong while setting local description: " + err.Error())
    }

## 4. Share ICE candidates

Once the `offer` and `answer` are shared both peers (Agent and client) will start gathering one or more ICE candidates. An ICE candidate contains specific information about communication channels or routes.

Each ICE candidate is shared with the other peer (Agent -> client | client -> Agent). By doing so each peer will know how to communicate with each other. Once all ICE candidates are shared a candidate keypair is chosen for setting up the final communication; this decision is made by the WebRTC protocol.

    handleICECandidateEvent(event) {
        if (event.candidate) {
            // Handle ICE candidate event
            const { candidate } = event.candidate;
            const payload = {
                action: "receive-hd-candidates",
                device_id: this.name,
                value: {
                    timestamp: Math.floor(Date.now() / 1000),
                    session_id: this.sessionId,
                    candidate: candidate,
                }
            };
            this.mqtt.publish(payload);
        }
    }

## 5. Forwarding streaming

The Agent will start forwarding the RTP track to the client, using the chosen ICE candidate pair. The client will mount the RTP track to a `<video>` HTML component.

    handleTrackEvent(event) {
        const videoElement = this.videoRef.current;
        if (videoElement) {
            videoElement.srcObject = event.streams[0];
        }
    }

The `<video>` HTML component is rendered in the browser and visualises the RTP stream accordingly.

    render(){
        return (
            <video style={{width: "100%"}} ref={this.videoRef} muted controls></video>
        );
    }

## Example

In the `ui` folder a React application is created implementing the above feature, which contains a working example using our [`demo enviroment`](https://app-demo.kerberos.io). To run the project, install the dependencies and run the project using `npm install`.

    cd ui/
    npm install
    npm start
