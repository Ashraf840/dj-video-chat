//console.log('Hello!')

// get the location of the current client(browser)
//console.log(location)
//console.log(document.location)
//console.log(window.location)

// get all the HTML DOM element
var label_Username = document.querySelector('#label-username');
var input_Username = document.querySelector('#input-username');
var btn_Join = document.querySelector('#btn-join');

// store the value from the username-input-field
var username;

// empty js-obj to add the each RTCPeerConnection to this js-obj
var mapPeers = {}


btn_Join.addEventListener('click', () => {
    username = input_Username.value;

    // if the username-input-field is empty, don't let the user to join the room.
    // by using the "return", the js will not execute the codes below.
    if (username == '') {
        return;
    }


    // if the username is not empty, then clear the username-input-field and disable that input-field as well.
    input_Username.value = '';
    input_Username.disabled = true;
    input_Username.style.visibility = 'hidden';

    // also disable the join-room btn
    btn_Join.disabled = true;
    btn_Join.style.visibility = 'hidden';

    label_Username.innerHTML = username;

    // fetch the current-url info using the window.location()
    var loc = window.location;
    // create the scheme of the websocket
    var wsStart = 'ws://';

    // check if the client-url protocol is secured 'https'
    if (loc.protocol == 'https:') {
        wsStart = 'wss://';
    }

    // generate the websocket-url
    var url = wsStart + loc.host + loc.pathname;

     console.log('Websocket endpoint: ', url);

    // instantiate a websocket-obj & pass the url inside
    let socket = new WebSocket(url);

    // -------complete the websocket life-cycle----------------------------------------------

    // connect the frontend websocket with the backend consumer
    socket.onopen = function (e) {
        console.log('Frontend Websocket: Connection Established!');
        //------------------------------------------------------------------------------------ (Instead of sending a dummy serialized-json-object, call the "sendSignal" function)
        // Construct a msg using the 'message'-key
        // var jsonMsg = JSON.stringify({'message': 'This a message'});
        // After constructing the msg & serialize that into json-format, we need to use the "websocket.send()" method to send that msg into the backend consumer.
        // socket.send( jsonMsg )
        //------------------------------------------------------------------------------------

        // call the "sendSignal" func to send signals to other peers, although an empty-dict will be provided while provoking the "sendSignal" function.
        sendSignal(
            'new-peer',
            {'signal-msg': 'This is a dummy signal message to other peers!'},
            socket=socket
        );
    }

    // receive any messages sent from the backend consumer as json-format
    socket.onmessage = function (e) {
        console.log('Frontend Websocket ("onmessage" function): Receive messages!')
        // console.log(JSON.parse(e.data));

        // de-serialize the json-string into js-object
        // [NOTE]: equivalent to "json.loads()" in python for de-serializing into the native format
        var parsedData = JSON.parse(e.data);

        // the backend-consumer is going to sent a payload along with the key 'message' (NB: The 'send_message()' method will sent that payload), so we need to extract that key-value ("message") from the parsed-js-object
        var payload = parsedData['payload'];
        var peerUsername = parsedData['payload']['peer'];
        var action = parsedData['payload']['action'];
        var receiver_channel_name = parsedData['payload']['message']['receiver_channel_name'];
        // console.log('Peer Username: ', peerUsername)
        console.log('Initial Receiver Channel: ' + receiver_channel_name)

        // check if the username is equal to the peerUsername, then avoid displaying the payload to the current-client. (other clients will see the current-client's connection-message)
        // the "username" will get the value from the user-input-field for joining a room.
        // the "peerUsername" will be got from the backend-channel to frontend-websocket
        if (username == peerUsername) {
            return;   // won't allow the JS to execute anymore code
        }

        // since the current user gets avoided, the other existing users will now create an offer, which will later be sent to the new-peer.
        // The offer will consist of peerUsername & it's channel-name
        if (action == 'new-peer') {
            // offer-sdp will be created by other existing-peers; later sent to the newly-joined-peer
            createOfferer(peerUsername, receiver_channel_name, socket=socket);
            console.log('payload: ', payload);
            return;     // won't allow the JS to execute anymore code
        }

        // if a new-offer is sent from the backend, then retrieve the offer-SDP.
        // also inside this func, an answer-SDP will also be created which will be sent in the backend-dj-channel
        if (action == 'new-offer') {
            var offer_sdp = payload['message']['sdp'];
            console.log("Offer SDP:", offer_sdp);

            // build the func "createAnswerer" beneath the func "createOfferer". The "createAnswer()" func will be used by the newly-joined-peer to send answer-SDP to the other-existing-peers through using the backend-dj-channel.
            createAnswerer(offer_sdp, peerUsername, receiver_channel_name, socket=socket);
        }


        // this will be executed by the other-existing-peer's machine, since the answer will be dispatched from the newly-joined-peer for the purpose of sending to the existing-peers.
        if (action == 'new-answer') {
            var answer_sdp = payload['message']['sdp'];
            console.log("Answer SDP:", answer_sdp);
            console.log('PeerUserName: %s', peerUsername);
            // set the answer-SDP as the remote description to the offerer. We can retrieve the offerer from the mapPeer func
            var peer = mapPeers[peerUsername][0];   // since the first elem of the list is RTCPeerConnection & the second one is the dataChannel
            console.log('Peer (in the existing peer machine): %s', peer);

            // the existing-peers will set it's remoteDescription to their machines
            peer.setRemoteDescription(answer_sdp);
            return;
        }
    }

    // disconnect the frontend websocket from the backend consumer
    socket.onclose = function (e) {
        console.log('Frontend Websocket: Connection Closed!');
    }

    // handle any error due to the websocket connection with the backend consumer
    socket.onerror = function (e) {
        console.log('Frontend Websocket: Error occurred!');
    }
});



