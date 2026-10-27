import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 base:'/cbam-platform/',
 plugins:[react()],
 build:{outDir:'docs',emptyOutDir:true,target:['chrome90','edge90','firefox88','safari14','ios13'],cssTarget:['chrome90','edge90','firefox88','safari14','ios13']},
 server:{port:5186,strictPort:true},
 preview:{port:5186,strictPort:true}
});
