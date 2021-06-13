// Made using the idea each page has the same form layout and only one form per page max
const form = document.querySelector('form');
const submit_button = document.querySelector('button[type="submit"]');
const error_text = document.querySelector('#error h2');

function submitForm() {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            error_text.
        }
    }
}

$.ajax({
    url: '/',
    type:'POST',
    data: form.serialize(),
    success: function(response)
    {
        alert('UserName Sent');
    }
});