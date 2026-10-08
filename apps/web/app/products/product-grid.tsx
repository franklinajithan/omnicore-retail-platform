'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Box,Button,Checkbox,FormControlLabel,MenuItem,Paper,Select,Stack,Typography} from '@mui/material';
import {AgGridReact} from 'ag-grid-react';
import {AllCommunityModule,ColDef,GridApi,ModuleRegistry,RowDoubleClickedEvent,RowClickedEvent} from 'ag-grid-community';
import type {Product} from './page';
import {Icon} from '../app-shell';

ModuleRegistry.registerModules([AllCommunityModule]);
type Row=Product&{margin:number};
type Key='itemCode'|'product'|'barcode'|'category'|'supplier'|'cost'|'retail'|'margin'|'stock'|'status';
const labels:Record<Key,string>={itemCode:'Item Code',product:'Product',barcode:'Barcode / EAN',category:'Category',supplier:'Primary Supplier',cost:'Cost',retail:'Retail',margin:'Margin',stock:'Stock',status:'Status'};
const storageKeyForStore=(store:string)=>'omnicore-product-ag-grid-v2:'+encodeURIComponent(store);

export default function ProductGrid({rows,workingStore,onPreview,onOpen}:{rows:Product[];workingStore:string;onPreview:(p:Product)=>void;onOpen:(p:Product)=>void}){
 const storageKey=storageKeyForStore(workingStore);const gridRef=useRef<AgGridReact<Row>>(null);const appliedStoreRef=useRef<string|null>(null);const[density,setDensity]=useState<'compact'|'standard'>('compact');const[chooser,setChooser]=useState(false);const[hidden,setHidden]=useState<Record<string,boolean>>({});const[loadedKey,setLoadedKey]=useState<string|null>(null);
 useEffect(()=>{try{const s=JSON.parse(localStorage.getItem(storageKey)||'{}');setDensity(s.density==='standard'?'standard':'compact');setHidden(s.hidden&&typeof s.hidden==='object'?s.hidden:{});}catch{setDensity('compact');setHidden({});}setLoadedKey(storageKey);},[storageKey]);
 useEffect(()=>{if(loadedKey!==storageKey || appliedStoreRef.current===storageKey)return;const grid=gridRef.current?.api;if(!grid)return;grid.resetColumnState();Object.entries(hidden).forEach(([key,isHidden])=>{if(isHidden)grid.setColumnsVisible([key==='product'?'name':key],false)});appliedStoreRef.current=storageKey;},[hidden,loadedKey,storageKey]);
 useEffect(()=>{if(loadedKey!==storageKey)return;try{localStorage.setItem(storageKey,JSON.stringify({density,hidden}))}catch{}},[density,hidden,storageKey,loadedKey]);
 const data=useMemo<Row[]>(()=>rows.map(p=>({...p,margin:Math.round((p.retail-p.cost)/p.retail*100)})),[rows]);
 const columns=useMemo<ColDef<Row>[]>(()=>[
  {field:'itemCode',headerName:labels.itemCode,width:115,pinned:'left'},
  {field:'name',headerName:labels.product,minWidth:280,flex:1},
  {field:'barcode',headerName:labels.barcode,width:155},
  {field:'category',headerName:labels.category,width:120},
  {field:'supplier',headerName:labels.supplier,width:160},
  {field:'cost',headerName:labels.cost,width:90,type:'numericColumn',valueFormatter:p=>'£'+Number(p.value).toFixed(2)},
  {field:'retail',headerName:labels.retail,width:90,type:'numericColumn',valueFormatter:p=>'£'+Number(p.value).toFixed(2)},
  {field:'margin',headerName:labels.margin,width:90,type:'numericColumn',valueFormatter:p=>p.value+'%'},
  {field:'stock',headerName:labels.stock,width:85,type:'numericColumn'},
  {field:'status',headerName:labels.status,width:130,cellRenderer:(p:any)=>{const e=document.createElement('span');e.className='agStatus '+String(p.value).toLowerCase().replaceAll(' ','-');e.textContent=String(p.value);return e}}
 ],[]);
 const api=()=>gridRef.current?.api;
 const reset=()=>{setDensity('compact');setHidden({});api()?.resetColumnState();api()?.setFilterModel(null);try{localStorage.removeItem(storageKey)}catch{}};
 const toggle=(key:Key)=>{if(loadedKey!==storageKey)return;const field=key==='product'?'name':key;setHidden(v=>({...v,[key]:!v[key]}));api()?.setColumnsVisible([field],!!hidden[key])};
 const copy=()=>{api()?.copySelectedRowsToClipboard({includeHeaders:true})};
 const openFrom=(p?:Row|null)=>{if(p)onOpen(p)};
 const click=(e:RowClickedEvent<Row>)=>{if(e.data)onPreview(e.data)};
 const dbl=(e:RowDoubleClickedEvent<Row>)=>openFrom(e.data);
 return <Box className="agProductShell">
  <Paper className="gridToolbar" variant="outlined"><Stack direction="row" spacing={1} alignItems="center" sx={{width:'100%',flexWrap:'wrap'}}>
   <Typography fontWeight={600}>Product grid · {workingStore}</Typography><Typography variant="body2" color="text.secondary" sx={{flex:1}}>AG Grid · sort, filter, resize, reorder, keyboard navigation & Excel copy</Typography>
   <Button variant="outlined" size="small" onClick={copy}>Copy rows</Button><Button variant="outlined" size="small" startIcon={<Icon name="Columns"/>} onClick={()=>setChooser(!chooser)}>Columns</Button>
   <Select size="small" value={density} onChange={e=>setDensity(e.target.value as 'compact'|'standard')}><MenuItem value="compact">Compact</MenuItem><MenuItem value="standard">Comfortable</MenuItem></Select>
   <Button variant="outlined" size="small" startIcon={<Icon name="Reset"/>} onClick={reset}>Reset view</Button>
  </Stack></Paper>
  {chooser&&<Paper className="columnChooser" elevation={3}><Typography fontWeight={600}>Columns</Typography>{(Object.keys(labels) as Key[]).map(k=><FormControlLabel key={k} control={<Checkbox size="small" checked={!hidden[k]} onChange={()=>toggle(k)}/>} label={labels[k]}/>)}</Paper>}
  <Box className="tableWrap ag-theme-quartz" sx={{height:520,width:'100%'}}>
   <AgGridReact<Row> ref={gridRef} rowData={data} columnDefs={columns} getRowId={p=>p.data.itemCode} rowSelection={{mode:'multiRow',enableClickSelection:true}} defaultColDef={{sortable:true,filter:true,resizable:true}} rowHeight={density==='compact'?38:46} headerHeight={40} pagination paginationPageSize={25} paginationPageSizeSelector={[25,50,100]} onRowClicked={click} onRowDoubleClicked={dbl} onCellKeyDown={e=>{const ev=e.event as KeyboardEvent;if(ev.key==='Enter')openFrom(e.data);if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='c'){ev.preventDefault();copy()}}} onGridReady={({api}: {api:GridApi<Row>})=>{Object.entries(hidden).forEach(([k,v])=>{if(v)api.setColumnsVisible([k==='product'?'name':k],false)})}}/>
  </Box>
 </Box>
}
