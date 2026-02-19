export async function sendEmail({
  to,
  subject,
  body
}: {
  to: string
  subject: string
  body: string
}) {
  console.log('Mock email:', { to, subject, body })

  return {
    success: true,
    messageId: Math.random().toString(),
    timestamp: Date.now()
  }
}
