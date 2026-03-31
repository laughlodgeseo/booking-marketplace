import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { WishlistService } from './wishlist.service';

type JwtUser = { id: string; email: string; role: string };

@Controller('wishlist')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Post(':propertyId')
  add(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
  ) {
    return this.wishlist.add(req.user.id, propertyId);
  }

  @Delete(':propertyId')
  remove(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
  ) {
    return this.wishlist.remove(req.user.id, propertyId);
  }

  @Get()
  list(
    @Req() req: { user: JwtUser },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.wishlist.list(
      req.user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get('check/:propertyId')
  check(
    @Req() req: { user: JwtUser },
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
  ) {
    return this.wishlist.check(req.user.id, propertyId);
  }
}
