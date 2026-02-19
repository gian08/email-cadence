export type Step =
  | {
      id: string
      type: 'SEND_EMAIL'
      subject: string
      body: string
    }
  | {
      id: string
      type: 'WAIT'
      seconds: number
    }
