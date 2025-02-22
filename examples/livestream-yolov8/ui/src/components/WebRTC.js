import React from 'react';
import { v4 as uuidv4 } from "uuid";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import { detectVideo } from "../utils/detect";

class WebRTC extends React.Component {

    constructor() {
        super();
        this.videoRef = React.createRef();
        this.canvasRef = React.createRef();
        this.sessionId = uuidv4();

        this.state = {
            net: null,
            inputShape: [1, 0, 0, 3],
            loading: true,
        };

        this.modelName = "yolov8n";
        //this.modelName = "helmet_o";
        tf.setBackend("webgl"); // set backend to webgl
        tf.ready().then(async () => {
            const yolov8 = await tf.loadGraphModel(
                `${window.location.href}/${this.modelName}_web_model/model.json`,
                {
                onProgress: (fractions) => {
                    //setLoading({ loading: true, progress: fractions }); // set loading fractions
                    this.setState({ loading: true });

                    if (fractions === 1) {
                        this.setState({ loading: false });
                        console.log("ready");
                    }
                },
                }
            ); // load model
        
            // warming up model
            const dummyInput = tf.ones(yolov8.inputs[0].shape);
            const warmupResults = yolov8.execute(dummyInput);
            this.setState({
                net: yolov8,
                inputShape: yolov8.inputs[0].shape,
            }); // set model & input shape
            tf.dispose([warmupResults, dummyInput]); // cleanup memory
        });

        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: window.env.STUN_URI },
                { urls: window.env.TURN_URI, username: window.env.WEBRTC_USERNAME, credential: window.env.WEBRTC_PASSWORD }
            ]
        });
    }

    componentDidMount() {
        const { mqtt, name } = this.props;
        this.name = name;
        this.mqtt = mqtt;

        this.peerConnection.onicecandidate = this.handleICECandidateEvent.bind(this);
        this.peerConnection.ontrack = this.handleTrackEvent.bind(this);
        this.peerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
        this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent.bind(this);
        this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
        this.peerConnection.onicegatheringstatechange = this.handleICEGatheringStateChangeEvent.bind(this);
        this.peerConnection.onconnectionstatechange = this.handleConnectionStateChangeEvent.bind(this);

        // We need to subscribe to the specific agent to receive the ICECandidate.
        // Upon receiving the ICECandidate, we'll add it to the peerConnection.
        this.subscribe();

        this.peerConnection.addTransceiver("video", {
            direction: "sendrecv",
        });
        this.peerConnection.addTransceiver("audio", {
            direction: "sendrecv",
        });
    }

    componentWillUnmount() {
        this.peerConnection.close();
        this.peerConnection = null;
        this.setState({ net: null });
        this.setState({ loading: true });
    }


    subscribe() {
        // We're listening for the "receive-hd-candidate" action for the specific
        // camera (all other actions are ignored).
        // Each time we receive a message with this action, we update the liveview state.
        this.mqtt.on(this.name, (_, message) => {
            const { payload } = message;
            if (payload.action === "receive-hd-candidates") {
                let { candidate } = payload.value;
                candidate = JSON.parse(candidate.toString());
                if(this.peerConnection === null || this.peerConnection.remoteDescription === null) {
                    this.iceCandidates.push(candidate);
                    return;
                }
                this.peerConnection.addIceCandidate(candidate);
            } else if (payload.action === 'receive-hd-answer') {
                const { sdp, session_id } = payload.value;
                if (session_id === this.sessionId) {
                    this.peerConnection.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: atob(atob(sdp)),
                    }));
                }
            }
        });
    }

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

    handleNegotiationNeededEvent() {
        // In here we'll create an offer and send it to the other peer.
        this.iceCandidates = [];
        return this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            iceRestart: true,
        }).then(offer => {
            return this.peerConnection.setLocalDescription(offer);
        }).then(() => {
            this.sendOffer();
        }).catch(error => console.log(error));
    }

    sendOffer(){
        const { sdp } = this.peerConnection.localDescription;
        const payload = {
            action: "request-hd-stream",
            device_id: this.name,
            value: {
                timestamp: Math.floor(Date.now() / 1000),
                session_id: this.sessionId,
                session_description: btoa(sdp),
            }
        };
        this.mqtt.publish(payload);
    }

    handleConnectionStateChangeEvent() {
        if (this.peerConnection.connectionState === 'connected') {
            const videoElement = this.videoRef.current;
            if (videoElement && videoElement.play) {
                videoElement.play().catch(error => {
                    console.error('Error playing video:', error);
                });
            }
        }
    }

    handleTrackEvent(event) {
        const videoElement = this.videoRef.current;
        if (videoElement) {
            videoElement.srcObject = event.streams[0];
            // Map to test.mp4 video which is in public folder
        }
    }

    handleICEConnectionStateChangeEvent() {
        this.status = this.peerConnection.connectionState;
        if(this.status === 'failed') {
          // While we are disconnected we should try to reconnect
          this.peerConnection.restartIce();
        }
    }

    handleSignalingStateChangeEvent() {
        // Handle signaling state change event
    }

    handleICEGatheringStateChangeEvent() {
        if(this.peerConnection.iceGatheringState === 'complete') {
            // Handle ICE gathering state change event
            for(const candidate of this.iceCandidates) {
                this.peerConnection.addIceCandidate(candidate);
            }
            this.iceCandidates = [];
        }
    }

    render(){
        const model  = this.state;
        return (<div>
                { !model.loading && <div className="content">
                        <video className="video" 
                        autoPlay playsInline
                        style={{width: "100%"}} ref={this.videoRef} muted onPlay={() => detectVideo(this.videoRef.current, model, this.canvasRef.current)}></video>
                        <canvas className='canvas' width={model.inputShape[1]} height={model.inputShape[2]} ref={this.canvasRef} />
                </div> }
            </div>
        );
    }
}

export default WebRTC;