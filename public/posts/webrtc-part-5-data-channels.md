---
title: "WebRTC For Beginners - Part 5: Data Channels"
metaTitle: "WebRTC For Beginners Data Channels"
metaDesc: "WebRTC For Beginners Data Channels"
socialImage: assets/images/webrtc.jpg
date: "2022-02-01"
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

Hello again! Welcome to Part 5!

In this part I will be going over the basics of Data Channels.

What is a Data Channel?
A data channel represents a network channel which can be used for bi-directional peer-to-peer transfers of data. 
The API is similar to WebSocket, although like the description says you send messages to each other without the need for the message to go through a server. The DataChannel is useful for things such as File Sharing.
Also WebSocket is limited too TCP whereas the Data Channel can use TCP and UDP.

Which brings up the next point, should you use TCP or UDP? 
With TCP the transfer of data is reliable and ordered, however if something like packet loss were to occur this would cause a “blockage”.
With UDP the transfer of data is not reliable or ordered, however if packet loss were to occur the packets proceeding will be sent. 
Which is best to use if mostly down to what type of application you want to create, if it’s a chat app you would most likely go with TCP, if it’s a gaming app you would probably want more “real time” data transfer so for that I would recommend UDP.

Also the limit of the amount of Data Channels you can create varies on the browser, the limit is around 65,534 although I don’t think you would need that many. (If you do use that many Data Channels please tell me)

To create a Data Channel we need to pass some options. The most common options used are:

ordered: If true the packets will be received in the same oder that they were sent.

maxPacketLifetime: The maximum number of milliseconds that attempts to transfer a message may take in unreliable mode.

maxRetransmits: The maximum number of times the user agent should attempt to retransmit a message which fails the first time in unreliable mode.

A Data Channel is created via the RTCPeerConnection’s “createDataChannel” method, this adds the Data Channel to the RTCPeerConnection and triggers the “ondatachannel” event on the remote peer’s RTCPeerConnection.

Well then, now that the boring stuff is out the way let’s implement it!

We will add the ability to send_receive chat messages to the previous example, so first we need to edit the public_index.html. Open it up and add the following below the screen share button:

```html
<br />
<input type="text" id="chatMessage" placeholder="Enter message"/>
<button id="sendMessageButton" onclick="sendMessage();">Send</button>
```

That’s the HTML out of the way now for the fun part, open up public/main.js.

First we create the variable for the Data Channel.

```javascript
let dataChannel;
```

Next in the “call” method add the following after “initializePeerConnection”:

```javascript
initializeDataChannel();
```

Next we will create that method, add the following after “initializePeerConnection” method:

```javascript
const initializeDataChannel = () => {
  const config = { ordered: true };

  dataChannel = peerConnection.createDataChannel('dataChannel', config);
  initializeDataChannelListeners();
};
```

Here we initialize the options for the Data Channel. We are creating a simple message transfer so I would like the packets to be ordered, else the conversation may turn weird otherwise. 
Next we initialize the Data Channel, “dataChannel” is the label of the channel and here we pass the configuration options.

Once this is done the “ondatachannel” event should fire on the remote peers side, so let’s implement that. In the “initializePeerConnection” method add the following listener after the “ontrack” event.

```javascript
peerConnection.ondatachannel = ({ channel }) => {
  console.log('peerConnection::ondatachannel');
  dataChannel = channel;

  initializeDataChannelListeners();
};
```

Here we set the global Data Channel to the received channel and then initialize the Data Channel listeners. Let’s create this method now after “initializeDataChannel”:

```javascript
const initializeDataChannelListeners = () => {
  dataChannel.onopen = () => console.log('dataChannel opened');
  dataChannel.onclose = () => console.log('dataChannel closed');
  dataChannel.onerror = (error) => console.error('dataChannel error:', error);

  dataChannel.onmessage = ({ data }) => {
    console.log('dataChannel data', data);
  };
};
```

Here we listen to the Data Channel events, as you can see it’s very similar to the WebSocket API.
When we get a message we just log it to the console. 

Next we need a way to send the message that the user has gone out of their way to write for us. At the end of the file add the following:

```javascript
const sendMessage = () => {
  const message = document.getElementById('chatMessage').value;

  if (!message) {
    alert('no message entered');

    return;
  }

  if (!dataChannel || dataChannel.readyState !== 'open') {
    alert('data channel is undefined or is not connected');

    return;
  }

  console.log('sending message', message);
  const data = {
    message,
    time: new Date()
  };

  dataChannel.send(JSON.stringify(data));
  document.getElementById('chatMessage').value = '';
};
```

Here we get the value of the text input and check if it is empty or not, if it’s empty we alert the user. After that we check if the dataChannel has been set and if the state is “open”, like a WebSocket you can’t send anything if it’s not open/connected.
Finally we append a TimeStamp and send it to the remote peer which should trigger their Data Channel’s “onmessage” event.

Finally we need to close the Data Channel at the end of the session, in the “stop” method add the following above peerConnection.close():

```javascript
dataChannel.close();
```

Phew, all done now let’s try it out! First we start the server.

```bash
npm start
```

Like the previous examples open up two windows/tabs at “https://localhost:3000” and start a call. 
Once the call has started try typing a message and click send, the message should appear in the remote peer’s console like so:

![Data Channel message](https://i.ibb.co/6XL7d4X/2022-02-01-14-50-48.png)

Well that cover’s the basics of Data Channels, I hope this was useful to you.
Next in Part 6 we will start going over the native side of things starting with Android.

Hope to see you there!

Github Repo:
https://github.com/ethand91/webrtc-tutorial

- - - -
Bonus - Things to consider:
* Printing to the console is good and all but try implementing a chat log
* Once the Data Channel connection is established do you still need the WebSocket?
* Try implementing file share

Bonus Materials:
[RTCDataChannel - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)

- - - -

Like me work? Any support is appreciated. :)
[![“Buy Me A Coffee”](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)

