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
            function adjustCrisp() {
              var el = document.getElementById('crisp-chatbox');
              if (el) {
                el.style.transform = window.innerWidth < 768 ? 'translateY(-70px)' : '';
              } else {
                setTimeout(adjustCrisp, 300);
              }
            }
            adjustCrisp();
            window.addEventListener('resize', adjustCrisp);
          })();
        `,
      }}
    />
  )
}
