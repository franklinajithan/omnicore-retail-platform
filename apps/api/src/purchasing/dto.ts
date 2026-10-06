// Core DTOs for Day 3
export class CreatePurchaseOrderDto {
  storeId!: string;
  supplierId!: string;
  expectedDeliveryDate?: Date;
  notes?: string;
  lines!: Array<{
    productId: string;
    supplierProductId?: string;
    casesOrdered: number;
  }>;
}

export class CreateDeliveryDto {
  purchaseOrderId!: string;
  expectedDate?: Date;
  notes?: string;
}

export class StartReceivingDto {
  deliveryIdentifier!: string;
}

export class RecordReceiptDto {
  productId!: string;
  barcode?: string;
  quantity!: number;
}

export class PostGoodsReceiptDto {
  deliveryId!: string;
  lines!: Array<{
    productId: string;
    receivedQuantity: number;
  }>;
}

export class CreateTransferDto {
  sourceStoreId!: string;
  destStoreId!: string;
  expectedDate?: Date;
  lines!: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class StockAdjustmentDto {
  storeId!: string;
  productId!: string;
  quantity!: number;
  reason!: string;
  notes?: string;
}
