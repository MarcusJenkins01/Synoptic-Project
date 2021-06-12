function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        includedLanguages: 'es,en',
        autoDisplay: false
    }, 'google_translate_element');
}

function translatePage() {
    const translator = document.querySelector('#google_translate_element select');

    if (translator.selectedIndex  == 0) {
        translator.selectedIndex = 1;
        language = 2;
    } else {
        translator.selectedIndex = 0;
        language = 1;
    }

    translator.dispatchEvent(new Event('change'));
}
