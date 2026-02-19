import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../styles/Home.module.css';

type Step =
  | {
      id: string;
      type: 'SEND_EMAIL';
      subject: string;
      body: string;
    }
  | {
      id: string;
      type: 'WAIT';
      seconds: number;
    };

interface EnrollmentState {
  currentStepIndex: number;
  stepsVersion: number;
  status: string;
  steps: Step[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const POLL_INTERVAL_MS = 2000;

const SAMPLE_CADENCE_JSON = JSON.stringify(
  {
    steps: [
      {
        id: 'step-1',
        type: 'SEND_EMAIL',
        subject: 'Welcome to the cadence',
        body: 'This is the first message.',
      },
      {
        id: 'step-2',
        type: 'WAIT',
        seconds: 30,
      },
      {
        id: 'step-3',
        type: 'SEND_EMAIL',
        subject: 'Follow up',
        body: 'This is the follow-up message.',
      },
    ],
  },
  null,
  2,
);

function parseSteps(raw: string): Step[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as Step[];
  }

  if (
    parsed &&
    typeof parsed === 'object' &&
    'steps' in parsed &&
    Array.isArray((parsed as { steps: unknown }).steps)
  ) {
    return (parsed as { steps: Step[] }).steps;
  }

  throw new Error('Cadence JSON must be an array or an object with a steps array.');
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse errors and use status text fallback.
  }

  return `${response.status} ${response.statusText}`;
}

