const URL = 'ws://localhost:7001/ws';

const localVideo = document.getElementById('localVideo');
const remotesDiv = document.getElementById("remotes");

const mediaStreamConstraints = {
    video: true,
    audio: true,
};
const offerOptions = {
    offerToReceiveVideo: 1,
};
let localStream;
let localUserId;
let connections = [];
let connection;
let remoteConnection;
let connectionID;


function gotRemoteStream(event, userId) {

    let remoteVideo = document.createElement('video');

    remoteVideo.setAttribute('data-socket', userId);
    remoteVideo.srcObject = event.stream;
    remoteVideo.autoplay = true;
    remoteVideo.muted = true;
    remoteVideo.playsinline = true;
    document.querySelector('.videos').appendChild(remoteVideo);
}

function gotIceCandidate(fromId, candidate) {
    connections[fromId].addIceCandidate(new RTCIceCandidate(candidate)).catch(handleError);
}


function startLocalStream() {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(getUserMediaSuccess)
        .then(connectWSToSignaling).catch(handleError);
}

async function connectWSToSignaling() {
    // clientLocal.publish(localStream);
    const socket = new WebSocket(URL);

    socket.onmessage = async event => {
        const msg = JSON.parse(event.data);
        if (typeof msg != 'object') {
            return;
        }

        const {
            params,
            result,
            method,
            id,
        } = msg;

        console.log(method);

        if (id == connectionID) {
            console.log('set remote');
            await connection.setRemoteDescription(result);
        } else if (method == 'offer') {
            await remoteConnection.setRemoteDescription(params);
            const description = await remoteConnection.createAnswer();

            await remoteConnection.setLocalDescription(description);

            sendWS(socket, {
                method: 'answer',
                params: {
                    sid: 'test-room',
                    desc: description,
                },
            });
        } else if (method == 'trickle') {
            if (params.target == 0) {
                connection.addIceCandidate(params.candidate);
            } else {
                remoteConnection.addIceCandidate(params.candidate);
            }
        }
    };

    socket.onopen = async () => {
        console.log('websocket connected');
    };

    connection = new RTCPeerConnection(mediaStreamConstraints);
    remoteConnection = new RTCPeerConnection(mediaStreamConstraints);

    connection.addStream(localStream);

    const description = await connection.createOffer(offerOptions);

    console.log('set local')
    await connection.setLocalDescription(description);

    connection.onicecandidate = () => {
        if (event.candidate) {
            console.log('send candidate');
            sendWS(socket, {
                method: 'trickle',
                params: {
                    target: 0,
                    candidate: event.candidate,
                },
            });
        }
    };

    remoteConnection.onicecandidate = () => {
        if (event.candidate) {
            console.log('send candidate');
            sendWS(socket, {
                method: 'trickle',
                params: {
                    target: 1,
                    candidate: event.candidate,
                },
            });
        }
    };

    remoteConnection.ontrack = (ev) => {
        const tmp = ev.streams[0];
        const track = ev.track;

        const stream = tmp;

        console.log("got track", track.id, "for stream", stream.id);
        if (track.kind === "video") {
            track.onunmute = () => {
                const remoteVideo = document.createElement("video");
                remoteVideo.srcObject = stream;
                remoteVideo.autoplay = true;
                remoteVideo.muted = true;
                remotesDiv.appendChild(remoteVideo);

                track.onremovetrack = () => remotesDiv.removeChild(remoteVideo);
            };
        }
    }

    connection.oniceconnectionstatechange = (event) => {
        console.log('connection state change to', event.target.iceConnectionState);
    };

    console.log('send offer to sfu');
    connectionID = Date.now();
    sendWS(socket, {
        method: 'join',
        params: {
            sid: 'test-room',
            offer: description,
        },
    });
}

function getUserMediaSuccess(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
}

function handleError(e) {
    console.log(e);
    alert('Something went wrong');
}

function sendWS(socket, data, noNeedId) {
    const payload = Object.assign(data, {
        jsonrpc: '2.0',
        // id: connectionID,
    });
    if (!noNeedId) {
        payload.id = connectionID;
    }
    socket.send(JSON.stringify(payload));
}

startLocalStream();