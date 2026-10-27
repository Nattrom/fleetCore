import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.workshop)
  maintenances: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
