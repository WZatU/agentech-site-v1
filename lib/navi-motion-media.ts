export type NaviReferenceMedia = {
  label: string;
  src: string;
  description: string;
};

const base = "https://wesleyfan2015.github.io/Navi-Videos/videos";

const clip = (
  group: "movements" | "actions" | "athletics",
  number: number,
  slug: string,
  label: string,
  description: string
): NaviReferenceMedia => ({
  label,
  src: `${base}/${group}/${String(number).padStart(2, "0")}_${slug}.mp4`,
  description
});

const movement = (number: number, slug: string, label: string, description: string) =>
  clip("movements", number, slug, label, description);
const action = (number: number, slug: string, label: string, description: string) =>
  clip("actions", number, slug, label, description);
const athletic = (number: number, slug: string, label: string, description: string) =>
  clip("athletics", number, slug, label, description);

export const naviMotionMedia: Record<string, NaviReferenceMedia[]> = {
  backward: [movement(1, "backward", "Backward", "Navi walks straight backward while maintaining its heading, then stops in a four-foot stance.")],
  lateral: [
    movement(2, "lateral_left", "Lateral left", "Navi translates directly left without deliberately changing its body heading."),
    movement(3, "lateral_right", "Lateral right", "Navi mirrors the sideways gait toward the right and remains upright after stopping.")
  ],
  diagonal: [
    movement(4, "diagonal_left_backward", "Backward-left diagonal", "Forward and lateral velocity components combine into a single backward-left path."),
    movement(5, "diagonal_right_forward", "Forward-right diagonal", "Navi follows a forward-right path while keeping its torso aligned with the original heading.")
  ],
  jump: [athletic(1, "jump", "Jump", "All four legs compress, drive a vertical takeoff, and absorb a four-foot landing near the starting point.")],
  jump_round: [athletic(2, "jump_round", "Small jump", "A compact vertical hop uses less height and travel than the standard jump.")],
  jump_forward: [athletic(3, "jump_forward", "Forward jump", "Navi crouches, launches forward, and lands ahead of its starting position.")],
  frontflip: [athletic(4, "frontflip", "Front flip", "Navi drives upward, completes a full forward rotation, and recovers to four feet.")],
  sideflip: [
    athletic(5, "sideflip_left", "Left sideflip", "Navi rotates laterally toward its left side and returns to a balanced landing."),
    athletic(6, "sideflip_right", "Right sideflip", "Navi mirrors the lateral rotation toward its right side.")
  ],
  kick: [athletic(7, "kick", "Kick", "A dynamic leg-strike sequence extends the body and then recovers to a stable stance.")],

  sway: [action(1, "sway", "Side-to-side sway", "The torso rocks rhythmically left and right while the feet remain planted.")],
  pee: [action(2, "pee", "Held rear-leg pose", "Navi balances on three legs while holding its right rear leg raised for the requested time.")],
  shake_hand: [action(3, "shake_hand", "Held handshake", "The right front leg lifts and reaches forward into a sustained handshake pose.")],
  knock: [action(4, "knock", "Three knocks", "The right front leg rises, taps forward three times, and returns to the floor.")],
  hip_shake: [action(5, "hip_shake", "Hip shake", "The hindquarters oscillate left and right while the forequarters provide support.")],
  wave_hand: [action(6, "wave_hand", "Hand wave", "Navi raises its right front leg and swings it laterally in a clear waving gesture.")],
  bow: [action(7, "bow", "Bow", "Both front legs flex and lower the forequarters while the rear remains elevated.")],
  wag_rear: [action(8, "wag_rear", "Rear wag", "The rear of the torso swings from side to side without a physical tail.")],
  bark: [
    action(9, "bark", "Single bark gesture", "All four feet stay planted while the body makes one silent forward bark-like thrust."),
    action(105, "bark_bark", "Repeated bark gesture", "The forebody pulses through a longer repeated bark-like sequence without producing sound.")
  ],
  nod_head: [
    action(10, "nod_head", "Single nod", "The front legs flex and raise the forebody once to create a deliberate nod."),
    action(48, "nod_head_twice", "Double nod", "Navi repeats the forebody nod twice before settling level.")
  ],
  shake_head: [
    action(11, "shake_head", "Single head shake", "The front of the body twists left and right in one compact no-like gesture."),
    action(49, "shake_head_twice", "Double head shake", "A broader left-right twisting sequence repeats the head-shake pattern.")
  ],
  confused: [
    action(12, "confused", "Single puzzled shrug", "One side of the forebody dips and returns in a small questioning shrug."),
    action(85, "confused_again", "Repeated puzzled motion", "Navi alternates several uneven shoulder and body dips to emphasize a puzzled reaction.")
  ],
  show_affection: [
    action(13, "show_affection", "Gentle affection", "The body rocks through alternating left and right dips in a soft affectionate gesture."),
    action(63, "affection_7s", "Extended affection", "A longer affectionate routine repeats the side-to-side body motion before standing level.")
  ],
  draw_heart: [action(14, "draw_heart", "Draw a heart", "The left front leg lifts and traces a heart-shaped path through the air.")],
  dance: [
    action(15, "dance_beats", "Beats dance", "A rhythmic whole-body dance alternates leg flexion and torso motion in place."),
    action(30, "dance_shoulder", "Shoulder dance", "The dance emphasizes alternating shoulder and forebody dips."),
    action(31, "dance_lion", "Lion dance", "A more theatrical sequence combines lowered poses, rises, and broad body accents."),
    action(87, "dance_in_place", "Dance in place", "Navi cycles energetic body and leg motions while remaining near its starting point."),
    action(124, "dance_4x1500", "Four-count dance", "Four measured body accents form a short, evenly paced dance phrase."),
    action(125, "dance_9x1000", "Nine-count dance", "A longer nine-count routine repeats quick coordinated body pulses."),
    action(126, "dance_with_beatsx4", "Four-beat dance", "Four compact beat-matched motions create a short rhythmic sequence.")
  ],
  cute: [
    action(16, "cute", "Playful shimmy", "A compact side-to-side body shimmy returns quickly to standing."),
    action(82, "cute_2", "Playful pose", "A longer playful sequence combines a low body pose with gentle rocking.")
  ],
  ask_for_play: [action(17, "ask_for_play", "Ask for play", "The forequarters lower into a play bow and sway before Navi rises again.")],
  enjoy_touch: [
    action(18, "enjoy_being_touched", "Gentle touch response", "Navi dips slightly, raises a front foot, and relaxes back into its stance."),
    action(43, "touch_happy", "Happy touch response", "A brighter touch reaction lifts and shifts the forebody before returning level."),
    action(83, "very_enjoy", "Delighted touch response", "The body lowers deeply and stretches through a longer, visibly delighted response.")
  ],
  sniff_left: [
    action(19, "sniff_left", "Left sniff", "The left-front side lowers close to the floor for a brief sniffing pose."),
    action(52, "sniff_left_slow", "Slow left sniff", "The same leftward sniff unfolds more gradually with a longer low pause.")
  ],
  sniff_ahead: [
    action(20, "sniff_ahead", "Forward sniff", "Both front legs flex to bring the forebody near the floor before rising."),
    action(56, "sniff_ahead_3", "Deep forward sniff", "A deeper forward sniff lowers the chest, pauses close to the floor, and then lifts.")
  ],
  front_stretch: [
    action(21, "front_stretch", "Front stretch", "The front legs extend as the chest lowers while the hindquarters remain raised."),
    action(64, "front_strech_without_modelscale", "Compact front stretch", "A shorter version reaches forward and lowers the chest through a smaller range.")
  ],
  full_body_stretch: [action(22, "full_body_stretch", "Full-body stretch", "Navi transitions from a rear-body extension into a deep forward stretch.")],
  push_up: [action(23, "push_up", "Push-ups", "The forebody repeatedly lowers and rises while the rear legs stabilize the body.")],
  look_around: [
    action(24, "look_around", "Panoramic scan", "Navi changes body height and twists left and right through a broad surroundings scan."),
    action(59, "look_around_2", "Left glance", "A brief planted-foot lean and twist checks one side."),
    action(60, "look_around_3", "Right glance", "The short glance is mirrored toward the opposite side."),
    action(61, "look_around_5", "Low sweep", "The body lowers, rises, and sweeps across a wider viewing arc."),
    action(62, "look_around_6", "Quick sweep", "A compact low-to-level scan moves quickly across the front."),
    action(88, "look_around_7", "High sweep", "Navi extends taller and turns through a broad elevated scan.")
  ],
  think: [
    action(25, "think", "Thinking pause", "The front legs bend first, then the rear follows before Navi returns to standing."),
    action(75, "thinking__1", "Long thinking routine", "A longer contemplative sequence alternates lowered pauses and gentle body shifts."),
    action(76, "thinking__2", "Short thinking routine", "A compact thinking gesture lowers and levels the forebody once.")
  ],
  observe: [action(26, "observe", "Observe", "The body twists toward one side and attempts to continue a wider inspection sequence.")],
  yawn: [action(27, "yawn", "Yawn", "A mild whole-body extension lengthens the stance through a smaller range than the full stretch.")],
  clap_hand: [action(28, "clap_hand", "Front-foot presentation", "A front leg lifts and reaches upward and forward before returning to the floor.")],
  sniff_right: [
    action(29, "sniff_right", "Right sniff", "The right-front side lowers close to the floor in a mirrored sniffing pose."),
    action(53, "sniff_right_slow", "Slow right sniff", "The rightward sniff progresses gradually and holds the low pose longer.")
  ],

  eager: [action(32, "eager", "Eager", "Navi lowers, stretches forward, and cycles through an animated sequence of eager body shifts.")],
  rub_eyes: [action(33, "rub_eyes", "Rub eyes", "A raised front leg moves near the lowered forebody in a rubbing-like gesture.")],
  point_to_sky: [
    action(34, "point_to_sky_left", "Point left", "Navi lowers for balance and raises the left front leg into an upward pointing pose."),
    action(35, "point_to_sky_right", "Point right", "The upward pointing pose is mirrored with the right front leg.")
  ],
  wait_for_praise: [action(36, "wait_for_praise", "Wait for praise", "Navi settles low, raises a front leg, and holds an expectant pose before recovering.")],
  lucky_cat: [
    action(37, "lucky_cat_1", "Full lucky-cat routine", "A long beckoning routine balances low and repeatedly presents a raised front leg."),
    action(38, "lucky_cat_2", "Quick lucky-cat gesture", "A short beckoning motion lifts and resets the forebody quickly."),
    action(39, "lucky_cat_3", "Brief lucky-cat gesture", "The shortest variant makes one compact front-leg and shoulder accent.")
  ],
  dramatic_listen: [action(40, "drama_hearing", "Dramatic listen", "The body freezes, leans, and reacts through an exaggerated listening pose.")],
  jingle: [action(41, "jingle", "Jingle", "A low playful sequence combines quick body bounces and alternating forebody accents.")],
  flex_muscles: [action(42, "flex_muscles", "Flex muscles", "Navi braces low and alternates raised, widened foreleg poses like a flexing display.")],
  good_night_wave: [action(44, "good_night_wave", "Good-night wave", "One front leg rises high and makes a gentle farewell wave before lowering.")],
  cry: [action(45, "cry", "Cry", "The body droops through repeated low, uneven forebody movements that suggest sadness.")],
  encourage: [action(46, "encourage", "Encourage", "An upbeat sequence raises a front leg and punctuates several forward body accents.")],
  playful_greeting: [action(47, "opening_cute_dog", "Playful greeting", "A welcoming routine combines a low bow, body sway, and lively recovery.")],
  nod_with_beats: [action(50, "nod_with_beats", "Beat nod", "Several compact forebody nods follow a quick, regular rhythm.")],
  head_up_down: [action(51, "head_up_down", "Head up and down", "Navi alternates a pronounced forebody lift and drop before leveling out.")],
  push_ahead: [action(54, "push_ahead", "Push ahead", "The torso drives forward over planted feet in one short, forceful body push.")],
  brace: [action(55, "stick", "Brace", "Navi lowers and stiffens its stance briefly as if bracing against a forward force.")],
  shake_hand_quick: [action(57, "shake_hand_2", "Quick handshake", "The right front leg rises for a short presentation and returns immediately.")],
  pee_quick: [action(58, "pee_2", "Quick rear-leg lift", "The right rear leg lifts and resets in a brief one-shot balance gesture.")],
  sway_front_back: [action(65, "sway_front_back", "Front-back sway", "The torso rocks along its length over planted feet before returning to center.")],
  step_idle: [action(66, "step_idle", "Idle step", "Navi performs a small in-place weight shift and foot adjustment without traveling away.")],
  stand_at_attention: [action(67, "stand_at_attention", "Stand at attention", "The feet and body draw into a more aligned, alert stance, then relax.")],
  rear_stretch: [action(68, "rear_strech", "Rear stretch", "The hind legs extend and the rear body lengthens before Navi returns to neutral.")],
  rear_puff: [
    action(69, "long_fart", "Long rear puff", "The rear body makes a longer comic lift-and-pulse sequence while the front remains supportive."),
    action(70, "short_fart", "Short rear puff", "A quicker rear-body pulse delivers the shorter comic variant.")
  ],
  chat: [
    action(71, "chatting", "Animated chat", "Navi shifts height and twists its forebody through a long conversational rhythm."),
    action(72, "chatting__1", "Gentle chat", "A quieter conversational variant uses smaller body nods and side shifts."),
    action(73, "chatting__2", "Brief chat", "One short body accent suggests a concise reply."),
    action(74, "chatting_5s", "Five-second chat", "A compact five-second exchange combines a lean, nod, and recovery."),
    action(77, "talking", "Talking", "The forebody alternates small lifts and turns like an animated speaking gesture.")
  ],
  cooking: [
    action(78, "cooking_right_and_left", "Cooking motion", "A raised front leg sweeps right and left in a short stirring-like gesture."),
    action(79, "cooking_right_and_left_with_recovery", "Cooking with recovery", "The right-left stirring gesture is followed by a complete controlled reset to standing.")
  ],
  eat: [
    action(80, "eating_swallow", "Eat and swallow", "Navi lowers toward an imaginary bowl, repeats eating motions, then raises through a swallow-like finish."),
    action(81, "eating_only", "Eat only", "The forebody lowers and repeats the eating portion without the longer finishing sequence.")
  ],
  excited: [
    action(84, "excited_2", "Quick excitement", "A quick energetic bounce shifts the body and feet before settling."),
    action(128, "excited", "Full excitement", "A fuller excited routine combines a low twist, energetic rise, and lively reset.")
  ],
  shake_self: [action(86, "shake_self", "Shake self", "The torso and shoulders oscillate rapidly from side to side like shaking off water.")],
  explore_road: [
    action(89, "explore_road_yaw", "Road scan by turning", "Navi keeps its feet planted and turns its forebody left and right to inspect the path."),
    action(90, "explore_road_roll", "Road scan by tilting", "The body tilts from side to side in a shorter road-checking motion.")
  ],
  search_environment: [
    action(91, "search_env_yaw", "Environment search by turning", "A broader left-right body turn surveys the nearby environment."),
    action(92, "search_env_roll", "Environment search by tilting", "A compact side tilt checks the surroundings without stepping.")
  ],
  search_tag: [action(93, "search_tag", "Search for tag", "The body makes a short directed dip and turn as if checking for a nearby marker.")],
  body_tag_search: [action(94, "body_tag_search", "Body-tag search", "Navi shifts and lowers its torso through a compact body-centered search pattern.")],
  listen: [
    action(95, "listen_left", "Listen left", "The forebody tilts toward the left and holds a brief attentive pose."),
    action(96, "listen_right", "Listen right", "The attentive tilt is mirrored toward the right."),
    action(97, "listen_right_and_left", "Listen both ways", "Navi checks both sides in sequence with a longer alternating listening motion.")
  ],
  toss: [
    action(98, "tossing", "Centered toss", "The forebody dips and snaps upward through a centered tossing-like motion."),
    action(99, "tossing_left", "Toss left", "A longer toss sequence angles the body and recovery toward the left."),
    action(100, "tossing_right", "Toss right", "The extended toss sequence is mirrored toward the right.")
  ],
  explore_new_home: [action(101, "explore_new_home", "Explore new home", "Navi lowers into a cautious forward-looking pose and makes a compact exploratory shift.")],
  bored_half_sit: [action(102, "bored_half_sit", "Bored half-sit", "The body sinks into a loose half-seated slump and then rises again.")],
  rest: [action(103, "rest", "Rest", "Navi briefly settles into a low relaxed posture before returning to standing.")],
  sniff_up: [action(104, "sniff_up", "Sniff upward", "The forebody lifts and angles upward through repeated air-sniffing motions.")],
  act_shy: [
    action(106, "coquetry_1", "Shy pose left", "Navi lowers into a soft asymmetric pose with a gentle leftward body curl."),
    action(107, "coquetry_2", "Shy pose right", "The coy lowered pose is mirrored with a rightward emphasis.")
  ],
  look_down: [action(108, "look_down", "Look down", "The forequarters fold into a low downward-looking pose, pause, and rise.")],
  snuggle: [
    action(109, "snuggle_x", "Snuggle rise", "Navi curls low, then rises through a close, compact body motion."),
    action(110, "snuggle_y", "Snuggle curl", "The body folds downward and lengthens into a softer low snuggling pose.")
  ],
  be_sleepy: [action(111, "be_sleepy", "Be sleepy", "A long drowsy routine repeatedly droops, pauses low, and partially wakes before settling again.")],
  brush_teeth: [
    action(112, "brush_teeth_right", "Brush teeth right", "A sustained right-side routine repeats small raised-leg and forebody brushing motions."),
    action(113, "brush_teeth_left", "Brush teeth left", "The long brushing routine is mirrored toward the left side."),
    action(127, "brush_teeth_right_start", "Brush teeth right start", "The extended right-side starting sequence raises and cycles the front leg before recovery.")
  ],
  toilet_pose: [action(114, "shit", "Toilet pose", "The hindquarters lower into a brief toileting-like squat and then return to standing.")],
  fast_rotate: [action(115, "fast_rotate", "Fast rotate", "Navi rapidly turns through a long energetic sequence; carpet can introduce slip and path drift.")],
  swim: [action(116, "swim", "Swim", "The body lowers while the legs cycle in broad paddling-like motions before recovery.")],
  joy_walk: [action(117, "joy_walk", "Joy walk", "A buoyant low walk uses exaggerated rhythmic steps and body bounce.")],
  duck_walk: [action(118, "duck_walk", "Duck walk", "Navi travels in a low crouch with short alternating steps.")],
  step: [
    action(119, "step_forward", "Step forward", "One compact preset advances Navi a short distance and settles."),
    action(120, "step_back", "Step backward", "The matching preset retreats a short distance and settles.")
  ],
  turn_around: [
    action(121, "rotate_180", "Turn around right", "Navi executes a compact half-turn toward the right."),
    action(122, "rotate__180", "Turn around left", "The half-turn is mirrored toward the left through a longer recovery sequence.")
  ],
  nod_off: [action(123, "nod_off", "Nod off", "A long sleep sequence repeatedly droops into a low resting pose with small waking motions.")]
};
