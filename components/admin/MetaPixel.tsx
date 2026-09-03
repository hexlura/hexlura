'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import * as pixel from '@/lib/meta-pixel';

export default function FacebookPixel() {
    const [loaded, setLoaded] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!loaded) return;
        pixel.pageview();
    }, [pathname, searchParams, loaded]);

    if (!pixel.FB_PIXEL_ID) return null;

    return (
        <Script
            id="fb-pixel"
            strategy="afterInteractive"
            onLoad={() => setLoaded(true)}
            dangerouslySetInnerHTML={{
                __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixel.FB_PIXEL_ID}');
        `,
            }}
        />
    );
}