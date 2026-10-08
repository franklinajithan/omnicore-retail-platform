import {BrowserWindow} from 'electron';
import {saleReceipt} from './receipt-service';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
const pounds=(pence:unknown)=>'£'+(Number(pence||0)/100).toFixed(2);
export function receiptHtml(receipt:any):string{
  if(!receipt||!Array.isArray(receipt.lines)||!Array.isArray(receipt.payments))throw new Error('Invalid receipt');
  const rows=receipt.lines.map((line:any)=>`<tr><td>${escapeHtml(line.name)}<small>${escapeHtml(line.itemCode)} · Qty ${escapeHtml(line.qty)}</small></td><td class="amount">${pounds(line.lineTotal)}</td></tr>`).join('');
  const payments=receipt.payments.map((p:any)=>`<tr><td>${escapeHtml(p.method)}</td><td class="amount">${pounds(p.amount)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(receipt.receiptNo)}</title><style>
    @page{size:80mm auto;margin:3mm}body{font:12px monospace;color:#000;width:72mm;margin:0 auto}h2,p{text-align:center;margin:6px 0}
    table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #aaa;vertical-align:top}.amount{text-align:right;white-space:nowrap}small{display:block;font-size:10px}
    .total{font-size:16px;font-weight:bold}.muted{font-size:10px}
  </style></head><body><h2>OmniCore POS</h2><p>Store ${escapeHtml(receipt.storeId)} · Till ${escapeHtml(receipt.tillId)}</p>
    <p class="muted">${escapeHtml(receipt.receiptNo)}<br>${escapeHtml(receipt.createdAt)}<br>Cashier ${escapeHtml(receipt.cashierId)}</p>
    <table>${rows}<tr><td>Subtotal</td><td class="amount">${pounds(receipt.subtotal)}</td></tr>
    <tr><td>Discount</td><td class="amount">-${pounds(receipt.discountTotal)}</td></tr>
    <tr><td>VAT included</td><td class="amount">${pounds(receipt.vatTotal)}</td></tr>
    <tr class="total"><td>TOTAL</td><td class="amount">${pounds(receipt.total)}</td></tr>
    ${payments}<tr><td>Change</td><td class="amount">${pounds(receipt.changeDue)}</td></tr></table>
    <p>Thank you for shopping!</p></body></html>`;
}
export async function printReceipt(saleId:string,storeId:string,tillId:string){
  const receipt:any=saleReceipt(saleId);
  if(!receipt||receipt.storeId!==storeId||receipt.tillId!==tillId)throw new Error('Receipt not found for this till');
  const win=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  try{
    await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(receiptHtml(receipt)));
    return await new Promise<{printed:boolean;error?:string}>((resolve)=>{
      win.webContents.print({silent:false,printBackground:false},(success,errorType)=>{
        resolve(success?{printed:true}:{printed:false,error:errorType||'Printing cancelled'});
      });
    });
  }finally{if(!win.isDestroyed())win.destroy();}
}
