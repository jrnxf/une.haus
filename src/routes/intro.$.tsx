import { createFileRoute, Link } from "@tanstack/react-router"

import { Logo } from "~/components/logo"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { seo } from "~/lib/seo"

export const Route = createFileRoute("/intro/$")({
  component: RouteComponent,
  head: () =>
    seo({
      title: "intro",
      description: "welcome to une.haus — the next chapter for our community",
      path: "/intro",
    }),
})

function RouteComponent() {
  const { _splat } = Route.useParams()
  const destination = _splat ? `/${_splat}` : "/"

  return (
    <div className="mx-auto w-full max-w-3xl p-4 lowercase md:p-6">
      <div className="flex justify-center py-6">
        <Logo className="h-10 w-auto" />
      </div>
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <p>
          Welcome to une.haus. If you're coming from skrrrt.io, welcome back. If
          you're brand new — you're in the right place.
        </p>

        <p>
          une.haus is the next chapter for the une community. It's been rebuilt
          from the ground up to give you more ways to connect, create, and
          compete.
        </p>
        <p>
          Everything you loved about skrrrt.io is still here (games, chat,
          posts, profiles, map, etc) but each one has been rethought and
          expanded.
        </p>

        <h3>games</h3>
        <p>
          Instead of one game, there are now three. <strong>Rack It Up</strong>{" "}
          is the original. Post up to three creative sets weekly and submit for
          all other rider sets. Rider with the most points wins.{" "}
          <strong>Back It Up</strong> is about backing up the last trick then
          setting a new one. The never-ending game. <strong>Stack It Up</strong>{" "}
          is about landing every trick in an ever-growing stack then setting
          your own at the end. Consistency wins. Each game has its own rhythm,
          and you'll find a different kind of challenge in each one.
        </p>

        <h3>Tricks</h3>
        <p>
          There's now a full tricks library, searchable, sortable, and
          filterable by elements and modifiers. Whether you're trying to name
          something you just landed or looking for inspiration, it's all
          cataloged in one place with a glossary to go along with it.
        </p>

        <p>
          A huge thank you to the riders who built and maintained the{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1MkBw37AB-pdIh4j6a76rBraM02kYZacu4rtGyOrLdh8/edit"
            target="_blank"
            rel="noopener noreferrer"
          >
            tricktionary
          </a>{" "}
          — the community Google Sheet that tracked trick data for years. That
          sheet was the foundation for our tricks database and none of it would
          exist without the time and care those riders put into documenting what
          we do.
        </p>

        <h3>vault</h3>
        <p>
          The entire unicycle.tv video archive. Browse what riding was like in
          the golden age of une, before YouTube and Facebook took us off the
          forums.
        </p>

        <h3>tourneys</h3>
        <p>
          Full tournament support with prelims, rankings, and bracket stages.
          Create or join tournaments and follow them through to completion. Each
          tournament has its own public page that updates in real time and hides
          all admin controls.
        </p>

        <h3>posts</h3>
        <p>
          Posts now better support images, video uploads, YouTube embeds, tags,
          and even mentioning other riders. It's a real discussion board, not
          just a text feed. Filter by topic, search by content, and engage with
          likes and comments.
        </p>

        <h3>metrics</h3>
        <p>
          Track community activity with real-time metrics. Posts, games, tricks,
          vault videos, and user growth all in one place.
        </p>

        <h3>arcade</h3>
        <p>
          Hit jumps, grind rails, dodge scooter kids. The brainchild of my son{" "}
          <RichText content="@[452]" /> and me.
        </p>

        <h2>Staying connected</h2>

        <p>
          One of the biggest additions to une.haus is how you stay in the loop
          with what other riders are doing.
        </p>

        <h3>Following</h3>
        <p>
          When you follow someone, you'll get notified whenever they post new
          content. A new post, a game submission, a vault video. Your feed
          reflects the riders you actually care about, not just whatever was
          posted most recently.
        </p>

        <h3>Mentions</h3>
        <p>
          Any text area on the site (chat, posts, comments) supports mentions.
          Type <code>@</code> and start typing a name to pull up a list of
          users. Select someone and they'll be tagged in your message. Here's
          what a mention looks like when rendered:
        </p>

        <p>
          "just landed my first unispin, thanks <RichText content="@[1]" /> for
          the tip"
        </p>

        <p>
          Mentions show up as clickable links to that person's profile, and more
          importantly, the person you mention gets a notification so they don't
          miss it.
        </p>

        <h3>In-app notifications</h3>
        <p>
          You'll get notified inside the app when someone likes your content,
          comments on something you posted, follows you, mentions you, or when
          someone you follow posts something new. These show up in your
          notification feed so you can catch up at a glance.
        </p>

        <p>
          You can toggle each type on or off individually. If you only care
          about mentions and follows, turn off the rest. If you want everything,
          leave them all on. It's your call.
        </p>

        <h3>Email digests</h3>
        <p>
          If you'd rather not check the app constantly, you can opt into email
          digests. Choose between daily or weekly, pick the day and time that
          works for you, and you'll get a summary of everything you missed
          delivered to your inbox. Digests are off by default. Turn them on in
          your notification settings.
        </p>

        <p>
          There are also game-specific reminders you can subscribe to. Get a
          heads-up when a new Rack It Up round starts, or a reminder a few days
          before the round ends so you don't forget to submit. You choose how
          far in advance you want the nudge.
        </p>

        <p>
          And if you ever want to go quiet, there's a single switch to
          unsubscribe from all emails at once. No hunting through settings.
        </p>

        <h2>Community-driven</h2>

        <p>
          any rider can contribute to the platform. Submit new tricks, propose
          updates to existing tricks, add videos to trick entries, suggest edits
          to vault content, and flag anything that doesn't look right. All
          contributions go through admin review, so the quality stays high while
          the doors stay open. If you see something missing or something off,
          you have the tools to help fix it.
        </p>

        <h2>Open source</h2>

        <p>
          une.haus is fully open source. The entire codebase is available at{" "}
          <a
            href="https://github.com/jrnxf/une.haus"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/jrnxf/une.haus
          </a>
          . If you want to see how something works, report a bug, or contribute,
          it's all there. I'm so glad you're here. Thanks for being a part of
          the une community.
        </p>
        <p className="text-right">
          <RichText content="@[1]" />
        </p>
      </div>

      <div className="flex justify-center py-6">
        <Button asChild>
          <Link to={destination}>let me in</Link>
        </Button>
      </div>
    </div>
  )
}
