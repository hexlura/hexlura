'use client'

import { useState } from 'react'

const sectionStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '48px 0 16px',
    paddingTop: '48px',
    borderTop: '1px solid #EEEEEE',
}

const subStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0A0A0F',
    margin: '24px 0 8px',
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

export default function TermsPage() {
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms')

    function scrollTo(id: string, tab: 'terms' | 'privacy') {
        setActiveTab(tab)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const activeTabStyle: React.CSSProperties = {
        background: '#0A0A0F',
        color: '#FFFFFF',
        border: '1px solid #0A0A0F',
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        borderRadius: '2px',
    }

    const inactiveTabStyle: React.CSSProperties = {
        background: 'transparent',
        color: '#666677',
        border: '1px solid #E0E0E0',
        padding: '10px 24px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        borderRadius: '2px',
    }

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 24px' }}>

                {/* Header */}
                <h1 style={{ fontFamily: '"Bebas Neue", "Arial Black", sans-serif', fontSize: '48px', color: '#0A0A0F', marginBottom: '8px' }}>
                    Terms &amp; Privacy Policy
                </h1>
                <p style={{ fontSize: '13px', color: '#8888AA', marginBottom: '4px' }}>
                    Hexlura Ltd · Company No. 17102803 · Registered in England &amp; Wales
                </p>
                <p style={{ fontSize: '13px', color: '#8888AA', marginBottom: '8px' }}>
                    Last updated: March 2026
                </p>
                <div style={{ borderTop: '3px solid #E63950', margin: '24px 0 40px' }} />

                {/* Tab navigation */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
                    <button
                        style={activeTab === 'terms' ? activeTabStyle : inactiveTabStyle}
                        onClick={() => scrollTo('terms', 'terms')}
                    >
                        Terms of Service
                    </button>
                    <button
                        style={activeTab === 'privacy' ? activeTabStyle : inactiveTabStyle}
                        onClick={() => scrollTo('privacy', 'privacy')}
                    >
                        Privacy Policy
                    </button>
                </div>

                {/* ── TERMS OF SERVICE ── */}
                <div id="terms">
                    <h2 style={{ fontFamily: '"Bebas Neue", "Arial Black", sans-serif', fontSize: '32px', color: '#0A0A0F', margin: '0 0 24px' }}>
                        Terms of Service
                    </h2>

                    <h3 style={sectionStyle}>1. Introduction</h3>
                    <p style={bodyStyle}>
                        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Hexlura, an online event ticketing platform operated by Hexlura Ltd, a company registered in England and Wales (Company No. 17102803). By accessing or using hexlura.com, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use our platform.
                    </p>
                    <p style={bodyStyle}>
                        These Terms constitute a binding legal agreement between you (&ldquo;User&rdquo;) and Hexlura Ltd (&ldquo;Hexlura&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We may update these Terms at any time by posting the revised version on our website. Your continued use of the platform following any changes constitutes your acceptance of the updated Terms.
                    </p>

                    <h3 style={sectionStyle}>2. Definitions</h3>
                    <dl style={{ margin: 0 }}>
                        {[
                            ['"Platform"', 'means the website hexlura.com and any associated mobile applications'],
                            ['"User"', 'means any individual who accesses or uses the Platform, including Buyers, Organisers and Administrators'],
                            ['"Buyer"', 'means a User who purchases tickets through the Platform'],
                            ['"Organiser"', 'means a User who creates and sells tickets for events through the Platform'],
                            ['"Event"', 'means any event listed on the Platform for which tickets are available'],
                            ['"Ticket"', 'means a digital token purchased via the Platform granting entry to an Event'],
                            ['"Booking Fee"', 'means the service charge applied to each ticket purchase by Hexlura'],
                            ['"Payout"', 'means the transfer of ticket sale proceeds to an Organiser following an Event'],
                            ['"Content"', 'means all text, images, data and other materials appearing on the Platform'],
                        ].map(([term, def]) => (
                            <div key={term} style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                <dt style={{ fontWeight: 600, color: '#0A0A0F', fontSize: '15px', minWidth: '140px', flexShrink: 0 }}>{term}</dt>
                                <dd style={{ fontSize: '15px', color: '#333333', lineHeight: 1.7, margin: 0 }}>{def}</dd>
                            </div>
                        ))}
                    </dl>

                    <h3 style={sectionStyle}>3. User Accounts</h3>
                    <p style={subStyle}>3.1 To access certain features of the Platform, you must register for an account. You must:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Be at least 18 years of age',
                            'Provide accurate, complete and current information',
                            'Maintain the security of your password and account',
                            'Notify us immediately of any unauthorised use of your account',
                            'Accept responsibility for all activities that occur under your account',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={subStyle}>3.2 Hexlura reserves the right to suspend or terminate any account at its sole discretion, including where:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'These Terms have been violated',
                            'Fraudulent or misleading activity is suspected',
                            'An account has been inactive for 6 or more consecutive months',
                            'We are required to do so by law or regulation',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>

                    <h3 style={sectionStyle}>4. Ticket Purchases</h3>
                    <p style={bodyStyle}>4.1 All ticket purchases are subject to availability at the time of purchase.</p>
                    <p style={subStyle}>4.2 A booking fee is applied to each ticket purchase as follows:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Fee structure: 5% of ticket face value + 49p per ticket',
                            'Minimum booking fee: £0.99 per ticket',
                            'Maximum booking fee: £5.00 per ticket',
                            'The booking fee is shown clearly before you complete your purchase',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={bodyStyle}>4.3 Hexlura acts as the agent of the Organiser only. The contract for the supply of the event is between you and the Organiser. Hexlura is not a party to that contract and accepts no liability for the quality, safety, legality or any other aspect of any Event.</p>
                    <p style={bodyStyle}>4.4 Upon successful payment, you will receive a booking confirmation and e-tickets to your registered email address. It is your responsibility to ensure your email address is correct.</p>
                    <p style={bodyStyle}>4.5 Tickets are personal to the named holder and may not be resold or transferred except where the Organiser expressly permits this.</p>

                    <h3 style={sectionStyle}>5. Refunds and Cancellations</h3>
                    <p style={bodyStyle}>5.1 Refund eligibility is determined by the Organiser&apos;s refund policy, which is displayed on the Event listing prior to purchase. It is your responsibility to review this policy before completing your purchase.</p>
                    <p style={bodyStyle}>5.2 Booking fees are non-refundable under all circumstances, including where an Event is cancelled or postponed.</p>
                    <p style={subStyle}>5.3 If an Event is cancelled by the Organiser:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'You are entitled to a full refund of the ticket face value',
                            'Refunds will be processed within 10 business days of cancellation being confirmed',
                            'You will be notified by email',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={bodyStyle}>5.4 Refund requests must be submitted through your Hexlura account. Hexlura will process approved refunds within 30 days of approval being confirmed by the Organiser.</p>
                    <p style={bodyStyle}>5.5 Hexlura shall not be liable to any Buyer for any refunds where the Organiser fails to honour their refund policy. Your recourse in such circumstances is against the Organiser directly.</p>

                    <h3 style={sectionStyle}>6. Event Organisers</h3>
                    <p style={subStyle}>6.1 By listing an Event on the Platform, Organisers agree to:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Provide accurate and complete event information including date, time, venue, age restrictions and ticket details',
                            'Hold all necessary licences, permits and approvals required for the Event',
                            'Honour all valid tickets purchased through the Platform',
                            'Notify ticket holders promptly of any changes, postponements or cancellations',
                            'Process refunds in accordance with their stated refund policy',
                            'Comply with all applicable laws including the Consumer Rights Act 2015',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={subStyle}>6.2 Payouts to Organisers are processed as follows:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Payouts are initiated 2 business days after the Event end date',
                            'Payouts are made via Stripe Connect to the Organiser\'s connected bank account',
                            'Hexlura deducts its booking fees prior to payout',
                            'Hexlura reserves the right to withhold or delay payouts where fraud is suspected or disputes are outstanding',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={bodyStyle}>6.3 Hexlura reserves the right to remove any Event listing, cancel ticket sales or withhold payouts at its absolute discretion where it deems an Event to be in breach of these Terms or applicable law.</p>

                    <h3 style={sectionStyle}>7. Prohibited Conduct</h3>
                    <p style={{ ...bodyStyle, marginBottom: '8px' }}>Users must not:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Use the Platform for any unlawful purpose or in breach of any applicable regulation',
                            'Resell tickets at above face value (ticket touting)',
                            'Create fraudulent, misleading or duplicate Event listings',
                            'Misrepresent their identity or affiliation',
                            'Use automated tools, bots or scraping software on the Platform',
                            'Attempt to circumvent any security measure or access control',
                            'Interfere with the proper functioning of the Platform',
                            'Upload or transmit any malicious code, virus or harmful software',
                            'Harass, abuse or threaten other users or Hexlura staff',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>

                    <h3 style={sectionStyle}>8. Intellectual Property</h3>
                    <p style={bodyStyle}>8.1 All intellectual property rights in the Platform, including its design, software, text, graphics and trademarks, are owned by or licensed to Hexlura Ltd.</p>
                    <p style={bodyStyle}>8.2 You may not reproduce, distribute, modify or create derivative works from any Platform content without our prior written consent.</p>
                    <p style={bodyStyle}>8.3 By uploading content to the Platform (such as Event images or descriptions), you grant Hexlura a non-exclusive, royalty-free licence to use, display and distribute that content in connection with the Platform.</p>

                    <h3 style={sectionStyle}>9. Limitation of Liability</h3>
                    <p style={bodyStyle}>9.1 Hexlura provides the Platform on an &ldquo;as is&rdquo; basis. We make no warranties, express or implied, regarding the availability, accuracy or fitness for purpose of the Platform.</p>
                    <p style={subStyle}>9.2 To the fullest extent permitted by law, Hexlura shall not be liable for:</p>
                    <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                        {[
                            'Any indirect, consequential or special losses',
                            'Loss of revenue, profits or data',
                            'Any losses arising from Events listed on the Platform',
                            'Any acts or omissions of Organisers or third parties',
                        ].map(item => <li key={item} style={liStyle}>{item}</li>)}
                    </ul>
                    <p style={bodyStyle}>9.3 Our total aggregate liability to you shall not exceed the amount you paid in booking fees in the 12 months preceding the relevant claim.</p>
                    <p style={bodyStyle}>9.4 Nothing in these Terms limits our liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded by law.</p>

                    <h3 style={sectionStyle}>10. Force Majeure</h3>
                    <p style={bodyStyle}>Hexlura shall not be liable for any failure to perform its obligations where such failure results from circumstances beyond our reasonable control, including but not limited to acts of God, pandemic, government restrictions, power failure, internet outages or industrial disputes.</p>

                    <h3 style={sectionStyle}>11. Governing Law</h3>
                    <p style={bodyStyle}>These Terms are governed by the laws of England and Wales. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

                    <h3 style={sectionStyle}>12. Contact</h3>
                    <p style={bodyStyle}>For any queries regarding these Terms, contact us at <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a></p>
                </div>

                {/* ── PRIVACY POLICY ── */}
                <div
                    id="privacy"
                    style={{ background: '#F5F5F7', padding: '20px 32px', margin: '60px 0 0', borderRadius: '2px' }}
                >
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#0A0A0F', margin: '0 0 4px' }}>Privacy Policy</p>
                    <p style={{ fontSize: '13px', color: '#8888AA', margin: 0 }}>How we collect, use and protect your personal data</p>
                </div>

                <h3 style={sectionStyle}>13. Who We Are</h3>
                <p style={bodyStyle}>Hexlura Ltd (Company No. 17102803), registered in England and Wales, is the data controller for personal data collected through hexlura.com. We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
                <p style={bodyStyle}>For data protection queries, contact us at: <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a></p>
                <p style={subStyle}>We act as:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    <li style={liStyle}><strong>Data Controller:</strong> for personal data you provide when creating an account or purchasing tickets</li>
                    <li style={liStyle}><strong>Data Processor:</strong> where we process personal data on behalf of Organisers (such as attendee lists)</li>
                </ul>

                <h3 style={sectionStyle}>14. Information We Collect</h3>
                <p style={bodyStyle}>We collect the following personal data:</p>

                <p style={subStyle}>Account Information</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {['Full name, email address, phone number', 'Date of birth, gender (optional)', 'Profile photograph (if uploaded)'].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>

                <p style={subStyle}>Address Information</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    <li style={liStyle}>Home address and postcode (optional, used for location-based recommendations)</li>
                </ul>

                <p style={subStyle}>Payment Information</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    <li style={liStyle}>All payment data is processed securely by Stripe — Hexlura does not store card details</li>
                </ul>

                <p style={subStyle}>Booking Information</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {['Events booked, tickets purchased, booking references', 'Attendance history'].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>

                <p style={subStyle}>Technical Data</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {['IP address, browser type, device information', 'Pages visited, search queries, session data (collected via cookies)'].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>

                <p style={subStyle}>Communications</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    <li style={liStyle}>Support messages, feedback and correspondence with our team</li>
                </ul>

                <h3 style={sectionStyle}>15. How We Use Your Information</h3>
                <p style={bodyStyle}>We use your personal data to:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Create and manage your account',
                        'Process ticket purchases and send booking confirmations',
                        'Deliver e-tickets and event reminders',
                        'Process refunds and resolve disputes',
                        'Share relevant attendee information with Event Organisers',
                        'Send transactional emails (booking confirmations, password resets)',
                        'Personalise event recommendations based on your location and interests',
                        'Improve the Platform through analytics and usage data',
                        'Prevent fraud, abuse and unauthorised access',
                        'Comply with our legal and regulatory obligations',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>

                <h3 style={sectionStyle}>16. Legal Basis for Processing</h3>
                <p style={bodyStyle}>We process your personal data under the following legal bases as defined under UK GDPR:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Performance of a contract: to process ticket purchases and deliver our services',
                        'Legal obligation: to comply with financial, tax and regulatory requirements',
                        'Legitimate interests: to improve the Platform, prevent fraud and communicate with users',
                        'Consent: for marketing communications (you may withdraw consent at any time)',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>

                <h3 style={sectionStyle}>17. Data Sharing</h3>
                <p style={bodyStyle}>We share your personal data with the following third parties only where necessary:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Stripe: secure payment processing and fraud prevention',
                        'Resend: transactional email delivery (booking confirmations, password resets)',
                        'Event Organisers: your name, email and phone number are shared with the Organiser of events you have booked, solely for event administration purposes',
                        'Supabase: our database and authentication infrastructure provider',
                        'Legal authorities: where we are required by law to disclose information',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>
                <p style={bodyStyle}>We do not sell, rent or share your personal data with third parties for marketing purposes.</p>

                <h3 style={sectionStyle}>18. Data Retention</h3>
                <p style={bodyStyle}>We retain your personal data for the following periods:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Account data: for the duration of your account and up to 7 years after closure',
                        'Booking and transaction records: 7 years, as required by UK financial regulations',
                        'Marketing preferences: until you withdraw consent',
                        'Technical/usage data: up to 24 months',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>
                <p style={bodyStyle}>You may request deletion of your account and associated data at any time. Please note that certain data may be retained for legal compliance purposes even after deletion.</p>

                <h3 style={sectionStyle}>19. Your Rights Under UK GDPR</h3>
                <p style={bodyStyle}>You have the following rights in relation to your personal data:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'Right of access: to request a copy of the data we hold about you',
                        'Right to rectification: to correct any inaccurate or incomplete data',
                        'Right to erasure: to request deletion of your data ("right to be forgotten")',
                        'Right to restrict processing: to limit how we use your data in certain circumstances',
                        'Right to data portability: to receive your data in a structured, machine-readable format',
                        'Right to object: to object to processing based on legitimate interests or for direct marketing',
                        'Right to withdraw consent: at any time, where processing is based on consent',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>
                <p style={bodyStyle}>To exercise any of these rights, contact us at <a href="mailto:support@hexlura.com" style={{ color: '#E63950' }}>support@hexlura.com</a>. We will respond within 30 days. If you are dissatisfied with our response, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at ico.org.uk.</p>

                <h3 style={sectionStyle}>20. Security</h3>
                <p style={bodyStyle}>We implement the following security measures to protect your personal data:</p>
                <ul style={{ paddingLeft: '24px', margin: '0 0 16px' }}>
                    {[
                        'SSL/TLS encryption on all data transmitted to and from the Platform',
                        'Secure password hashing using industry-standard algorithms',
                        'Payment data processed by Stripe under PCI DSS Level 1 compliance',
                        'Regular security reviews and access controls',
                        'Role-based access restrictions for staff',
                    ].map(i => <li key={i} style={liStyle}>{i}</li>)}
                </ul>
                <p style={bodyStyle}>Despite these measures, no internet transmission is completely secure. We cannot guarantee the absolute security of data transmitted to our Platform.</p>

                <h3 style={sectionStyle}>21. International Transfers</h3>
                <p style={bodyStyle}>Your personal data is stored and processed within the UK and European Economic Area (EEA). Where any data is transferred outside the EEA (for example via our service providers), we ensure appropriate safeguards are in place in accordance with UK GDPR requirements.</p>

                <h3 style={sectionStyle}>22. Changes to This Policy</h3>
                <p style={bodyStyle}>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. The date of the most recent revision appears at the top of this page. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>

                <div style={{ height: '60px' }} />
            </div>
        </div>
    )
}