// >>>>>>>> Get the audio & video from the client's local machine <<<<<<<<
// Create an empty "MediaStream" object
var localStream = new MediaStream();

const constraints = {
    'audio': true,
    'video': true,
};


// access client's webcam

//  after finishing the execution, it's going to return a stream. For streaming the video from the local-machine,
//  we are calling the local-video streaming element from the DOM.
const localVideo = document.querySelector('#local-video');

// get the audio mute-unmute button
var btnToggleAudio = document.querySelector('#btn-toggle-audio');
// get the video on-off button
var btnToggleVideo = document.querySelector('#btn-toggle-video');


//btnToggleAudio.addEventListener('click', () => {
//    alert('Audio btn is clicked!')
//});

// stream the local-video of the current-peer's machine & display that to the current-peer
// it's an asynchronous-func, thus we need to make sure the code is fully executed before moving on to the next part.
var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    // as soon as the 'getUserMedia' finished its execution, it'll return a MediaStream object.
    .then(stream => {
        // assign the stream to our 'localStream' variable
        localStream = stream;
        // assign the 'localStream' as the source-object of our HTML-video-element
        localVideo.srcObject = localStream;
        // also mute ourselves, since we don't want to listen to ourselves.
        localVideo.muted = true;

        // get the audioTracks
        var audioTracks = stream.getAudioTracks();
        // get the videoTracks
        var videoTracks = stream.getVideoTracks();

        // by default, the audio & video tracks will be enabled by default
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        // audio-btn mute/un-mute toggle func
        btnToggleAudio.addEventListener('click', () => {
            console.log('Audio btn clicked!');
            // inverting the previous state of the audio-track, (not the audio-btn, but the audio-track)
            audioTracks[0].enabled = !audioTracks[0].enabled;

            // if the audio is enabled, then set the innerHTML of the audio-btn to "Audio Mute"
            if (audioTracks[0].enabled) {
                btnToggleAudio.innerHTML = 'Audio Mute';
                return;
            }

            btnToggleAudio.innerHTML = 'Audio Unmute';
        });

        // video-btn on/off toggle func
        btnToggleVideo.addEventListener('click', () => {
            console.log('Video btn clicked!');
            // inverting the previous state of the audio
            videoTracks[0].enabled = !videoTracks[0].enabled;

            // if the audio is enabled, then set the innerHTML of the audio-btn to "Audio Mute"
            if (videoTracks[0].enabled) {
                btnToggleVideo.innerHTML = 'Video Off';
            }

            btnToggleVideo.innerHTML = 'Video On';
        });
    })
    // In case we encounter an error, then we should handle that wrror using the catch-codeBlock
    .catch(error => {
        // the error will be console logged
        console.log('Error accessing media devices!', error);
    });



