import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { getTemporalClient } from './temporal';
import { v4 as uuid } from 'uuid';
import { Step } from './cadence.types';
import { CadencesService } from './cadences.service';

const CADENCE_WORKFLOW = 'cadenceWorkflow';
const GET_STATE_QUERY = 'getState';
const UPDATE_CADENCE_SIGNAL = 'updateCadence';

interface EnrollmentDto {
  cadenceId: string;
  contactEmail: string;
}

interface UpdateCadenceDto {
  steps: Step[];
}

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly cadencesService: CadencesService) {}

  @Post()
  async enroll(@Body() body: EnrollmentDto) {
    if (!body?.cadenceId || typeof body.cadenceId !== 'string') {
      throw new BadRequestException('cadenceId is required');
    }

    if (!body?.contactEmail || typeof body.contactEmail !== 'string') {
      throw new BadRequestException('contactEmail is required');
    }

    const cadence = this.cadencesService.getById(body.cadenceId);
    const client = await getTemporalClient();
    const enrollmentId = uuid();

    await client.workflow.start(CADENCE_WORKFLOW, {
      workflowId: enrollmentId,
      taskQueue: 'cadence-queue',
      args: [cadence.steps, body.contactEmail],
    });

    return { enrollmentId, cadenceId: body.cadenceId };
  }

  @Get(':id')
  async getState(@Param('id') id: string) {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(id);
    try {
      return await handle.query(GET_STATE_QUERY);
    } catch (err) {
      if (err instanceof Error && 'workflowId' in err) {
        throw new NotFoundException(`Enrollment ${id} was not found`);
      }
      throw err;
    }
  }

  @Post(':id/update-cadence')
  async update(@Param('id') id: string, @Body() body: UpdateCadenceDto) {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(id);
    try {
      await handle.signal(UPDATE_CADENCE_SIGNAL, body.steps);
    } catch (err) {
      if (err instanceof Error && 'workflowId' in err) {
        throw new NotFoundException(`Enrollment ${id} was not found`);
      }
      throw err;
    }
    return { updated: true };
  }
}
