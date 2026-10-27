import { ValidationPipe } from '@nestjs/common';
import { UserRole } from '../../common/enums/index.js';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

describe('authentication DTO validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validRegistration = {
    name: 'Alex Morgan',
    email: 'alex@example.com',
    password: 'a-strong-password',
  };

  const validate = (type: new () => object, value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: type });

  it.each([
    ['role', UserRole.ADMIN],
    ['isActive', true],
    ['passwordHash', '$2b$12$forgedhash'],
  ])('rejects the extra registration property %s', async (property, value) => {
    await expect(
      validate(RegisterDto, { ...validRegistration, [property]: value }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts a valid registration payload', async () => {
    await expect(validate(RegisterDto, validRegistration)).resolves.toEqual(
      validRegistration,
    );
  });

  it('rejects extra properties and short passwords on login', async () => {
    await expect(
      validate(LoginDto, {
        email: 'alex@example.com',
        password: 'a-strong-password',
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate(LoginDto, { email: 'alex@example.com', password: 'short' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each(['MANAGER', 'admin', '', 42])(
    'rejects the unsupported role %p on administrative user creation',
    async (role) => {
      await expect(
        validate(CreateUserDto, { ...validRegistration, role }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it('accepts the supported roles on administrative user creation', async () => {
    for (const role of Object.values(UserRole)) {
      await expect(
        validate(CreateUserDto, { ...validRegistration, role }),
      ).resolves.toMatchObject({ role });
    }
  });
});
