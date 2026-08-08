import 'server-only'

export function requireServerEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function hasNeonDataEnv() {
  return Boolean(process.env.NEON_DATA_API_URL)
}
