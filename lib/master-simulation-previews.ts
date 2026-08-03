export type MasterSimulationVariantValue = "fixed" | "left" | "right" | "both";

export type MasterSimulationVariant = {
  value: MasterSimulationVariantValue;
  label: string;
  asset: string;
};

export type MasterSimulationPreview = {
  defaultVariant: MasterSimulationVariantValue;
  variants: MasterSimulationVariant[];
};

const masterPreviewRoot = "/assets/products/agentech-library/simulator-previews/master";

function variant(
  value: MasterSimulationVariantValue,
  filename: string
): MasterSimulationVariant {
  const label = value === "fixed" ? "Simulation" : value[0].toUpperCase() + value.slice(1);
  return {
    value,
    label,
    asset: `${masterPreviewRoot}/${filename}`
  };
}

function preview(
  defaultVariant: MasterSimulationVariantValue,
  ...variants: MasterSimulationVariant[]
): MasterSimulationPreview {
  return { defaultVariant, variants };
}

export const masterSimulationPreviews: Record<string, MasterSimulationPreview> = {
  wave: preview(
    "right",
    variant("left", "01_action_wave_left.mp4"),
    variant("right", "02_action_wave_right.mp4")
  ),
  blow_kiss: preview(
    "left",
    variant("left", "03_action_blow_kiss_left.mp4"),
    variant("right", "04_action_blow_kiss_right.mp4")
  ),
  raise_hand: preview(
    "right",
    variant("left", "05_action_raise_hand_left.mp4"),
    variant("right", "06_action_raise_hand_right.mp4")
  ),
  salute: preview(
    "right",
    variant("left", "07_action_salute_left.mp4"),
    variant("right", "08_action_salute_right.mp4")
  ),
  heart: preview(
    "both",
    variant("left", "09_action_heart_left.mp4"),
    variant("right", "10_action_heart_right.mp4"),
    variant("both", "11_action_heart_both.mp4")
  ),
  handshake: preview(
    "right",
    variant("left", "12_action_handshake_left.mp4"),
    variant("right", "13_action_handshake_right.mp4")
  ),
  high_five: preview(
    "right",
    variant("left", "14_action_high_five_left.mp4"),
    variant("right", "15_action_high_five_right.mp4")
  ),
  clap: preview("fixed", variant("fixed", "16_action_clap.mp4")),
  cross_arms: preview("fixed", variant("fixed", "17_action_cross_arms.mp4")),
  chest_wave: preview(
    "right",
    variant("left", "18_action_chest_wave_left.mp4"),
    variant("right", "19_action_chest_wave_right.mp4")
  ),
  hug: preview("fixed", variant("fixed", "20_action_hug.mp4")),
  cheer: preview("fixed", variant("fixed", "21_action_cheer.mp4")),
  wave_goodbye: preview("fixed", variant("fixed", "22_action_wave_goodbye.mp4")),
  raise_hands: preview("fixed", variant("fixed", "23_action_raise_hands.mp4")),
  bow: preview("fixed", variant("fixed", "24_action_bow.mp4")),
  scratch_head: preview("fixed", variant("fixed", "25_action_scratch_head.mp4")),
  status: preview("fixed", variant("fixed", "26_sensor_status.mp4")),
  action_catalog: preview("fixed", variant("fixed", "27_sensor_action_catalog.mp4"))
};

export function resolveMasterSimulationVariant(
  command: string,
  requestedVariant?: string
): MasterSimulationVariant | undefined {
  const previewEntry = masterSimulationPreviews[command];
  if (!previewEntry) return undefined;

  return previewEntry.variants.find((item) => item.value === requestedVariant)
    ?? previewEntry.variants.find((item) => item.value === previewEntry.defaultVariant);
}
