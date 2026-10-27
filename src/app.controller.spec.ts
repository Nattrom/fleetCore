import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('reports a healthy status', () => {
    expect(new AppController().getHealth()).toEqual({ status: 'ok' });
  });
});
