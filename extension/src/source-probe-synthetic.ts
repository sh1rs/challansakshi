import type { ExtensionHandoffEnvelope } from '../../lib/extension-handoff-contract';
import type { SourceProbeRejectionCode, SourceProbeResult } from './source-probe';

export function probeSyntheticChallanSakshiSource(plan: unknown): SourceProbeResult {
  type LocalRead = { ok: true; values: Record<string, unknown> } | { ok: false };

  const reject = (code: SourceProbeRejectionCode): SourceProbeResult => Object.freeze({
    status: 'rejected' as const,
    code,
  });
  const isWellFormedUnicode = (value: string): boolean => {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    }
    return true;
  };
  const utf8ByteLength = (value: string): number => {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit <= 0x7f) bytes += 1;
      else if (unit <= 0x7ff) bytes += 2;
      else if (unit >= 0xd800 && unit <= 0xdbff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
      if (bytes > 8_192) return bytes;
    }
    return bytes;
  };
  const readRecord = (value: unknown, expectedKeys: readonly string[]): LocalRead => {
    try {
      if (
        typeof value !== 'object'
        || value === null
        || Array.isArray(value)
        || Object.getPrototypeOf(value) !== Object.prototype
      ) return { ok: false };
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== expectedKeys.length
        || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
      ) return { ok: false };
      const values: Record<string, unknown> = {};
      for (const key of expectedKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return { ok: false };
        values[key] = descriptor.value;
      }
      return { ok: true, values };
    } catch {
      return { ok: false };
    }
  };
  const readStringArray = (value: unknown): readonly string[] | null => {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== 2 || keys[0] !== '0' || keys[1] !== 'length') return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, '0');
      if (
        !descriptor
        || !descriptor.enumerable
        || !('value' in descriptor)
        || typeof descriptor.value !== 'string'
      ) return null;
      return [descriptor.value];
    } catch {
      return null;
    }
  };
  const isBoundedAscii = (value: unknown, maximum: number): value is string => (
    typeof value === 'string'
    && value.length <= maximum
    && /^[\x20-\x7e]*$/.test(value)
  );

  try {
    const planRead = readRecord(plan, [
      'schema',
      'sourceContractVersion',
      'expectedEnvelopeSchema',
      'expectedEnvelopeMode',
      'rootAttribute',
      'rootValue',
      'envelopeAttribute',
      'envelopeValue',
      'expectedLocation',
      'operationNotAfterMs',
    ]);
    if (!planRead.ok) return reject('invalid-plan');
    const checkedPlan = planRead.values;
    if (
      checkedPlan.schema !== 'challansakshi.source-probe-plan/v1'
      || checkedPlan.sourceContractVersion !== 'challansakshi.source-contract/v1'
      || checkedPlan.expectedEnvelopeSchema !== 'challansakshi.extension-handoff/v1'
      || checkedPlan.expectedEnvelopeMode !== 'synthetic'
      || checkedPlan.rootAttribute !== 'data-challansakshi-extension-handoff'
      || checkedPlan.rootValue !== 'v1'
      || checkedPlan.envelopeAttribute !== 'data-challansakshi-extension-envelope'
      || checkedPlan.envelopeValue !== 'v1'
      || !Number.isSafeInteger(checkedPlan.operationNotAfterMs)
      || (checkedPlan.operationNotAfterMs as number) < 0
    ) return reject('invalid-plan');

    const locationRead = readRecord(checkedPlan.expectedLocation, [
      'protocol', 'hostname', 'port', 'pathname', 'allowedSearches',
    ]);
    if (!locationRead.ok) return reject('invalid-plan');
    const expectedLocation = locationRead.values;
    const allowedSearches = readStringArray(expectedLocation.allowedSearches);
    if (
      !isBoundedAscii(expectedLocation.protocol, 8)
      || !isBoundedAscii(expectedLocation.hostname, 253)
      || !isBoundedAscii(expectedLocation.port, 5)
      || !isBoundedAscii(expectedLocation.pathname, 256)
      || !allowedSearches
      || expectedLocation.protocol !== 'http:'
      || expectedLocation.hostname !== '127.0.0.1'
      || expectedLocation.port !== '3000'
      || expectedLocation.pathname !== '/demo/extension-fixture/source'
      || allowedSearches[0] !== ''
    ) return reject('invalid-plan');

    if (Date.now() >= (checkedPlan.operationNotAfterMs as number)) return reject('deadline-reached');
    if (window.top !== window) return reject('not-top-frame');
    const currentLocation = window.location;
    const expectedHref = `${expectedLocation.protocol}//${expectedLocation.hostname}:${expectedLocation.port}${expectedLocation.pathname}${currentLocation.search}`;
    if (
      currentLocation.protocol !== expectedLocation.protocol
      || currentLocation.hostname !== expectedLocation.hostname
      || currentLocation.port !== expectedLocation.port
      || currentLocation.pathname !== expectedLocation.pathname
      || currentLocation.search !== ''
      || currentLocation.hash !== ''
      || currentLocation.href !== expectedHref
    ) return reject('location-mismatch');

    const roots = document.querySelectorAll('[data-challansakshi-extension-handoff]');
    const envelopes = document.querySelectorAll('[data-challansakshi-extension-envelope]');
    if (roots.length !== 1 || envelopes.length !== 1) return reject('capsule-topology-mismatch');
    const root = roots[0];
    const envelopeNode = envelopes[0];
    if (
      !root
      || !envelopeNode
      || root.nodeType !== 1
      || envelopeNode.nodeType !== 1
      || root.getAttribute('data-challansakshi-extension-handoff') !== 'v1'
      || envelopeNode.getAttribute('data-challansakshi-extension-envelope') !== 'v1'
      || root.childNodes.length !== 1
      || root.childNodes[0] !== envelopeNode
      || envelopeNode.parentNode !== root
      || envelopeNode.childNodes.length !== 1
      || envelopeNode.childNodes[0]?.nodeType !== 3
    ) return reject('capsule-topology-mismatch');

    const textNode = envelopeNode.childNodes[0] as Text;
    const raw = textNode.data;
    if (typeof raw !== 'string') return reject('capsule-topology-mismatch');
    if (raw.length > 8_192) return reject('capsule-too-large');
    if (!isWellFormedUnicode(raw)) return reject('invalid-json');
    if (utf8ByteLength(raw) > 8_192) return reject('capsule-too-large');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return reject('invalid-json');
    }
    const envelopeKeys = [
      'schema', 'mode', 'packId', 'resultRevisionId', 'packRevisionId',
      'routeRegistryVersion', 'adapterContractVersion', 'description',
      'descriptionDigest', 'language', 'simpleMode', 'confirmed', 'deviceMode',
      'issuedAt', 'expiresAt', 'routeKey', 'issueCode',
    ];
    const envelopeRead = readRecord(parsed, envelopeKeys);
    if (!envelopeRead.ok) return reject('invalid-envelope');
    const values = envelopeRead.values;
    const scalarKeys = envelopeKeys.filter((key) => key !== 'simpleMode' && key !== 'confirmed' && key !== 'issueCode');
    if (
      scalarKeys.some((key) => typeof values[key] !== 'string' || !isWellFormedUnicode(values[key] as string))
      || typeof values.simpleMode !== 'boolean'
      || values.confirmed !== true
      || (values.issueCode !== null
        && (typeof values.issueCode !== 'string' || !isWellFormedUnicode(values.issueCode)))
      || values.schema !== checkedPlan.expectedEnvelopeSchema
      || values.mode !== 'synthetic'
      || !/^[0-9a-f]{32}$/.test(values.packId as string)
      || !/^[0-9a-f]{32}$/.test(values.resultRevisionId as string)
      || !/^[0-9a-f]{32}$/.test(values.packRevisionId as string)
      || !/^[0-9a-f]{64}$/.test(values.descriptionDigest as string)
      || values.routeRegistryVersion !== 'challansakshi.official-routes/v1'
      || values.adapterContractVersion !== 'challansakshi.adapter-contract/v1'
      || (values.language !== 'en' && values.language !== 'hi')
      || values.deviceMode !== 'private'
    ) return reject('invalid-envelope');

    const issueCodes = [
      'wrong-evidence',
      'wrong-vehicle-number',
      'two-wheeler-on-four-wheeler',
      'four-wheeler-on-two-wheeler',
      'possible-duplicate-number-plate',
    ];
    const routeMatches = values.routeKey === 'synthetic-fixture'
      && (values.issueCode === null
        || (typeof values.issueCode === 'string' && issueCodes.includes(values.issueCode)));
    if (!routeMatches) return reject('invalid-envelope');

    const canonicalEnvelope = Object.freeze({
      schema: values.schema,
      mode: values.mode,
      packId: values.packId,
      resultRevisionId: values.resultRevisionId,
      packRevisionId: values.packRevisionId,
      routeRegistryVersion: values.routeRegistryVersion,
      adapterContractVersion: values.adapterContractVersion,
      description: values.description,
      descriptionDigest: values.descriptionDigest,
      language: values.language,
      simpleMode: values.simpleMode,
      confirmed: values.confirmed,
      deviceMode: values.deviceMode,
      issuedAt: values.issuedAt,
      expiresAt: values.expiresAt,
      routeKey: values.routeKey,
      issueCode: values.issueCode,
    }) as ExtensionHandoffEnvelope;
    if (raw !== JSON.stringify(canonicalEnvelope)) return reject('non-canonical-envelope');
    return Object.freeze({ status: 'accepted' as const, envelope: canonicalEnvelope });
  } catch {
    return reject('invalid-plan');
  }
}
