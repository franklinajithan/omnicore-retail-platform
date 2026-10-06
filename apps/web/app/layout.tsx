import type { ReactNode } from 'react';
import './globals.css';
export const metadata={title:'OmniCore | Retail Operating System',description:'Enterprise retail operations platform'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}