import React from 'react';

export const fallbackRender = ({ error, resetErrorBoundary }) => {
    // Call resetErrorBoundary() to reset the error boundary and retry the render.

    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre style={{ color: 'red' }}>{error.message}</pre>
        </div>
    );
};


export const remove_subs = (SUB_ID) => {
    const key = SUB_ID + "_subs";
    const subs = window[key] || [];


    subs.forEach(s => {
        if(s.unsubscribe) s.unsubscribe();
        if(s.event && s.fn){
            document.removeEventListener(s.event, s.fn);
            window.removeEventListener(s.event, s.fn);
        }
    });
    window[key] = [];
}

export const add_sub = (SUB_ID, s) => {
    const key = SUB_ID + "_subs";
    const subs = window[key] || [];
    window[key] = subs;
    subs.push(s);
}
