import './sites-env.mjs';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'.wrangler','preview');await mkdir(out,{recursive:true});
const config=JSON.parse(await readFile(path.join(root,'dist/server/wrangler.json'),'utf8'));
config.main=path.join(root,'dist/server',config.main);config.assets.directory=path.join(root,'dist/client');delete config.build;
await writeFile(path.join(out,'wrangler.json'),JSON.stringify(config));
try{await access(path.join(root,'.dev.vars'));await copyFile(path.join(root,'.dev.vars'),path.join(out,'.dev.vars'));}catch{console.warn('No local .dev.vars; calculation works but encrypted record storage requires DATA_ENCRYPTION_KEY.');}
const args=[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',path.join(out,'wrangler.json'),'--local','--persist-to',path.join(root,'.wrangler/state'),'--ip','127.0.0.1','--inspector-port','0',...process.argv.slice(2)];
const child=spawn(process.execPath,args,{stdio:'inherit'});child.on('exit',code=>process.exit(code||0));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
