import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  function capture() {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/maintenances' }),
        getResponse: () => ({ status }),
      }),
    } as never;
    return { host, status, json };
  }

  it.each([
    [
      new BadRequestException('invalid input'),
      HttpStatus.BAD_REQUEST,
      'invalid input',
    ],
    [
      new UnauthorizedException('unauthorized'),
      HttpStatus.UNAUTHORIZED,
      'unauthorized',
    ],
    [new ForbiddenException('forbidden'), HttpStatus.FORBIDDEN, 'forbidden'],
    [new NotFoundException('missing'), HttpStatus.NOT_FOUND, 'missing'],
    [new ConflictException('duplicate'), HttpStatus.CONFLICT, 'duplicate'],
  ])(
    'preserves HTTP error status and message',
    (exception, statusCode, message) => {
      const filter = new HttpExceptionFilter();
      const { host, status, json } = capture();
      filter.catch(exception, host);
      expect(status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, statusCode, message }),
      );
      const body = json.mock.calls[0][0] as { statusCode: number };
      expect(Number.isInteger(body.statusCode)).toBe(true);
      expect(body.statusCode).toBe(status.mock.calls[0][0]);
    },
  );

  it('maps database uniqueness failures to a safe conflict response', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = capture();
    const error = new QueryFailedError('insert', [], { code: '23505' });
    filter.catch(error, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The resource conflicts with existing data',
      }),
    );
  });

  it('does not expose unexpected error details', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = capture();
    filter.catch(new Error('database password should not escape'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });
});
