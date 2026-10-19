import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React,{useState} from 'react';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/settings',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,File:dom.window.File,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
after(()=>dom.window.close());

const props={acceptedTypes:['image/png','image/jpeg'],accept:'image/png,image/jpeg',maxSize:2*1024*1024,rejectInvalid:true,label:'Image du cachet *',dropTitle:'Glissez-déposez votre cachet ici',dropText:'ou cliquez pour sélectionner une image',selectText:'Sélectionner une image',formatsText:'PNG ou JPEG — maximum 2 Mio',invalidTypeMessage:'Format interdit. Sélectionnez une image PNG ou JPEG.',oversizedMessage:'Cette image dépasse la limite de 2 Mio.'} as const;

test('B3491 clic, clavier, sélection, remplacement et retrait restent accessibles',async()=>{
  const{render,fireEvent,screen,cleanup}=await import('@testing-library/react');const{DocumentFileDropField}=await import('../src/modules/documents/DocumentFileDropField.js');
  let selected:File|null=null;const Host=()=>{const[file,setFile]=useState<File|null>(null);return React.createElement(DocumentFileDropField,{...props,file,onChange:next=>{selected=next;setFile(next)}})};
  render(React.createElement(Host));const zone=screen.getByRole('button',{name:'Déposer ou sélectionner un fichier'}),input=screen.getByLabelText('Image du cachet') as HTMLInputElement;let clicks=0;const nativeClick=input.click.bind(input);input.click=()=>{clicks++};fireEvent.click(zone);fireEvent.keyDown(zone,{key:'Enter'});fireEvent.keyDown(zone,{key:' '});assert.equal(clicks,3);input.click=nativeClick;
  const first=new File(['png'],'cachet-lca.png',{type:'image/png'});fireEvent.change(input,{target:{files:[first]}});assert.equal(selected?.name,'cachet-lca.png');assert.ok(screen.getByText('cachet-lca.png'));assert.ok(screen.getByText('PNG • 1 Ko'));
  fireEvent.click(screen.getByRole('button',{name:'Remplacer'}));const replacement=new File(['jpeg'],'cachet-remplacement.jpg',{type:'image/jpeg'});fireEvent.change(input,{target:{files:[replacement]}});assert.equal(selected?.name,'cachet-remplacement.jpg');assert.ok(screen.getByText('cachet-remplacement.jpg'));
  fireEvent.click(screen.getByRole('button',{name:'Retirer'}));assert.equal(selected,null);assert.ok(screen.getByText('Glissez-déposez votre cachet ici'));cleanup();
});

test('B3491 dépôt valide sélectionne sans enregistrer automatiquement',async()=>{
  const{render,fireEvent,screen,cleanup}=await import('@testing-library/react');const{DocumentFileDropField}=await import('../src/modules/documents/DocumentFileDropField.js');let selected:File|null=null,calls=0;const file=new File(['png'],'depose.png',{type:'image/png'});render(React.createElement(DocumentFileDropField,{...props,file:null,onChange:next=>{calls++;selected=next}}));const zone=screen.getByRole('button',{name:'Déposer ou sélectionner un fichier'});fireEvent.dragEnter(zone,{dataTransfer:{files:[file]}});assert.match(zone.className,/border-\[#8f1722\]/);fireEvent.drop(zone,{dataTransfer:{files:[file]}});assert.equal(calls,1);assert.equal(selected?.name,'depose.png');cleanup();
});

test('B3491 format interdit et fichier volumineux sont refusés sans remplacer le fichier valide',async()=>{
  const{render,fireEvent,screen,cleanup}=await import('@testing-library/react');const{DocumentFileDropField}=await import('../src/modules/documents/DocumentFileDropField.js');const valid=new File(['png'],'valide.png',{type:'image/png'});let selected:File|null=valid,calls=0;const{rerender}=render(React.createElement(DocumentFileDropField,{...props,file:valid,onChange:next=>{calls++;selected=next}}));const input=screen.getByLabelText('Image du cachet');fireEvent.change(input,{target:{files:[new File(['gif'],'interdit.gif',{type:'image/gif'})]}});assert.ok(screen.getByRole('alert').textContent?.includes('Format interdit'));assert.equal(calls,0);assert.equal(selected,valid);
  fireEvent.change(input,{target:{files:[new File([new Uint8Array(2*1024*1024+1)],'trop-grand.png',{type:'image/png'})]}});assert.ok(screen.getByRole('alert').textContent?.includes('2 Mio'));assert.equal(calls,0);assert.equal(selected,valid);rerender(React.createElement(DocumentFileDropField,{...props,file:valid,onChange:()=>undefined}));cleanup();
});
