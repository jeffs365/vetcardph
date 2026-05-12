import { env } from '../env'

type PhilSmsResponse = {
  status?: string
  message?: string
  data?: unknown
}

export class OtpDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OtpDeliveryError'
  }
}

function otpMessage(code: string) {
  return `Your VetCard verification code is ${code}. It expires in 5 minutes.`
}

async function sendPhilSmsOtp(mobile: string, code: string) {
  if (!env.PHILSMS_API_TOKEN) {
    throw new OtpDeliveryError('PhilSMS is not configured.')
  }

  const response = await fetch(env.PHILSMS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PHILSMS_API_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: mobile,
      sender_id: env.PHILSMS_SENDER_ID,
      type: 'plain',
      message: otpMessage(code),
    }),
  })

  const body = (await response.json().catch(() => null)) as PhilSmsResponse | null

  if (!response.ok || body?.status === 'error') {
    throw new OtpDeliveryError(body?.message || `PhilSMS returned HTTP ${response.status}.`)
  }
}

export async function deliverOwnerOtp(mobile: string, code: string) {
  if (env.OWNER_OTP_DELIVERY_MODE === 'dev-response') {
    return
  }

  if (env.OWNER_OTP_DELIVERY_MODE === 'philsms') {
    await sendPhilSmsOtp(mobile, code)
    return
  }

  throw new OtpDeliveryError('Owner verification code delivery is disabled.')
}
