import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { Maintenance } from '../../maintenances/entities/maintenance.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('mechanics')
export class Mechanic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  specialty: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Maintenance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
