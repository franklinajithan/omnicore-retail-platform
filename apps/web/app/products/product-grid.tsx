'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Box,Button,Checkbox,FormControlLabel,MenuItem,Paper,Select,Stack,Typography} from '@mui/material';
import {AgGridReact} from 'ag-grid-react';
import {AllCommunityModule,ColDef,GridApi,ICellRendererParams,ModuleRegistry,RowDoubleClickedEvent,RowClickedEvent} from 'ag-grid-community';
import type {Product} from './page';
import {Icon} from '../app-shell';

ModuleRegistry.registerModules([AllCommunityModule]);
type Row=Product&{margin:number};
type Key='itemCode'|'product'|'barcode'|'category'|'supplier'|'cost'|'retail'|'margin'|'stock'|'status';
const labels:Record<Key,string>={itemCode:'Item Code',product:'Product',barcode:'Barcode / EAN',category:'Category',supplier:'Primary Supplier',cost:'Cost',retail:'Retail',margin:'Margin',stock:'Stock',status:'Status'};
const storageKey='omnicore-product-ag-grid-v1';

export default function ProductGrid({rows,workingStore,onPreview,onOpen}:{rows:Product[];workingStore:string;onPreview:(p:Product)=>void;onOpen:(p:Product)=>void}){
 const gridRef=useRef<AgGridReact<Row>>(null);const[density,setDensity]=useState<'compact'|'standard'>('compact');const[chooser,setChooser]=useState(false);const[hidden,setHidden]=useState<Record<string,boolean>>({});
 useEffect(()=>{try{const s=JSON.parse(localStorage.getItem(storageKey)||'{}');if(s.density)setDensity(s.density);if(s.hidden)setHidden(s.hidden)}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify({density,hidden}))}catch{}},[density,hidden]);
 const data=useMemo<Row[]>(()=>rows.map(p=>({...p,margin:p.retail>0?Math.round((p.retail-p.cost)/p.retail*100):0})),[rows]);
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
  {field:'status',headerName:labels.status,width:130,cellRenderer:(p:ICellRendererParams<Row,Product['status']>)=>{const status=String(p.value??'');return <span className={'agStatus '+status.toLowerCase().replaceAll(' ','-')}>{status}</span>}}
 ],[]);
 const api=()=>gridRef.current?.api;
 const reset=()=>{setDensity('compact');setHidden({});api()?.resetColumnState();api()?.setFilterModel(null);try{localStorage.removeItem(storageKey)}catch{}};
 const toggle=(key:Key)=>{setHidden(v=>({...v,[key]:!v[key]}))};
 const copy=()=>{api()?.copySelectedRowsToClipboard({includeHeaders:true})};
 const exportCsv=()=>{
  const grid=api();if(!grid)return;
  const safeStore=workingStore.replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'')||'Store';
  const date=new Date().toISOString().slice(0,10);
  grid.exportDataAsCsv({
   fileName:`OmniCore-Products-${safeStore}-${date}.csv`,
   exportedRows:'filteredAndSorted',
   allColumns:false,
   processCellCallback:p=>p.column.getColId()==='margin'?`${p.value}%`:p.value==null?'':String(p.value),
  });
 };
 useEffect(()=>{const grid=api();if(!grid)return;for(const key of Object.keys(labels) as Key[]){grid.setColumnsVisible([key==='product'?'name':key],!hidden[key])}},[hidden]);
 const openFrom=(p?:Row|null)=>{if(p)onOpen(p)};
 const click=(e:RowClickedEvent<Row>)=>{if(e.data)onPreview(e.data)};
 const dbl=(e:RowDoubleClickedEvent<Row>)=>openFrom(e.data);
 return <Box className="agProductShell">
  <Paper className="gridToolbar" variant="outlined"><Stack direction="row" spacing={1} alignItems="center" sx={{width:'100%',flexWrap:'wrap'}}>
   <Typography fontWeight={600}>Product grid · {workingStore}</Typography><Typography variant="body2" color="text.secondary" sx={{flex:1}}>AG Grid · sort, filter, resize, reorder, keyboard navigation & Excel copy</Typography>
   <Button variant="outlined" size="small" onClick={copy}>Copy rows</Button><Button variant="outlined" size="small" onClick={exportCsv}>Export CSV</Button><Button variant="outlined" size="small" startIcon={<Icon name="Columns"/>} onClick={()=>setChooser(!chooser)}>Columns</Button>
   <Select size="small" value={density} onChange={e=>setDensity(e.target.value as 'compact'|'standard')}><MenuItem value="compact">Compact</MenuItem><MenuItem value="standard">Comfortable</MenuItem></Select>
   <Button variant="outlined" size="small" startIcon={<Icon name="Reset"/>} onClick={reset}>Reset view</Button>
  </Stack></Paper>
  {chooser&&<Paper className="columnChooser" elevation={3}><Typography fontWeight={600}>Columns</Typography>{(Object.keys(labels) as Key[]).map(k=><FormControlLabel key={k} control={<Checkbox size="small" checked={!hidden[k]} onChange={()=>toggle(k)}/>} label={labels[k]}/>)}</Paper>}
  <Box className="tableWrap ag-theme-quartz" sx={{height:520,width:'100%'}}>
   <AgGridReact<Row> ref={gridRef} rowData={data} columnDefs={columns} getRowId={p=>p.data.itemCode} rowSelection={{mode:'multiRow',enableClickSelection:true}} defaultColDef={{sortable:true,filter:true,resizable:true}} rowHeight={density==='compact'?38:46} headerHeight={40} pagination paginationPageSize={25} paginationPageSizeSelector={[25,50,100]} onRowClicked={click} onRowDoubleClicked={dbl} onCellKeyDown={e=>{const ev=e.event as KeyboardEvent;if(ev.key==='Enter')openFrom(e.data);if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='c'){ev.preventDefault();copy()}}} onGridReady={({api}: {api:GridApi<Row>})=>{Object.entries(hidden).forEach(([k,v])=>{if(v)api.setColumnsVisible([k==='product'?'name':k],false)})}}/>
  </Box>
 </Box>
}
