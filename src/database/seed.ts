import { AppDataSource } from './data-source.js';
import { User } from '../users/entities/user.entity.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import {
  MaintenanceStatus,
  MaintenanceType,
  UserRole,
  VehicleStatus,
} from '../common/enums/index.js';
import { PasswordHasherService } from '../common/security/password-hasher.service.js';

const passwords = new PasswordHasherService();

const demoUsers = [
  {
    name: 'FleetCore Administrator',
    email: 'admin@fleetcore.local',
    password: 'FleetCoreAdmin!2026',
    role: UserRole.ADMIN,
  },
  {
    name: 'Taylor Technician',
    email: 'tech1@fleetcore.local',
    password: 'FleetCoreTech!2026',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Jordan Technician',
    email: 'tech2@fleetcore.local',
    password: 'FleetCoreTech!2026',
    role: UserRole.TECHNICIAN,
  },
] as const;

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const users = AppDataSource.getRepository(User);
    const mechanics = AppDataSource.getRepository(Mechanic);
    const workshops = AppDataSource.getRepository(Workshop);
    const vehicles = AppDataSource.getRepository(Vehicle);
    const maintenances = AppDataSource.getRepository(Maintenance);

    const seededUsers = new Map<string, User>();
    for (const data of demoUsers) {
      let user = await users.findOne({ where: { email: data.email } });
      if (!user) {
        user = users.create({
          name: data.name,
          email: data.email,
          passwordHash: await passwords.hash(data.password),
          role: data.role,
          isActive: true,
        });
      } else {
        user.name = data.name;
        user.role = data.role;
        user.isActive = true;
      }
      seededUsers.set(data.email, await users.save(user));
    }

    const mechanicData = [
      {
        user: seededUsers.get('tech1@fleetcore.local')!,
        name: 'Taylor Technician',
        email: 'tech1@fleetcore.local',
        specialty: 'Diesel engines',
        isActive: true,
      },
      {
        user: seededUsers.get('tech2@fleetcore.local')!,
        name: 'Jordan Technician',
        email: 'tech2@fleetcore.local',
        specialty: 'Electrical systems',
        isActive: true,
      },
    ];
    const seededMechanics = new Map<string, Mechanic>();
    for (const data of mechanicData) {
      let mechanic = await mechanics.findOne({
        where: { userId: data.user.id },
      });
      if (!mechanic) {
        mechanic = mechanics.create({
          userId: data.user.id,
          name: data.name,
          email: data.email,
          specialty: data.specialty,
          isActive: data.isActive,
        });
      } else {
        mechanic.name = data.name;
        mechanic.email = data.email;
        mechanic.specialty = data.specialty;
        mechanic.isActive = data.isActive;
      }
      seededMechanics.set(data.email, await mechanics.save(mechanic));
    }
    let inactiveMechanic = await mechanics.findOne({
      where: { email: 'inactive@fleetcore.local' },
    });
    if (!inactiveMechanic) {
      inactiveMechanic = mechanics.create({
        name: 'Inactive Demonstration Mechanic',
        email: 'inactive@fleetcore.local',
        specialty: 'General maintenance',
        isActive: false,
      });
    } else {
      inactiveMechanic.isActive = false;
    }
    await mechanics.save(inactiveMechanic);

    const workshopData = [
      { name: 'Central Workshop', address: '100 Fleet Road', isActive: true },
      { name: 'Inactive Workshop', address: '200 Fleet Road', isActive: false },
    ];
    const seededWorkshops = new Map<string, Workshop>();
    for (const data of workshopData) {
      let workshop = await workshops.findOne({ where: { name: data.name } });
      if (!workshop) workshop = workshops.create(data);
      else Object.assign(workshop, data);
      seededWorkshops.set(data.name, await workshops.save(workshop));
    }

    const vehicleData = [
      {
        plate: 'FLEET001',
        brand: 'Volvo',
        model: 'FH',
        year: 2022,
        mileage: 68200,
        status: VehicleStatus.AVAILABLE,
      },
      {
        plate: 'FLEET002',
        brand: 'Mercedes-Benz',
        model: 'Actros',
        year: 2023,
        mileage: 42500,
        status: VehicleStatus.AVAILABLE,
      },
      {
        plate: 'FLEET003',
        brand: 'Scania',
        model: 'R450',
        year: 2021,
        mileage: 74200,
        status: VehicleStatus.IN_MAINTENANCE,
      },
      {
        plate: 'FLEET004',
        brand: 'MAN',
        model: 'TGX',
        year: 2020,
        mileage: 91000,
        status: VehicleStatus.INACTIVE,
      },
    ];
    const seededVehicles = new Map<string, Vehicle>();
    for (const data of vehicleData) {
      let vehicle = await vehicles.findOne({ where: { plate: data.plate } });
      if (!vehicle) vehicle = vehicles.create(data);
      else Object.assign(vehicle, data);
      seededVehicles.set(data.plate, await vehicles.save(vehicle));
    }

    const now = Date.now();
    const maintenanceData = [
      {
        id: 'a1111111-1111-4111-8111-111111111111',
        vehicle: seededVehicles.get('FLEET001')!,
        mechanic: seededMechanics.get('tech1@fleetcore.local')!,
        workshop: seededWorkshops.get('Central Workshop')!,
        type: MaintenanceType.PREVENTIVE,
        description: 'Completed scheduled oil and filter service',
        mileage: 68000,
        scheduledAt: new Date(now - 7 * 86400000),
        scheduledEndAt: new Date(now - 7 * 86400000 + 3600000),
        status: MaintenanceStatus.COMPLETED,
        workPerformed: 'Oil, filters and brakes inspected',
        cost: '450.00',
        finishedAt: new Date(now - 7 * 86400000 + 3000000),
        finalMileage: 68200,
      },
      {
        id: 'a2222222-2222-4222-8222-222222222222',
        vehicle: seededVehicles.get('FLEET003')!,
        mechanic: seededMechanics.get('tech2@fleetcore.local')!,
        workshop: seededWorkshops.get('Central Workshop')!,
        type: MaintenanceType.CORRECTIVE,
        description: 'Investigate transmission vibration',
        mileage: 74200,
        scheduledAt: new Date(now - 1800000),
        scheduledEndAt: new Date(now + 7200000),
        status: MaintenanceStatus.IN_PROGRESS,
        workPerformed: null,
        cost: null,
        finishedAt: null,
        finalMileage: null,
      },
      {
        id: 'a3333333-3333-4333-8333-333333333333',
        vehicle: seededVehicles.get('FLEET002')!,
        mechanic: seededMechanics.get('tech1@fleetcore.local')!,
        workshop: seededWorkshops.get('Central Workshop')!,
        type: MaintenanceType.PREVENTIVE,
        description: 'Upcoming inspection and tire rotation',
        mileage: 42500,
        scheduledAt: new Date(now + 2 * 86400000),
        scheduledEndAt: new Date(now + 2 * 86400000 + 3600000),
        status: MaintenanceStatus.SCHEDULED,
        workPerformed: null,
        cost: null,
        finishedAt: null,
        finalMileage: null,
      },
    ];
    for (const data of maintenanceData) {
      let maintenance = await maintenances.findOne({ where: { id: data.id } });
      if (!maintenance) maintenance = maintenances.create(data);
      else Object.assign(maintenance, data);
      await maintenances.save(maintenance);
    }

    console.log('FleetCore demo data is ready.');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(
    'FleetCore seeding failed:',
    error instanceof Error ? error.message : 'unknown error',
  );
  process.exitCode = 1;
});
