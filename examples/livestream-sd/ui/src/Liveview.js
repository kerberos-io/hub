// This component will receive an array of livestreams and display them in a video grid.

import React from 'react';

const Liveview = ({ liveviews }) => {
    return (
        <div className="liveview">
            {liveviews && liveviews.length && "ok"}
        {liveviews && liveviews.map((liveview, index) => (
            <img key={index} src={`data:image/jpeg;base64,${liveview.image}`} alt="liveview" />
        ))}
        </div>
    );
}

export default Liveview;
    