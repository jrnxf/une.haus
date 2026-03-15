import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { seo } from "~/lib/seo"

export const Route = createFileRoute("/privacy")({
  component: RouteComponent,
  head: () =>
    seo({
      title: "privacy policy",
      description: "privacy policy for une.haus",
      path: "/privacy",
    }),
})

function RouteComponent() {
  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>privacy</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl p-4">
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>

          <h2>Overview</h2>
          <p>
            This policy explains what data une.haus collects, how it's used, and
            who it's shared with.
          </p>

          <h2>Account Data</h2>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>
              <strong>Email address</strong> — used for authentication (we send
              a verification code, no passwords are stored)
            </li>
            <li>
              <strong>Name</strong> — displayed on your profile
            </li>
          </ul>
          <p>You can optionally provide:</p>
          <ul>
            <li>Bio, avatar image, and riding disciplines</li>
            <li>
              Location (city/coordinates via Google Places — used for the
              community map)
            </li>
            <li>
              Social links (Instagram, YouTube, TikTok, Facebook, X, Spotify)
            </li>
          </ul>

          <h2>Content You Create</h2>
          <p>
            We store the content you choose to post, including videos, text
            posts, comments, trick submissions, game entries, and tournament
            participation. We also store engagement data like likes, follows,
            and votes.
          </p>

          <h2>Videos &amp; Images</h2>
          <p>
            Videos you upload are processed and hosted by{" "}
            <a
              href="https://www.mux.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mux
            </a>
            . Avatar images and image media are stored via{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare Images
            </a>
            .
          </p>

          <h2>Cookies &amp; Sessions</h2>
          <p>
            We use a single encrypted session cookie to keep you logged in (30
            days, rolling). We do not use analytics cookies, tracking pixels, or
            third-party ad trackers. There is no Google Analytics, Mixpanel, or
            similar tracking on this site.
          </p>

          <h2>Online Presence</h2>
          <p>
            We display a count of who's currently active on the site using a
            server-side polling system. No third-party service is involved. For
            logged-in users, your name and avatar are visible to other users in
            the "online" indicator. Presence data is held in server memory and
            discarded shortly after you leave the site.
          </p>

          <h2>Error Monitoring</h2>
          <p>
            We use{" "}
            <a
              href="https://sentry.io/privacy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sentry
            </a>{" "}
            to monitor application errors and performance. When an error occurs,
            Sentry may collect technical information such as your browser type,
            operating system, the URL you were visiting, stack traces, and your
            IP address. If you are logged in, your user ID and email address are
            associated with error reports. This data is used solely for
            debugging and improving the platform.
          </p>

          <h2>Emails</h2>
          <p>We send emails for:</p>
          <ul>
            <li>Authentication (verification codes)</li>
            <li>
              Notification digests (likes, comments, follows — configurable
              frequency)
            </li>
            <li>Game and trick reminders (opt-in)</li>
          </ul>
          <p>
            Emails are delivered via{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend
            </a>
            . You can unsubscribe from all non-authentication emails in your
            notification settings or via unsubscribe links.
          </p>

          <h2>Third-Party Services</h2>
          <p>
            Your data is shared with these services solely to operate the
            platform:
          </p>
          <ul>
            <li>
              <strong>Neon</strong> — database hosting
            </li>
            <li>
              <strong>Mux</strong> — video processing and streaming
            </li>
            <li>
              <strong>Cloudflare</strong> — image hosting
            </li>
            <li>
              <strong>Resend</strong> — email delivery
            </li>
            <li>
              <strong>Google Maps API</strong> — location search (your search
              queries are sent to Google when you set your location)
            </li>
            <li>
              <strong>Sentry</strong> — error monitoring and performance
              tracking
            </li>
          </ul>
          <p>
            We do not sell your data. We may share information to comply with
            legal obligations.
          </p>

          <h2>Data Retention &amp; Deletion</h2>
          <p>
            Your data is retained as long as your account exists. Authentication
            codes expire after 5 minutes. Sessions expire after 30 days. If you
            delete your account, all associated data is deleted (cascading).
          </p>
          <p>
            You can request access, correction, or deletion of your data by
            contacting us.
          </p>

          <h2>Children</h2>
          <p>This site is not intended for users under 13.</p>

          <h2>Changes</h2>
          <p>This policy may be updated. Check back periodically.</p>

          <h2>Contact</h2>
          <p>
            Questions? Reach out at{" "}
            <a href="mailto:colby@jrnxf.co">colby@jrnxf.co</a>.
          </p>
        </div>
      </div>
    </>
  )
}
