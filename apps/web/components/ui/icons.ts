import {
  ArrowDownNarrowWide,
  Bug,
  Cloud,
  CloudRain,
  Compass,
  Droplets,
  Filter,
  Fish,
  Map,
  MapPin,
  Newspaper,
  SlidersHorizontal,
  Snowflake,
  Sun,
  User,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'

export {
  ArrowDownNarrowWide,
  Bug,
  Cloud,
  Compass,
  Fish,
  Filter,
  Map,
  MapPin,
  Newspaper,
  SlidersHorizontal,
  User,
  type LucideIcon,
}

const SPECIES_TABLE: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['trout', 'steelhead', 'salmon', 'kokanee', 'char', 'whitefish'], icon: Fish },
  { keywords: ['bass', 'pike', 'perch', 'walleye'], icon: Fish },
]

const HATCH_TABLE: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['mayfly', 'caddis', 'midge', 'stonefly', 'pmd', 'bwo', 'hatch', 'nymph', 'dun'], icon: Bug },
]

const CONDITION_TABLE: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['rain', 'shower', 'wet'], icon: CloudRain },
  { keywords: ['snow', 'freezing', 'frost'], icon: Snowflake },
  { keywords: ['wind', 'gust'], icon: Wind },
  { keywords: ['cloud', 'overcast'], icon: Cloud },
  { keywords: ['clear', 'sun', 'hot'], icon: Sun },
  { keywords: ['flow', 'water', 'river', 'current'], icon: Waves },
  { keywords: ['drop', 'cold', 'temp'], icon: Droplets },
]

function lookup(table: typeof SPECIES_TABLE, name: string, fallback: LucideIcon): LucideIcon {
  const haystack = name.toLowerCase()
  for (const row of table) {
    if (row.keywords.some((kw) => haystack.includes(kw))) return row.icon
  }
  return fallback
}

export function getSpeciesIcon(name: string): LucideIcon {
  return lookup(SPECIES_TABLE, name, Fish)
}

export function getHatchIcon(name: string): LucideIcon {
  return lookup(HATCH_TABLE, name, Bug)
}

export function getConditionIcon(name: string): LucideIcon {
  return lookup(CONDITION_TABLE, name, Cloud)
}
