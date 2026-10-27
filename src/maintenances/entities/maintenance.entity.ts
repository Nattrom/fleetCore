import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import {
  MaintenanceType,
  MaintenanceStatus,
} from '../../common/enums/index.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Mechanic } from '../../mechanics/entities/mechanic.entity.js';
import { Workshop } from '../../workshops/entities/workshop.entity.js';

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Relation<Vehicle>;

  @Column({ name: 'mechanic_id' })
  mechanicId: string;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances)
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: Relation<Mechanic>;

  @Column({ name: 'workshop_id' })
  workshopId: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances)
  @JoinColumn({ name: 'workshop_id' })
  workshop: Relation<Workshop>;

  @Column({
    type: 'enum',
    enum: MaintenanceType,
    enumName: 'maintenance_type_enum',
  })
  type: MaintenanceType;

  @Column('text')
  description: string;

  @Column('int')
  mileage: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'scheduled_end_at', type: 'timestamptz' })
  scheduledEndAt: Date;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    enumName: 'maintenance_status_enum',
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ name: 'work_performed', type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: string | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'final_mileage', type: 'int', nullable: true })
  finalMileage: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
