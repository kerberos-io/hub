import React from 'react';
import WebRTC from './WebRTC';

class Stream extends React.Component {

    streamModeOptions = ["jpeg", "webrtc"];

    render() {
        const { name, mqtt } = this.props;
        return (
            <div>
                <WebRTC name={name} mqtt={mqtt}></WebRTC>
            </div>
        );
    }
}

export default Stream;