// Construct a msg using the 'message'-key
// When a new peer joins the room, it's going to set the 'action' -key to 'new-peer' &
// all the other peers will use the 'action' -key as received object, &
// when they see the 'action' -key as "new-peer", they'll understand that they've to send
// an offer to this new-peer. And the existing peers will change the 'action' -key to 'new-offer'.
// The new peers sends response to the existing peers & set the dictionary-key ("action") to "new-answer" followed by receiving the dictionary which contains the 'action' -key as "new-offer".


// function to send signal (msg-dict & action) to other peers;
// [NOTE]:  This is invoked (called) inside the "websocket.onopen()" function.
function sendSignal(action, message, socket) {
    var jsonMsg = JSON.stringify({
        'peer': username,   // it'll contain the value fetched from the user for joining the room
        'action': action, // regarding the "Scheme to Build P2P Connection"
        'message': message,  // dict-type
    });

    // let socket = new WebSocket(url);

    // After constructing the msg & serialize that into json-format, we need to use the "websocket.send()" method to send that msg into the backend consumer.
    socket.send( jsonMsg );
}



// -------------------------- function to create offer-SDP through "RTCPeerConncetion" object ---------------------------------------------------------------
// this func will be used by the other-existing-peers who are already joined in the room to create & send offer-SDP to the newly-joined-peer-socket.
function createOfferer(peerUsername, channelName, socket) {
    console.log('"createOfferer" func is called!');
    var peer_conn = new RTCPeerConnection(null);
    console.log('"RTCPeerConnection" object is created!' + peer_conn);

    // add local-tracks; pass the "peer_conn" object
    addLocalTracks(peer_conn);

    // instantiate a dataChannel using the "peer_conn" obj
    var dc = peer_conn.createDataChannel('channel');
    console.log('Data Channel is instantiated!' + dc);

    dc.onopen = () => {
        console.log('Connection Opened!');
    }

    // create an "onmessage" func to receive any message/dict/packet from the other client
    dc.onmessage = (e) => {
        console.log("New Message: " + e.data);
    }

    // create a new video-element in the HTML file for the remote-peer using a function ("createRemoteVideo");
    // pass the peerUserName of the remote-peer through the function ("createRemoteVideo"), cause the video-elem will contain the peerUsername in it's id.
    // it'll create the video-element along with the video-container & the video-wrapper. Lately, return the video-elem to the "remoteVideo" variable.
    // [NB]:  "peerUsername" is got from the dispatched "payload" from the backend-dj-channel.
    var remoteVideo = createRemoteVideo(peerUsername);

    // set the "peer_conn" obj along with the remoteVideo using the "setOnTrack()" function.
    // the media-stream of the new remote peer will be added to the "RTCPeerConnection" object.
    // So that the existing peer window will be able to stream the media of the remote new peer.
    setOnTrack(peer_conn, remoteVideo);


    // add each RTCPeerConnection of each peer to the "mapPeers" js-obj.
    // The key will be the peerUsername & the value will be stored as a
    // list consisting of the "RTCPeerConnection" obj & the second elem will be the associating dataChannel.
    mapPeers[peerUsername] = [peer_conn, dc]

    // if any user leaves the room, or cannot connect for some reason, then we need to handle the scenario using the "oniceconnectionstatechange" event-listener.
    peer_conn.oniceconnectionstatechange = () => {
        // store the iceconnectionstate of the "peer_conn" obj to a variable; basically storing the "iceconnectionstate" of each existing peer, when creating offer-SDP.
        var iceConnectionState = peer_conn.iceConnectionState;

        // delete the peer_connection if its closed/failed/disconnected
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUserName];

            // close the peer_conn if that's not closed
            if (iceConnectionState != 'closed') {
                peer_conn.close();
            }

            // lastly remove the remote-video-element from the existing-peer-windows by calling the func "removeVideo()" func & passing the "remoteVideo" elem.
            removeVideo(remoteVideo);
        }
    };


    // sending offer to the backend-dj-channel
    // gather all the iceCandidates of the local-peer's machine before sending to both the offer & answer SDP
    peer_conn.addEventListener('icecandidate', e => {
        // get the candidate from the 'event' obj
        if (e.candidate) {
            // print the local-description of the peer after gathering all the candidates
            console.log('New ICE Candidate: ' + peer_conn.localDescription);
            return;
        }

        // send the offer-SDP  along w/ the receiver_channel_name to the remote-peer using the "sendSignal()" function,
        // which is created before the "createOfferer()" func.
        // it also set the value of the 'action' of the func to "new-offer", which was initially used to be "new-peer".
        sendSignal('new-offer', {
            'sdp': peer_conn.localDescription, // send the local-sdp of the existing-peer

            // the existing-peers-channels will be dispatched to the backend-dj-channel bearing the purpose of sending offer-SDP to the newly-added-peer,
            // cause this "sendSignal()" func is called inside the "createOfferer()" func, & this "createOfferer()" func is only instantiated based on the
            // condition that the "webSocket.onmessage()" event receives any payload from the backend-dj-channel which is containing the 'action' key as
            // "new-peer". Since the action == "new-peer" will only get in the other-existing-peers frontend in the room-group, thus the other-peers will
            // send thier own channel-names-along with their SDPs (session description protocols) to the backend-dj-channel.
            'receiver_channel_name': channelName, // the receiver-channel-name is used to sent the offer-sdp only to the newly-joined-peer. Get from the "createOfferer()" func's param.
        }, socket=socket);
    });



    // set-local-description of the local-machine
    // Initiates the creation of an SDP-offer using the "RTCPeerConnection" object for the purpose of starting a new WebRTC connection to the remote-peer.
    // "createOffer()" function:  built-in function provided by the "RTCPeerConnection" object
    peer_conn.createOffer()
        .then(o => {
            localSDP = peer_conn.setLocalDescription(o);
            console.log('Local Description: ' + localSDP);
        })
        .then(() => {
            console.log('Local Description set successfully!');
        });
}
// -------------------------- function to create offer-SDP through "RTCPeerConncetion" object ---------------------------------------------------------------







