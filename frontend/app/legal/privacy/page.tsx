import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Research-Agent',
  description: 'Privacy Policy for Research-Agent',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">
          RESEARCH-AGENT PRIVACY POLICY
        </h1>
        <p className="text-zinc-400 mb-8">Last updated: 13 May 2025</p>

        <div className="space-y-6">
          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              1. WHO WE ARE
            </h2>
            <p className="text-zinc-300">
              Research-Agent, LLC (&quot;we,&quot; &quot;our,&quot;
              &quot;us&quot;) operates the Research-Agent Service.
            </p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              2. INFORMATION WE COLLECT
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-zinc-300">Account Info</p>
                <p className="text-zinc-400">
                  Email, password hash, subscription plan (Direct)
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Usage Data</p>
                <p className="text-zinc-400">
                  Query text, chat history, clicked links (Direct)
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Device & Log</p>
                <p className="text-zinc-400">
                  IP address, browser type, referrer URL, timestamps (Automatic)
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Payment</p>
                <p className="text-zinc-400">
                  Card last-4, billing address (stored by Stripe) (Payment
                  Processor)
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  Cookies & Analytics
                </p>
                <p className="text-zinc-400">
                  Session cookie, Vercel Analytics page views (Automatic)
                </p>
              </div>
            </div>
            <p className="text-zinc-300 mt-4">
              We do not intentionally collect protected health information
              (PHI); uploading PHI is prohibited by our TOS.
            </p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              3. HOW WE USE THE DATA
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li>Provide, maintain, and secure the Service</li>
              <li>Personalize user experience and store chat history</li>
              <li>
                Monitor system performance, detect abuse, and improve models
              </li>
              <li>Billing and account management</li>
              <li>Communicate updates, with your consent</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              4. LEGAL BASES (GDPR)
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-zinc-300">
                  Operate the Service
                </p>
                <p className="text-zinc-400">Contract (Art. 6 (1)(b))</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  Improve & secure the Service
                </p>
                <p className="text-zinc-400">
                  Legitimate interest (Art. 6 (1)(f))
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Marketing e-mails</p>
                <p className="text-zinc-400">Consent (Art. 6 (1)(a))</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  Payment processing
                </p>
                <p className="text-zinc-400">Contract + Legitimate interest</p>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              5. SHARING & DISCLOSURE
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-zinc-300">
                  Supabase (U.S., EU)
                </p>
                <p className="text-zinc-400">Hosting & Postgres database</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Stripe</p>
                <p className="text-zinc-400">Subscription billing</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  OpenAI, Google AI, Anthropic
                </p>
                <p className="text-zinc-400">
                  Large-language-model inference (query text and context sent)
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Vercel Inc.</p>
                <p className="text-zinc-400">Deployment & analytics</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  Law enforcement / regulators
                </p>
                <p className="text-zinc-400">
                  When legally required or to prevent harm
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">Successor entity</p>
                <p className="text-zinc-400">
                  In case of merger, acquisition, or asset sale
                </p>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              6. INTERNATIONAL TRANSFERS
            </h2>
            <p className="text-zinc-300">
              Data is stored in the United States. For EU/UK users we rely on
              the European Commission&apos;s Standard Contractual Clauses.
            </p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              7. DATA RETENTION
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li>
                Account data: until you delete your account or 3 years after
                last activity
              </li>
              <li>Chat logs: until deleted by you or 3 years after creation</li>
              <li>Payment records: 7 years (tax/legal)</li>
              <li>Anonymized analytics: indefinite</li>
            </ul>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              8. SECURITY
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li>TLS 1.3 encryption in transit, AES-256 at rest</li>
              <li>Principle-of-least-privilege access controls</li>
              <li>Annual penetration test</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              No system is 100% secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              9. YOUR RIGHTS
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-zinc-300">EEA/UK</p>
                <p className="text-zinc-400">
                  Access, rectification, erasure, restriction, portability,
                  objection, lodge complaint with supervisory authority
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">
                  California (CCPA/CPRA)
                </p>
                <p className="text-zinc-400">
                  Know, delete, opt-out of sale/share, non-discrimination
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">All users</p>
                <p className="text-zinc-400">
                  Close account & delete data by e-mailing us
                </p>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              10. CHILDREN
            </h2>
            <p className="text-zinc-300">
              The Service is not directed to children under 13 (U.S.) / under 16
              (EEA). We do not knowingly collect their data. If you believe we
              have, contact us for deletion.
            </p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              11. DO NOT TRACK
            </h2>
            <p className="text-zinc-300">We do not respond to DNT signals.</p>
          </section>

          <section className="bg-zinc-900/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              12. CHANGES TO THIS POLICY
            </h2>
            <p className="text-zinc-300">
              We may update this Privacy Policy; material changes will be
              announced via the app or e-mail.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
