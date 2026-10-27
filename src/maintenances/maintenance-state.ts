import { BadRequestException } from '@nestjs/common';
import { MaintenanceStatus } from '../common/enums/index.js';

const transitions: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.IN_PROGRESS]: [
    MaintenanceStatus.COMPLETED,
    MaintenanceStatus.CANCELLED,
  ],
  [MaintenanceStatus.COMPLETED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

export function assertMaintenanceTransition(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
): void {
  if (!transitions[current].includes(next)) {
    throw new BadRequestException(
      `Changing maintenance from ${current} to ${next} is not allowed`,
    );
  }
}