// -------------------------- function to create answer-SDP through "RTCPeerConncetion" object ---------------------------------------------------------------
// this func will be used by the newly-joined-peer to send back it's answer-SDP in response to the offer-SDP it gets.
function createAnswerer(offer_sdp, peerUsername, channelName, socket) {
    console.log('"createAnswerer" func is called!');
    var peer_conn_newP = new RTCPeerConnection(null);
    console.log('"RTCPeerConnection" object is created ("createAnswerer" func)!' + peer_conn_newP);

    // add local-tracks; pass the "peer_conn" object (probably the existing other peers local-tracks)
    addLocalTracks(peer_conn_newP);

    var remoteVideo = createRemoteVideo(peerUsername);
    setOnTrack(peer_conn_newP, remoteVideo);


    // [IMPORTANT NOTE] we don't create a new dataChannel in the answer-SDP creation func ("createAnswerer"), we'll use the "onDataChannel" event-listener to connect with the dataChannel that is previously initiated in the "createOfferer()" func.
    // By using that event-listener, we'll store the dataChannel into a variable that is initially created by the "createOfferer()" func.
    peer_conn_newP.addEventListener('datachannel', e => {
        // now we can get the dataChannel from the "e" object, which will be assigned as an attribute to the newly created 'RTCPeerConnection' obj.
        // [NOTE]:  This 'RTCPeerConnection' is created by/for the newly-joined peer, cause inside the "socket.onmessage", we previously built a condition to check if the value of the action is "new-offer", then it'll execute the "createAnswerer()" func.
        // invoking the dataChannel of the previously created dataChannel (created by the other-existing-peers).
        peer_conn_newP.dc = e.channel;
        console.log('Triggering previously connected datachannel!');
        // console.log('Data Channel (triggering DC from "createAnswerer()" func): ' + e);

        peer_conn_newP.dc.onopen = () => {
            console.log('Connection Opened!');
        }

        // create an "onmessage" func to receive any message/dict/packet from the other client
        peer_conn_newP.dc.onmessage = (e) => {
            console.log("New Message: " + e.data);
        }

        mapPeers[peerUsername] = [peer_conn_newP, peer_conn_newP.dc];
    });


    // if any user leaves the room, or cannot connect for some reason, then we need to handle the scenario using the "oniceconnectionstatechange" event-listener.
    peer_conn_newP.oniceconnectionstatechange = () => {
        // store the iceconnectionstate of the "peer_conn" obj to a variable; basically storing the "iceconnectionstate" of each existing peer, when creating offer-SDP.
        var iceConnectionState = peer_conn_newP.iceConnectionState;

        // delete the peer_connection if its closed/failed/disconnected
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUserName];

            // close the peer_conn if that's not closed
            if (iceConnectionState != 'closed') {
                peer_conn_newP.close();
            }

            // lastly remove the remote-video-element from the existing-peer-windows by calling the func "removeVideo()" func & passing the "remoteVideo" elem.
            removeVideo(remoteVideo);
        }
    };


    // sending offer to the backend-dj-channel
    // gather all the iceCandidates of the local-peer's machine before sending to both the offer & answer SDP
    peer_conn_newP.addEventListener('icecandidate', e => {
        // get the candidate from the 'event' obj
        if (e.candidate) {
            // print the local-description of the peer after gathering all the candidates
            console.log('New ICE Candidate: ' + peer_conn_newP.localDescription);
            return;
        }

        // send the answer-SDP  along w/ the receiver_channel_name to the other existing-peer using the "sendSignal()" function,
        // which is created before the "createANswerer()" func.
        // it also set the value of the 'action' of the func to "new-answer", which was previously used to be "new-offer".
        sendSignal('new-answer', {
            'sdp': peer_conn_newP.localDescription, // send the local-sdp of the existing-peer

            // the newly-joined-peer-channel will be dispatched to the backend-dj-channel bearing the purpose of sending answer-SDP to the other existing-peers,
            'receiver_channel_name': channelName, // the receiver-channel-name is used to sent the answer-sdp only to the other existing-peers.
        }, socket=socket);
    });



    // set-remote-description of the local-machine
    // Initiates the creation of an answer-SDP using the "RTCPeerConnection" object.
    // newly-joined-peer's localDescription using the "setRemoteDescription(offer_sdp)", but this is set inside the new-peer's machine, thus this needs to be sent to the other-existing-peers' machine. Thus this "setRemoteDescription(answer)" inside the "socket.onmessage()" func.
    // [NOTE]:  The remote-description of the existing-peers is set inside the newly-joined-peer's "RTCPeerConnection" obj. Later, asynchronously, the newly-joined-peer's localDescription is set in its own RTCPeerConnection object.
    peer_conn_newP.setRemoteDescription(offer_sdp)
    .then(() => {
        console.log('Remote description set successfully for %s!', peerUsername);
        return peer_conn_newP.createAnswer();
    })
    .then(a => {
        console.log('Answer created!');
        localSDP = peer_conn_newP.setLocalDescription(a);
        console.log('Local Description: ' + localSDP);
    });
}
// -------------------------- function to create answer-SDP through "RTCPeerConncetion" object ---------------------------------------------------------------






