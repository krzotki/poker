import React from "react";

export const useAudio = (src: string) => {
  const [audio, setAudio] = React.useState<HTMLAudioElement>();

  React.useEffect(() => {
    if (!audio) {
      const newAudio = new Audio(src);
      newAudio.volume = 0.2;
      setAudio(newAudio);
    } else {
      audio.src = src;
    }
  }, [src, audio]);

  return audio;
};
