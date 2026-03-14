// --- Physics ---
export const GRAVITY = 0.25
export const JUMP_FORCE = -9
export const DOUBLE_JUMP_FORCE = -7
export const JUMP_CUT = 0.4
export const INITIAL_SPEED = 4
export const MAX_SPEED = 8
export const SPEED_INCREMENT = 0.0005
export const TRAMPOLINE_JUMP_FORCE = -14

// --- Spawning ---
export const MIN_SPAWN_GAP = 400
export const MAX_SPAWN_GAP = 700

// --- Player ---
export const PLAYER_X = 60
export const WHEEL_R = 10
export const RIDER_H = 56

// --- Rails ---
export const RAIL_TOLERANCE = 10
export const RAIL_OFFSET = 50
export const RAIL_GAP_BOB_SPEED = 0.04
export const RAIL_GAP_BOB_AMPLITUDE = 4

// --- Scoring ---
export const MILESTONE_INTERVAL = 500
export const MILESTONE_DISPLAY_FRAMES = 60

// --- Death ---
export const DEATH_ANIM_FRAMES = 40
export const DEATH_FREEZE_FRAMES = 300 // 5 seconds at 60fps

// --- Particles & Effects ---
export const DUST_COUNT = 7
export const DUST_LIFE = 16
export const SPEED_LINE_THRESHOLD = 5

// --- Animations ---
const SEAT_SPIN_FRAMES = 45
export const SEAT_SPIN_SPEED = (Math.PI * 2) / SEAT_SPIN_FRAMES
export const BACKFLIP_FRAMES = 105

// --- Trampoline ---
export const TRAMPOLINE_W = 120
export const TRAMPOLINE_H = 6

// --- Persistence ---
export const LS_HIGH_SCORE_KEY = "unicycle-high-score"

// --- Letter Collectibles ---
export const LETTER_WORD = "unehaus"
export const LETTER_SIZE = 16
export const LETTER_BOB_SPEED = 0.05
export const LETTER_BOB_AMPLITUDE = 6
export const LETTER_SPAWN_INTERVAL = 450
export const LETTER_COLLECT_RADIUS = 20
export const LETTER_BONUS = 2500
export const LETTER_BONUS_DISPLAY_FRAMES = 120

// --- Scooter Kid ---
export const SCOOTER_KID_W = 24
export const SCOOTER_KID_H = 36
export const SCOOTER_KID_SPEED = 2.5

// --- Terrain geometry ---
export const STEP_H = 8
export const RAMP_SLOPE = 2.5
export const MELLOW_RAMP_SLOPE = 4
export const CONE_H = 24
export const MAX_RAIL_HEIGHT = 200
export const MIN_STEP_PLAT_W = RIDER_H * 5
export const MAX_STEP_H = RIDER_H * 1.5
