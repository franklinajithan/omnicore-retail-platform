"use client";
import {createContext,useContext,useEffect,useMemo,useState,ReactNode} from "react";
import {useRouter} from "next/navigation";
export type WorkspaceTab={id:string;title:string;href:string;pinned?:boolean;dirty?:boolean;state?:Record<string,unknown>};
type Ctx={tabs:WorkspaceTab[];activeId:string;open:(t:WorkspaceTab,newTab?:boolean)=>void;activate:(t:WorkspaceTab)=>void;openRoute:(href:string,title:string,newTab?:boolean)=>void;close:(id:string)=>void;closeOthers:(id:string)=>void;togglePin:(id:string)=>void;duplicate:(id:string)=>void;saveState:(id:string,state:Record<string,unknown>)=>void;getState:(id:string)=>Record<string,unknown>|undefined;recent:WorkspaceTab[];reopenLast:()=>void};
const WorkspaceContext=createContext<Ctx|null>(null);
const home:WorkspaceTab={id:"dashboard",title:"Dashboard",href:"/",pinned:true};
const productsRoot:WorkspaceTab={id:"products",title:"Products",href:"/products",pinned:true};
export function WorkspaceProvider({children}:{children:ReactNode}){
 const router=useRouter();const[tabs,setTabs]=useState<WorkspaceTab[]>([productsRoot]);const[activeId,setActiveId]=useState("products");const[recent,setRecent]=useState<WorkspaceTab[]>([]);
 useEffect(()=>{try{const x=localStorage.getItem("omnicore-tabs");if(x){const s=JSON.parse(x);if(Array.isArray(s)&&s.length){const path=window.location.pathname;const normalized=s.filter((t:WorkspaceTab)=>t.id!=="products"&&t.id!=="dashboard"&&!t.id.startsWith("dashboard-"));if(path.startsWith("/products"))setTabs([productsRoot,...normalized]);else setTabs([home,...normalized])}}else if(window.location.pathname==="/")setTabs([home])const a=localStorage.getItem("omnicore-active-tab");if(window.location.pathname.startsWith("/products")){const code=new URLSearchParams(window.location.search).get("item");setActiveId(code?"product-"+code:"products")}else if(window.location.pathname==="/")setActiveId("dashboard");else if(a)setActiveId(a);const r=localStorage.getItem("omnicore-recent-tabs");if(r)setRecent(JSON.parse(r))}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("omnicore-tabs",JSON.stringify(tabs));localStorage.setItem("omnicore-active-tab",activeId);localStorage.setItem("omnicore-recent-tabs",JSON.stringify(recent.slice(0,10)))}catch{}},[tabs,activeId,recent]);
 const navigate=(t:WorkspaceTab)=>{setActiveId(t.id);router.push(t.href);window.dispatchEvent(new CustomEvent("omnicore-workspace-navigate",{detail:{href:t.href,id:t.id,state:t.state||{}}}))};
 const open=(t:WorkspaceTab,newTab=false)=>{let target=t;setTabs(v=>{const found=v.find(x=>x.id===t.id);if(found){target=found;return v}if(newTab)return[...v,t];const i=v.findIndex(x=>x.id===activeId);if(i<0||v[i]?.pinned)return[...v,t];const n=[...v];setRecent(r=>[v[i],...r].slice(0,10));n[i]=t;return n});setTimeout(()=>navigate(target),0)};
 const activate=(t:WorkspaceTab)=>navigate(t);
 const openRoute=(href:string,title:string,newTab=true)=>open({id:"route-"+href.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase(),title,href},newTab);
 const close=(id:string)=>setTabs(v=>{const i=v.findIndex(x=>x.id===id);if(i<0||v[i].pinned)return v;const closing=v[i],n=v.filter(x=>x.id!==id),safe=n.length?n:[home];setRecent(r=>[closing,...r.filter(x=>x.id!==closing.id)].slice(0,10));if(id===activeId){const next=safe[Math.max(0,Math.min(i-1,safe.length-1))];setTimeout(()=>navigate(next),0)}return safe});
 const closeOthers=(id:string)=>setTabs(v=>v.filter(x=>x.id===id||x.pinned));
 const togglePin=(id:string)=>{if(id==="products"||id==="dashboard")return;setTabs(v=>v.map(x=>x.id===id?{...x,pinned:!x.pinned}:x)};
 const duplicate=(id:string)=>{const t=tabs.find(x=>x.id===id);if(t)open({...t,id:t.id+"-copy-"+Date.now(),title:t.title+" · Copy",pinned:false},true)};
 const saveState=(id:string,state:Record<string,unknown>)=>setTabs(v=>v.map(x=>x.id===id?{...x,state:{...(x.state||{}),...state}}:x));
 const getState=(id:string)=>tabs.find(x=>x.id===id)?.state;
 const reopenLast=()=>{const t=recent[0];if(t){setRecent(r=>r.slice(1));open({...t,pinned:false},true)}};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!e.ctrlKey)return;if(e.key==="w"){e.preventDefault();close(activeId)}if(e.key==="Tab"){e.preventDefault();const i=tabs.findIndex(x=>x.id===activeId),d=e.shiftKey?-1:1;activate(tabs[(i+d+tabs.length)%tabs.length])}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[tabs,activeId]);
 return <WorkspaceContext.Provider value={{tabs,activeId,open,activate,openRoute,close,closeOthers,togglePin,duplicate,saveState,getState,recent,reopenLast}}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace(){return useContext(WorkspaceContext)!}
