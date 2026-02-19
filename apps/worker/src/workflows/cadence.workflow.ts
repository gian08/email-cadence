import {
  proxyActivities,
  sleep,
  defineSignal,
  defineQuery,
  setHandler
} from '@temporalio/workflow'
import type * as activities from '../activities/email.activity'
import { Step } from '../types/cadence'

const { sendEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute'
})

export const updateCadenceSignal = defineSignal<[Step[]]>('updateCadence')
export const getStateQuery = defineQuery<any>('getState')

export async function cadenceWorkflow(
  steps: Step[],
  contactEmail: string
) {
  let state = {
    currentStepIndex: 0,
    stepsVersion: 1,
    status: 'RUNNING',
    steps
  }

  setHandler(getStateQuery, () => state)

  setHandler(updateCadenceSignal, (newSteps: Step[]) => {
    state.stepsVersion++
    const currentIndex = state.currentStepIndex
    state.steps = newSteps

    if (newSteps.length <= currentIndex) {
      state.status = 'COMPLETED'
    }
  })

  while (
    state.currentStepIndex < state.steps.length &&
    state.status !== 'COMPLETED'
  ) {
    const step = state.steps[state.currentStepIndex]

    if (step.type === 'WAIT') {
      await sleep(step.seconds * 1000)
    }

    if (step.type === 'SEND_EMAIL') {
      await sendEmail({
        to: contactEmail,
        subject: step.subject,
        body: step.body
      })
    }

    state.currentStepIndex++
  }

  state.status = 'COMPLETED'
}
