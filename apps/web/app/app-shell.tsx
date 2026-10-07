'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';

const icons:Record<string,string>={Dashboard:'⌂',Products:'▣',Categories:'⌘',Pricing:'£',Barcode:'▥',Boxes:'▦',Supplier:'⇄',Cart:'◫',Orders:'☷',Warehouse:'▤',Transfer:'↔',Scan:'⌗',Waste:'△',Adjust:'≡',Invoice:'▧',Promo:'%',People:'♙',Store:'▱',Shield:'◇',Admin:'♙',File:'▤',Payment:'▰',Chart:'⌁',AI:'✦',Network:'◎',Plug:'⌁',Settings:'⚙'};
export const Icon=({name}:{name:string})=><span aria-hidden className="glyph">{icons[name]||'•'}</span>;
export const appNav=[
 ['CORE RETAIL',[['Products','Products','/products'],['Categories','Categories','#'],['Pricing','Pricing','#'],['Barcodes & EANs','Barcode','#'],['Product Passport','Shield','#'],['Brands','Categories','#'],['Units & Packaging','Boxes','#']]],
 ['SUPPLY CHAIN',[['Suppliers','Supplier','#'],['Purchasing','Cart','#'],['Purchase Orders','Orders','#'],['Deliveries','Supplier','#'],['Invoice Matching','Invoice','#'],['Returns & Claims','Transfer','#']]],
 ['INVENTORY',[['Stock & Inventory','Warehouse','#'],['Stock Transfers','Transfer','#'],['Stocktake (HHU)','Scan','#'],['Allocations','Boxes','#'],['Wastage','Waste','#'],['Adjustments','Adjust','#']]],
 ['SALES & MARKETING',[['Sales (POS)','Cart','#'],['Promotions','Promo','#'],['RTC & Markdown','Categories','#'],['Customers','People','#'],['Loyalty','Shield','#']]],
 ['STORE OPERATIONS',[['Stores','Store','#'],['Store Performance','Chart','#'],['Tasks & Compliance','Orders','#']]],
 ['PEOPLE & ORGANISATION',[['Workforce','People','#'],['Roles & Permissions','Admin','#'],['Activity & Audit','Shield','#']]],
 ['FINANCE',[['Invoices','File','#'],['Payments','Payment','#'],['Cost Tracking','Pricing','#'],['Profitability','Chart','#']]],
 ['ANALYTICS & INTELLIGENCE',[['Reports','File','#'],['BI Analytics','Chart','#'],['AI Insights','AI','#'],['Forecasting','Chart','#']]],
 ['OMNICORE NETWORK',[['Supplier Network','Network','#'],['Product Network','Network','#'],['Integration Hub','Plug','#']]],
 ['ADMINISTRATION',[['Settings','Settings','#'],['Integrations','Plug','#']]]
] as const;
export function AppSidebar({active,open,onClose}:{active:string;open:boolean;onClose:()=>void}){
 return <aside className={(open?'side open':'side')+' sharedSide'}><button className="drawerClose" onClick={onClose} aria-label="Close menu">×</button><Link href="/" className="brand sharedBrand"><span className="mark logoMark"><img src="/EE8811F8-FC53-4FA4-81E3-3E5B28F44B0F.png" alt="OmniCore"/></span><span><b>OmniCore</b><small>Retail Operating System</small></span></Link><Link href="/" className={'nav '+(active==='Dashboard'?'active':'')}><Icon name="Dashboard"/><span>Dashboard</span></Link>{appNav.map(([section,items])=><div key={section}><div className="section">{section}</div>{items.map(([name,icon,href])=>href!=='#'?<Link key={name} href={href} className={'nav '+(active===name?'active':'')}><Icon name={icon}/><span>{name}</span></Link>:<div key={name} className={'nav '+(active===name?'active':'')}><Icon name={icon}/><span>{name}</span></div>)}</div>)}</aside>
}
export function DrawerBackdrop({open,onClose}:{open:boolean;onClose:()=>void}){return <div className={open?'drawerBackdrop open':'drawerBackdrop'} onClick={onClose}/>}
