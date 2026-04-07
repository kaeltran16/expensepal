export const DISPLAY_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core',
] as const

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number]

export const MUSCLE_GROUP_MAP: Record<string, DisplayGroup> = {
  chest: 'Chest',
  pectorals: 'Chest',
  back: 'Back',
  lats: 'Back',
  traps: 'Back',
  rhomboids: 'Back',
  shoulders: 'Shoulders',
  deltoids: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  abs: 'Core',
  obliques: 'Core',
  core: 'Core',
  'lower back': 'Core',
}

export function getMuscleGroupsHitThisWeek(
  exerciseMuscleGroups: string[]
): DisplayGroup[] {
  const hit = new Set<DisplayGroup>()
  for (const group of exerciseMuscleGroups) {
    const mapped = MUSCLE_GROUP_MAP[group.toLowerCase()]
    if (mapped) hit.add(mapped)
  }
  return Array.from(hit)
}

export function computeWeeklyVolume(
  workouts: Array<{ total_volume: number | null }>
): number {
  return workouts.reduce((sum, w) => sum + (w.total_volume || 0), 0)
}

export function computeVolumeTrend(
  currentVolume: number,
  previousVolume: number
): number {
  if (previousVolume === 0) return 0
  return Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
}
