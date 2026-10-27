import Platform from './platform';
import seed from '../lib/config.json';
export default function Page(){return <Platform initial={seed}/>;}
