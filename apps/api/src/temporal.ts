import { Connection, Client } from '@temporalio/client';

let temporalClientPromise: Promise<Client> | null = null;

export async function getTemporalClient() {
  if (!temporalClientPromise) {
    temporalClientPromise = (async () => {
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
      });

      return new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
      });
    })();
  }

  return temporalClientPromise;
}
