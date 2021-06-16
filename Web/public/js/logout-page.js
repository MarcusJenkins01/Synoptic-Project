var redirect_timer = document.querySelector('#redirect-time');
var time = 3;

redirect_timer.textContent = time;

// Count down then redirect
setInterval(() => {
    if (time <= 0) {
        window.location.href = '/';
    } else {
        time--;
        redirect_timer.textContent = time;
    }
}, 1000);
