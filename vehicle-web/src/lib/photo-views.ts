import type { PhotoView } from "./api";

/// What each required photo should show, in plain words.
export const VIEW_GUIDE: Record<PhotoView, { label: string; hint: string }> = {
  front: { label: "Front", hint: "Whole front with the number plate readable" },
  back: { label: "Back", hint: "Whole rear with the number plate readable" },
  left: { label: "Left side", hint: "Step back so the full side fits, wheels included" },
  right: { label: "Right side", hint: "Step back so the full side fits, wheels included" },
  interior: { label: "Interior", hint: "Dashboard and front seats from the driver's door" },
  odometer: { label: "Odometer", hint: "Close-up of the mileage with the engine on" },
};
