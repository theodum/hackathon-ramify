import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict an endpoint to users with specific roles.
 * Must be used together with RolesGuard.
 *
 * @example
 * @Roles('admin', 'user')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('protected')
 * getData() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
