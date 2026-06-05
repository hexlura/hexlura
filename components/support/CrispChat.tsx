'use client'

import Script from 'next/script'

export function CrispChat() {
  return (
    <Script
      id="crisp-chat"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="b69e3a5d-f4a9-41f0-bbe5-2e85ab90dc6b";
          (function(){
            var d=document;
            var s=d.createElement("script");
            s.src="https://client.crisp.chat/l.js";
            s.async=1;
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
          (function(){
            var OFFSET = 70;
            function isMobile() { return window.innerWidth < 768; }
            function applyOffset(container) {
              var els = container.querySelectorAll('*');
              for (var i = 0; i < els.length; i++) {
                if (window.getComputedStyle(els[i]).position === 'fixed') {
                  els[i].style.bottom = isMobile() ? OFFSET + 'px' : '';
                }
              }
            }
            function init() {
              var container = document.getElementById('crisp-chatbox');
              if (!container) { setTimeout(init, 400); return; }
              var observer = new MutationObserver(function() { applyOffset(container); });
              observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
              applyOffset(container);
            }
            init();
            window.addEventListener('resize', function() {
              var c = document.getElementById('crisp-chatbox');
              if (c) applyOffset(c);
            });
          })();
        `,
      }}
    />
  )
}
