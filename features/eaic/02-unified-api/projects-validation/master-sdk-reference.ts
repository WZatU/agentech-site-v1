import type { AgentechFunction, AgentechParam } from "./aegis-sdk-reference";

const hand = (
  allowed: '"left" | "right"' | '"left" | "right" | "both"',
  description: string,
  defaultValue?: string
): AgentechParam => ({
  name: "hand",
  type: allowed,
  description,
  defaultValue,
  status: "available"
});

export const masterFunctions: AgentechFunction[] = [
  {
    name: "wave",
    category: "Actions",
    signature: "Agentech.wave(hand)",
    summary: "Wave with the selected left or right hand while Master remains standing in place.",
    example: 'Agentech.wave("right")',
    params: [hand('"left" | "right"', "Choose the hand Master uses to wave.")],
    verification: "Right-hand wave physically verified on Master."
  },
  {
    name: "blow_kiss",
    category: "Actions",
    signature: "Agentech.blow_kiss(hand)",
    summary: "Raise the selected hand and perform Master's standing blow-a-kiss gesture.",
    example: 'Agentech.blow_kiss("left")',
    params: [hand('"left" | "right"', "Choose the hand Master uses for the gesture.")],
    verification: "Left- and right-hand variants physically verified on Master."
  },
  {
    name: "raise_hand",
    category: "Actions",
    signature: "Agentech.raise_hand(hand)",
    summary: "Raise the selected left or right hand without commanding leg movement.",
    example: 'Agentech.raise_hand("right")',
    params: [hand('"left" | "right"', "Choose which hand Master raises.")],
    verification: "Right-hand variant physically verified on Master."
  },
  {
    name: "salute",
    category: "Actions",
    signature: "Agentech.salute(hand)",
    summary: "Perform Master's standing salute with the selected left or right hand.",
    example: 'Agentech.salute("right")',
    params: [hand('"left" | "right"', "Choose the saluting hand.")],
    verification: "Right-hand salute physically verified on Master."
  },
  {
    name: "heart",
    category: "Actions",
    signature: "Agentech.heart(hand=\"both\")",
    summary: "Make a heart with the left hand, right hand, or both hands while Master stays in its standing posture.",
    example: 'Agentech.heart("both")',
    params: [
      hand(
        '"left" | "right" | "both"',
        "Choose a one-hand heart or the coordinated two-hand heart.",
        '"both"'
      )
    ],
    verification: "The coordinated both-hands heart was physically verified on Master."
  },
  {
    name: "handshake",
    category: "Actions",
    signature: "Agentech.handshake(hand)",
    summary: "Offer the selected left or right hand for a handshake while Master remains standing.",
    example: 'Agentech.handshake("right")',
    params: [hand('"left" | "right"', "Choose the hand Master offers.")],
    verification: "Left- and right-hand variants physically verified on Master."
  },
  {
    name: "high_five",
    category: "Actions",
    signature: "Agentech.high_five(hand)",
    summary: "Raise the selected left or right hand for a high-five while Master remains standing.",
    example: 'Agentech.high_five("right")',
    params: [hand('"left" | "right"', "Choose the hand Master raises.")],
    verification: "Left- and right-hand variants physically verified on Master."
  },
  {
    name: "clap",
    category: "Actions",
    signature: "Agentech.clap()",
    summary: "Clap using Master's coordinated two-arm standing preset.",
    example: "Agentech.clap()",
    params: [],
    verification: "The coordinated clap was physically verified on Master."
  },
  {
    name: "cross_arms",
    category: "Actions",
    signature: "Agentech.cross_arms()",
    summary: "Cross both arms using Master's coordinated upper-body standing preset.",
    example: "Agentech.cross_arms()",
    params: [],
    verification: "The coordinated cross-arms action was physically verified on Master."
  },
  {
    name: "chest_wave",
    category: "Actions",
    signature: "Agentech.chest_wave(hand)",
    summary: "Wave at chest height with the selected left or right hand while Master remains standing.",
    example: 'Agentech.chest_wave("right")',
    params: [hand('"left" | "right"', "Choose the hand Master waves at chest height.")],
    verification: "Left- and right-hand chest-wave variants physically verified on Master."
  },
  {
    name: "hug",
    category: "Actions",
    signature: "Agentech.hug()",
    summary: "Perform Master's coordinated two-arm standing hug gesture.",
    example: "Agentech.hug()",
    params: [],
    verification: "The coordinated hug was physically verified on Master."
  },
  {
    name: "cheer",
    category: "Actions",
    signature: "Agentech.cheer()",
    summary: "Perform Master's fixed left-hand cheer while remaining in place.",
    example: "Agentech.cheer()",
    params: [],
    verification: "The left-hand cheer was physically verified on Master."
  },
  {
    name: "wave_goodbye",
    category: "Actions",
    signature: "Agentech.wave_goodbye()",
    summary: "Perform Master's fixed left-hand goodbye wave while remaining in place.",
    example: "Agentech.wave_goodbye()",
    params: [],
    verification: "The left-hand goodbye wave was physically verified on Master."
  },
  {
    name: "raise_hands",
    category: "Actions",
    signature: "Agentech.raise_hands()",
    summary: "Raise both hands using Master's coordinated standing preset.",
    example: "Agentech.raise_hands()",
    params: [],
    verification: "The both-hands raise was physically verified on Master."
  },
  {
    name: "bow",
    category: "Actions",
    signature: "Agentech.bow()",
    summary: "Bow using Master's fixed standing preset.",
    example: "Agentech.bow()",
    params: [],
    verification: "The standing bow was physically verified on Master."
  },
  {
    name: "scratch_head",
    category: "Actions",
    signature: "Agentech.scratch_head()",
    summary: "Scratch the head with the left hand using Master's fixed standing preset.",
    example: "Agentech.scratch_head()",
    params: [],
    verification: "The fixed left-hand scratch-head action was physically verified on Master; AimDK provides no right-hand selector."
  },
  {
    name: "center",
    category: "Actions",
    signature: "Agentech.center()",
    summary: "Move Master into its predefined centered pose.",
    example: "Agentech.center()",
    params: []
  },
  {
    name: "stay",
    category: "Actions",
    signature: "Agentech.stay()",
    summary: "Hold Master in its current pose using the predefined stay action.",
    example: "Agentech.stay()",
    params: []
  },
  {
    name: "sit",
    category: "Actions",
    signature: "Agentech.sit()",
    summary: "Move Master from its standing posture into the seated posture used by seated actions.",
    example: "Agentech.sit()",
    params: []
  },
  {
    name: "seated_actions.turn_head",
    category: "Actions",
    signature: "Agentech.seated_actions.turn_head()",
    summary: "Perform Master's predefined seated head-turn action.",
    example: "Agentech.seated_actions.turn_head()",
    params: [],
    platformNoteLabel: "Posture requirement",
    platformNote: "Run Agentech.sit() before starting this seated action."
  },
  {
    name: "seated_actions.shake_head",
    category: "Actions",
    signature: "Agentech.seated_actions.shake_head()",
    summary: "Perform Master's predefined seated head-shake action.",
    example: "Agentech.seated_actions.shake_head()",
    params: [],
    platformNoteLabel: "Posture requirement",
    platformNote: "Run Agentech.sit() before starting this seated action."
  },
  {
    name: "status",
    category: "Sensing",
    signature: "Agentech.status()",
    summary: "Read Master's current motion-control posture and confirm whether it is stably standing.",
    example: "print(Agentech.status())",
    params: [],
    verification: "Read-only status checks are used before and after every live Master gesture."
  },
  {
    name: "action_catalog",
    category: "Sensing",
    signature: "Agentech.action_catalog()",
    summary: "List the public Master gestures, supported hands, defaults, and required standing posture without moving the robot.",
    example: "print(Agentech.action_catalog())",
    params: []
  }
];

export const masterStarterCode = `from agentech import Agentech
Agentech.use("master")`;

export const masterSafetyLimits = [
  "Stable standing posture is required before every standing gesture",
  "Seated actions require Agentech.sit() first",
  "Only one gesture can run at a time",
  "Motion is dry-run unless dry_run=False is selected",
  "Every live gesture waits for completion and verifies stable standing again"
];

export const masterReferenceCategories: AgentechFunction["category"][] = [
  "Actions",
  "Sensing"
];
