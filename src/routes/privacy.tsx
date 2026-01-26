import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>

        <h2>Overview</h2>
        <p>
          This Privacy Policy explains how personal information is collected,
          used, and shared when you visit or use une.haus.
        </p>

        <h2>Information Collection</h2>

        <h3>Device Information</h3>
        <p>We automatically collect certain information, including:</p>
        <ul>
          <li>Web browser details</li>
          <li>IP address and time zone</li>
          <li>Cookies</li>
          <li>Pages viewed and referral sources</li>
          <li>Interaction patterns with the site</li>
        </ul>
        <p>
          This information is collected using cookies, log files, and similar
          technologies.
        </p>

        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Name and email address</li>
          <li>Profile information you choose to provide</li>
        </ul>

        <h2>Information Use</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Communicate with you about your account</li>
          <li>Screen for potential security risks and fraud</li>
          <li>Improve site performance through analytics</li>
        </ul>

        <h2>Third-Party Sharing</h2>
        <p>
          We may share your information with third-party service providers to
          help us operate the site and analyze usage. Personal information may
          also be shared to comply with legal requirements or respond to lawful
          requests.
        </p>

        <h2>User Rights</h2>
        <p>
          You can request access, correction, or deletion of your personal
          information by contacting us directly.
        </p>

        <h2>Additional Provisions</h2>
        <ul>
          <li>Data is retained unless deletion is requested</li>
          <li>This site is not intended for users under 13</li>
          <li>This policy may be updated periodically</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For questions about this privacy policy, contact us at{" "}
          <a href="mailto:privacy@une.haus">privacy@une.haus</a>.
        </p>
      </div>
    </div>
  );
}
