'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Box,Button,Checkbox,FormControlLabel,MenuItem,Paper,Select,Stack,Typography} from '@mui/material';
import {DataGrid,GridColDef,GridColumnVisibilityModel,GridRowParams,GridSortModel,GridRowSelectionModel} from '@mui/x-data-grid';
import type {Product} from './page';
import {Icon} from '../app-shell';

type Key='product'|'itemCode'|'barcode'|'category'|'supplier'|'cost'|'retail'|'margin'|'stock'|'status';
const labels:Record<Key,string>={product:'Product',itemCode:'Item Code',barcode:'Barcode / EAN',category:'Category',supplier:'Primary Supplier',cost:'Cost',retail:'Retail',margin:'Margin',stock:'Stock',status:'Status'};
const defaults:Key[]=['product','itemCode','barcode','category','supplier','cost','retail','margin','stock','status'];
const storageKey='omnicore-product-grid-v3';

export default function ProductGrid({rows,workingStore,onPreview,onOpen}:{rows:Product[];workingStore:string;onPreview:(p:Product)=>void;onOpen:(p:Product)=>void}){
 const[rowSelectionModel,setRowSelectionModel]=useState<GridRowSelectionModel>({type:'include',ids:new Set()});const[density,setDensity]=useState<'compact'|'standard'>('compact');const[visibility,setVisibility]=useState<GridColumnVisibilityModel>({});const[sortModel,setSortModel]=useState<GridSortModel>([]);const[chooser,setChooser]=useState(false);const tapRef=useRef<{id:string;at:number}|null>(null);const tapTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{try{const s=JSON.parse(localStorage.getItem(storageKey)||'{}');if(s.density)setDensity(s.density);if(s.visibility)setVisibility(s.visibility);if(s.sortModel)setSortModel(s.sortModel)}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify({density,visibility,sortModel}))}catch{}},[density,visibility,sortModel]);
 const data=useMemo(()=>rows.map(p=>({...p,id:p.itemCode,product:p.name,margin:Math.round((p.retail-p.cost)/p.retail*100)})),[rows]);
 const columns=useMemo<GridColDef[]>(()=>[
  {field:'itemCode',headerName:labels.itemCode,width:110},
  {field:'product',headerName:labels.product,minWidth:300,flex:1,renderCell:p=><div className="prodCell"><div><b>{p.row.name}</b><small>{p.row.alt}</small></div></div>},
  {field:'barcode',headerName:labels.barcode,width:155},
  {field:'category',headerName:labels.category,width:120},
  {field:'supplier',headerName:labels.supplier,width:160},
  {field:'cost',headerName:labels.cost,width:90,type:'number',valueFormatter:v=>'£'+Number(v).toFixed(2)},
  {field:'retail',headerName:labels.retail,width:90,type:'number',valueFormatter:v=>'£'+Number(v).toFixed(2)},
  {field:'margin',headerName:labels.margin,width:90,type:'number',valueFormatter:v=>v+'%'},
  {field:'stock',headerName:labels.stock,width:85,type:'number'},
  {field:'status',headerName:labels.status,width:125,renderCell:p=><span className={'status '+String(p.value).toLowerCase().replaceAll(' ','-')}>{p.value}</span>}
 ],[]);
 const reset=()=>{setDensity('compact');setVisibility({});setSortModel([]);try{localStorage.removeItem(storageKey)}catch{}};
 const visibleKeys=()=>defaults.filter(k=>visibility[k]!==false);
 const copySelection=async(fallback?:Product)=>{const keys=visibleKeys();const ids=Array.from(rowSelectionModel.ids).map(String);const selectedRows=ids.length?rows.filter(r=>ids.includes(r.itemCode)):(fallback?[fallback]:[]);if(!selectedRows.length)return;const header=keys.map(k=>labels[k]).join('\t');const lines=selectedRows.map(p=>keys.map(k=>{const v=k==='product'?p.name:k==='margin'?Math.round((p.retail-p.cost)/p.retail*100)+'%':k==='cost'||k==='retail'?'£'+Number(p[k]).toFixed(2):String(p[k as keyof Product]??'');return v.replace(/[\t\r\n]+/g,' ')}).join('\t'));try{await navigator.clipboard.writeText([header,...lines].join('\r\n'))}catch{}};
 const find=(id:unknown)=>rows.find(p=>p.itemCode===String(id));
 return <Box>
  <Paper className="gridToolbar" variant="outlined"><Stack direction="row" spacing={1} alignItems="center" sx={{width:'100%',flexWrap:'wrap'}}>
   <Typography fontWeight={600}>Product grid · {workingStore}</Typography><Typography variant="body2" color="text.secondary" sx={{flex:1}}>Excel mode · sort, resize, reorder, hide, keyboard navigation & copy</Typography>
   <Button variant="outlined" size="small" startIcon={<Icon name="Columns"/>} onClick={()=>setChooser(!chooser)}>Columns</Button>
   <Select size="small" value={density} onChange={e=>setDensity(e.target.value as 'compact'|'standard')}><MenuItem value="compact">Compact</MenuItem><MenuItem value="standard">Comfortable</MenuItem></Select>
   <Button variant="outlined" size="small" startIcon={<Icon name="Reset"/>} onClick={reset}>Reset view</Button>
  </Stack></Paper>
  {chooser&&<Paper className="columnChooser" elevation={3}><Typography fontWeight={600}>Columns</Typography>{defaults.map(k=><FormControlLabel key={k} control={<Checkbox size="small" checked={visibility[k]!==false} onChange={()=>setVisibility(v=>({...v,[k]:v[k]===false}))}/>} label={labels[k]}/>)}</Paper>}
  <Box className="tableWrap" sx={{height:520,width:'100%'}}>
   <DataGrid className="productTable excelGrid" rows={data} columns={columns} density={density} checkboxSelection rowSelectionModel={rowSelectionModel} onRowSelectionModelChange={setRowSelectionModel} disableRowSelectionOnClick={false} columnVisibilityModel={visibility} onColumnVisibilityModelChange={setVisibility} sortModel={sortModel} onSortModelChange={setSortModel} onRowClick={(p:GridRowParams,e)=>{const x=find(p.id);if(!x)return;if(e.detail>=2){if(tapTimer.current)clearTimeout(tapTimer.current);tapTimer.current=null;tapRef.current=null;onOpen(x);return}const now=Date.now();const last=tapRef.current;if(last&&last.id===String(p.id)&&now-last.at<500){if(tapTimer.current)clearTimeout(tapTimer.current);tapTimer.current=null;tapRef.current=null;onOpen(x);return}tapRef.current={id:String(p.id),at:now};if(tapTimer.current)clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>{onPreview(x);tapTimer.current=null;tapRef.current=null},520)}} onRowDoubleClick={(p:GridRowParams)=>{const x=find(p.id);if(x){if(tapTimer.current)clearTimeout(tapTimer.current);tapTimer.current=null;tapRef.current=null;onOpen(x)}}} onCellKeyDown={(p,e)=>{const x=find(p.id);if(!x)return;if(e.key==='Enter'){e.preventDefault();onOpen(x)}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){e.preventDefault();void copySelection(x)}}} pageSizeOptions={[25,50,100]} initialState={{pagination:{paginationModel:{pageSize:25,page:0}}}} sx={{border:0,fontSize:13,'& .MuiDataGrid-columnHeaders':{backgroundColor:'#f5f7fa',borderBottom:'1px solid #dfe5ec'},'& .MuiDataGrid-columnHeaderTitle':{fontWeight:700,color:'#263b55'},'& .MuiDataGrid-cell':{borderColor:'#edf1f5'},'& .MuiDataGrid-row:hover':{backgroundColor:'#f7faff'},'& .MuiDataGrid-row.Mui-selected':{backgroundColor:'#eaf2ff'},'& .MuiDataGrid-cell:focus,& .MuiDataGrid-columnHeader:focus':{outline:'2px solid #1769e0',outlineOffset:-2},'& .MuiDataGrid-footerContainer':{minHeight:42,borderTop:'1px solid #dfe5ec'}}}/>
  </Box>
 </Box>
}
