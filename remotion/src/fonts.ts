import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

const serif = loadSerif();
const sans = loadSans();
const mono = loadMono();

export const fontSerif = serif.fontFamily;
export const fontSans = sans.fontFamily;
export const fontMono = mono.fontFamily;
