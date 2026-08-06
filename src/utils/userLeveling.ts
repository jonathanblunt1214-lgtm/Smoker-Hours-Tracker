import { CookLog, FuelLog, SmokerProfile, CharGPTMemory, UserPitmasterAccount, UserAchievement } from '../types';
import { AI_NAME } from '../constants/appName';

const USER_ACCOUNT_KEY = 'user_pitmaster_account_v1';

export const ALL_ACHIEVEMENTS: UserAchievement[] = [
  {
    id: 'blend_alchemist',
    title: '🧪 Blend Alchemist',
    description: 'Created a Custom Fuel Blend with component ratio physics.',
    iconName: 'FlaskConical',
    unlocked: false,
  },
  {
    id: 'pit_journaler',
    title: '🍖 Pit Journaler',
    description: 'Logged 3+ smoking sessions in your cook journal.',
    iconName: 'BookOpen',
    unlocked: false,
  },
  {
    id: 'grand_champion',
    title: '🏆 Grand Champion',
    description: 'Logged 10+ smoking sessions in your cook journal.',
    iconName: 'Award',
    unlocked: false,
  },
  {
    id: 'maintenance_hawk',
    title: '🛠️ Maintenance Hawk',
    description: 'Completed scheduled maintenance on your smoker.',
    iconName: 'Wrench',
    unlocked: false,
  },
  {
    id: 'ai_instructor',
    title: '🧠 BBQ AI Instructor',
    description: `Taught custom rules or saved notes into ${AI_NAME} Memory.`,
    iconName: 'Brain',
    unlocked: false,
  },
  {
    id: 'five_star_pit',
    title: '⭐ 5-Star Pitmaster',
    description: 'Achieved a 5-star overall rating on a finished cook.',
    iconName: 'Star',
    unlocked: false,
  },
  {
    id: 'fuel_master',
    title: '🪵 Fuel Inventory Manager',
    description: 'Maintained 3+ restock bags or custom blends in fuel inventory.',
    iconName: 'Flame',
    unlocked: false,
  },
];

export function getUserLevelTitle(level: number): string {
  if (level >= 7) return 'Legendary Smoke Maestro 👑';
  if (level >= 6) return 'Grand Champion Pitmaster 🏆';
  if (level >= 5) return 'Competition Pitmaster 🥇';
  if (level >= 4) return 'Smoker Captain 🎖️';
  if (level >= 3) return 'Weekend Pit Hand 🪵';
  if (level >= 2) return 'Backyard Smokehandler 🔥';
  return 'Yardbird Novice 🐣';
}

export function getUserLevelThresholds(xp: number): {
  level: number;
  levelTitle: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  let currentLevelXp = 0;
  let nextLevelXp = 150;

  if (xp >= 2600) {
    level = 7;
    currentLevelXp = 2600;
    nextLevelXp = 3500;
  } else if (xp >= 1800) {
    level = 6;
    currentLevelXp = 1800;
    nextLevelXp = 2600;
  } else if (xp >= 1200) {
    level = 5;
    currentLevelXp = 1200;
    nextLevelXp = 1800;
  } else if (xp >= 700) {
    level = 4;
    currentLevelXp = 700;
    nextLevelXp = 1200;
  } else if (xp >= 350) {
    level = 3;
    currentLevelXp = 350;
    nextLevelXp = 700;
  } else if (xp >= 150) {
    level = 2;
    currentLevelXp = 150;
    nextLevelXp = 350;
  } else {
    level = 1;
    currentLevelXp = 0;
    nextLevelXp = 150;
  }

  const range = nextLevelXp - currentLevelXp;
  const gained = xp - currentLevelXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));

  return {
    level,
    levelTitle: getUserLevelTitle(level),
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

export function calculateUserAccount(
  cookLogs: CookLog[] = [],
  fuelLogs: FuelLog[] = [],
  profile?: SmokerProfile,
  charGPTMemory?: CharGPTMemory
): UserPitmasterAccount {
  // Compute XP breakdown
  const cooksCount = cookLogs.length;
  const cookXp = cooksCount * 50;

  const ratedCooks = cookLogs.filter((c) => c.ratings && c.ratings.overall > 0).length;
  const ratingXp = ratedCooks * 25;

  const nextTimeNotesCount = cookLogs.filter((c) => c.nextTimeNotes && c.nextTimeNotes.trim().length > 0).length;
  const notesXp = nextTimeNotesCount * 25;

  // Custom fuel blends count (+40 XP each) & normal fuel logs (+20 XP each)
  const blendCount = fuelLogs.filter((f) => f.isBlend).length;
  const normalFuelCount = fuelLogs.length - blendCount;
  const fuelXp = blendCount * 40 + normalFuelCount * 20;

  // Serviced maintenance tasks
  const servicedTasks = profile
    ? profile.maintenanceTasks.filter((t) => t.lastPerformedHours > 0).length
    : 0;
  const maintenanceXp = servicedTasks * 35;

  // CharGPT rules taught by user
  const rulesTaught = charGPTMemory
    ? charGPTMemory.learnedRules.filter((r) => r.source === 'user_taught').length
    : 0;
  const aiRulesXp = rulesTaught * 15;

  const totalXp = cookXp + ratingXp + notesXp + fuelXp + maintenanceXp + aiRulesXp;

  const { level, levelTitle, nextLevelXp } = getUserLevelThresholds(totalXp);

  // Check achievements
  const hasBlend = blendCount > 0;
  const has5Star = cookLogs.some((c) => c.ratings && c.ratings.overall >= 5);
  const achievements: UserAchievement[] = ALL_ACHIEVEMENTS.map((ach) => {
    let unlocked = false;
    if (ach.id === 'blend_alchemist') unlocked = hasBlend;
    else if (ach.id === 'pit_journaler') unlocked = cooksCount >= 3;
    else if (ach.id === 'grand_champion') unlocked = cooksCount >= 10;
    else if (ach.id === 'maintenance_hawk') unlocked = servicedTasks >= 1;
    else if (ach.id === 'ai_instructor') unlocked = rulesTaught >= 1;
    else if (ach.id === 'five_star_pit') unlocked = has5Star;
    else if (ach.id === 'fuel_master') unlocked = fuelLogs.length >= 3;

    return {
      ...ach,
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : undefined,
    };
  });

  return {
    name: profile?.name ? `${profile.name} Pitmaster` : 'Backyard Pitmaster',
    title: levelTitle,
    email: '',
    xp: totalXp,
    level,
    levelTitle,
    nextLevelXp,
    achievements,
    createdAt: new Date().toISOString(),
    linkedSmokerId: profile?.id,
    linkedSmokerName: profile?.name || 'Pit Boss Copperhead 5-Series',
    linkedSmokerModel: profile?.model || 'Vertical Pellet Smoker',
    linkedSmokerType: profile?.smokerType || 'Vertical Pellet Smoker',
    linkedSmokerFuelType: profile?.fuelType || 'Pellets',
    linkedSmokerHopperCapacityLbs: profile?.pelletHopperCapacityLbs || 20,
    linkedSmokerTotalHours: profile?.currentHours || 0,
  };
}

export function loadUserAccount(): UserPitmasterAccount | null {
  try {
    const raw = localStorage.getItem(USER_ACCOUNT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load user account', e);
  }
  return null;
}

export function saveUserAccount(account: UserPitmasterAccount): void {
  try {
    localStorage.setItem(USER_ACCOUNT_KEY, JSON.stringify(account));
  } catch (e) {
    console.error('Failed to save user account', e);
  }
}
