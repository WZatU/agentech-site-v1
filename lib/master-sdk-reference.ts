import type { AgentechFunction, AgentechParam } from "@/lib/agentech-library";

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
  "Stable standing posture is required before every gesture",
  "Current Master commands are upper-body gestures only",
  "Only one gesture can run at a time",
  "Motion is dry-run unless dry_run=False is selected",
  "Every live gesture waits for completion and verifies stable standing again"
];

export const masterReferenceCategories: AgentechFunction["category"][] = [
  "Actions",
  "Sensing"
];
