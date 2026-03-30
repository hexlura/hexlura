const sectionStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '48px 0 16px',
    paddingTop: '48px',
    borderTop: '1px solid #EEEEEE',
}

const bodyStyle: React.CSSProperties = {
    fontSize: '15px',
    color: '#333333',
    lineHeight: 1.9,
    margin: '0 0 16px',
}

const liStyle: React.CSSProperties = {
    marginBottom: '8px',
    lineHeight: 1.8,
    fontSize: '15px',
    color: '#333333',
}

const tableHeaderStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0A0A0F',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '10px 14px',
    background: '#F5F5F7',
    borderBottom: '2px solid #E8E8EE',
    textAlign: 'left',
    whiteSpace: 'nowrap',
}

const tableCellStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#333333',
    padding: '12px 14px',
    borderBottom: '1px solid #F0F0F0',
    verticalAlign: 'top',
    lineHeight: 1.6,
}

const typeBadge = (type: string): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '2px',
    background: type === 'Essential' ? '#E8F5E9' : type === 'Functional' ? '#E3F2FD' : '#FFF3E0',
    color: type === 'Essential' ? '#2E7D32' : type === 'Functional' ? '#1565C0' : '#E65100',
})

const cookies = [
    { name: 'Session cookie', type: 'Essential', purpose: 'Maintains your login session', duration: 'Session' },
    { name: 'CSRF token', type: 'Essential', purpose: 'Protects against cross-site request forgery', duration: 'Session' },
    { name: 'Stripe session', type: 'Essential', purpose: 'Required for secure payment processing', duration: 'Session' },
    { name: 'Preferences', type: 'Functional', purpose: 'Remembers your city and search preferences', duration: '30 days' },
    { name: 'Checkout session', type: 'Functional', purpose: 'Preserves your ticket selection during checkout', duration: '10 minutes' },
    { name: 'Analytics', type: 'Analytics', purpose: 'Tracks page views and user journeys to improve the Platform', duration: '24 months' },
    { name: 'Performance', type: 'Analytics', purpose: 'Monitors page load times and errors', duration: '12 months' },
]

export default function CookiesPage() {
    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 24px' }}>

                {/* Header */}
                <h1 style={{ fontFamily: '"Bebas Neue", "Arial Black", sans-serif', fontSize: '48px', color: '#0A0A0F', marginBottom: '8px' }}>
                    Cookie Policy
                </h1>
                <p style={{ fontSize: '13px', color: '#8888AA', marginBottom: '4px' }}>
                    How we use cookies and similar technologies on hexlura.com
                </p>
                <p style={{ fontSize: '13px', color: '#8888AA', marginBottom: '8px' }}>
                    Last updated: March 2026
                </p>
                <div style={{ borderTop: '3px solid #E63950', margin: '24px 0 40px' }} />

                <h3 style={{ ...sectionStyle, borderTop: 'none', paddingTop: 0, marginTop: 0 }}>1. What Are Cookies</h3>
                <p style={bodyStyle}>
                    Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to the website owner. We use cookies to improve your experience on hexlura.com and to understand how our Platform is used.
                </p>

                <h3 style={sectionStyle}>2. Types of Cookies We Use</h3>
                <p style={bodyStyle}>The table below lists the cookies we use and their purpose:</p>

                <div style={{ overflowX: 'auto', margin: '0 0 24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E8E8EE', borderRadius: '4px' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle}>Cookie Name</th>
                                <th style={tableHeaderStyle}>Type</th>
                                <th style={tableHeaderStyle}>Purpose</th>
                                <th style={tableHeaderStyle}>Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies.map((c, i) => (
                                <tr key={c.name} style={{ background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                                    <td style={{ ...tableCellStyle, fontWeight: 600, color: '#0A0A0F' }}>{c.name}</td>
                                    <td style={tableCellStyle}>
                                        <span style={typeBadge(c.type)}>{c.type}</span>
                                    </td>
                                    <td style={tableCellStyle}>{c.purpose}</td>
                                    <td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}>{c.duration}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h3 style={sectionStyle}>3. Third Party Cookies</h3>
                <p style={bodyStyle}>
                    Our payment provider Stripe places cookies that are necessary for secure transaction processing. These cookies are governed by Stripe&apos;s own privacy policy, available at stripe.com/privacy.
                </p>
                <p style={bodyStyle}>
                    We may use Google Analytics to understand how visitors interact with our Platform. Google Analytics sets cookies to collect information in an anonymous form. You can opt out of Google Analytics by visiting tools.google.com/dlpage/gaoptout.
                </p>

                <h3 style={sectionStyle}>4. Managing Cookies</h3>
                <p style={bodyStyle}>You can control and manage cookies through your browser settings:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Google Chrome: Settings → Privacy and Security → Cookies and other site data',
                        'Mozilla Firefox: Options → Privacy & Security → Cookies and Site Data',
                        'Apple Safari: Preferences → Privacy → Manage Website Data',
                        'Microsoft Edge: Settings → Privacy, search, and services → Cookies',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>
                <p style={bodyStyle}>Please note that disabling essential cookies will affect your ability to use key features of the Platform, including logging in and completing purchases.</p>

                <h3 style={sectionStyle}>5. Your Consent</h3>
                <p style={bodyStyle}>
                    By continuing to use hexlura.com, you consent to our use of cookies as described in this policy. You may withdraw consent at any time by adjusting your browser settings, although this may impact your experience on the Platform.
                </p>

                <h3 style={sectionStyle}>6. Updates to This Policy</h3>
                <p style={bodyStyle}>
                    We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
                </p>

                <h3 style={sectionStyle}>7. Contact</h3>
                <p style={bodyStyle}>
                    For any questions about our use of cookies, please contact us at <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>
                </p>

                <div style={{ height: '60px' }} />
            </div>
        </div>
    )
}