export function WorkspaceTabs(){
 const w=useWorkspace();const[menu,setMenu]=useState<string|null>(null);const[allOpen,setAllOpen]=useState(false);
 const visible=useMemo(()=>w.tabs.slice(0,7),[w.tabs]);
 return <div className="workspaceTabs" onMouseLeave={()=>setMenu(null)}>{visible.map(t=><div key={t.id} className={"workspaceTab "+(t.id===w.activeId?"active ":"")+(t.pinned?"pinned":"")} onClick={()=>w.activate(t)} onContextMenu={e=>{e.preventDefault();setMenu(t.id)}} title={t.title}>{t.pinned&&<span className="pinMark">●</span>}<span>{t.dirty?"● ":""}{t.title}</span>{!t.pinned&&w.tabs.length>1&&<button onClick={e=>{e.stopPropagation();w.close(t.id)}}>×</button>}{menu===t.id&&<div className="tabMenu" onClick={e=>e.stopPropagation()}><button onClick={()=>{w.togglePin(t.id);setMenu(null)}}>{t.pinned?"Unpin":"Pin tab"}</button><button onClick={()=>{w.duplicate(t.id);setMenu(null)}}>Duplicate</button><button onClick={()=>{w.closeOthers(t.id);setMenu(null)}}>Close others</button>{!t.pinned&&<button onClick={()=>{w.close(t.id);setMenu(null)}}>Close</button>}</div>}</div>)}{w.tabs.length>7&&<div className="tabOverflow"><button onClick={()=>setAllOpen(!allOpen)}>▼ {w.tabs.length-7}</button>{allOpen&&<div className="allTabs">{w.tabs.slice(7).map(t=><button key={t.id} onClick={()=>{w.activate(t);setAllOpen(false)}}>{t.title}</button>)}</div>}</div>}{w.recent.length>0&&<button className="reopenTab" title="Reopen recently closed tab" onClick={w.reopenLast}>↶</button>}</div>
}

export function WorkspaceLink({href,title,children,className}:{href:string;title:string;children:ReactNode;className?:string}){const w=useWorkspace();return <a href={href} className={className} onClick={e=>{e.preventDefault();w.openRoute(href,title,true)}} onDoubleClick={e=>{e.preventDefault();w.openRoute(href,title,true)}}>{children}</a>}
