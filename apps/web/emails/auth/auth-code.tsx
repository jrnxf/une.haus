import { Tailwind } from "@react-email/components"

export const PreviewProps = {
  code: "123456",
}

export default function AuthCodeTemplate({
  code = "000000",
}: {
  code: string
}) {
  return (
    <Tailwind>
      <div className="font-mono">
        <h1 className="text-2xl font-bold">une.haus</h1>
        <p>enter the following code to authenticate:</p>
        <span className="font-mono text-4xl font-bold">{code}</span>
        <p>this code will expire in 5 minutes</p>
      </div>
    </Tailwind>
  )
}
