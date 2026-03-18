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

const ADMIN_USER = {
  email: 'admin@othman.com',
  password: 'admin123',
  name: 'Othman Admin',
  phone: '+961 1 000 000',
  plan: 'agency',
  role: 'admin',
}

const DEMO_USER = {
  email: 'user@othman.com',
  password: 'user123',
  name: 'Othman Demo User',
  phone: '+961 70 000 001',
  plan: 'free',
  role: 'user',
}

const SAMPLE_USER_PASSWORD = 'User@1234!'

const SAMPLE_USERS = [
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

async function listAllUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    throw new Error(`listUsers: ${error.message}`)
  }
  return data.users
}

async function ensureAuthUser(account, existingUsers) {
  const existing = existingUsers.get(account.email.toLowerCase())

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        phone: account.phone,
      },
    })

    if (error) {
      throw new Error(`updateUser ${account.email}: ${error.message}`)
    }

    return { user: data.user ?? existing, created: false }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      name: account.name,
      phone: account.phone,
    },
  })

  if (error || !data.user) {
    throw new Error(`createUser ${account.email}: ${error?.message}`)
  }

  return { user: data.user, created: true }
}

async function syncProfile(userId, account) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: account.email.toLowerCase(),
      name: account.name,
      phone: account.phone,
      plan: account.plan,
      role: account.role,
      is_banned: false,
    },
    {
      onConflict: 'id',
    }
  )

  if (error) {
    throw new Error(`syncProfile ${account.email}: ${error.message}`)
  }
}

async function seedAccount(account, existingUsers) {
  const { user, created } = await ensureAuthUser(account, existingUsers)
  await syncProfile(user.id, account)
  existingUsers.set(account.email.toLowerCase(), user)

  console.log(
    `${created ? 'created' : 'updated'} ${account.role.padEnd(5)} ${account.email} (${account.plan})`
  )
}

async function main() {
  const existingUsers = new Map(
    (await listAllUsers()).map((user) => [user.email?.toLowerCase(), user])
  )

  console.log(`Found ${existingUsers.size} existing auth user(s).`)
  console.log('')
  console.log('Seeding demo accounts...')

  await seedAccount(ADMIN_USER, existingUsers)
  await seedAccount(DEMO_USER, existingUsers)

  console.log('')
  console.log('Seeding sample directory users...')

  for (const sampleUser of SAMPLE_USERS) {
    await seedAccount(
      {
        ...sampleUser,
        password: SAMPLE_USER_PASSWORD,
        role: 'user',
      },
      existingUsers
    )
  }

  console.log('')
  console.log('Demo credentials:')
  console.log(`- Admin: ${ADMIN_USER.email} / ${ADMIN_USER.password}`)
  console.log(`- User: ${DEMO_USER.email} / ${DEMO_USER.password}`)
  console.log(`- Sample directory users: ${SAMPLE_USER_PASSWORD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
