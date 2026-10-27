import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'铝型材 CBAM 碳核算平台',description:'铝型材CBAM排放与成本核算、PDF及Excel报告。',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><head><script src="/compat.js"/></head><body>{children}</body></html>}
