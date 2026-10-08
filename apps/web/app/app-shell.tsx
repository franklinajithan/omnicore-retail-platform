'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import InventoryOutlined from '@mui/icons-material/InventoryOutlined';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import AssignmentReturnOutlined from '@mui/icons-material/AssignmentReturnOutlined';
import WarehouseOutlined from '@mui/icons-material/WarehouseOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import StoreOutlined from '@mui/icons-material/StoreOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import StraightenOutlined from '@mui/icons-material/StraightenOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import OpenInFullOutlined from '@mui/icons-material/OpenInFullOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import ViewColumnOutlined from '@mui/icons-material/ViewColumnOutlined';

const iconMap:Record<string,React.ElementType>={Dashboard:DashboardOutlined,Products:Inventory2Outlined,Categories:CategoryOutlined,Pricing:SellOutlined,Barcode:QrCode2Outlined,Boxes:InventoryOutlined,Supplier:BusinessOutlined,Cart:ShoppingCartOutlined,Orders:ReceiptLongOutlined,Warehouse:WarehouseOutlined,Transfer:SwapHorizOutlined,Scan:FactCheckOutlined,Waste:DeleteSweepOutlined,Adjust:TuneOutlined,Invoice:ReceiptLongOutlined,Promo:CampaignOutlined,People:PeopleAltOutlined,Store:StoreOutlined,Shield:VerifiedOutlined,Admin:AdminPanelSettingsOutlined,File:ReceiptLongOutlined,Payment:PaymentsOutlined,Chart:AnalyticsOutlined,AI:AutoAwesomeOutlined,Network:HubOutlined,Plug:ExtensionOutlined,Settings:SettingsOutlined,Search:SearchOutlined,Bell:NotificationsNoneOutlined,Trend:TrendingUpOutlined,Alert:WarningAmberOutlined,ProductsOpen:Inventory2Outlined,Menu:MenuOutlined,More:MoreHorizOutlined,Close:CloseOutlined,Add:AddOutlined,Upload:UploadOutlined,Download:DownloadOutlined,Expand:OpenInFullOutlined,Reset:RestartAltOutlined,Columns:ViewColumnOutlined};
export const Icon=({name}:{name:string})=>{const C=iconMap[name]||Inventory2Outlined;return <C className="muiNavIcon" aria-hidden fontSize="small"/>};
export const appNav=[
 ['CORE RETAIL',[['Products','Products','/products'],['Categories','Categories','#'],['Pricing','Pricing','#'],['Barcodes & EANs','Barcode','#'],['Product Passport','Shield','#'],['Brands','Categories','#'],['Units & Packaging','Boxes','#']]],
 ['SUPPLY CHAIN',[['Suppliers','Supplier','#'],['Purchasing','Cart','#'],['Purchase Orders','Orders','#'],['Deliveries','Supplier','#'],['Invoice Matching','Invoice','#'],['Returns & Claims','Transfer','#']]],
 ['INVENTORY',[['Stock & Inventory','Warehouse','#'],['Stock Transfers','Transfer','#'],['Stocktake (HHU)','Scan','#'],['Allocations','Boxes','#'],['Wastage','Waste','#'],['Adjustments','Adjust','#']]],
 ['SALES & MARKETING',[['Sales (POS)','Cart','#'],['Promotions','Promo','/promotions'],['RTC & Markdown','Categories','/rtc-history'],['Customers','People','#'],['Loyalty','Shield','#']]],
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
