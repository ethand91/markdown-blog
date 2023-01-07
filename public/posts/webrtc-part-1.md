---
title: "WebRTC For Beginners - Part 1"
metaTitle: "WebRTC For Beginners"
metaDesc: "WebRTC For Beginners"
socialImage: assets/images/webrtc.jpg
date: "2022-01-12"
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
### Part 1: Introduction to WebRTC and creating the signaling server

Hello, due to finding not too much information regarding WebRTC I have decided to create a tutorial. Hopefully it is helpful to anyone looking into trying out WebRTC. 

While WebRTC is not a new technology it is constantly evolving. I will try to update this as new changes occur. 

WebRTC is short for (Web Real-Time Communication), and allows Peers to send/receive media/data via P2P.

Before we dive into the fun parts, we need to set up a Signaling server so that the peers can initially communicate, the protocol for this can be anything but it usually ends up being WebSockets. It’s also possible after the initial signaling is complete to use Data Channels, which we will leave until later. 

With that being said, let’s start on creating the signaling server.
The signaling server can be any language, but for simplicity’s sake I will be using JavaScript and Nodejs.
Since WebRTC does not work on insecure addresses we will also need to provide a self signed certificate. (Don’t used self signed if you’re planning to take it to production.)

Requirements:
* A Computer (obviously)
* Nodejs

IDE can be anything of your choice. I generally prefer Vim, since I’m always using the terminal.
Well then let’s get started!

First create a directory for the server and initialize the application.

```bash
mkdir signal-server && cd signal-server
# Also make a directory for the src files
mkdir src
npm init -y
```

This will create the package.json file, next we need to install the modules needed.

```bash
npm i ws #WebSocket server
npm i nanoid #Used to create a unique id
npm i express #Used to serve static pages
```

The WebSocket module can be anything but for simplicity’s sake I decided to use the ws module.

Next we need to create a self signed certificate in order to handle https connections. 

```bash
mkdir ssl && cd ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout cert.key -out cert.pem
```

Next we will create the code for the server, create a new file called “server.js” in the src folder.
Now open it up in your preferred IDE, let’s get started!
First we import the modules that we will use.

```javascript
const express = require('express');
const { createServer } = require('https');
const { readFileSync } = require('fs');
const { nanoid } = require('nanoid');
const { resolve } = require('path');
const { WebSocketServer, OPEN } = require('ws');
```

We will be creating two https servers, one for the web socket and the other to serve static pages. 

Next we create the web socket server and the server to serve our static files.

```javascript
const appServer = createServer({
  cert: readFileSync(resolve(__dirname, './../ssl/cert.pem')),
  key: readFileSync(resolve(__dirname, './../ssl/cert.key'))
}, app).listen(3000);

app.use(express.static(resolve(__dirname, './../public')));

const wsServer = createServer({
  cert: readFileSync(resolve(__dirname, './../ssl/cert.pem')),
  key: readFileSync(resolve(__dirname, './../ssl/cert.key'))
});
const wss = new WebSocketServer({ server: wsServer });
```

Next we listen for any web socket connections and handle them. Don’t worry about the functions we haven’t defined yet, they we will be defined later.

```javascript
wss.on('connection', (socket) => {
  console.log('new connection');

  socket.on('message', (data) => {
    console.log('socket::message data=%s', data);

    try {
      const jsonMessage = JSON.parse(data);
      handleJsonMessage(socket, jsonMessage);
    } catch (error) {
      console.error('failed to handle onmessage', error);
    }
  });


  socket.once('close', () => {
    console.log('socket::close');
  });
}); 
```

Above we listen for any connections, once a connection is established we listen for any messages that come through and parse them into JSON.

Now we can define the function to handle parsed JSON messages.

```javascript
const handleJsonMessage = (socket, jsonMessage) => {
  switch (jsonMessage.action) {
    case 'start':
      socket.id = nanoid();
      emitMessage(socket, { action: 'start', id: socket.id }); 
      break;
    default: 
      // Default we will just relay the message to the peer
      if (!jsonMessage.data.remoteId) return;

      const remotePeerSocket = getSocketById(jsonMessage.data.remoteId);

      if (!remotePeerSocket) {
        return console.log('failed to find remote socket with id', jsonMessage.data.remoteId);
      }

      // delete/edit the remoteId depending if the action is offer or not
      if (jsonMessage.action !== 'offer') {
        delete jsonMessage.data.remoteId;
      } else {
        jsonMessage.data.remoteId = socket.id;
      }

      emitMessage(remotePeerSocket, jsonMessage);
  }
};
```

Here we get the action from the parsed JSON, if the action is “start” we give the socket a unique ID and send it back to the client. 
Anything else we get the socket of the other peer and just relay the message to them.
If the action is not “offer” we delete the remote id as it is not needed anymore. If the action is “offer” we “switch” the remote id to the other party in order to receive an answer.

Next we will create the two helper functions that are missing.

```javascript
const emitMessage = (socket, jsonMessage) => {
  if (socket.readyState === OPEN) {
    socket.send(JSON.stringify(jsonMessage));
  }
};

// Helper to get socket via id
const getSocketById = (socketId) =>
  Array.from(wss.clients).find((client => client.id === socketId));
```

emitMessage simply sends a message to a socket if it is in open state. 
getSocketById simply returns a socket based on the socket id. (Unique id we defined with nanoid)

Finally let’s start up the web socket server and start listening.

```javascript
wsServer.listen(8888);
console.log('app server listening on port 3000');
console.log('wss server listening on port 8888');
```

That’s the signaling server sorted.
Now let’s see if it starts!

```bash
node src/server.js

# This should print the following output
app server listening on port 3000
wss server listening on port 8888
```

If you get the above output that means the signaling server is ready to go!

In the next part we will go into getting the user’s media devices (Camera and Mic) and the constraints we can use to do so. 
Hope to see you in the next part!
https://dev.to/ethand91/webrtc-for-beginners-part-2-mediadevices-142d

Source Code: https://github.com/ethand91/webrtc-tutorial

- - - -

Bonus: Things to consider:
* The current signaling server only handles 1 to 1, how could you make it so it support up to 4 clients?
* It also only supports 1 call, how could you make it support multiple?

---

Like me work? Any support is appreciated. :)
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
