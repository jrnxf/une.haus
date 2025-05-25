import getYoutubeVideoId from "get-youtube-id";
import { useState } from "react";

import { Input } from "~/components/ui/input";
import { YoutubeIframe } from "~/components/youtube-iframe";

export function YoutubeInput({
  currentId = "",
  onChange,
}: {
  currentId?: null | string;
  onChange: (uploadId: null | string) => void;
}) {
  const [youtubeVideoId, setYoutubeVideoId] = useState<null | string>(
    currentId,
  );
  return (
    <div className="space-y-2">
      <Input
        defaultValue={currentId ? `https://youtu.be/${currentId}` : ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          const videoId = getYoutubeVideoId(nextValue);
          setYoutubeVideoId(videoId);
          onChange(videoId);
        }}
      />

      {youtubeVideoId && <YoutubeIframe videoId={youtubeVideoId} />}
    </div>
  );
}
