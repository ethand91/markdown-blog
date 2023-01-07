---
title: "WebRTC For Beginners - Part 3: Peers"
metaTitle: "WebRTC For Beginners Peers"
metaDesc: "WebRTC For Beginners Peers"
socialImage: assets/images/webrtc.jpg
date: "2022-01-24"
tags:
	- webrtc
---

Contents:
1. Part 1: Introduction to WebRTC and creating the signaling server [Link](https://dev.to/ethand91/webrtc-for-beginners-1l14)
2. Part 2: Understanding the MediaDevices API and getting access to the user’s media devices [Link](https://dev.to/ethand91/webrtc-for-beginners-part-2-mediadevices-142d)
3. Part 3: Creating the peers and sending/receiving media [Link] (https://dev.to/ethand91/webrtc-for-beginners-part-3-creating-the-peers-and-sendingreceiving-media-4lab)
4. Part 4: Sharing and sending the user’s display and changing tracks [Link](https://dev.to/ethand91/webrtc-for-beginners-part-4-screen-share-42p6)
5. Part 5: Data Channels basics [Link] (https://dev.to/ethand91/webrtc-for-beginners-part-5-data-channels-l3m)
6. Part 5.5: Building the WebRTC Android Library [Link](https://dev.to/ethand91/webrtc-for-beginners-part-55-building-the-webrtc-android-library-e8l)
7. Part 6: Android native peer [Link](https://dev.to/ethand91/webrtc-for-beginners-part-6-android-231l)
8. Part 7: iOS native peer
9. Part 8: Where to go from here

- - - -

Hello again! Welcome to Part 3 of my ongoing WebRTC series.

This time we will finally be able to send and receive media.

Again this carries on from the previous parts, so if you have not read them please take a look at them. Or you can download the source from GitHub ;)

If you are continuing on from the previous parts the index.html file from part 2 is no longer needed, feel free to either rename it or remove it. 

In this part we will go over the RTCPeerConnection API, how we can use it to establish a connection to another peer. But first we need to go over some terminology.

The steps that need to be taken to establish a P2P connection in simple terms is as follows:
1. The caller creates their RTCPeerConnection and creates an offer.
2. The caller then uses the created offer and set’s their local description.
3. The caller then sends the created offer to the callee.
4. The callee receives the caller’s offer, creates their RTCPeerConnection (creating the RTCPeerConnection can be done before this step.) and then set’s the remote description.
5. The callee then creates an answer based on their remote description.
6. The callee then set’s their local description to the answer and sends the answer to the caller.
7. The caller when receiving the answer set’s their remote description.
8. If all goes well a P2P connection is established.

The steps may seem hard to grasp at first, but the more you play around the easier it is to remember.

Next we will go over SDP. SDP stands for “Session Description Protocol”. Each SDP message is made of key/value pairs, it contains details such as.
* IP/Ports that is reachable on
* How many audio/video tracks are to be used.
* What audio/video codecs the client supports
* Security (certificate fingerprint)

Next we will look at STUN/TURN.
STUN stands for “Session Traversal Utilities for NAT”. It was created just for working with NATS. In basic terms its purpose is to answer the question “what’s my IP address?”.
TURN stands for “Traversal Using Relays around NAT.”, it is used when the use of STUN is not available(firewall rules/blocked ports etc.) In simple terms TURN will act as a middle man in between the peers, Peer A will send their media to the TURN server and the TURN server will relay it to Peer B. Be warned if you do plan on using a TURN server this will use bandwidth.
If you are planning to host an app in production I recommend you host your own STUN/TURN server, a good open source solution is “coturn”. 

Finally ICE. ICE stands for “Interactive Connectivity Establishment”. In basic terms ICE collects all available candidates such as IP addresses, relayed addresses etc. Which is then sent to the remote peer via SDP.

If your still awake by this part let’s finally get coding!

First open up public_index.html and paste_type the following contents:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>Simple P2P example</title>
  </head>

  <body>
    <h1>Simple P2P Example</h1>
    <hr />
    <button onclick="start();">Start</button><br/>
    <b>Local Id: <span id="localId"/></b><br/>
    <input type="text" id="callId" placeholder="Enter remote peer id"/>
    <button id="callButton" onclick="call();" disabled>Call</button>
    <button id="hangupButton" onclick="hangup();" disabled>Hang Up</button>
    <hr />

    <h3>Local Video</h3>
    <video id="localVideo" width="640" height="480" autoplay muted></video>

    <h3>Remote Video</h3>
    <video id="remoteVideo" width="640" height="480" autoplay></video>

    <script src="./main.js"></script>
  </body>
</html>
```

This is a very simple page that shows both the local and the remote video of the peer, once the start button is clicked a random ID is generated and show to the local peer, this id is needs to be passed to the remote peer so that they can call them.

Now that the HTML file is done next we create the JavaScript file. Open up public/main.js and let’s get coding.

First we need to initiate/declare a few variables:

```javascript
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const socket = new WebSocket('wss://localhost:8888');

let peerConnection;
let localMediaStream;
let remoteId;
const remoteMediaStream = new MediaStream();
```

Next we listen for the WebSocket’s onopen event:

```javascript
socket.onopen = () => {
  console.log('socket::open');
};
```

This fires when the connection to the WebSocket server is established, right now we’re just printing to the console.

Next we need to listen for remote messages from the WebSocket server, we do this with “onmessage”, this is a pretty large block but I’ll go over it soon.

```javascript
socket.onmessage = async ({ data }) => {
  try {
    const jsonMessage = JSON.parse(data);

    console.log('action', jsonMessage.action);
    switch (jsonMessage.action) {
      case 'start':
        console.log('start', jsonMessage.id);
        callButton.disabled = false;

       document.getElementById('localId').innerHTML = jsonMessage.id;
        break;
      case 'offer':
        remoteId = jsonMessage.data.remoteId;
        delete jsonMessage.data.remoteId;

        await initializePeerConnection(localMediaStream.getTracks());
        await peerConnection.setRemoteDescription(new RTCSessionDescription(jsonMessage.data.offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendSocketMessage('answer', { remoteId, answer }); 
        break;
      case 'answer':
        await peerConnection.setRemoteDescription(new RTCSessionDescription(jsonMessage.data.answer));
        break;
      case 'iceCandidate':
        await peerConnection.addIceCandidate(jsonMessage.data.candidate);
        break;
      default: console.warn('unknown action', jsonMessage.action);
    }
  } catch (error) {
    console.error('failed to handle socket message', error);
  }
};
```

Here we get a message from the WebSocket server, in order to know what to do with the message we parse it into json and handle it based on what the “action” is.
If the action is “start” all we do is display the peer’s local id, which can be passed to a remote peer in order to initiate a call.
If the action is “offer”, we set the remoteId variable and delete it as it’s no longer necessary(you can skip this part if you want). After that we create the callee’s RTCPeerConnection and set the remote description to the caller’s offer, we then create an answer based on the offer and set the callee’s local description, finally the answer needs to be sent back to the caller so they can set their RTCPeerConnection’s remote description.
If the action is “answer”, like explained above we just need to set the RTCPeerConnection’s answer.
If the action is “iceCandidate”, we just add the ice candidate to the RTCPeerConnection.
Any other action is unexpected, so if it occurs we just log to the console.

Next we will add the last two socket listeners:

```javascript
socket.onerror = (error) => {
  console.error('socket::error', error);
};

socket.onclose = () => {
  console.log('socket::close');
  stop();
};
```

“onerror” event occurs when the WebSocket has been closed due to an error, and “onclose” fires when the WebSocket connection has been closed with no error. Here we stop the P2P session.

Next we write the helper function to send message’s to the WebSocket server.

```javascript
const sendSocketMessage = (action, data) => {
  const message = { action, data };
  socket.send(JSON.stringify(message));
};
```

This function basically takes an action string and a data object, it then sends the object to the server as a string.

Next we need to write the “start” function:

```javascript
const start = async () => {
  try {
    localMediaStream = await getLocalMediaStream(); 

    sendSocketMessage('start');
  } catch (error) {
    console.error('failed to start stream', error);
  }
};
```   

This function basically just initializes the local media stream and sends a message to the server to initiate the session.

Next we create the “call” function:

```javascript
const call = async () => {
  try {
    remoteId = document.getElementById('callId').value;

    if (!remoteId) {
      alert('Please enter a remote id');

      return;
    }

    console.log('call: ', remoteId);
    await initializePeerConnection(localMediaStream.getTracks());
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSocketMessage('offer', { offer, remoteId });
  } catch (error) {
    console.error('failed to initialize call', error);
  }
};
```

Here we get the id of the remote peer based on the input, if no input was entered we just display a warning to the user. 
Once we have an id we can start the offer/answer process. First we create and initialize the RTCPeerConnection, next we create an offer and set it to the RTCPeerConnection’s local description. Finally we need to send it to the remote peer so that we can get an answer.

Next, we create the function to handle hangup and close.

```javascript
const hangup = () => socket.close();

const stop = () => {
  if (!localVideo.srcObject) return;

  for (const track of localVideo.srcObject.getTracks()) {
    track.stop();
  }

  peerConnection.close();
  callButton.disabled = true;
  hangupButton.disabled = true;
  localVideo.srcObject = undefined;
  remoteVideo.srcObject = undefined;
};
```

Hangup basically just closes the socket so that the socket onclose event fires. 

Stop like the previous part releases the users media, it also closes the RTCPeerConnection and releases the video objects src object.

Next we need to create the function to initialize the local media.

```javascript
const getLocalMediaStream = async () => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    console.log('got local media stream');

    localVideo.srcObject = mediaStream;

    return mediaStream;
  } catch (error) {
    console.error('failed to get local media stream', error);
  }
};
```

Here we get the user’s camera/microphone device and display the user’s local media.

Finally we need a function is initialize the RTCPeerConnection.

```javascript
const initializePeerConnection = async (mediaTracks) => {
  const config = { iceServers: [{ urls: [ 'stun:stun1.l.google.com:19302' ] } ] };
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = ({ candidate }) => {
    if (!candidate) return;

    console.log('peerConnection::icecandidate', candidate);
    console.log('remote', remoteId);
    sendSocketMessage('iceCandidate', { remoteId, candidate });
  };

  peerConnection.oniceconnectionstatechange = () => {
console.log('peerConnection::iceconnectionstatechange newState=', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'disconnected') {
      alert('Connection has been closed stopping...');
      socket.close();
    }
  };

  peerConnection.ontrack = ({ track }) => {
    console.log('peerConnection::track', track);
    remoteMediaStream.addTrack(track);
    remoteVideo.srcObject = remoteMediaStream;
  };

  for (const track of mediaTracks) {
    peerConnection.addTrack(track);
  }
};

hangupButton.disabled = false;
```

Here we create the configuration that is to be used by the RTCPeerConnection, this requires an array of iceServers which are either STUN_TURN. Note that if you plan to take an app into production you may want to host your own STUN_TURN servers. Especially TURN! Using a “free” TURN server is risky and I wouldn’t recommend it.

Next we create the RTCPeerConnection and set up it’s event listeners:
“onicecandidate” occurs when the local peer connection creates an IceCandidate object, here we check if there is an actual candidate and send it to the remote peer.
“oniceconnectionstatechange” occurs when the connection state changes during the negotiation process. If the status is disconnected it means that the connection between the peers is closed, so here we also close the socket.
“ontrack” occurs when an incoming track has been received, here we add the track to the remote media stream and display it.

Finally we add the local tracks to the RTCPeerConnection, and enable the hang up button.

**phew** Now that the code is complete we can finally run the example, so let’s start up the server!

```bash
npm start
```

Navigate your browser to https://localhost:3000 and you should see the below page:

![Sample Page](https://i.ibb.co/8mjv1Ly/2022-01-24-15-24-47.png)

If you click on Start you should be able to see your local camera. Please note I am using a fake media device.

![Sample Page Start](https://i.ibb.co/WcZxmFc/2022-01-24-15-25-51.png)

Copy the ID created and displayed and open another browser tab/window. Go to the same URL, click start and paste the remote peer’s ID into the textbox, then once you hit call you should be able to see the remote user’s media. Like below.

![Sample Page P2P Call](https://i.ibb.co/ncgSTjS/2022-01-24-15-49-31.png)

And there we have it, a simple P2P example. :) 
If you have any issues please let me know. Well done on getting this far. Hopefully this will allow you to get started on creating your own apps.
If you still want more follow me into Part 4, were we get the user’s screen and share it with the remote peer.

Github Repo:
https://github.com/ethand91/webrtc-tutorial

- - - -
Bonus - Things to consider:
* Since we looked at media constraints in the last part why not try changing the constraints?
* What would happen if you tried to call a peer that closed their page after running start?
* Is it possible to handle a change of Network? (Example Wifi -> 4G)


[RTCPeerConnection - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)

Coturn: 
https://github.com/coturn/coturn

---

Like me work? Any support is appreciated. :)
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
