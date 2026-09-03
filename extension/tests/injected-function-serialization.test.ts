import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { probeChallanSakshiSource } from '../src/source-probe';

const envelope = {
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
  packId: '00112233445566778899aabbccddeeff',
  resultRevisionId: '11112222333344445555666677778888',
  packRevisionId: '9999aaaabbbbccccddddeeeeffff0000',
  routeRegistryVersion: 'challansakshi.official-routes/v1',
  adapterContractVersion: 'challansakshi.adapter-contract/v1',
  description: 'Please review the fictional vehicle-class mismatch.',
  descriptionDigest: '2904ce189e9e2a9e7f7d59ef19b3ae9298caaff1e5158927e602029ce9f06763',
  language: 'en',
  simpleMode: false,
  confirmed: true,
  deviceMode: 'private',
  issuedAt: '2026-09-03T08:00:00.000Z',
  expiresAt: '2026-09-03T08:10:00.000Z',
  routeKey: 'synthetic-fixture',
  issueCode: 'four-wheeler-on-two-wheeler',
} as const;

const plan = {
  schema: 'challansakshi.source-probe-plan/v1',
  sourceContractVersion: 'challansakshi.source-contract/v1',
  expectedEnvelopeSchema: 'challansakshi.extension-handoff/v1',
  expectedEnvelopeMode: 'synthetic',
  rootAttribute: 'data-challansakshi-extension-handoff',
  rootValue: 'v1',
  envelopeAttribute: 'data-challansakshi-extension-envelope',
  envelopeValue: 'v1',
  expectedLocation: {
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: '3000',
    pathname: '/demo/extension-fixture/source',
    allowedSearches: [''],
  },
  operationNotAfterMs: Date.now() + 60_000,
} as const;

describe('serialized injected source probe', () => {
  it('reconstructs from Function.prototype.toString in a fresh realm with only DOM platform globals and JSON data', () => {
    const dom = new JSDOM(
      '<!doctype html><body><div data-challansakshi-extension-handoff="v1"><span data-challansakshi-extension-envelope="v1"></span></div></body>',
      {
        url: 'http://127.0.0.1:3000/demo/extension-fixture/source',
        runScripts: 'outside-only',
      },
    );
    dom.window.document.querySelector('span')?.append(
      dom.window.document.createTextNode(JSON.stringify(envelope)),
    );
    const context = vm.createContext({
      window: dom.window,
      document: dom.window.document,
    });
    const serializedCall = `(${Function.prototype.toString.call(probeChallanSakshiSource)})(${JSON.stringify(plan)})`;
    const result = vm.runInContext(serializedCall, context) as unknown;
    expect(JSON.parse(JSON.stringify(result))).toEqual({ status: 'accepted', envelope });
  });

  it('contains no imported helper closure Chrome authority or whole-page read', () => {
    const source = Function.prototype.toString.call(probeChallanSakshiSource);
    expect(source).not.toMatch(/validateExtensionHandoffEnvelope|parseCanonicalExtensionHandoffEnvelopeJson|digestCanonicalExtensionHandoffEnvelope/);
    expect(source).not.toMatch(/\bchrome\b|\bbrowser\b|executeScript|sendMessage|storage\./);
    expect(source).not.toMatch(/innerHTML|outerHTML|documentElement|body\.textContent|document\.textContent/);
    expect(source).not.toMatch(/getElementById|getElementsBy|querySelector\(/);
    expect(source.match(/document\.querySelectorAll/g)).toHaveLength(2);
  });
});
