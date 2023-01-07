---
title: "WebRTC For Beginners - Part 5.5: Building the WebRTC Android Library"
metaTitle: "WebRTC For Beginners - Part 5.5: Building the WebRTC Android Library"
metaDesc: "WebRTC For Beginners - Part 5.5: Building the WebRTC Android Library"
socialImage: assets/images/webrtc.jpg
date: "2022-12-26"
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
7. Part 6: Android native peer
8. Part 7: iOS native peer
9. Part 8: Where to go from here

- - - -

Hello Again, sorry for the wait! Just thought I'd seperate the Android tutorial and the WebRTC Android build tutorial. 

I tried using the prebuilt libraries from:
https://webrtc.github.io/webrtc-org/native-code/android/

But that didn't work so I decided to build it from scratch.
After trying for hours to build it on Arch Linux and failing I then found out you can only build Android on the following OS's: 

```
ERROR: The only supported distros are
 	Ubuntu 14.04 LTS (trusty with EoL April 2022)
 	Ubuntu 16.04 LTS (xenial with EoL April 2024)
 	Ubuntu 18.04 LTS (bionic with EoL April 2028)
 	Ubuntu 20.04 LTS (focal with Eol April 2030)
 	Ubuntu 20.10 (groovy)
 	Debian 10 (buster) or later
```

Hopefully you don't make the same mistake I did. Hopefully the future me won't make the same mistake either! 😅

Here I will show you how to build the Android library from scratch, I will show how to implement it into your own project next part. 

Well then let's build the native Android WebRTC Library! Don't forget to check the OS your building on! 🤧

---

## Setting up depot_tools

First we need to get the tools needed to build the library, this can be done via the following:

```bash
mkdir webrtc && cd webrtc

git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH=/path/to/depot_tools:$PATH
```

Here we get the tools required to build the android library(and ios) and set the path.

---

## Obtaining the WebRTC Android source

Next we need to get the WebRTC Android source and sync.

```bash
fetch --nohooks webrtc_android
gclient sync
```

Once we have the source we can update to the latest source via the following:

```bash
cd src
git checkout main
git pull origin main
gclient sync
```

As far as I'm aware sync must be done after and source updates.

Next we need to install the dependencies needed to build the libarary.

```bash
./build/install-build-deps.sh
```

Finally build the WebRTC Android library.
This part may take some time to complete so grab your favorite beverage and relax. 🍸

```bash
./tools_webrtc/android/build_aar.py 
```

Once done you should see the "libwebrtc.aar" file in the src directory.

---

TLDR

You can get the WebRTC Android library here:
https://github.com/ethand91/android_libwebrtc

Feel free to use it. 😎

That concludes this small part, hopefully this is helpful to you.

- - - -

Like me work? I post about a variety of topics, if you would like to see more please like and follow me.
Also I love coffee. 😊

[![“Buy Me A Coffee”](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
