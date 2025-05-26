import { Button, Tailwind } from "@react-email/components";

import { env } from "~/lib/env";

export default function MagicLinkTemplate({
  token,
  redirect,
}: {
  token: string;
  redirect: string;
}) {
  return (
    <Tailwind>
      <div className="font-mono">
        <h1 className="text-2xl font-bold">une.haus</h1>
        <p>Click the button below to authenticate and be taken to the app.</p>
        <Button
          href={`${env.URL}/api/auth/verify?token=${token}&redirect=${redirect}`}
          className="rounded-md bg-black px-2.5 py-1.5 font-mono text-white"
        >
          Authenticate
        </Button>
      </div>
    </Tailwind>
  );
}
