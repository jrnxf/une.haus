import { Tailwind } from "@react-email/components";

export default function AuthCodeTemplate({ code }: { code: number }) {
  return (
    <Tailwind>
      <div className="font-mono">
        <h1 className="text-2xl font-bold">une.haus</h1>
        <p>Enter the following code to authenticate:</p>
        <span className="font-mono text-4xl font-bold">
          {String(code).padStart(4, "0")}
        </span>

        <p>This code will expire in 5 minutes</p>
      </div>
    </Tailwind>
  );
}