export default function Home() {
  const [cadenceName, setCadenceName] = useState('Welcome Flow');
  const [cadenceJson, setCadenceJson] = useState(SAMPLE_CADENCE_JSON);
  const [contactEmail, setContactEmail] = useState('test@test.com');

  const [cadenceId, setCadenceId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [enrollmentState, setEnrollmentState] = useState<EnrollmentState | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const requestJson = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      return (await response.json()) as T;
    },
    [],
  );

  const fetchEnrollmentState = useCallback(
    async (id: string) => {
      const state = await requestJson<EnrollmentState>(`/enrollments/${id}`);
      setEnrollmentState(state);
    },
    [requestJson],
  );

  const createCadence = useCallback(async () => {
    clearMessages();
    setIsBusy(true);

    try {
      const steps = parseSteps(cadenceJson);
      const data = await requestJson<{ id: string }>('/cadences', {
        method: 'POST',
        body: JSON.stringify({ name: cadenceName, steps }),
      });

      setCadenceId(data.id);
      setSuccess(`Cadence created: ${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cadence');
    } finally {
      setIsBusy(false);
    }
  }, [cadenceName, cadenceJson, clearMessages, requestJson]);

  const updateCadenceDefinition = useCallback(async () => {
    clearMessages();
    setIsBusy(true);

    try {
      if (!cadenceId) {
        throw new Error('Create a cadence first so there is a cadenceId to update.');
      }

      const steps = parseSteps(cadenceJson);
      await requestJson(`/cadences/${cadenceId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: cadenceName, steps }),
      });

      setSuccess(`Cadence ${cadenceId} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cadence');
    } finally {
      setIsBusy(false);
    }
  }, [cadenceId, cadenceName, cadenceJson, clearMessages, requestJson]);

  const enrollContact = useCallback(async () => {
    clearMessages();
    setIsBusy(true);

    try {
      if (!cadenceId) {
        throw new Error('cadenceId is required. Create a cadence first.');
      }

      if (!contactEmail.trim()) {
        throw new Error('contactEmail is required.');
      }

      const data = await requestJson<{ enrollmentId: string }>('/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          cadenceId,
          contactEmail: contactEmail.trim(),
        }),
      });

      setEnrollmentId(data.enrollmentId);
      setEnrollmentState(null);
      setSuccess(`Enrollment started: ${data.enrollmentId}`);
      await fetchEnrollmentState(data.enrollmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
    } finally {
      setIsBusy(false);
    }
  }, [cadenceId, clearMessages, contactEmail, fetchEnrollmentState, requestJson]);

  const updateRunningCadence = useCallback(async () => {
    clearMessages();
    setIsBusy(true);

    try {
      if (!enrollmentId) {
        throw new Error('Start an enrollment first.');
      }

      const steps = parseSteps(cadenceJson);
      await requestJson(`/enrollments/${enrollmentId}/update-cadence`, {
        method: 'POST',
        body: JSON.stringify({ steps }),
      });

      setSuccess(`Enrollment ${enrollmentId} signaled with updated cadence.`);
      await fetchEnrollmentState(enrollmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update running cadence');
    } finally {
      setIsBusy(false);
    }
  }, [cadenceJson, clearMessages, enrollmentId, fetchEnrollmentState, requestJson]);

  useEffect(() => {
    if (!enrollmentId || enrollmentState?.status === 'COMPLETED') {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchEnrollmentState(enrollmentId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch enrollment state');
      });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enrollmentId, enrollmentState?.status, fetchEnrollmentState]);

  const stateSummary = useMemo(() => {
    if (!enrollmentState) {
      return 'No state loaded yet.';
    }

    return `Step ${enrollmentState.currentStepIndex}/${enrollmentState.steps.length} • ${enrollmentState.status}`;
  }, [enrollmentState]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Cadence Control Panel</h1>
        <p className={styles.subtitle}>
          Create a cadence, enroll a contact by cadence ID, and live-poll workflow state.
        </p>

        <label htmlFor="cadence-name" className={styles.label}>
          Cadence Name
        </label>
        <input
          id="cadence-name"
          type="text"
          className={styles.input}
          value={cadenceName}
          onChange={(event) => setCadenceName(event.target.value)}
          placeholder="e.g. Welcome Flow"
        />

        <label htmlFor="cadence-json" className={styles.label}>
          Cadence Steps (JSON)
        </label>
        <textarea
          id="cadence-json"
          className={styles.textarea}
          rows={16}
          value={cadenceJson}
          onChange={(event) => setCadenceJson(event.target.value)}
        />

        <div className={styles.row}>
          <button type="button" onClick={createCadence} disabled={isBusy} className={styles.primaryButton}>
            Create Cadence
          </button>
          <button
            type="button"
            onClick={updateCadenceDefinition}
            disabled={isBusy || !cadenceId}
            className={styles.secondaryButton}
          >
            Update Cadence Definition
          </button>
        </div>

        <p className={styles.meta}>
          cadenceId: <code>{cadenceId || '-'}</code>
        </p>

        <label htmlFor="contact-email" className={styles.label}>
          Contact Email
        </label>
        <input
          id="contact-email"
          type="email"
          className={styles.input}
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="contact@example.com"
        />

        <div className={styles.row}>
          <button type="button" onClick={enrollContact} disabled={isBusy || !cadenceId} className={styles.primaryButton}>
            Enroll Contact
          </button>
          <button
            type="button"
            onClick={updateRunningCadence}
            disabled={isBusy || !enrollmentId}
            className={styles.secondaryButton}
          >
            Update Running Cadence
          </button>
        </div>

        <p className={styles.meta}>
          enrollmentId: <code>{enrollmentId || '-'}</code>
        </p>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}

        <section className={styles.statePanel}>
          <h2>Enrollment State</h2>
          <p className={styles.stateSummary}>{stateSummary}</p>
          <div className={styles.stateGrid}>
            <div>
              <p className={styles.stateLabel}>status</p>
              <p className={styles.stateValue}>{enrollmentState?.status ?? '-'}</p>
            </div>
            <div>
              <p className={styles.stateLabel}>currentStepIndex</p>
              <p className={styles.stateValue}>
                {enrollmentState ? enrollmentState.currentStepIndex : '-'}
              </p>
            </div>
            <div>
              <p className={styles.stateLabel}>stepsVersion</p>
              <p className={styles.stateValue}>
                {enrollmentState ? enrollmentState.stepsVersion : '-'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
