import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CadenceDefinition, Step } from './cadence.types';

@Injectable()
export class CadencesService {
  private readonly cadences = new Map<string, CadenceDefinition>();

  create(name: string, steps: Step[]): CadenceDefinition {
    this.assertName(name);
    this.assertSteps(steps);

    const timestamp = new Date().toISOString();
    const cadence: CadenceDefinition = {
      id: uuid(),
      name,
      steps,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.cadences.set(cadence.id, cadence);
    return cadence;
  }

  getById(id: string): CadenceDefinition {
    const cadence = this.cadences.get(id);
    if (!cadence) {
      throw new NotFoundException(`Cadence ${id} was not found`);
    }

    return cadence;
  }

  update(id: string, name: string, steps: Step[]): CadenceDefinition {
    this.assertName(name);
    this.assertSteps(steps);

    const existing = this.getById(id);
    const updated: CadenceDefinition = {
      ...existing,
      name,
      steps,
      updatedAt: new Date().toISOString(),
    };

    this.cadences.set(id, updated);
    return updated;
  }

  private assertName(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('name must be a non-empty string');
    }
  }

  private assertSteps(steps: Step[]): void {
    if (!Array.isArray(steps)) {
      throw new BadRequestException('steps must be an array');
    }

    for (const step of steps) {
      if (!step || typeof step !== 'object') {
        throw new BadRequestException('each step must be an object');
      }

      if (
        !('id' in step) ||
        typeof step.id !== 'string' ||
        step.id.length === 0
      ) {
        throw new BadRequestException(
          'each step requires a non-empty string id',
        );
      }

      if (
        !('type' in step) ||
        (step.type !== 'WAIT' && step.type !== 'SEND_EMAIL')
      ) {
        throw new BadRequestException(
          'each step must have type WAIT or SEND_EMAIL',
        );
      }

      if (step.type === 'WAIT') {
        if (
          !('seconds' in step) ||
          typeof step.seconds !== 'number' ||
          step.seconds < 0
        ) {
          throw new BadRequestException('WAIT step requires seconds >= 0');
        }
      } else {
        if (
          !('subject' in step) ||
          typeof step.subject !== 'string' ||
          !('body' in step) ||
          typeof step.body !== 'string'
        ) {
          throw new BadRequestException(
            'SEND_EMAIL step requires subject and body strings',
          );
        }
      }
    }
  }
}
