import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '../common/enums/index.js';
import { assertMaintenanceTransition } from './maintenance-state.js';

describe('maintenance state transitions', () => {
  it.each([
    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.CANCELLED],
    [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED],
    [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  ])('allows %s -> %s', (current, next) => {
    expect(() => assertMaintenanceTransition(current, next)).not.toThrow();
  });

  it.each([
    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.COMPLETED],
    [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.SCHEDULED],
    [MaintenanceStatus.COMPLETED, MaintenanceStatus.IN_PROGRESS],
    [MaintenanceStatus.CANCELLED, MaintenanceStatus.IN_PROGRESS],
  ])('rejects %s -> %s', (current, next) => {
    expect(() => assertMaintenanceTransition(current, next)).toThrow(
      BadRequestException,
    );
  });
});
