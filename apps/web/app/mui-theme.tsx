'use client';
import type {ReactNode} from 'react';
import {createTheme,ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme=createTheme({
 palette:{
  primary:{main:'#1769e0',dark:'#0b4fb3'},
  background:{default:'#f5f7fb',paper:'#ffffff'},
  text:{primary:'#0b1f38',secondary:'#61738a'},
  success:{main:'#0a9b62'},warning:{main:'#d98a00'},error:{main:'#d92d20'}
 },
 shape:{borderRadius:8},
 typography:{
  fontFamily:'Roboto, Arial, sans-serif',
  h1:{fontSize:'1.75rem',fontWeight:700,letterSpacing:'-.02em'},
  h2:{fontSize:'1.35rem',fontWeight:700,letterSpacing:'-.015em'},
  h3:{fontSize:'1rem',fontWeight:700},
  body1:{fontSize:14},body2:{fontSize:13},
  button:{fontSize:13,fontWeight:500,textTransform:'none'}
 },
 components:{
  MuiButton:{defaultProps:{disableElevation:true},styleOverrides:{root:{borderRadius:8,minHeight:34}}},
  MuiIconButton:{styleOverrides:{root:{borderRadius:8}}},
  MuiOutlinedInput:{styleOverrides:{root:{borderRadius:8,background:'#fff'}}},
  MuiSelect:{defaultProps:{size:'small'}},
  MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},
  MuiTooltip:{defaultProps:{arrow:true}}
 }
});
export default function MuiAppTheme({children}:{children:ReactNode}){return <ThemeProvider theme={theme}><CssBaseline/>{children}</ThemeProvider>}
