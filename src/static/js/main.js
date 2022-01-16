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

    // console.log(url);

    // instantiate a websocket-obj & pass the url inside
    let socket = new WebSocket(url);

    // -----complete the websocket life-cycle-----

    // connect the frontend websocket with the backend consumer
    socket.onopen = function (e) {
        console.log('Frontend Websocket: Connection Established!');
    }

    // receive any messages sent from the backend consumer as json-format
    socket.onmessage = function (e) {
        console.log(JSON.parse(e.data));

        // de-serialize the json-string into js-object
        // [NOTE]: equivalent to "json.loads()" in python for de-serializing into the native format
        var parsedData = JSON.parse(e.data);

        // the backend-consumer is going to sent a payload along with the key 'payload', so we need to extract that key-value ("payload") from the parsed-js-object
        var payload = parsedData['payload'];

        console.log('payload: ', payload);
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
