import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities/email.activity'

const RETRY_DELAY_MS = 5000
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233'
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  while (true) {
    try {
      const connection = await NativeConnection.connect({
        address: TEMPORAL_ADDRESS
      })

      const worker = await Worker.create({
        connection,
        namespace: TEMPORAL_NAMESPACE,
        workflowsPath: require.resolve('./workflows/cadence.workflow'),
        activities,
        taskQueue: 'cadence-queue'
      })

      await worker.run()
      return
    } catch (err) {
      console.error(
        `Temporal worker failed to connect to ${TEMPORAL_ADDRESS}. Retrying in ${RETRY_DELAY_MS / 1000}s...`
      )
      console.error(err)
      await sleep(RETRY_DELAY_MS)
    }
  }
}

void run()
