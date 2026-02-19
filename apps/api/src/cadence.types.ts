export type Step =
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

export interface CadenceDefinition {
  id: string;
  name: string;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}
