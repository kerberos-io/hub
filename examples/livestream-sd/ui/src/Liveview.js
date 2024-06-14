// This component will receive an array of livestreams and display them in a video grid.
import React from 'react';
import { ImageCard } from '@kerberos-io/ui';

const Liveview = ({ liveviews }) => {
    return (
        <div className="liveview">
        {liveviews && liveviews.map((liveview, index) => (
            <div key={index}>
                <p>Camera name: {liveview.camera_id}</p>
                <ImageCard
                    imageSrc={`data:image/png;base64, ${liveview.image}`}
                    onerror=""
                />
            </div>
        ))}
        {!liveviews || liveviews.length === 0 && <p>No liveviews available</p>}
        </div>

    );
}

export default Liveview;
    