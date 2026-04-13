import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly to us when you create an account, run a brand analysis, or contact us. This includes your name, email address, brand information (website URL, social media handles, industry), and payment information processed through our payment providers.

We also automatically collect certain usage information when you visit Skorvia, including your IP address (used only for currency detection), browser type, and pages visited.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:
• Provide, operate, and improve the Skorvia platform
• Generate your Ad Readiness Score and action plan
• Send you transactional emails (account confirmation, password reset)
• Communicate with you about product updates and new features (you can opt out)
• Process payments through our secure payment providers
• Detect fraud and ensure platform security`,
  },
  {
    title: "3. Data Storage and Security",
    content: `Your data is stored on secure PostgreSQL databases hosted in the European Union. We use industry-standard encryption (TLS 1.3) for data in transit and AES-256 encryption for sensitive data at rest.

We implement strict access controls and conduct regular security audits. We never store plain-text passwords — all passwords are hashed using bcrypt with a minimum cost factor of 12.`,
  },
  {
    title: "4. Data Sharing",
    content: `We do not sell, trade, or rent your personal data to third parties. We may share data only with:
• Service providers who help us operate Skorvia (e.g., hosting, email)
• Payment processors for subscription management
• Law enforcement when required by law

All third-party providers are contractually required to handle data according to our privacy standards.`,
  },
  {
    title: "5. Your Rights",
    content: `You have the right to:
• Access the personal data we hold about you
• Correct inaccurate or incomplete data
• Request deletion of your account and associated data
• Export your data in a portable format
• Object to processing of your data for marketing purposes

To exercise any of these rights, email us at privacy@skorvia.io.`,
  },
  {
    title: "6. Cookies",
    content: `Skorvia uses minimal cookies — primarily session tokens stored in localStorage (not cookies) to identify your session. We do not use third-party tracking or advertising cookies. You can clear your localStorage data at any time through your browser settings.`,
  },
  {
    title: "7. Children's Privacy",
    content: `Skorvia is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a child, please contact us immediately.`,
  },
  {
    title: "8. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email and by posting a notice on our platform at least 14 days before the change takes effect.`,
  },
  {
    title: "9. Contact Us",
    content: `For privacy-related questions or requests, contact our Data Protection Officer at privacy@skorvia.io or write to us at: Skorvia, Lagos, Nigeria.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: April 5, 2026</p>
          </div>
          <div className="prose prose-slate max-w-none space-y-8">
            <p className="text-muted-foreground text-lg leading-relaxed">
              At Skorvia, your privacy is important to us. This policy explains what information we collect, how we use it, and your rights regarding that information.
            </p>
            {sections.map((section, i) => (
              <div key={i} className="space-y-3">
                <h2 className="text-xl font-bold">{section.title}</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
