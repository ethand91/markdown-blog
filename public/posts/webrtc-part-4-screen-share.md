---
title: "WebRTC For Beginners - Part 4: Screen Share"
metaTitle: "WebRTC For Beginners Screen Share"
metaDesc: "WebRTC For Beginners Screen Share"
socialImage: assets/images/webrtc.jpg
date: "2022-01-27"
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

Welcome back! Here in part 4 we will be learning how to get the user’s screen and how to switch media tracks so that instead of the camera the screen will be sent instead.

This part technically doesn’t need the previous parts, if you already have a signaling server feel free to use that instead.

Keep in mind that the variety of screens/tabs/windows that can be shared depends on the browser being used.

First we will need to edit the public/index.html file, open it and add the following one line:

```html
<button id="screenShareButton" onclick="shareScreen();" disabled>Share Screen</button>
```

Screen sharing will be started when the user clicks this button.

Next we need to modify public/main.js, open it up and add the following:

First we need to get a reference to the screen share button.

```javascript
const screenShareButton = document.getElementById('screenShareButton');
``` 

We will enable the button once the RTCPeerConnection is initialized (same as the call button), at the end of the “initializePeerConnection” function add the following:

```javascript
screenShareButton.disabled = false;
```

Next we need to disable the button again when the session has finished so in the “stop” function add the following:

```javascript
screenShareButton.disabled = true;
```

Now we can create the new functions that will allow the user to share their screen.

```javascript
const shareScreen = async () => {
  const mediaStream = await getLocalScreenCaptureStream();

  const screenTrack = mediaStream.getVideoTracks()[0];

  if (screenTrack) {
    console.log('replace camera track with screen track');
    replaceTrack(screenTrack);
  }
};
```

This function calls a helper function which will be implemented shortly, but basically what it does is get the screen track and replaces the track being sent to the remote peer.

Next we will define the two helper functions, the first being “getLocalScreenCaptureStream”

```javascript
const getLocalScreenCaptureStream = async () => {
  try {
    const constraints = { video: { cursor: 'always' }, audio: false };
    const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(constraints);

    return screenCaptureStream;
  } catch (error) {
    console.error('failed to get local screen', error);
  }
};
```

Here we get the user’s screen by calling “getDisplayMedia”, this API uses slightly different constraints than the “getUserMedia” API. Here I’ve told it to also show the cursor when screen sharing. Also we already have the user’s microphone so we don’t need any audio.

Next we define the function that replaces the camera track with the screen track.

```javascript
const replaceTrack = (newTrack) => {
  const sender = peerConnection.getSenders().find(sender =>
    sender.track.kind === newTrack.kind 
  );

  if (!sender) {
    console.warn('failed to find sender');

    return;
  }

  sender.replaceTrack(newTrack);
}
```

This function takes a newTrack parameter, this is the track that is to replace the old track.
First we need to get the relevant RTCRtpSender so we call RTCPeerConnection.getSenders, this returns an array of RTCRtpSender objects, next we filter the senders based on the kind of the newTrack(which is audio or video). 
Since we are replacing the camera track with the screen track we should get the video RTCRtpSender object.
Finally we replace the sender’s track with the screen track. 

Next we need to stop the track when the session ends, so add the following to the “stop” function:

```javascript
for (const sender of peerConnection.getSenders()) {
  sender.track.stop();
}
```

This loops through all the RtcRtpSender’s of the RTCPeerConnection and stops their track. 

Done :) if done correctly the remote peer should now be getting the shared screen.

Now let’s see it in action. First start the server:

```bash
npm start
```

Next open 2 tabs/browsers to “https://localhost:3000”

Follow the steps from the previous part to initialize the call and click on the “Share Screen” button. You should see the following prompt: (I’m using Chrome but if you are using a different browser the prompt will be different). Also the language may vary.

![Share Screen Prompt](https://i.ibb.co/njL8HKz/2022-01-27-11-01-33.png)

Feel free to pick whatever you wanna share and click OK. 

Once done look at the remote peer and you should see the shared screen in the remote video like so:

![Remote Screen](https://i.ibb.co/6HJMzpG/2022-01-27-11-02-04.png)

The track should also be released when the session ends.

Phew. That’s this part done next we will be looking into Data Channels. Hope to see you there!

Github Repo:
https://github.com/ethand91/webrtc-tutorial

- - - -

Bonus - Things to consider:
* What are the other constraints that could be passed to the getDisplay API.
* Mobile devices cannot share the screen, can you detect if the user is using a mobile device?
* In newer MacOS’s the user needs to enable the browser to use the screen via the privacy settings, can that be handled?

Bonus Materials:
[RTCRtpSender - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender)
[MediaDevices.getDisplayMedia() - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)

- - - -

Like me work? Any support is appreciated. :)
[![“Buy Me A Coffee”](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
