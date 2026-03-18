#!/usr/bin/env node
/**
 * Migrates all lucide-react icon imports to @tabler/icons-react
 * Run with: node scripts/migrate-icons.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

function findFiles(dir, exts, ignore = []) {
  const results = []
  const entries = readdirSync(dir)
  for (const e of entries) {
    const full = join(dir, e)
    if (ignore.some((ig) => full.replace(/\\/g, '/').includes(ig))) continue
    const st = statSync(full)
    if (st.isDirectory()) results.push(...findFiles(full, exts, ignore))
    else if (exts.some((ext) => e.endsWith(ext))) results.push(full)
  }
  return results
}

const MAPPING = {
  AlertCircle: 'IconAlertCircle',
  AlertTriangle: 'IconAlertTriangle',
  ArrowLeft: 'IconArrowLeft',
  ArrowRight: 'IconArrowRight',
  Award: 'IconAward',
  Ban: 'IconBan',
  BarChart3: 'IconChartBar',
  Bath: 'IconBath',
  Bed: 'IconBed',
  Building2: 'IconBuilding',
  Calendar: 'IconCalendar',
  Check: 'IconCheck',
  CheckCircle: 'IconCircleCheck',
  ChevronDown: 'IconChevronDown',
  ChevronLeft: 'IconChevronLeft',
  ChevronRight: 'IconChevronRight',
  ChevronUp: 'IconChevronUp',
  Clock: 'IconClock',
  Eye: 'IconEye',
  EyeOff: 'IconEyeOff',
  Facebook: 'IconBrandFacebook',
  Heart: 'IconHeart',
  Home: 'IconHome',
  Images: 'IconPhoto',
  Instagram: 'IconBrandInstagram',
  Key: 'IconKey',
  LayoutDashboard: 'IconLayoutDashboard',
  Linkedin: 'IconBrandLinkedin',
  LogIn: 'IconLogin',
  LogOut: 'IconLogout',
  Mail: 'IconMail',
  MapPin: 'IconMapPin',
  Menu: 'IconMenu2',
  MessageCircle: 'IconMessage',
  MoreHorizontal: 'IconDots',
  Phone: 'IconPhone',
  PlusCircle: 'IconCirclePlus',
  Save: 'IconDeviceFloppy',
  Search: 'IconSearch',
  Settings: 'IconSettings',
  Shield: 'IconShield',
  SlidersHorizontal: 'IconAdjustmentsHorizontal',
  Square: 'IconSquare',
  Star: 'IconStar',
  User: 'IconUser',
  UserPlus: 'IconUserPlus',
  Users: 'IconUsers',
  X: 'IconX',
  XCircle: 'IconCircleX',
  Zap: 'IconBolt',
}

const files = findFiles(
  '.',
  ['.tsx', '.ts'],
  ['node_modules', '.next', 'scripts']
)

let totalFiles = 0

for (const file of files) {
  let content = readFileSync(file, 'utf8')

  if (!content.includes("from 'lucide-react'")) continue

  let changed = false

  // 1. Replace the import source
  content = content.replace(
    /from 'lucide-react'/g,
    "from '@tabler/icons-react'"
  )

  // 2. Replace 'LucideIcon' type
  if (content.includes('LucideIcon')) {
    content = content.replace(
      /import type \{ LucideIcon \} from '@tabler\/icons-react'/g,
      "import type { Icon as TablerIconComponent } from '@tabler/icons-react'"
    )
    content = content.replace(/LucideIcon/g, 'TablerIconComponent')
    changed = true
  }

  // 3. Replace each icon name with word boundaries
  for (const [old, neo] of Object.entries(MAPPING)) {
    // Match as a whole word (preceded and followed by non-word chars)
    const regex = new RegExp(`\\b${old}\\b`, 'g')
    if (regex.test(content)) {
      content = content.replace(new RegExp(`\\b${old}\\b`, 'g'), neo)
      changed = true
    }
  }

  if (changed || content.includes("from '@tabler/icons-react'")) {
    writeFileSync(file, content, 'utf8')
    console.log(`✅ ${file}`)
    totalFiles++
  }
}

console.log(`\nDone. Migrated ${totalFiles} files.`)