// create video-element (w/ video-container) of the remotePeer in the existing peers window (HTML).
// Any new-peer which gets connected create a new video-element underneath the primary video-element in the HTML file of the other existing peers.
function createRemoteVideo(peerUsername) {
    console.log('"createRemoteVideo()" func is called!');
    // get the video-container elem from the HTML file & store that into a variable ("video_container")
    var video_container = document.querySelector('.video-container');

    // create remote-video elem
    var remoteVideo = document.createElement('video');
    // set the id of the newly-created remote-video using the "peerUsername"+ "-video"
    remoteVideo.id = peerUsername + "-video";
    remoteVideo.autoplay = true;   // as soon as the remoteVideo gets created, it'll start streaming automatically
    remoteVideo.playsInline = true    // it'll prohibit the browser to play the video in fullscreen by default, it'll start streaming the video from where the video-elem got created

    // since the video-element resides inside a div, thus create another element which returns a "div"
    var video_wrapper = document.createElement('div');

    video_container.appendChild(video_wrapper);
    video_wrapper.appendChild(remoteVideo);

    return remoteVideo;    // this "remoteVideo" elem will be saved into a var where the func gets called
}





// function to get the local-media stream & later add those tracks to the "RTCPeerConnection" Obj
function addLocalTracks(peer_conn) {
    console.log('"addLocalTracks" func is called!');
    // make a for-each loop on the localMedia stream obj to get all the tracks from the local machine of the existing peers.
    // Use the foreach-loop on the "getTracks()" func of the local-media-obj and this will return and event as track and will be added each track to the "peer_conn" object we found from making a foreach-loop on the "localStream" obj.
    localStream.getTracks().forEach(track => {
        peer_conn.addTrack(track, localStream);     // adding each available tracks of the existing peers to the "RTCPeerConnection" object.
        console.log('Local Media Track ("addLocalTracks" func): ' + track)
    });
}




