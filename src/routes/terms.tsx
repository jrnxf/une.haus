import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/terms")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>terms</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
          <h1>Terms of Service</h1>

          <h2>Overview</h2>
          <p>
            By accessing or using une.haus, you agree to be bound by these Terms
            of Service.
          </p>

          <h2>Use of Service</h2>
          <p>
            You agree to use the service only for lawful purposes and in
            accordance with these terms. You are responsible for maintaining the
            confidentiality of your account credentials.
          </p>

          <h2>User Content</h2>
          <p>
            You retain ownership of content you submit. By posting content, you
            grant une.haus a non-exclusive license to use, display, and
            distribute that content within the platform.
          </p>

          <h2>Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Upload malicious software or interfere with the service</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
          </ul>

          <h2>Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time
            for violations of these terms or for any other reason at our
            discretion.
          </p>

          <h2>Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind, either express or implied.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service after changes constitutes acceptance of the updated terms.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a href="mailto:terms@une.haus">terms@une.haus</a>.
          </p>
        </div>
      </div>
    </>
  );
}
