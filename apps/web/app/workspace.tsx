"use client";
import {createContext,useContext,useEffect,useState,ReactNode} from "react";
import {useRouter} from "next/navigation";
type Tab={id:string;title:string;href:string};
type Ctx={tabs:Tab[];activeId:string;open:(t:Tab,newTab?:boolean)=>void;activate:(t:Tab)=>void;close:(id:string)=>void};
const WorkspaceContext=createContext<Ctx|null>(null);
const home:Tab={id:"dashboard",title:"Dashboard",href:"/"};
export function WorkspaceProvider({children}:{children:ReactNode}){
 const router=useRouter();const[tabs,setTabs]=useState<Tab[]>([home]);const[activeId,setActiveId]=useState("dashboard");
 useEffect(()=>{try{const x=localStorage.getItem("omnicore-tabs");if(x){const saved=JSON.parse(x);if(Array.isArray(saved)&&saved.length)setTabs(saved)}const a=localStorage.getItem("omnicore-active-tab");if(a)setActiveId(a)}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("omnicore-tabs",JSON.stringify(tabs));localStorage.setItem("omnicore-active-tab",activeId)}catch{}},[tabs,activeId]);
 const navigate=(t:Tab)=>{setActiveId(t.id);router.push(t.href);window.dispatchEvent(new CustomEvent("omnicore-workspace-navigate",{detail:t.href}))};
 const open=(t:Tab,newTab=false)=>{setTabs(v=>{const exists=v.some(x=>x.id===t.id);if(exists)return v;if(newTab)return[...v,t];const i=v.findIndex(x=>x.id===activeId);if(i<0)return[...v,t];const n=[...v];n[i]=t;return n});navigate(t)};
 const activate=(t:Tab)=>navigate(t);
 const close=(id:string)=>{setTabs(v=>{const i=v.findIndex(x=>x.id===id),n=v.filter(x=>x.id!==id);const safe=n.length?n:[home];if(id===activeId){const next=safe[Math.max(0,Math.min(i-1,safe.length-1))];setTimeout(()=>navigate(next),0)}return safe})};
 return <WorkspaceContext.Provider value={{tabs,activeId,open,activate,close}}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace(){return useContext(WorkspaceContext)!}
export function WorkspaceTabs(){const{tabs,activeId,activate,close,open}=useWorkspace();return <div className="workspaceTabs">{tabs.map(t=><div key={t.id} className={"workspaceTab "+(t.id===activeId?"active":"")} onClick={()=>activate(t)}><span>{t.title}</span>{tabs.length>1&&<button onClick={e=>{e.stopPropagation();close(t.id)}}>×</button>}</div>)}<button className="tabPlus" title="New workspace tab" onClick={()=>open({id:"dashboard-"+Date.now(),title:"Dashboard",href:"/"},true)}>＋</button></div>}
