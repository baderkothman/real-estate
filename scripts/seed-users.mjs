// scripts/seed-users.mjs
// Run: node --env-file=.env.local scripts/seed-users.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Admin ────────────────────────────────────────────────────────────────────
const ADMIN = {
  email: 'admin@othman.com',
  password: 'Admin@1234!',
  name: 'Othman Admin',
  phone: '+961 1 000 000',
}

// ── 20 regular users ─────────────────────────────────────────────────────────
const USERS = [
  {
    name: 'Rania Khoury',
    email: 'rania.khoury@example.com',
    phone: '+961 71 100 001',
    plan: 'free',
  },
  {
    name: 'Karim Nassar',
    email: 'karim.nassar@example.com',
    phone: '+961 71 100 002',
    plan: 'pro',
  },
  {
    name: 'Lina Haddad',
    email: 'lina.haddad@example.com',
    phone: '+961 71 100 003',
    plan: 'free',
  },
  {
    name: 'Fadi Saad',
    email: 'fadi.saad@example.com',
    phone: '+961 71 100 004',
    plan: 'agency',
  },
  {
    name: 'Maya Saleh',
    email: 'maya.saleh@example.com',
    phone: '+961 71 100 005',
    plan: 'pro',
  },
  {
    name: 'Tarek Mansour',
    email: 'tarek.mansour@example.com',
    phone: '+961 71 100 006',
    plan: 'free',
  },
  {
    name: 'Nour Khalil',
    email: 'nour.khalil@example.com',
    phone: '+961 71 100 007',
    plan: 'free',
  },
  {
    name: 'Georges Abi Nader',
    email: 'georges.abinader@example.com',
    phone: '+961 71 100 008',
    plan: 'pro',
  },
  {
    name: 'Sara Frem',
    email: 'sara.frem@example.com',
    phone: '+961 71 100 009',
    plan: 'free',
  },
  {
    name: 'Ali Berri',
    email: 'ali.berri@example.com',
    phone: '+961 71 100 010',
    plan: 'agency',
  },
  {
    name: 'Carla Rizk',
    email: 'carla.rizk@example.com',
    phone: '+961 71 100 011',
    plan: 'free',
  },
  {
    name: 'Hassan Mroue',
    email: 'hassan.mroue@example.com',
    phone: '+961 71 100 012',
    plan: 'pro',
  },
  {
    name: 'Joelle Assaf',
    email: 'joelle.assaf@example.com',
    phone: '+961 71 100 013',
    plan: 'free',
  },
  {
    name: 'Rabih Chidiac',
    email: 'rabih.chidiac@example.com',
    phone: '+961 71 100 014',
    plan: 'free',
  },
  {
    name: 'Dana Wehbe',
    email: 'dana.wehbe@example.com',
    phone: '+961 71 100 015',
    plan: 'pro',
  },
  {
    name: 'Marwan Issa',
    email: 'marwan.issa@example.com',
    phone: '+961 71 100 016',
    plan: 'free',
  },
  {
    name: 'Rana Tabbara',
    email: 'rana.tabbara@example.com',
    phone: '+961 71 100 017',
    plan: 'agency',
  },
  {
    name: 'Elie Karam',
    email: 'elie.karam@example.com',
    phone: '+961 71 100 018',
    plan: 'free',
  },
  {
    name: 'Nadine Azzi',
    email: 'nadine.azzi@example.com',
    phone: '+961 71 100 019',
    plan: 'pro',
  },
  {
    name: 'Ziad Hamdan',
    email: 'ziad.hamdan@example.com',
    phone: '+961 71 100 020',
    plan: 'free',
  },
]

const DEFAULT_PASSWORD = 'User@1234!'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function listAllUsers() {
  // Supabase paginates at 1000; one page is enough for seeding
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`listUsers: ${error.message}`)
  return data.users
}

async function upsertAuthUser(email, password, name, phone, existingUsers) {
  const existing = existingUsers.find((u) => u.email === email)

  if (existing) {
    // Update password so we always know the credential
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
    })
    if (error) throw new Error(`updatePassword ${email}: ${error.message}`)
    return { user: existing, created: false }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return { user: data.user, created: true }
}

async function setProfileRole(userId, role) {
  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw new Error(`setRole ${userId}: ${error.message}`)
}

async function setProfilePlan(userId, plan) {
  const { error } = await admin
    .from('profiles')
    .update({ plan })
    .eq('id', userId)
  if (error) throw new Error(`setPlan ${userId}: ${error.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load all existing auth users once to avoid N+1 listUsers calls
  const existingUsers = await listAllUsers()
  console.log(`Found ${existingUsers.length} existing auth user(s).\n`)

  // ── Admin ─────────────────────────────────────────────────────────────────
  console.log('── Seeding admin ──────────────────────────────────────')
  const { user: adminUser, created: adminCreated } = await upsertAuthUser(
    ADMIN.email,
    ADMIN.password,
    ADMIN.name,
    ADMIN.phone,
    existingUsers
  )
  await setProfileRole(adminUser.id, 'admin')
  console.log(
    `${adminCreated ? '✓ created' : '✓ updated'} admin: ${ADMIN.email}`
  )

  // ── Regular users ─────────────────────────────────────────────────────────
  console.log('\n── Seeding 20 users ───────────────────────────────────')
  for (const u of USERS) {
    const { user, created } = await upsertAuthUser(
      u.email,
      DEFAULT_PASSWORD,
      u.name,
      u.phone,
      existingUsers
    )
    if (u.plan !== 'free') await setProfilePlan(user.id, u.plan)
    const tag = created ? 'created' : 'updated'
    console.log(
      `✓ ${tag.padEnd(7)} ${u.name.padEnd(22)} ${u.email}  [${u.plan}]`
    )
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
── Security notes ──────────────────────────────────────
  Passwords are stored by Supabase Auth as bcrypt hashes
  in the internal auth.users table. The profiles table
  has NO password column — credentials never touch it.

── Admin credentials ────────────────────────────────────
  Email   : ${ADMIN.email}
  Password: ${ADMIN.password}
  Role    : admin

── Regular user password ────────────────────────────────
  Password: ${DEFAULT_PASSWORD}  (same for all 20 users)
`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
