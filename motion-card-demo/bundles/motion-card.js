'use strict';
const matchQueryValue = (regex, defaultValue) => {
    const queryValue = window.location.search.match(regex);
    return queryValue === null || queryValue[1] === void 0
        ? String(defaultValue)
        : String(queryValue[1]);
};
const getGravityAxisValue = accelerationIncludingGravity => {
    const { x, y } = accelerationIncludingGravity;
    return window.innerHeight > window.innerWidth
        ? parseInt(String(x || 0), 10)
        : parseInt(String(y || 0), 10);
};
const displayError = (err, DOMElement) => {
    if (typeof err === 'string') err = new Error(err);
    DOMElement.innerHTML = `<p>${err.message}</p>`;
};
const isMotionEventSupported = () => 'DeviceMotionEvent' in window;
const FRAMES_COUNT = (() => {
    const defaultValue = 6;
    const queryValue = matchQueryValue(/frames-count=([0-9]+)/, defaultValue);
    return Math.max(parseInt(queryValue, 10), 0);
})();
let motionEventRegistered = false;
let frameIndexCache = 0;
let frameTransitionActive = false;
const framesB64CachedList = [];
const framesURIsList = (() => {
    const frames = [];
    while (frames.length < FRAMES_COUNT)
        frames.push(`./assets/frame-${frames.length + 1}.jpg`);
    return frames;
})();
const frameDOMRender = document.getElementById('render');
const infoDOMRender = document.getElementById('info');
const handleMotionEvent = event => {
    motionEventRegistered = true;
    if (frameTransitionActive === false) {
        frameTransitionActive = true;
    } else return;
    const { accelerationIncludingGravity = null } = event;
    if (accelerationIncludingGravity === null) {
        frameTransitionActive = false;
        return;
    }
    const axisValue = getGravityAxisValue(accelerationIncludingGravity);
    if (Math.abs(axisValue % 2) !== 0) {
        frameTransitionActive = false;
        return;
    }
    const frameIndex = (() => {
        const middleFrameIndex = Math.ceil(framesB64CachedList.length / 2 - 1);
        if (axisValue === 0) {
            return middleFrameIndex;
        }
        if (axisValue < 0) {
            const previousFrameIndex = middleFrameIndex + axisValue + 1;
            return framesB64CachedList[previousFrameIndex] !== void 0
                ? previousFrameIndex
                : 0;
        }
        const nextFrameIndex = middleFrameIndex + axisValue - 1;
        return framesB64CachedList[nextFrameIndex] !== void 0
            ? nextFrameIndex
            : framesB64CachedList.length - 1;
    })();
    if (frameIndexCache === frameIndex) {
        frameTransitionActive = false;
        return;
    } else frameIndexCache = frameIndex;
    const img = new Image();
    img.src = framesB64CachedList[frameIndex];
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        frameDOMRender.style.backgroundImage = `url('${img.src}')`;
        if (frameDOMRender.classList.contains('lenticular-effect') === false) {
            frameDOMRender.classList.add('lenticular-effect');
        }
        setTimeout(() => {
            frameTransitionActive = false;
        }, 330 + 330 / 2);
    };
    img.onerror = () => {
        frameTransitionActive = false;
    };
};
const initializeDeviceMotionEvent = () => {
    window.addEventListener('devicemotion', handleMotionEvent, true);
    frameDOMRender.addEventListener('click', () => {
        frameDOMRender.requestFullscreen();
    });
    setTimeout(() => {
        motionEventRegistered === false &&
            displayError('Something went wrong...', infoDOMRender) &&
            frameDOMRender.classList.remove('lenticular-effect');
    }, 1000);
};
const preloadAssets = cb => {
    Promise.all(
        framesURIsList.map(
            frameURI =>
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = frameURI;
                    img.crossOrigin = 'anonymous';
                    img.onerror = () => {
                        reject(new Error(`Cannot load "${frameURI}"`));
                    };
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const context = canvas.getContext('2d');
                        if (context === null) {
                            reject(new Error(`Cannot load "${frameURI}"`));
                            return;
                        }
                        context.drawImage(img, 0, 0);
                        const b64 = canvas.toDataURL('image/jpeg');
                        framesB64CachedList.push(b64);
                        resolve();
                    };
                })
        )
    )
        .then(() => cb(null))
        .catch(preloadError => {
            cb(preloadError);
        });
};
if (isMotionEventSupported()) {
    preloadAssets(preloadError => {
        if (preloadError) displayError(preloadError.message, infoDOMRender);
        else initializeDeviceMotionEvent();
    });
} else displayError('Device not supported! :(', infoDOMRender);
