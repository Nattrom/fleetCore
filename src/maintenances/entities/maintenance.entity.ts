import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MaintenanceType, MaintenanceStatus } from '../../common/enums/index.js';
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
  vehicle: Vehicle;

  @Column({ name: 'mechanic_id' })
  mechanicId: string;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances)
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: Mechanic;

  @Column({ name: 'workshop_id' })
  workshopId: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances)
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column('text')
  description: string;

  @Column('int')
  mileage: number;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'scheduled_end_at', type: 'timestamp' })
  scheduledEndAt: Date;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  @Column({ name: 'work_performed', type: 'text', nullable: true })
  workPerformed: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: string | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ name: 'final_mileage', type: 'int', nullable: true })
  finalMileage: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
