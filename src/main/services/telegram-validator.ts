export async function validateTelegramToken(token: string): Promise<{
  valid: boolean
  username?: string
  error?: string
}> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = await res.json()
    if (data.ok && data.result) {
      return { valid: true, username: data.result.username }
    }
    return { valid: false, error: 'Invalid token' }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) }
  }
}
