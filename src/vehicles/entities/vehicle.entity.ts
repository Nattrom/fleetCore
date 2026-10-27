import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { VehicleStatus } from '../../common/enums/index.js';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  plate: string;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column('int')
  year: number;

  @Column('int', { default: 0 })
  mileage: number;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    enumName: 'vehicle_status_enum',
    default: VehicleStatus.AVAILABLE,
  })
  status: VehicleStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Relation<Maintenance[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
