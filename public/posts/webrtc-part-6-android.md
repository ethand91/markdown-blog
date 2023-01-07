---
title: "WebRTC For Beginners - Part 6 Android"
metaTitle: "WebRTC For Beginners - Part 6 Android"
metaDesc: "WebRTC For Beginners - Part 6 Android"
socialImage: assets/images/webrtc.jpg
date: "2022-12-20"
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

---

## Introduction

Hello, sorry for the wait! I finally bring the android native peer tutorial. 🥳
The API has changed a bit since I last touched native android webRTC (4 years ago) so it did take some time trying out the new API.

You will need to build the WebRTC Android library, this can be done via following the below instructions:
https://dev.to/ethand91/webrtc-for-beginners-part-55-building-the-webrtc-android-library-e8l

You will also need to server side code for signalling which can be found via:
https://dev.to/ethand91/webrtc-for-beginners-part-5-data-channels-l3m

Once you've got everything set up let's start creating the project. 😀

---

## Creating and Setting Up the Project

Fire up Android Studio and create a new "Empty Project", give it any name you like and click on Finish.

Once the project is has loaded, add a new package called webrtc. This is the only package we will need for this tutorial. Next we need to add the permissions to allow us access to the camera and microphone of the device. Add the following to "AndroidManifest.xml".

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

Next we will need to import the WebRTC Android library we previously built. Change the project window from "Android" to "Project" and add the library to the "app/libs" directory.

Finally we need to add the dependencies to the gradle file, open up the module's "build.gradle" and add the following to the dependencies section:

```gradle
// WebRTC
implementation(name: 'libwebrtc', ext: 'aar')

// WebSocket
implementation 'org.java-websocket:Java-WebSocket:1.5.2'

// Easy Permissions
implementation 'pub.devrel:easypermissions:3.0.0'
```

Done, next we need to supply the resources and view. 😎

---

## Setting up the resources/view

First we will handle the "strings.xml" file, open it up and add the following:

```xml
<resources>
    <string name="app_name">Android WebRTC</string>

    <string name="peer_id_placeholder">Enter remote peer id</string>
    <string name="call_button_text">Call</string>
    <string name="request_camera_mic_permissions_text">Please allow access to your camera and mic.</string>
    <string name="logout_button">Logout</string>
</resources>
```

Here we basically setting up the strings needed by the sample app. 

Next we will create a simple view, open up "activity_main.xml" and add the following:

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:paddingTop="20dp"
        android:layout_marginStart="5dp"
        android:layout_marginEnd="5dp"
        android:orientation="vertical">

        <EditText
            android:id="@+id/peerIdEditText"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="@string/peer_id_placeholder"
            android:autofillHints="test"
            android:inputType="text" />

        <Button
            android:id="@+id/callButton"
            android:text="@string/call_button_text"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="10dp"
            android:enabled="false"/>

    </LinearLayout>

    <org.webrtc.SurfaceViewRenderer
        android:layout_width="100dp"
        android:layout_height="100dp"
        android:id="@+id/localRenderer"
        android:visibility="invisible"
        />

    <org.webrtc.SurfaceViewRenderer
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:id="@+id/remoteRenderer"
        android:visibility="invisible"
        />

    <Button
        android:id="@+id/logoutButton"
        android:layout_width="200dp"
        android:layout_height="100dp"
        android:text="@string/logout_button"
        android:visibility="invisible"
        android:gravity="bottom"
        android:layout_alignParentEnd="true"
        />
</RelativeLayout>
```

Here we are creating a simple form to call a remote user, at the bottom we have 2 SurfaceRenderers one for the local view and one for the remote view. Finally a simple logout button.

Next we can finally start writing the code! 😸

---

## Creating the webrtc package

First we will create the files needed under the webrtc package, I'll start with the easier one as it's just a simple interface.

Create a interface file called "ConnectionListener" and add the following code:

```java
import org.webrtc.IceCandidate;
import org.webrtc.MediaStreamTrack;
import org.webrtc.SessionDescription;

