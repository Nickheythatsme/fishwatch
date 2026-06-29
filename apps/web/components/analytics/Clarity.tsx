import Script from 'next/script'

// Microsoft Clarity session-analytics tag. The project id defaults to the
// Score.Fish production project but can be overridden per-environment via
// `NEXT_PUBLIC_CLARITY_PROJECT_ID`. Set that var to an empty string to disable
// Clarity (e.g. for preview/dev builds you don't want recorded).
const DEFAULT_CLARITY_PROJECT_ID = 'xeq670y34r'

const clarityProjectId =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? DEFAULT_CLARITY_PROJECT_ID

export function Clarity() {
  if (!clarityProjectId) return null

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityProjectId}");`}
    </Script>
  )
}
