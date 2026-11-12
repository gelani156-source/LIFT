import type {calculateAchievements} from './achievements'

type Achievements = ReturnType<typeof calculateAchievements>

/** Представление существующих достижений без дополнительной системы очков. */
export function characterProgress(achievements: Achievements) {
  const next = achievements.badges.find(b => !b.earned)
  return next ? {target: next.target, remaining: Math.max(0, next.target - achievements.days)} : null
}