public interface ConnectionListener {
    void onIceCandidateReceived(IceCandidate iceCandidate);
    void onAddStream(MediaStreamTrack mediaStreamTrack);
    void onLocalOffer(SessionDescription offer);
    void onLocalAnswer(SessionDescription answer);
}
```

This listener basically listens for ICE candidate events, stream events and local offer/answer.

The next file is more complicated but I will try to explain it as best as I can, create a new file called "Connection", first we add the needed imports

```java
import android.content.Context;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;
import org.webrtc.AudioSource;
import org.webrtc.AudioTrack;
import org.webrtc.Camera1Enumerator;
import org.webrtc.Camera2Enumerator;
import org.webrtc.CameraEnumerator;
import org.webrtc.DataChannel;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.MediaStreamTrack;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RendererCommon;
import org.webrtc.RtpReceiver;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;
import org.webrtc.SoftwareVideoDecoderFactory;
import org.webrtc.SoftwareVideoEncoderFactory;
import org.webrtc.SurfaceTextureHelper;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoCapturer;
import org.webrtc.VideoDecoderFactory;
import org.webrtc.VideoEncoderFactory;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;

import java.util.ArrayList;
```

We use a lot of imports from the WebRTC library, next we need to make Connection class implement PeerConnection.Observer so change it to the following:

```java
public class Connection implements PeerConnection.Observer {
```

The first thing we will do is initialize some member variable so add the following:

```java
private static final String TAG = "Connection";

private static final String MEDIA_STREAM_ID = "ARDAMS";
private static final String VIDEO_TRACK_ID = "ARDAMSv0";
private static final String AUDIO_TRACK_ID = "ARDAMSa0";
private static final int VIDEO_HEIGHT = 480;
private static final int VIDEO_WIDTH = 640;
private static final int VIDEO_FPS = 30;

private static final String STUN_SERVER_URL = "stun:stun.l.google.com:19302";

private static Connection INSTANCE = null;
private final PeerConnectionFactory mFactory;

private PeerConnection mPeerConnection;
private MediaStream mMediaStream;
private VideoCapturer mVideoCapturer;
private final ConnectionListener mListener;
```

Here we set some constants for the media stream, video track and audio track. We then set the video resolution and FPS.

We also set the STUN server url. After that we prepare some variables needed for later.

Next we will create the Connection constructor:

```java
private Connection(final Context context, final ConnectionListener listener) {
    final PeerConnectionFactory.InitializationOptions options = PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions();
    final EglBase.Context eglContext = EglBase.create().getEglBaseContext();
    final VideoEncoderFactory encoderFactory = new SoftwareVideoEncoderFactory();
    final VideoDecoderFactory decoderFactory = new SoftwareVideoDecoderFactory();

    PeerConnectionFactory.initialize(options);
    mFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory();
     mListener = listener;
};
```

Here we initialize the PeerConnectionFactory object, we also initialize the video encoder and decoder factory, finally we initialize and create the peer connection factory object. Please note initializing the peer connection factory should only be done once which is why I made this class a Singleton.

Next we need to create the method to create our Connection class:

```java
public static synchronized Connection initialize(final Context context, final ConnectionListener listener) {
    if (INSTANCE != null) {
        return INSTANCE;
    }

    INSTANCE = new Connection(context, listener);
    return INSTANCE;
}
```

Here we are just creating a new Connection if the INSTANCE variable is null, if it's not null we return the Singleton instance.

Next we need a method to initialize the devices camera and mic and start capturing content add the following method:

```java
public void initializeMediaDevices(final Context context, final SurfaceViewRenderer localRenderer) throws Exception {
    mMediaStream = mFactory.createLocalMediaStream(MEDIA_STREAM_ID);

    mVideoCapturer = createVideoCapturer(context);

    final VideoSource videoSource = mFactory.createVideoSource(false);
    final EglBase.Context eglContext = EglBase.create().getEglBaseContext();
    final SurfaceTextureHelper surfaceTextureHelper = SurfaceTextureHelper.create("captureThread", eglContext);

        // Video capturer and localRenderer needs to be initialized
    mVideoCapturer.initialize(surfaceTextureHelper, context, videoSource.getCapturerObserver());
    localRenderer.init(eglContext, new RendererCommon.RendererEvents() {
        @Override
        public void onFirstFrameRendered() {
            Log.d(TAG, "onFirstFrameRendered");
        }

            @Override
        public void onFrameResolutionChanged(int i, int i1, int i2) {
            Log.d(TAG, "Frame resolution changed");
        }
    });

    mVideoCapturer.startCapture(VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS);

    final VideoTrack videoTrack = mFactory.createVideoTrack(VIDEO_TRACK_ID, videoSource);
    videoTrack.setEnabled(true);
    videoTrack.addSink(localRenderer);

    final AudioSource audioSource = mFactory.createAudioSource(new MediaConstraints());
    final AudioTrack audioTrack = mFactory.createAudioTrack(AUDIO_TRACK_ID, audioSource);
    audioTrack.setEnabled(true);

    mMediaStream.addTrack(videoTrack);
    mMediaStream.addTrack(audioTrack);
    Log.d(TAG, "media devices initialized");
}
```

Phew, pretty big method but I'll try to explain everything that is occuring here also don't mind if any methods don't exist yet as we will be writing them later.

First we create a new MediaStream using the id we defined at the top of the file.

Next we create a VideoCapturer object passing the context.
Next we create a SurfaceTextureHelper to create a "capture" thread we also pass in the eglContext. 

Next we initialize the video capturer object and init the surface view, you shouldn't really need "onFirstFrameRendered" but "onFrameResoulutionChanged" is pretty useful when you want to update the UI to the new video resolution. 

Next we actually start capturing the user's camera and pass the video width/height/fps variables.

Next we create a new video track passing in the video track id, set it to enabled and set the sink to the SurfaceView.

Next we start capturing the audio by create an AudioSource and AudioTrack.

Finally we then need to add the tracks to the MediaStream.

Phew! Next we handle create offers etc. Create the following method:

```java
public void createOffer() {
    final MediaConstraints mediaConstraints = new MediaConstraints();

    mediaConstraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"));
    mediaConstraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));


    for (final MediaStreamTrack videoTrack: mMediaStream.videoTracks) {
        mPeerConnection.addTrack(videoTrack);
    }

    for (final MediaStreamTrack audioTrack: mMediaStream.audioTracks) {
        mPeerConnection.addTrack(audioTrack);
    }

    mPeerConnection.createOffer(new SdpObserver() {
        @Override
        public void onCreateSuccess(SessionDescription sessionDescription) {
            Log.d(TAG, "Local offer created:" + sessionDescription.description);
            mPeerConnection.setLocalDescription(this, sessionDescription);
        }

        @Override
        public void onSetSuccess() {
            Log.d(TAG, "Local description set success");

            mListener.onLocalOffer(mPeerConnection.getLocalDescription());
        }

        @Override
        public void onCreateFailure(String s) {
            Log.e(TAG, "Failed to create local offer error:" + s);
        }

        @Override
        public void onSetFailure(String s) {
            Log.e(TAG, "Failed to set local description error:" + s);
        }
    }, mediaConstraints);
}
```

First we create the MediaConstraints, with Android you need to set "OfferToReveiveVideo" and "OfferToReceiveAudio" keys to true in order to receive media from the remote peer.

Next we add the local media tracks to the peer connection, and create a new SDP offer.
When the SDP is created we set the local description of the peer connection, when it is set we pass it back via listener. 

Next we need a method to handle a remote peer's SDP offer add the following method:

```java
public void createAnswerFromRemoteOffer(final String remoteOffer) {
    // Reuse the SdpObserver
    final SdpObserver observer = new SdpObserver() {
        @Override
        public void onCreateSuccess(SessionDescription sessionDescription) {
            Log.d(TAG, "Local answer created");
            mListener.onLocalAnswer(sessionDescription);
            mPeerConnection.setLocalDescription(this);
        }

        @Override
        public void onSetSuccess() {
            Log.d(TAG, "Set description was successful");
        }

        @Override
        public void onCreateFailure(String s) {
            Log.e(TAG, "Failed to create local answer error:" + s);
        }

        @Override
        public void onSetFailure(String s) {
            Log.e(TAG, "Failed to set description error:" + s);
        }
    };

    final SessionDescription sessionDescription = new SessionDescription(SessionDescription.Type.ANSWER, remoteOffer);
    final MediaConstraints mediaConstraints = new MediaConstraints();

    mediaConstraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"));
    mediaConstraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));

    mPeerConnection.setRemoteDescription(observer, sessionDescription);
    mPeerConnection.createAnswer(observer, mediaConstraints);
}
```

What we are doing here is not so different from the createOffer method, we pass the created answer to the listener and set the peer connection's Local Description.

Next we need to create a method to handle remote ICE candidates:

```java
public void addRemoteIceCandidate(final JSONObject iceCandidateData) throws JSONException {
    Log.d(TAG, "Check " + iceCandidateData.toString());
    final String sdpMid = iceCandidateData.getString("sdpMid");
    final int sdpMLineIndex = iceCandidateData.getInt("sdpMLineIndex");
    String sdp = iceCandidateData.getString("candidate");

    final IceCandidate iceCandidate = new IceCandidate(sdpMid, sdpMLineIndex, sdp);
    Log.d(TAG, "add remote candidate " + iceCandidate.toString());
    mPeerConnection.addIceCandidate(iceCandidate);
}
```

Here we transform the ICE candidate JSON to a new IceCandidate object, we then add the ICE candidate to the peer connection.

Next we will create a method to handle closing the peer connection and releasing the media:

```java
public void close() {
    for (AudioTrack audioTrack : mMediaStream.audioTracks) {
        audioTrack.setEnabled(false);
    }

    for (VideoTrack videoTrack : mMediaStream.videoTracks) {
        videoTrack.setEnabled(false);
    }

     try {
        mVideoCapturer.stopCapture();
    } catch (InterruptedException ie) {
        Log.e(TAG, "Failed to stop capture", ie);
    }

    mPeerConnection.close();
    mFactory.dispose();
}
```

Here we change the status of all the local tracks to disabled, stop capturing the camera and finally close the connection and dispose of the factory.

Next we will create a method to to get the user's camera device for capturing:

```java
private VideoCapturer createVideoCapturer(final Context context) throws Exception {
    final boolean isUseCamera2 = Camera2Enumerator.isSupported(context);
    final CameraEnumerator cameraEnumerator = isUseCamera2 ? new Camera2Enumerator(context) : new Camera1Enumerator(true);

    final String[] deviceNames = cameraEnumerator.getDeviceNames();

    for (final String deviceName : deviceNames) {
        Log.d(TAG, "Found device: " + deviceName);
        if (cameraEnumerator.isFrontFacing(deviceName)) {
            Log.d(TAG, "Found front device");
            return cameraEnumerator.createCapturer(deviceName, null);
        }
    }

    throw new Exception("Failed to get camera device");
}
```

Here we simply get the user's first front camera, if no camera is found an exception is found. Most devices these days have multiple devices so feel free to play around trying out different devices.

Next we will create a method to create the peer connection object:

```java
public void createPeerConnection() {
    if (mPeerConnection != null) return;

    final ArrayList<PeerConnection.IceServer> iceServers = new ArrayList<>();
	        iceServers.add(PeerConnection.IceServer.builder(STUN_SERVER_URL).createIceServer());

    mPeerConnection = mFactory.createPeerConnection(iceServers, this);
    Log.d(TAG, "Peer Connection created");
}
```

Here we simply create a list of ICE servers and create the peer connection using the ice servers array.

Finally all we need to do now is override the Observer listeners:

```java
@Override
public void onAddStream(MediaStream mediaStream) {
    Log.d(TAG, "onAddStream");
}

