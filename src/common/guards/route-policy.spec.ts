import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppController } from '../../app.controller.js';
import { AuthController } from '../../auth/auth.controller.js';
import { IntegrationsController } from '../../integrations/integrations.controller.js';
import {
  MaintenanceHistoryController,
  MaintenancesController,
} from '../../maintenances/maintenances.controller.js';
import { MechanicsController } from '../../mechanics/mechanics.controller.js';
import { UsersController } from '../../users/users.controller.js';
import { VehiclesController } from '../../vehicles/vehicles.controller.js';
import { WorkshopsController } from '../../workshops/workshops.controller.js';
import { ANY_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole } from '../enums/index.js';

type Policy =
  'PUBLIC' | 'AUTHENTICATED' | 'ADMIN' | 'ADMIN,TECHNICIAN' | 'TECHNICIAN';

const ADMIN: Policy = 'ADMIN';
const BOTH: Policy = 'ADMIN,TECHNICIAN';

// Expected authorization policy for every route exposed by the API.
const EXPECTED_POLICIES: Record<string, Policy> = {
  'GET /health': 'PUBLIC',
  'POST /auth/register': 'PUBLIC',
  'POST /auth/login': 'PUBLIC',
  'GET /auth/profile': 'AUTHENTICATED',
  'GET /integrations/vehicles/:id/maintenance-history': 'PUBLIC',
  'GET /users': ADMIN,
  'POST /users': ADMIN,
  'POST /users/:id/deactivate': ADMIN,
  'POST /users/:id/activate': ADMIN,
  'GET /vehicles/plate/:plate': ADMIN,
  'GET /vehicles': ADMIN,
  'GET /vehicles/:id': ADMIN,
  'POST /vehicles': ADMIN,
  'PATCH /vehicles/:id': ADMIN,
  'POST /vehicles/:id/deactivate': ADMIN,
  'GET /mechanics': ADMIN,
  'GET /mechanics/:id': ADMIN,
  'POST /mechanics': ADMIN,
  'PATCH /mechanics/:id': ADMIN,
  'POST /mechanics/:id/activate': ADMIN,
  'POST /mechanics/:id/deactivate': ADMIN,
  'GET /workshops': ADMIN,
  'GET /workshops/:id': ADMIN,
  'POST /workshops': ADMIN,
  'PATCH /workshops/:id': ADMIN,
  'POST /workshops/:id/activate': ADMIN,
  'POST /workshops/:id/deactivate': ADMIN,
  'POST /maintenances': ADMIN,
  'GET /maintenances/active': BOTH,
  'GET /maintenances/my-assignments': 'TECHNICIAN',
  'GET /maintenances': BOTH,
  'GET /maintenances/:id': BOTH,
  'PATCH /maintenances/:id/status': BOTH,
  'PATCH /maintenances/:id/complete': BOTH,
  'PATCH /maintenances/:id/cancel': BOTH,
  'GET /vehicles/:id/maintenances': ADMIN,
  'GET /mechanics/:id/maintenances': BOTH,
};

const CONTROLLERS = [
  AppController,
  AuthController,
  IntegrationsController,
  UsersController,
  VehiclesController,
  MechanicsController,
  WorkshopsController,
  MaintenancesController,
  MaintenanceHistoryController,
];

function joinPath(...parts: string[]): string {
  const joined = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`;
}

function describeRoutes() {
  const reflector = new Reflector();
  const routes: Record<string, Policy> = {};

  for (const controller of CONTROLLERS) {
    const base = Reflect.getMetadata('path', controller) as string;
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = controller.prototype[name] as (
        ...args: never[]
      ) => unknown;
      const method = Reflect.getMetadata('method', handler) as
        RequestMethod | undefined;
      if (method === undefined) continue;

      const path = Reflect.getMetadata('path', handler) as string;
      const targets = [handler, controller];
      const roles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, targets);
      let policy: Policy | 'UNDECLARED' = 'UNDECLARED';
      if (reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
        policy = 'PUBLIC';
      } else if (roles?.length) {
        policy = [...roles].sort().join(',') as Policy;
      } else if (
        reflector.getAllAndOverride<boolean>(ANY_AUTHENTICATED_KEY, targets)
      ) {
        policy = 'AUTHENTICATED';
      }
      routes[`${RequestMethod[method]} ${joinPath(base, path)}`] =
        policy as Policy;
    }
  }
  return routes;
}

describe('route authorization policy', () => {
  const routes = describeRoutes();

  it('declares an explicit policy for every route', () => {
    const undeclared = Object.entries(routes)
      .filter(([, policy]) => (policy as string) === 'UNDECLARED')
      .map(([route]) => route);
    expect(undeclared).toEqual([]);
  });

  it('matches the expected permission matrix exactly', () => {
    expect(routes).toEqual(EXPECTED_POLICIES);
  });

  it('never grants administrative routes to technicians', () => {
    const technicianRoutes = Object.entries(routes)
      .filter(([, policy]) => policy.split(',').includes('TECHNICIAN'))
      .map(([route]) => route)
      .sort();
    expect(technicianRoutes).toEqual(
      [
        'GET /maintenances',
        'GET /maintenances/:id',
        'GET /maintenances/active',
        'GET /maintenances/my-assignments',
        'GET /mechanics/:id/maintenances',
        'PATCH /maintenances/:id/cancel',
        'PATCH /maintenances/:id/complete',
        'PATCH /maintenances/:id/status',
      ].sort(),
    );
  });
});
