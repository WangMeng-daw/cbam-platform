import {createRoot} from 'react-dom/client';
import Platform from '../app/platform';
import config from '../lib/config.json';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<Platform initial={config}/>);
