import React from "react";
import { Composition } from "remotion";
import { Teaser } from "./Teaser";
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from "./brand";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Teaser"
        component={Teaser}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