@Override
public void onAddTrack(RtpReceiver receiver, MediaStream[] mediaStreams) {
    Log.d(TAG, "onAddTrack");
    mListener.onAddStream(receiver.track());
}

@Override
public void onIceConnectionReceivingChange(boolean b) {
    Log.d(TAG, "onIceConnectionReceivingChange");
}

@Override
public void onIceGatheringChange(PeerConnection.IceGatheringState iceGatheringState) {
    Log.d(TAG, "onIceGatheringChange state=" + iceGatheringState.toString());
}

@Override
public void onDataChannel(DataChannel dataChannel) {
    Log.d(TAG, "onDataChannel");
}

@Override
public void onRenegotiationNeeded() {
    Log.d(TAG, "onRenegotiationNeeded");
}

@Override
public void onIceCandidate(IceCandidate iceCandidate) {
    Log.d(TAG, "onIceCandidate");

    mListener.onIceCandidateReceived(iceCandidate);
}

@Override
public void onSignalingChange(PeerConnection.SignalingState signalingState) {
    Log.d(TAG, "onSignalingChange state=" + signalingState.toString());
}

@Override
public void onIceCandidatesRemoved(IceCandidate[] iceCandidates) {
    Log.d(TAG, "onIceCandidatesRemoved");
}

@Override
public void onIceConnectionChange(PeerConnection.IceConnectionState iceConnectionState) {
    Log.d(TAG, "onIceConnectionChange state=" + iceConnectionState.toString());
}

