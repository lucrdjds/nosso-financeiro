import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distribuir,ajustarLimite,categoria} from './orcamento.mjs';

const plano={renda:1000000,compromissos:300000,guardar:0,limites:[{id:'mercado',valor:300000},{id:'lazer',valor:0}]};
test('renda menos compromissos e valor sem destino',()=>assert.deepEqual(distribuir(plano),{disponivel:700000,distribuido:300000,semDestino:400000,faltaCobrir:0,valido:true}));
test('próxima categoria só aceita o restante',()=>{const a=ajustarLimite(plano,'lazer',400001);assert.equal(a.aceito,false);assert.equal(a.teto,400000);assert.match(a.mensagem,/reduza outro limite/i)});
test('redução libera espaço e não altera original',()=>{const a=ajustarLimite(plano,'mercado',200000);assert.equal(a.aceito,true);assert.equal(plano.limites[0].valor,300000);assert.equal(ajustarLimite(a.plano,'lazer',500000).aceito,true)});
test('guardar também ocupa o teto',()=>{const a=ajustarLimite({...plano,guardar:200000},'lazer',200001);assert.equal(a.aceito,false);assert.equal(a.teto,200000)});
test('excesso de gasto não bloqueia compra',()=>assert.deepEqual(categoria(10000,12500),{limite:10000,gasto:12500,restante:0,excedeu:2500}));
test('rejeita valores negativos, fracionários e categorias repetidas',()=>{assert.throws(()=>categoria(0,-1));assert.throws(()=>ajustarLimite(plano,'lazer',2.2));assert.throws(()=>distribuir({...plano,limites:[{id:'x',valor:1},{id:'x',valor:2}]}))});
test('plano acima do teto permite reduzir gradualmente, sem permitir aumento',()=>{const p={...plano,renda:400000,guardar:0,limites:[{id:'mercado',valor:300000},{id:'lazer',valor:200000}]};const a=ajustarLimite(p,'mercado',250000);assert.equal(a.aceito,true);assert.equal(a.resumo.valido,false);assert.equal(ajustarLimite(p,'mercado',310000).aceito,false)});
