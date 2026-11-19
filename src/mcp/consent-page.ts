import { buttonVariants } from "~/components/ui/button"
import { injectThemeScript } from "~/lib/theme/inject"

import type { ConsentDescription } from "@cloudflare/workers-oauth-provider"

// The consent page is plain HTML from the /oauth/authorize server route: it
// must post a form back to the same URL and set the provider's cookies, which
// a React page cannot do. It uses the app stylesheet, so it still looks like
// une.haus.

// Client names, domains and hosts come from the client, so an attacker
// picks them. Escape every one.
const escape = (value: string) =>
  value.replaceAll(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

function shell(css: string, title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)} - une.haus</title>
<link rel="stylesheet" href="${escape(css)}">
<script>(${injectThemeScript.toString()})()</script>
</head>
<body class="bg-background text-foreground antialiased">
<main class="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 p-4 md:p-6">
<p class="font-mono text-sm text-muted-foreground">une.haus</p>
${body}
</main>
</body>
</html>`
}

export function consentPage({
  css,
  details,
  handle,
  userName,
}: {
  css: string
  details: ConsentDescription
  handle: string
  userName: string
}) {
  const name = escape(details.clientName)
  const origin = details.clientDomain
    ? `published by <strong class="text-foreground">${escape(details.clientDomain)}</strong>.`
    : "this app named itself, so its name is not checked."
  const loopback = details.redirectIsLoopback
    ? `<p class="rounded-md border border-border bg-muted p-4 text-sm">this sends access to an app on your computer. continue only if you just started to connect from it.</p>`
    : ""
  const scopes = details.scope
    .map(
      (scope) => `<input type="hidden" name="scope" value="${escape(scope)}">`,
    )
    .join("")

  return shell(
    css,
    `connect ${details.clientName}`,
    `<div class="flex flex-col gap-2">
<h1 class="text-xl font-semibold">allow ${name} to read une.haus as you?</h1>
<p class="text-sm text-muted-foreground">${origin} access goes to <strong class="text-foreground">${escape(details.redirectHost)}</strong>.</p>
</div>
${loopback}
<ul class="flex list-disc flex-col gap-1 pl-6 text-sm">
<li>it can read posts, riders, games and videos.</li>
<li>it cannot post, like or change anything.</li>
<li>it never sees your email.</li>
</ul>
<form method="post" class="flex flex-col gap-4">
<input type="hidden" name="handle" value="${escape(handle)}">
${scopes}
<p class="text-sm text-muted-foreground">signed in as <strong class="text-foreground">${escape(userName)}</strong></p>
<div class="flex justify-end gap-2">
<button class="${buttonVariants({ variant: "secondary" })}" name="decision" value="deny">deny</button>
<button class="${buttonVariants()}" name="decision" value="approve">allow</button>
</div>
</form>`,
  )
}

export function errorPage(css: string, message: string) {
  return shell(
    css,
    "cannot connect",
    `<h1 class="text-xl font-semibold">cannot connect this app</h1>
<p class="text-sm text-muted-foreground">${escape(message)}</p>
<p class="text-sm text-muted-foreground">start again from the app.</p>`,
  )
}