@Override
public void onRemoveStream(MediaStream mediaStream) {
    Log.d(TAG, "onRemoveStream");
}
```

The only one we are focusing on are the onTrack and onIceCandidate methods, feel free to edit them as you like.

That's the Connection file done! 😃 Sorry for the randomness of the order.

Next we can flesh out the MainActivity file.

---

## Creating the MainActivity File

Finally we can start using our new Connection class, open up MainActivity and add the following imports:

```java
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.Manifest;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;

import com.example.androidwebrtc.webrtc.Connection;
import com.example.androidwebrtc.webrtc.ConnectionListener;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONException;
import org.json.JSONObject;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaStreamTrack;
import org.webrtc.RendererCommon;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoTrack;

import java.net.URI;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import pub.devrel.easypermissions.AfterPermissionGranted;
import pub.devrel.easypermissions.EasyPermissions;
```

Make sure MainActivity also implements the ConnectionListener:

```java
public class MainActivity extends AppCompatActivity implements ConnectionListener {
```

Next add the member variables that will be used:

```java
private static final String TAG = "MainActivity";
private static final String WS_URI = "wss://192.168.0.109:8888";
// WARNING: Turn this to false for production
private static final boolean IS_DEBUG = true;
private static final int CAMERA_AND_MIC = 1001;

private WebSocketClient socket;
private SurfaceViewRenderer mLocalRenderer;
private SurfaceViewRenderer mRemoteRenderer;
private EditText mPeerIdEditText;
private Button mCallButton;
private Button mLogoutButton;
private Connection mConnection;
private String mRemoteId;
```

Make sure to change the WS_URI to your own network address!

Firstly add the following to the onCreate method:

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    mLocalRenderer = findViewById(R.id.localRenderer);
    mRemoteRenderer = findViewById(R.id.remoteRenderer);
    mPeerIdEditText = findViewById(R.id.peerIdEditText);
    mCallButton = findViewById(R.id.callButton);
    mLogoutButton = findViewById(R.id.logoutButton);

    mConnection = Connection.initialize(this, this);

    initializeCallButton();
    connectToWebsocketServer();
    initializeLogoutButton();
}
```

Here we set the view's elements (buttons etc.) Then we initialize our buttons and connect to the WebSocket server.

First we need to implement the initializeCallButton method:

```java
private void initializeCallButton() {
    mCallButton.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            if (mPeerIdEditText.getText().toString().trim().length() == 0) return;

            mRemoteId = mPeerIdEditText.getText().toString();
            mPeerIdEditText.setVisibility(View.INVISIBLE);
            mCallButton.setVisibility(View.INVISIBLE);
            mRemoteRenderer.setVisibility(View.VISIBLE);
            mLocalRenderer.setVisibility(View.VISIBLE);
            mLogoutButton.setVisibility(View.VISIBLE);
            Log.d(TAG, "Remote id " + mRemoteId);

            mConnection.createPeerConnection();
            mConnection.createOffer();

            view.clearFocus();
        }
    });
}
```

Here we update the ui elements visibility, create a new peer connection and call create offer to create a local offer.

Next we need to method to connect us to the WebSocket server:

```java
private void connectToWebsocketServer() {
    try {
        this.socket = new WebSocketClient(new URI(WS_URI)) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                Log.d(TAG, "onOpen");
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        mCallButton.setEnabled(true);
                    }
                });
                requestCameraAndMicAccess();
            }

            @Override
            public void onMessage(String message) {
                Log.d(TAG, "onMessage message=" + message);
                handleWebSocketMessage(message);
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                Log.d(TAG, "onClose reason=" + reason);
                MainActivity.this.closeConnection();
            }

            @Override
            public void onError(Exception ex) {
                Log.e(TAG, "onError", ex);
            }
        };

        if (IS_DEBUG) {
            Log.w(TAG, "Enabling debug mode");
            final SSLSocketFactory factory = supportSelfSignedCert();
            HttpsURLConnection.setDefaultSSLSocketFactory(factory);
            this.socket.setSocketFactory(factory);
        }

        this.socket.connect();
    } catch (Exception e) {
        Log.e(TAG, e.getMessage());
    }
}
```

Here we set up the websocket listener's and connect to the server, once a connection is established the user can tap the call button. Nothing too complicated.

Next we will implement the logout button call handler: 

```java
private void initializeLogoutButton() {
    mLogoutButton.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            closeConnection();
        }
    });
}
```

All this does is call closeConnection which is the next method we will write:

```java
private void closeConnection() {
    mConnection.close();

    mLocalRenderer.release();
    mRemoteRenderer.release();

    mPeerIdEditText.setVisibility(View.VISIBLE);
    mCallButton.setVisibility(View.VISIBLE);
    mRemoteRenderer.setVisibility(View.INVISIBLE);
    mLocalRenderer.setVisibility(View.INVISIBLE);
    mLogoutButton.setVisibility(View.INVISIBLE);
}
```

Here we release the renderer's and revert the UI.

Next we need a helper method because we are using self signed certificate:

```java
private SSLSocketFactory supportSelfSignedCert() throws NoSuchAlgorithmException, KeyManagementException {
    final TrustManager[] trustManagers = new TrustManager[] {
            new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException { }

                @Override
                public void checkServerTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException { }

                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[]{};
                }
            }
    };

    HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
        @Override
        public boolean verify(String s, SSLSession sslSession) {
            return true;
        }
    });
    final SSLContext context = SSLContext.getInstance("SSL");
    context.init(null, trustManagers, new SecureRandom());

    return context.getSocketFactory();
```

Note this source should not be used in production.

Next we will create a method to handle a remote  message from the server:

```java
private void handleWebSocketMessage(final String message) {
    Log.d(TAG, "Got server message:" + message);
    try {
        final JSONObject jsonMessage = new JSONObject(message);
        final String action = jsonMessage.getString("action");

        switch(action) {
            case "start":
                Log.d(TAG, "WebSocket::start");
                // TODO: Deplace in text
                Log.d(TAG, "Local ID = " + jsonMessage.getString("id"));
                break;
            case "offer":
                Log.d(TAG, "WebSocket::offer " + jsonMessage.getJSONObject("data"));
                mRemoteId = jsonMessage.getJSONObject("data").getString("remoteId");

                   mConnection.createAnswerFromRemoteOffer(jsonMessage.getJSONObject("data").getJSONObject("offer").getString("name"));
                break;
            case "answer":
                Log.d(TAG, "WebSocket::answer");
                   mConnection.createAnswerFromRemoteOffer(jsonMessage.getJSONObject("data").getJSONObject("answer").getString("sdp"));
                break;
            case "iceCandidate":
                Log.d(TAG, "WebSocket::iceCandidate " + jsonMessage.getJSONObject("data").getJSONObject("candidate").toString());
                    mConnection.addRemoteIceCandidate(jsonMessage.getJSONObject("data").getJSONObject("candidate"));
                break;
            default: Log.w(TAG, "WebSocket unknown action" + action);
        }
    } catch (JSONException je) {
        Log.e(TAG, "Failed to handle WebSocket message", je);
    }
}
```

Here we are just handle the websocket messages, what we are doing here is not so different from my previous WebRTC tutorials, so I won't go into a deep explanation. 

Next we will create a method that sends data to the server:

```java
private void sendSocketMessage(final String action, final JSONObject data) {
    try {
        final JSONObject message = new JSONObject();
        message.put("action", action);
        message.put("data", data);

        socket.send(message.toString());
    } catch (JSONException je) {
        Log.e(TAG, je.toString());
    }
}
```

Here all we are doing is sending a stringified JSON object.

Next we will create a method to get permissions from the user, please note I used an external library for ease, but you don't have to.

```java
@AfterPermissionGranted(CAMERA_AND_MIC)
private void requestCameraAndMicAccess() {
    String[] permissions = { Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO };
    if(EasyPermissions.hasPermissions(this, permissions)) {
        Log.d(TAG, "media permissions granted");
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getUserMedia();
            }
        });
    } else {
        EasyPermissions.requestPermissions(this, getString(R.string.request_camera_mic_permissions_text), CAMERA_AND_MIC, permissions);
    }
}
```

Here we are just getting permission to use the user's camera and mic. Because capturing requires the ui thread we will run getUserMedia on the ui thread which is the next method we will be implementing:

```java
private void getUserMedia() {
    try {
        Log.d(TAG, "getUserMedia");
        mConnection.initializeMediaDevices(this, mLocalRenderer);

        final JSONObject data = new JSONObject();
        data.put("action", "start");

        sendSocketMessage("start", data);
    } catch (Exception e) {
        Log.e(TAG, "Failed to get camera device", e);
    }
}
```

Here we start getting the user's media devices and then we send a message to the server to initialize the call.

If, like me you are using EasyPermissions you will also need to Override the following method:

```java
@Override
public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);

    EasyPermissions.onRequestPermissionsResult(requestCode, permissions, grantResults);
}
```

Finally we need to handle the ConnectionListener events, the first being onAddStream:

```java
@Override
public void onAddStream(MediaStreamTrack mediaStreamTrack) {
    Log.d(TAG, "onAddStream " + mediaStreamTrack.kind());
    mediaStreamTrack.setEnabled(true);

    if (mediaStreamTrack.kind().equals("video")) {
        Log.d(TAG, "add video");
        final VideoTrack videoTrack = (VideoTrack) mediaStreamTrack;

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final EglBase.Context eglContext = EglBase.create().getEglBaseContext();

                mRemoteRenderer.init(eglContext, new RendererCommon.RendererEvents() {
                    @Override
                    public void onFirstFrameRendered() {

                    }

                    @Override
                    public void onFrameResolutionChanged(int i, int i1, int i2) {

                    }
                });

                videoTrack.addSink(mRemoteRenderer);
            }
        });
    }
}
```

Here we enable the remote media track, if the track is audio it should play automatically, if the track is video we will need to initialize the surface view and set the sink of the video track to the surface view.

Next we will handle the onIceCandidateReceived event:

```java
@Override
public void onIceCandidateReceived(IceCandidate iceCandidate) {
    try {
        final JSONObject candidate = new JSONObject();
        candidate.put("sdp", iceCandidate.sdp);
        candidate.put("sdpMLineIndex", iceCandidate.sdpMLineIndex);
        candidate.put("sdpMid", iceCandidate.sdpMid);

        final JSONObject data = new JSONObject();
        data.put("action", "iceCandidate");
        data.put("remoteId", mRemoteId);
        data.put("candidate", candidate);

        sendSocketMessage("iceCandidate", data);
    } catch (JSONException je) {
        Log.e(TAG, "Failed to handle onIceCandidate event", je);
    }
}
```

Here we parse the candidate into a JSON object and then set the data, the data is then sent to the server.

Next we will handle onLocalOffer event:

```java
@Override
public void onLocalOffer(SessionDescription offer) {
    Log.d(TAG, "onLocalOffer offer=" + offer);
    try {
        final JSONObject sdp = new JSONObject();
        sdp.put("type", "offer");
        sdp.put("sdp", offer.description);

        final JSONObject data = new JSONObject();
        data.put("action", offer.type);
        data.put("remoteId", mRemoteId);
        data.put("offer", sdp);

        sendSocketMessage("offer", data);
    } catch (JSONException je) {
        Log.e(TAG, "Failed to handle onLocalOffer", je);
    }
}
```

Like the candidate event we just create the data object and then send it to the server.

Finally we handle onLocalAnswer:

```java
@Override
public void onLocalAnswer(SessionDescription answer) {
    Log.d(TAG, "onLocalAnswer answer=" + answer);
    try {
        final JSONObject sdp = new JSONObject();
        sdp.put("type", "answer");
        sdp.put("sdp", answer.description);

        final JSONObject data = new JSONObject();
        data.put("action", "answer");
        data.put("remoteId", mRemoteId);
        data.put("answer", sdp);

        sendSocketMessage("answer", data);
    } catch (JSONException je) {
        Log.e(TAG, "Failed to handle onLocalAnswer", je);
    }
}
```

Done! Well done for making it this far! 😉

---

## Running the example

First we need to start the node server via the following command:

```linux
node run src/server.js
```

Next access https://localhost:3000/ and click start, remember the local id.

Next fire up the application (note if both of your devices are using the same camera this may not work on an emulator, for this I'd recommend an actual device.)

Enter the remote peer id and click call you should need see each others streams. ☺️

---

## Bonus Challenges

1. Try to make the Android device the callee and not the caller.
2. Try handling third user.
3. Try implementing Data Channel

---

## Conclusion

Here I have shown how to set up a WebRTC connection and exchange media with the native Android SDK. 

Please let me know if I have missed anything etc.

You can find the source for this project via:
https://github.com/ethand91/webrtc-android

Also my macbook broke so I will not be able to write the iOS tutorial for a while, if you wish to help to buy a new macbook any donations would be appreciated. 🙏

---

Like me work? I post about a variety of topics, if you would like to see more please like and follow me.
Also I love coffee. 

[![“Buy Me A Coffee”](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ethand9999)