// dataChannel 'on_message' func (will be created later)


// get the media stream of the new remote peer
function setOnTrack(peer_conn, remoteVideo) {
    console.log('"setOnTrack()" func is called!');
    // Instantiate the "MediaStream" obj
    var remote_stream = new MediaStream();

    // assign the remote-video-stream of the new peer inside the new remote-video-element.
    // [NB]: The "remoteVideo" elem is called by the "createRemoteVideo()" func & stored inside the "remoteVideo" variable.
    remoteVideo.srcObject = remote_stream;

    // create an "ontrack" function on the "peer_conn" object, whose event will be asynchronous & add the tracks to the "remote_stream" object.
    // [NB]:  Whenever a remote-media-track is found in the RTCPeerConnection ("peer_conn") obj, it'll add the track asynchronously to the
    // "remoteVideo" elem which is meant to be created for any new peer joined to the room, thus other existing peers will create a "remoteVideo" elem
    // in their window and start adding tracks of the newly joined peer to their "remoteVideo" elem.
    peer_conn.ontrack = async (e) => {
        remote_stream.addTrack(e.track, remote_stream);
        console.log('Fetch & set the track of the remote peer:', e.track);
    };
}






// define the "removeVideo" func to remove the "remoteVideo" element
function removeVideo(video) {
    var videoWrapper = video.parentNode;   // get the "div" containing the remote-video-elem
    video_wrapper.parentNode.removeChild(videoWrapper);    // deleting the parentNode of that div-elem (which is "video-container" elem.
}