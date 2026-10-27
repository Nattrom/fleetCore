import {
  BadRequestException,
  ConflictException,
  HttpStatus,
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
        message: 'El recurso entra en conflicto con datos existentes',
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
        message: 'Error interno del servidor',
      }),
    );
  });
});
