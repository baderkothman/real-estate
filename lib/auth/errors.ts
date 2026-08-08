const COMPROMISED_PASSWORD_PATTERN =
  /compromised|leaked|pwned|have i been pwned/i

export function getPasswordPolicyErrorMessage(message: string) {
  if (COMPROMISED_PASSWORD_PATTERN.test(message)) {
    return 'Choose a different password. This password appears in a known data breach.'
  }

  return message
}

export function getRegisterErrorMessage(message: string) {
  if (/rate limit/i.test(message)) {
    return 'Too many signup attempts were sent recently. Please wait a minute and try again.'
  }

  if (/already registered/i.test(message)) {
    return 'An account with this email already exists. Try signing in instead.'
  }

  return getPasswordPolicyErrorMessage(message)
}
