import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

describe('ResponseInterceptor', () => {
  const context = (statusCode: number) =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as ExecutionContext;

  it('wraps successful values using the real HTTP status', async () => {
    const interceptor = new ResponseInterceptor();
    const handler = { handle: () => of({ value: 1 }) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context(201), handler)),
    ).resolves.toMatchObject({
      success: true,
      statusCode: 201,
      data: { value: 1 },
    });
  });

  it('does not wrap an already normalized response again', async () => {
    const interceptor = new ResponseInterceptor();
    const result = {
      success: true,
      statusCode: 200,
      data: [],
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const handler = { handle: () => of(result) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context(200), handler)),
    ).resolves.toBe(result);
  });
});
