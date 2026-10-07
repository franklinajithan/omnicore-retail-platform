"use client";
import {createContext,useContext,useEffect,useState,ReactNode} from "react";
import {usePathname,useRouter} from "next/navigation";
type Tab={id:string;title:string;href:string};
type Ctx={tabs:Tab[];open:(t:Tab,newTab?:boolean)=>void;close:(id:string)=>void};
const WorkspaceContext=createContext<Ctx|null>(null);
export function WorkspaceProvider({children}:{children:ReactNode}){
 const router=useRouter(),path=usePathname();
 const [tabs,setTabs]=useState<Tab[]>([{id:"dashboard",title:"Dashboard",href:"/"}]);
 useEffect(()=>{try{const x=localStorage.getItem("omnicore-tabs");if(x)setTabs(JSON.parse(x))}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("omnicore-tabs",JSON.stringify(tabs))}catch{}},[tabs]);
 const open=(t:Tab,newTab=false)=>{setTabs(v=>{if(!newTab){const active=v.findIndex(x=>x.href===path);if(active>=0){const n=[...v];n[active]=t;return n}}return v.some(x=>x.id===t.id)?v:[...v,t]});router.push(t.href)};
 const close=(id:string)=>setTabs(v=>{const n=v.filter(x=>x.id!==id);if(v.find(x=>x.id===id)?.href===path)router.push(n.at(-1)?.href||"/");return n.length?n:[{id:"dashboard",title:"Dashboard",href:"/"}]});
 return <WorkspaceContext.Provider value={{tabs,open,close}}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace(){return useContext(WorkspaceContext)!}
export function WorkspaceTabs(){
 const {tabs,open,close}=useWorkspace();const path=usePathname();
 return <div className="workspaceTabs">{tabs.map(t=><div key={t.id} className={"workspaceTab "+(t.href===path?"active":"")} onClick={()=>open(t)}><span>{t.title}</span>{tabs.length>1&&<button onClick={e=>{e.stopPropagation();close(t.id)}}>×</button>}</div>)}<button className="tabPlus">＋</button></div>
}
