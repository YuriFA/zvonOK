import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from 'src/generated/prisma/enums';

const makeContext = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when required roles list is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user has no role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.HOST, Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com' });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is USER and HOST/ADMIN required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.HOST, Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.USER });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('allows access when user is HOST and HOST is required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.HOST, Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.HOST });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user is ADMIN and ADMIN is required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.HOST, Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user is ADMIN and only ADMIN is required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user is HOST and only ADMIN is required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = makeContext({ id: '1', email: 'a@b.com', role: Role.HOST });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is undefined', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.HOST]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
