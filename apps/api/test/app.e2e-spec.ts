import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/cadences lifecycle', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/cadences')
      .send({
        steps: [
          {
            id: 'step-1',
            type: 'WAIT',
            seconds: 5,
          },
        ],
      })
      .expect(201);

    const cadenceId = createResponse.body.id as string;
    expect(cadenceId).toBeTruthy();
    expect(createResponse.body.stepsVersion).toBeUndefined();
    expect(createResponse.body.steps).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/cadences/${cadenceId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(cadenceId);
        expect(response.body.steps).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .put(`/cadences/${cadenceId}`)
      .send({
        steps: [
          {
            id: 'step-2',
            type: 'SEND_EMAIL',
            subject: 'Hi',
            body: 'Updated cadence',
          },
        ],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(cadenceId);
        expect(response.body.steps[0].type).toBe('SEND_EMAIL');
      });
  });
});
