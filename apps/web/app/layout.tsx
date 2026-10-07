import type { ReactNode } from 'react';
import './globals.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import MuiAppTheme from './mui-theme';
import {WorkspaceProvider} from './workspace';
export const metadata={title:'OmniCore | Retail Operating System',description:'Enterprise retail operations platform'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body><MuiAppTheme><WorkspaceProvider>{children}</WorkspaceProvider></MuiAppTheme></body></html>}