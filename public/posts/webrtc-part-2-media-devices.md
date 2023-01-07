---
title: "WebRTC For Beginners - Part 2: MediaDevices"
metaTitle: "WebRTC For Beginners Media Devices"
metaDesc: "WebRTC For Beginners MediaDevices"
socialImage: assets/images/webrtc.jpg
date: "2022-01-18"
tags:
	- webrtc
---

## Part 2 - Media Devices

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

Hello, welcome to part 2 of my beginner WebRTC series :) 

In this part I will introduce the MediaDevices API, how to get the user’s media devices (camera and microphone) and how to get a certain video resolution etc.

This part carries on from the previous part, so if you have not seen that please take the time to do so. (Or you could just clone the repo ;))

Part 1: [WebRTC For Beginners - DEV Community](https://dev.to/ethand91/webrtc-for-beginners-1l14)

In order to use the Media Devices API, you must host your page on a secure domain. Also the user must allow the page to get access to their camera and microphone, this changes depending what browser is used. (Chrome asks once whilst Safari asks every session). If the page is not secure you may get an undefined returned when trying to use the MediaDevices API.

Well then let’s get started.
First we will prepare the static HTML file, so open public_index.html in your preferred IDE and type_copy the following:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Part 2 - Media Devices</title>
    <meta charset="utf-8"/>
  </head>

  <body>
    <h2>Media Devices example</h2>

    <button onclick="startDefault()">Default</button>
    <button onclick="startVGA()">VGA</button>
    <button onclick="startHD()">HD</button>
    <button onclick="startFullHD()">Full HD</button>
    <button onclick="stop()">Stop</button>
    <hr/>

    <video id="localVideo" autoplay muted></video>

    <script src="./main.js"></script>
  </body>
</html>
```

Next we will need to prepare the main.js file, open public_main.js and type_copy the following: (Don’t worry I will explain what is going on after)

```javascript
const localVideo = document.getElementById('localVideo');

const startDefault = () => getMedia({ video: true, audio: true });

const startVGA = () => getMedia({ video: { width: 640, height: 480 }, audio: true });

const startHD = () => getMedia({ video: { width: 1280, height: 720 }, audio: true });

const startFullHD = () => getMedia({ video: { width: 1920, height: 1080 }, audio: true });

const stop = () => {
  if (!localVideo.srcObject) return;

  for (const track of localVideo.srcObject.getTracks()) {
    track.stop();
  }
};

const getMedia = async (constraints) => {
  try {
    console.log('getMedia constraints: ', constraints);
    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = mediaStream;
  } catch (error) {
    alert('failed to get media devices, see console for error');
    console.error(error);
  }
};
```

Each function basically calls “navigator.mediaDevices.getUserMedia” with different media constraints. I will explain what the constraints mean, but first let’s run the examples.

```bash
npm i # If needed
npm run start
```

Now open your browser and go to:
https://localhost:3000

You should get an SSL error, but hopefully you trust your own host ;) If you are using chrome you may not be able to excess the page, if so please enter “thisisunsafe”. 

There you should see the following page:
[example — ImgBB](https://ibb.co/7Qv35qQ)

Feel free to experiment with the various buttons, you can tell if you have the resolution just from the size of the video :) 

You may notice for example if you pick “Full HD” the resolution returned may be just “HD”. This is because if the resolution is not supported the API will automatically choose the resolution closest to the resolution wanted.

What if you absolutely wanted to make sure you get a certain resolution? You would need to use “exact” as shown below:

```javascript
const constraints = { video: { width: { exact: 1920 }, height: { exact: 1080 } } };
```

This would make absolutely sure the resolution was full HD, however if the device does not support full HD it will throw an error. 

What if you wanted a range? You would define the constraints like so:
```javascript
const constraints = { video: { width: { min: 600, max: 1300 }, height: { min: 300, max: 800 } } };
```

One thing you will need to be careful of is that when you are sending the media to another peer, WebRTC may alter the resolution/frame rate according to the available bitrate, network condition, packet loss etc. Because of this I generally don’t recommend using the “exact” parameter, only use it if you plan to use the video locally.

Well that wraps up this part, hope to see you in part 3 where we finally get to send and receive media between peers!

Source Code: https://github.com/ethand91/webrtc-tutorial

- - - -
Bonus: Things to consider:
* Is it possible to get just the camera/microphone without the other?
* See if you can adjust the video frame rate via the constraints.
* How would you handle the user not having a camera/mic? What if they just blocked access altogether? 
* If using a smartphone, can you get the back camera?

MediaDevices.getUserMedia API:
[MediaDevices.getUserMedia() - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

---

Like me work? Any support is appreciated. :)
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
