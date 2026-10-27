import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VehicleStatus } from '../../common/enums/index.js';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plate: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column('int')
  year: number;

  @Column('int', { default: 0 })
  mileage: number;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status: VehicleStatus;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
