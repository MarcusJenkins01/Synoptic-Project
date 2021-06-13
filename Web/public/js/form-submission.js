// Deprecated
// function submitForm(button) {
//     var form = button.parentElement;
//     var error_text = form.querySelector('#error h2');

//     var form_data = new FormData(form);

//     var xmlhttp = new XMLHttpRequest();

//     xmlhttp.onreadystatechange = function() {
//         if (xmlhttp.readyState == XMLHttpRequest.DONE) {
//             if (xmlhttp.status == 200) {
//                 // Display the error from Node js
//                 error_text.textContent = xmlhttp.responseText;
//             }
//         }
//     }

//     xmlhttp.open('POST', '/reg', true);
//     xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

//     xmlhttp.send(JSON.stringify({
//         first_name: form_data.get('first_name'),
//         surname: form_data.get('surname'),
//         country_code: form_data.get('country_code'),
//         phone_number: form_data.get('phone_number'),
//         username: form_data.get('username'),
//         password: form_data.get('password'),
//         confirm_password: form_data.get('confirm_password')
//     }));
// }

// Replaced the old XMLHTTP with jQuery AJAX
function initialiseFormOverride(action) {
    const form = document.querySelector('#login-register-container form');
    const submit_button = form.querySelector('button[type="submit"]');

    // Override the submit button's click
    submit_button.onclick = function(event) {
        event.preventDefault();

        var error_text = form.querySelector('#error h2');

        // A jQuery function
        var form_data = $('#login-register-container form').serialize();
        
        $.ajax({
            type: 'POST',
            url: action,
            data: form_data,
            cache: false,
            success: function(data) {
                error_text.textContent = data;
            },
            error: function(_, text_status, err) {
                console.log(err);
            }
        });
    }
}
