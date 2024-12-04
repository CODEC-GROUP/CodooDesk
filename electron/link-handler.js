"use strict";
document.addEventListener('click', (event) => {
    let target = event.target;
    while (target && target !== document.body) {
        if (target.tagName === 'A' && target.href) {
            const url = new URL(target.href);
            
            event.preventDefault();
            
            // Check if the link is internal
            if (url.origin === window.location.origin) {
                console.log('Navigating to:', url.pathname);
                window.posAPI.navigateTo(url.pathname);
            } else {
                console.log('External link:', url.href);
                // Uncomment if you want to handle external links
                // window.posAPI.openExternal(url.href);
            }
            break;
        }
        target = target.parentElement;
    }
});
