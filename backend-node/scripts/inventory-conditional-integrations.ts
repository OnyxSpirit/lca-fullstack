import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type Row={id:string;file:string;line:number;title:string;condition:string;activation:string[];prerequisiteDefinitions:string[]};
const root=path.resolve(import.meta.dirname,'..'),testRoot=path.join(root,'test');
const files=(directory:string):string[]=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):entry.name.endsWith('.test.ts')?[path.join(directory,entry.name)]:[]);
const textOf=(source:ts.SourceFile,node:ts.Node)=>source.text.slice(node.getStart(source),node.getEnd());
const staticTitle=(source:ts.SourceFile,node:ts.Expression)=>ts.isStringLiteralLike(node)?node.text:ts.isNoSubstitutionTemplateLiteral(node)?node.text:textOf(source,node);
const envNames=(value:string)=>[...value.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(match=>match[1]!);
const declarations=(source:ts.SourceFile,names:Set<string>)=>{
  const found:string[]=[];
  const visit=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&names.has(node.name.text)&&node.initializer)found.push(textOf(source,node.parent.parent));
    ts.forEachChild(node,visit);
  };
  visit(source);
  return found;
};
const rows:Row[]=[];
for(const absolute of files(testRoot).sort()){
  const source=ts.createSourceFile(absolute,readFileSync(absolute,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const visit=(node:ts.Node)=>{
    if(ts.isCallExpression(node)){
      const callee=node.expression,isDirect=ts.isIdentifier(callee)&&callee.text==='test',isSkip=ts.isPropertyAccessExpression(callee)&&ts.isIdentifier(callee.expression)&&callee.expression.text==='test'&&callee.name.text==='skip';
      if(isDirect||isSkip){
        const title=node.arguments[0];let condition=isSkip?'test.skip':undefined;
        for(const argument of node.arguments.slice(1))if(ts.isObjectLiteralExpression(argument))for(const property of argument.properties)if(ts.isPropertyAssignment(property)&&property.name.getText(source)==='skip')condition=textOf(source,property.initializer);
        if(title&&ts.isExpression(title)&&condition){
          const location=source.getLineAndCharacterOfPosition(node.getStart(source)),identifiers=new Set<string>();
          for(const match of condition.matchAll(/\b([A-Za-z_$][\w$]*)\b/g))if(!['process','env','true','false'].includes(match[1]!))identifiers.add(match[1]!);
          const definitions=declarations(source,identifiers),activation=[...new Set([...envNames(condition),...definitions.flatMap(envNames)])];
          rows.push({id:`IC-${String(rows.length+1).padStart(3,'0')}`,file:path.relative(root,absolute),line:location.line+1,title:staticTitle(source,title),condition,activation,prerequisiteDefinitions:definitions});
        }
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
}
process.stdout.write(`${JSON.stringify({count:rows.length,generatedAt:new Date().toISOString(),rows},null,2)}\n`);
