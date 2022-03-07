# WebRTC-SFU
This is a basic demo video call was written base on WebRTC using SFU solution.
# Installation
1. git clone
2. npm install
3. node index.js
4. Navigate to localhost:3000

# SFU explaination
- Selective forwarding unit: https://webrtcglossary.com/sfu/
- Why choose SFU: https://webrtc.ventures/2020/12/webrtc-media-servers-sfus-vs-mcus/

# Client flow
- Client join room
- Client creates connection to SFU server (offer -> answer -> add video/audio stream), starts sending audio data to server.
- When another user join this room, client will receive an offer to create a stream down connection to client (answer -> receive video/audio), receive audio in `track` event with id base on user join room.

