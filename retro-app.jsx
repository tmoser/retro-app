import React from 'react';

const RetroApp = () => {
    return (
        <div>
            <h1>Welcome to the Retro App!</h1>
            <p>Current Date and Time: {new Date().toUTCString()}</p>
        </div>
    );
};

export default RetroApp;