// Camera Access Utilities

// Request camera access, returns MediaStream or null
export const requestCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream;
    } catch (error) {
        console.error('[Camera] Access denied:', error);
        return null;
    }
};

// Stop all tracks on a camera stream
export const stopCamera = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
};
