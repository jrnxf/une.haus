import {
  AuthorizationError,
  CimdFetchError,
} from "@cloudflare/workers-oauth-provider"
import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"

import { getServerSessionUser } from "~/lib/session/hooks"
import { consentPage, errorPage } from "~/mcp/consent-page"
import { type McpProps, oauthApi } from "~/mcp/oauth"
import appCss from "~/styles.css?url"

// Response.redirect has immutable headers, and the app middleware adds
// headers after this handler. Build the redirect by hand.
const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { Location: location } })

const html = (body: string, status = 200, headers = new Headers()) => {
  headers.set("Content-Type", "text/html; charset=utf-8")
  return new Response(body, { status, headers })
}

// Errors the member can see. A redirect back to the client is safe only once
// the provider has checked the client and its redirect URI.
function failure(error: unknown) {
  if (error instanceof AuthorizationError && error.redirectTo) {
    return redirect(error.redirectTo)
  }
  if (error instanceof AuthorizationError) {
    return html(errorPage(appCss, error.description), 400)
  }
  if (error instanceof CimdFetchError) {
    return html(errorPage(appCss, "this app could not be checked."), 400)
  }
  throw error
}

export const Route = createFileRoute("/oauth/authorize")({
  server: {
    handlers: {
      // An MCP client sends the member here to approve it.
      GET: async ({ request }) => {
        const user = await getServerSessionUser()
        const oauth = oauthApi(request, env)
        try {
          const authRequest = await oauth.parseAuthRequest(request)
          if (!user) {
            // Sign in with the normal email code, then come back here.
            const url = new URL(request.url)
            const back = encodeURIComponent(url.pathname + url.search)
            return redirect(`/auth?redirect=${back}`)
          }
          // describeConsent first: a failed lookup leaves nothing in KV.
          const details = await oauth.describeConsent(authRequest)
          const consent = await oauth.beginConsent(authRequest)
          return html(
            consentPage({
              css: appCss,
              details,
              handle: consent.handle,
              userName: user.name,
            }),
            200,
            consent.headers,
          )
        } catch (error) {
          return failure(error)
        }
      },

      // The consent form posts back here with allow or deny.
      POST: async ({ request }) => {
        const user = await getServerSessionUser()
        const oauth = oauthApi(request, env)
        if (!user) {
          return html(errorPage(appCss, "you are signed out."), 401)
        }
        try {
          const form = await request.formData()
          const handle = String(form.get("handle"))
          if (form.get("decision") !== "approve") {
            const denied = await oauth.denyConsent(request, handle)
            return new Response(null, { status: 302, headers: denied.headers })
          }
          const approved = await oauth.approveConsent(request, handle, {
            scope: form.getAll("scope").map(String),
          })
          const props: McpProps = { userId: user.id }
          const { redirectTo } = await oauth.completeAuthorization({
            // The stored request, not the form, decides what is granted.
            request: approved.request,
            userId: String(user.id),
            metadata: {},
            scope: approved.request.scope,
            props,
          })
          approved.headers.set("Location", redirectTo)
          return new Response(null, { status: 302, headers: approved.headers })
        } catch (error) {
          return failure(error)
        }
      },
    },
  },
})
