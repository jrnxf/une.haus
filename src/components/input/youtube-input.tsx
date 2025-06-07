import { useState } from "react";

import getYoutubeVideoId from "get-youtube-id";

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
        placeholder="YouTube URL"
        onChange={(event) => {
          const value = event.target.value;
          const videoId = getYoutubeVideoId(value);
          setYoutubeVideoId(videoId);
          onChange(value);
        }}
      />

      {youtubeVideoId && <YoutubeIframe videoId={youtubeVideoId} />}
    </div>
  );
}
