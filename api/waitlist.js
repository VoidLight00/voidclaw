const BLOB_FILENAME = 'waitlist-emails.json'

async function getEmails(token) {
  const listRes = await fetch(
    `https://blob.vercel-storage.com?prefix=${BLOB_FILENAME}`,
    { headers: { authorization: `Bearer ${token}` } }
  )
  const { blobs } = await listRes.json()
  if (!blobs || blobs.length === 0) return []

  const dataRes = await fetch(blobs[0].url)
  return dataRes.json()
}

async function putEmails(token, emails) {
  await fetch(
    `https://blob.vercel-storage.com/${BLOB_FILENAME}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-content-type': 'application/json',
        'x-cache-control-max-age': '0'
      },
      body: JSON.stringify(emails)
    }
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '올바른 이메일을 입력해주세요.' })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.log('WAITLIST_EMAIL:', email)
    return res.status(200).json({ success: true, storage: 'log' })
  }

  try {
    const emails = await getEmails(token)
    const entry = { email, registeredAt: new Date().toISOString() }

    if (emails.some((e) => e.email === email)) {
      return res.status(200).json({ success: true })
    }

    emails.push(entry)
    await putEmails(token, emails)
    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('Blob error:', e)
    return res.status(500).json({ error: '서버 오류. 잠시 후 다시 시도해주세요.' })
  }
}
