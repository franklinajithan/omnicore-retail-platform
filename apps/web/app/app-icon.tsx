import type { SVGProps } from 'react';
export type IconName = 'home'|'products'|'scan'|'tasks'|'more'|'store'|'inventory'|'truck'|'chart'|'arrow'|'shield'|'suppliers'|'search';
const paths: Record<IconName, React.ReactNode> = {
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
 products:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
 scan:<><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M4 12h16"/></>,
 tasks:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M14 9h3M8 15l1.5 1.5L12 14M14 15h3"/></>,
 more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
 store:<><path d="M3 10 5 4h14l2 6M3 10v10h18V10M3 10c0 4 5 4 6 0 1 4 5 4 6 0 1 4 6 4 6 0M9 20v-6h6v6"/></>,
 inventory:<><path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7.5 5l9 4"/></>,
 truck:<><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
 chart:<><path d="M4 20V4M4 20h17M8 16v-5M13 16V7M18 16v-9"/></>,
 arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
 shield:<><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
 suppliers:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5h4M17 9h4M17 13h4"/></>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>
};
export function AppIcon({name,size=22,...props}:SVGProps<SVGSVGElement>&{name:IconName;size?:number}){
 return <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
