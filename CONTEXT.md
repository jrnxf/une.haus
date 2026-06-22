# une.haus

The community platform for **unicycle** riders worldwide — "all things une." Members post, chat, play
games, build a shared trick vocabulary, and connect. This glossary defines the project's ubiquitous
language; it is a glossary only, free of implementation detail.

## Language

**une**:
A unicycle. "une" is the brand's shorthand for the vehicle riders ride; the plural is **unes**.
_Avoid_: unicycle (in code/UI copy — the brand term is "une"), bike, cycle.

**rider**:
A member of une.haus who rides unes and participates in the community (posts, chat, games, trick
submissions). The canonical word for a user in rider-facing context.
_Avoid_: user (reserve for the auth/account concept), player, member.

### Tricks

**trick**:
A named une maneuver — the unit of the shared trick catalogue. Carries alternate names, who invented it,
year landed, demo videos, and typed relationships to other tricks.

**element**:
An intrinsic building block a trick is *composed of* (spin, flip, twist). Assigned per-trick (many-to-many).
Defines what the trick *is*.
_Avoid_: component, part.

**modifier**:
An orthogonal variation that can decorate *any* trick without changing its identity (e.g. stance or grab
variations). Defines how a trick is *varied*, not what it is. Global — applies across tricks.
_Avoid_: variation, tag.

**glossary**:
The shared vocabulary of elements and modifiers. Riders submit glossary proposals to create or edit an
element or modifier, which are reviewed before entering the glossary.

**trick submission**:
A rider's proposal for a **new** trick, awaiting review (pending → approved/rejected).
_Avoid_: suggestion (that is a different concept — see below).

**trick suggestion**:
A rider's proposed **edit to an existing** trick, expressed as a diff and awaiting review.
_Avoid_: submission, edit request.

### Games

Three rider games, each an "___ It Up" format. All are built from **sets** and **submissions**.

**RIU — "Rack It Up"**:
A rotating challenge game. Riders post **sets** and reply with **submissions**; each upload scores a point
and drives a rider ranking, with last-upload-time tiebreakers. Runs in rounds that rotate (active → archived).

**BIU — "Back It Up"**:
A game of proving a trick by landing it again on demand — confirming consistency, not a one-off.

**SIU — "Stack It Up"**:
A game of accumulating / chaining tricks into a stack (combo or volume).

**set**:
A rider's primary entry in a game (the thing being posted/answered).

**submission**:
A rider's reply entry within a game, made against the active round/set.

**round / rotation**:
A RIU cycle of play; rounds rotate over time, moving older ones from **active** to **archived**.

### Video vault

**vault** (UTV):
A locked archive of videos imported from **unicycle.tv** (Olaf's collection). Content is read-only — riders
cannot add or remove videos; they may only update a video's metadata and like/message. A **video suggestion**
is a proposed edit to an existing vault video's metadata.
_Avoid_: une TV (UTV is *not* "une tv"), library, channel.

### Engagement

Riders engage with most entities (posts, sets, submissions, vault videos, tricks, chat) the same two ways.

**like**:
A rider's single positive mark on an entity or message. The user-facing term.
_Avoid_: reaction (the internal `reactions` module is a misnomer — there is only one mark, the like),
favorite, upvote.

**message**:
A comment-thread entry attached to an entity. The user-facing term for what other apps call a comment;
messages can themselves be liked.
_Avoid_: comment, reply, post (a post is its own top-level entity, not a message).
