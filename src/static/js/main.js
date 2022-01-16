//console.log('Hello!')



// get all the HTML DOM element
var label_Username = document.querySelector('#label-username');
var input_Username = document.querySelector('#input-username');
var btn_Join = document.querySelector('#btn-join');

// store the value from the username-input-field
var username;


btn_Join.addEventListener('click', () => {
    username = input_Username.value;

    // if the username-input-field is empty, don't let the user to join the room.
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
});
