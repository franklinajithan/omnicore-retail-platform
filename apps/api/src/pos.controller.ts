import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { PosService } from './pos.service';
import { verifyDeviceCredential } from './pos-device-auth';

@Controller('pos/v1')
export class PosController {
  constructor(private readonly service: PosService) {}
  @Post('sales')
  sale(@Headers('authorization') auth: string | undefined, @Body() body: any) {
    const scope = verifyDeviceCredential(auth, process.env.OMNICORE_POS_DEVICE_SECRET);
    return this.service.receive(body, scope);
  }
  @Get('catalog')
  catalog(@Headers('authorization') auth: string | undefined, @Query('storeId') storeId: string, @Query('cursor') cursor = '', @Query('limit') limit = '5000') {
    const scope = verifyDeviceCredential(auth, process.env.OMNICORE_POS_DEVICE_SECRET);
    return this.service.catalog(storeId, cursor, Number(limit), scope);
  }
}
