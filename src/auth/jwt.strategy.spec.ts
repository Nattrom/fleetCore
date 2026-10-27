import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { UserRole } from '../common/enums/index.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const users = { findOne: jest.fn<(options: unknown) => Promise<unknown>>() };
  const mechanics = {
    findOne: jest.fn<(options: unknown) => Promise<unknown>>(),
  };
  let strategy: JwtStrategy;

  beforeEach(() => {
    users.findOne.mockReset();
    mechanics.findOne.mockReset();
    strategy = new JwtStrategy(
      { getOrThrow: () => 'test-secret' } as never,
      users as never,
      mechanics as never,
    );
  });

  it('loads an active user and links the active mechanic profile', async () => {
    users.findOne.mockResolvedValue({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      role: UserRole.TECHNICIAN,
      isActive: true,
    });
    mechanics.findOne.mockResolvedValue({ id: 'mechanic-id' });

    await expect(strategy.validate({ sub: 'user-id' })).resolves.toEqual({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      role: UserRole.TECHNICIAN,
      mechanicId: 'mechanic-id',
    });
    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-id', isActive: true } }),
    );
  });

  it('rejects an inactive or missing user even with a previously issued token', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'user-id' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mechanics.findOne).not.toHaveBeenCalled();
  });

  it('ignores a stale role claim and uses the role stored in the database', async () => {
    users.findOne.mockResolvedValue({
      id: 'user-id',
      name: 'Legacy User',
      email: 'legacy@example.com',
      role: UserRole.TECHNICIAN,
      isActive: true,
    });
    mechanics.findOne.mockResolvedValue(null);

    const result = await strategy.validate({
      sub: 'user-id',
      role: 'MANAGER',
    } as never);

    expect(result.role).toBe(UserRole.TECHNICIAN);
    expect(result.mechanicId).toBeNull();
  });

  it('rejects a token without a subject', async () => {
    await expect(strategy.validate({} as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findOne).not.toHaveBeenCalled();
  });
});
