export const DESTINATION_INJECTION_PLAN_SCHEMA = 'challansakshi.destination-injection-plan/v1' as const;
export const DESTINATION_OPERATION_RESULT_SCHEMA = 'challansakshi.destination-operation-result/v1' as const;
export const DESTINATION_FINGERPRINT_SCHEMA = 'challansakshi.destination-fingerprint/v1' as const;

export type DestinationFieldIdsV1 = readonly ['category', 'description'];

export type DestinationIdSelectorV1 = Readonly<{
  kind: 'id';
  value: string;
}>;

export type DestinationLocationV1 = Readonly<{
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
  username: '';
  password: '';
  search: '';
  hash: '';
}>;

export type DestinationFormV1 = Readonly<{
  selector: DestinationIdSelectorV1;
  tag: 'form';
  id: string;
  name: string;
  method: 'post';
  action: string;
  markerAttribute: string;
  markerValue: string;
}>;

export type DestinationStructuralFingerprintV1 = readonly [
  schema: typeof DESTINATION_FINGERPRINT_SCHEMA,
  locationProtocol: 'http:' | 'https:',
  locationHostname: string,
  locationPort: string,
  locationPathname: string,
  locationUsername: '',
  locationPassword: '',
  locationSearch: '',
  locationHash: '',
  formTag: 'form',
  formSelectorKind: 'id',
  formSelectorValue: string,
  formId: string,
  formName: string,
  formMethod: 'post',
  formAction: string,
  formMarkerAttribute: string,
  formMarkerValue: string,
  categoryField: 'category',
  categoryTag: 'select',
  categorySelectorKind: 'id',
  categorySelectorValue: string,
  categoryId: string,
  categoryName: string,
  categoryLabel: string,
  categoryContainerTag: 'section',
  categoryContainerAttribute: string,
  categoryContainerValue: string,
  categorySetter: 'HTMLSelectElement.value',
  neutralIndex: number,
  neutralValue: string,
  neutralLabel: string,
  neutralDisabled: boolean,
  neutralHidden: boolean,
  neutralParentOptgroupPresent: boolean,
  neutralParentOptgroupDisabled: boolean,
  neutralParentOptgroupHidden: boolean,
  mappedIndex: number,
  mappedValue: string,
  mappedLabel: string,
  mappedDisabled: false,
  mappedHidden: false,
  mappedParentOptgroupPresent: boolean,
  mappedParentOptgroupDisabled: boolean,
  mappedParentOptgroupHidden: boolean,
  descriptionField: 'description',
  descriptionTag: 'textarea',
  descriptionSelectorKind: 'id',
  descriptionSelectorValue: string,
  descriptionId: string,
  descriptionName: string,
  descriptionLabel: string,
  descriptionContainerTag: 'section',
  descriptionContainerAttribute: string,
  descriptionContainerValue: string,
  descriptionSetter: 'HTMLTextAreaElement.value',
  rawMinLengthPresent: boolean,
  rawMinLength: string,
  rawMaxLengthPresent: boolean,
  rawMaxLength: string,
  nativeMinLength: number,
  nativeMaxLength: number,
  descriptionRequired: boolean,
  descriptionReadOnly: boolean,
  adapterRevision: string,
];

type DestinationPlanBaseV1 = Readonly<{
  schema: typeof DESTINATION_INJECTION_PLAN_SCHEMA;
  adapterId: string;
  adapterContractVersion: string;
  routeRegistryVersion: string;
  adapterRevision: string;
  expectedLocation: DestinationLocationV1;
  expectedForm: DestinationFormV1;
  fields: DestinationFieldIdsV1;
  structuralFingerprint: DestinationStructuralFingerprintV1;
  dispatchedEvents: readonly [];
  effectiveExpiresAtMs: number;
  adapterExpiresAtMs: number;
  operationNotAfterMs: number;
}>;

export type DestinationPreviewPlanV1 = DestinationPlanBaseV1 & Readonly<{
  operation: 'preview';
  values: null;
}>;

export type DestinationFillPlanV1 = DestinationPlanBaseV1 & Readonly<{
  operation: 'fill';
  attemptId: string;
  values: Readonly<{
    category: string;
    description: string;
  }>;
}>;

export type DestinationInjectionPlanV1 = DestinationPreviewPlanV1 | DestinationFillPlanV1;

export type DestinationPreviewMismatchCode =
  | 'deadline-reached'
  | 'not-top-frame'
  | 'document-not-visible'
  | 'location-mismatch'
  | 'form-mismatch'
  | 'target-mismatch'
  | 'target-not-blank'
  | 'setter-unavailable';

export type DestinationOperationResultV1 =
  | Readonly<{
    schema: typeof DESTINATION_OPERATION_RESULT_SCHEMA;
    status: 'rejected';
    code: 'invalid-plan';
  }>
  | Readonly<{
    schema: typeof DESTINATION_OPERATION_RESULT_SCHEMA;
    operation: 'preview';
    status: 'ready';
    fieldIds: DestinationFieldIdsV1;
  }>
  | Readonly<{
    schema: typeof DESTINATION_OPERATION_RESULT_SCHEMA;
    operation: 'preview';
    status: 'mismatch';
    code: DestinationPreviewMismatchCode;
  }>
  | Readonly<{
    schema: typeof DESTINATION_OPERATION_RESULT_SCHEMA;
    operation: 'fill';
    attemptId: string;
    fieldIds: DestinationFieldIdsV1;
    status: 'complete' | 'partial' | 'indeterminate';
  }>;

/**
 * Self-contained Chrome isolated-world function. Keep every helper and literal used at runtime
 * inside this body: Chrome serializes the function body without this module's closure.
 */
export async function preflightOrFillDestination(planValue: unknown): Promise<DestinationOperationResultV1> {
  const resultSchema = 'challansakshi.destination-operation-result/v1';
  const planSchema = 'challansakshi.destination-injection-plan/v1';
  const fingerprintSchema = 'challansakshi.destination-fingerprint/v1';
  const fieldIds = ['category', 'description'];
  const previewKeys = [
    'schema', 'operation', 'adapterId', 'adapterContractVersion', 'routeRegistryVersion',
    'adapterRevision', 'expectedLocation', 'expectedForm', 'fields', 'structuralFingerprint',
    'dispatchedEvents', 'effectiveExpiresAtMs', 'adapterExpiresAtMs', 'operationNotAfterMs',
    'values',
  ];
  const fillKeys = [
    'schema', 'operation', 'adapterId', 'adapterContractVersion', 'routeRegistryVersion',
    'adapterRevision', 'expectedLocation', 'expectedForm', 'fields', 'structuralFingerprint',
    'dispatchedEvents', 'effectiveExpiresAtMs', 'adapterExpiresAtMs', 'operationNotAfterMs',
    'attemptId', 'values',
  ];
  const locationKeys = [
    'protocol', 'hostname', 'port', 'pathname', 'username', 'password', 'search', 'hash',
  ];
  const formKeys = [
    'selector', 'tag', 'id', 'name', 'method', 'action', 'markerAttribute', 'markerValue',
  ];
  const selectorKeys = ['kind', 'value'];
  const valueKeys = ['category', 'description'];
  const opaqueIdPattern = /^[0-9a-f]{32}$/;
  const safeIdPattern = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;
  const safeTokenPattern = /^[\x21-\x7e]{1,128}$/;
  const safeAttributePattern = /^[a-z][a-z0-9._:-]{0,127}$/;
  const safeHostnamePattern = /^[a-z0-9.-]{1,253}$/;

  const rejected = () => ({ schema: resultSchema, status: 'rejected', code: 'invalid-plan' });
  const previewMismatch = (code: string) => ({
    schema: resultSchema,
    operation: 'preview',
    status: 'mismatch',
    code,
  });
  const fillResult = (
    attemptId: string,
    status: 'complete' | 'partial' | 'indeterminate',
  ): DestinationOperationResultV1 => ({
    schema: resultSchema,
    operation: 'fill',
    attemptId,
    fieldIds: ['category', 'description'] as const,
    status,
  });
  const isSafeIntegerTime = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;
  const isPlainDataRecord = (value: unknown, expectedKeys: string[]) => {
    try {
      if (
        typeof value !== 'object'
        || value === null
        || Array.isArray(value)
        || Object.getPrototypeOf(value) !== Object.prototype
      ) return false;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== expectedKeys.length) return false;
      for (let index = 0; index < expectedKeys.length; index += 1) {
        if (keys[index] !== expectedKeys[index]) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, expectedKeys[index]!);
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return false;
      }
      return true;
    } catch {
      return false;
    }
  };
  const isDenseArray = (value: unknown, length: number) => {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== length) {
        return false;
      }
      const keys = Reflect.ownKeys(value);
      if (keys.length !== length + 1 || keys[length] !== 'length') return false;
      for (let index = 0; index < length; index += 1) {
        if (keys[index] !== String(index)) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  try {
    if (typeof planValue !== 'object' || planValue === null) return rejected() as DestinationOperationResultV1;
    const operationDescriptor = Object.getOwnPropertyDescriptor(planValue, 'operation');
    if (!operationDescriptor || !('value' in operationDescriptor)) return rejected() as DestinationOperationResultV1;
    const operation = operationDescriptor.value;
    const exactPlanKeys = operation === 'preview' ? previewKeys : operation === 'fill' ? fillKeys : null;
    if (!exactPlanKeys || !isPlainDataRecord(planValue, exactPlanKeys)) {
      return rejected() as DestinationOperationResultV1;
    }
    const plan = planValue as Record<string, unknown>;
    if (
      plan.schema !== planSchema
      || typeof plan.adapterId !== 'string'
      || !safeTokenPattern.test(plan.adapterId)
      || plan.adapterContractVersion !== 'challansakshi.adapter-contract/v1'
      || plan.routeRegistryVersion !== 'challansakshi.official-routes/v1'
      || typeof plan.adapterRevision !== 'string'
      || !safeTokenPattern.test(plan.adapterRevision)
      || !isDenseArray(plan.fields, 2)
      || (plan.fields as unknown[])[0] !== fieldIds[0]
      || (plan.fields as unknown[])[1] !== fieldIds[1]
      || !isDenseArray(plan.dispatchedEvents, 0)
      || !isSafeIntegerTime(plan.effectiveExpiresAtMs)
      || !isSafeIntegerTime(plan.adapterExpiresAtMs)
      || !isSafeIntegerTime(plan.operationNotAfterMs)
      || (plan.operationNotAfterMs as number) > (plan.effectiveExpiresAtMs as number)
      || (plan.operationNotAfterMs as number) > (plan.adapterExpiresAtMs as number)
    ) return rejected() as DestinationOperationResultV1;

    if (!isPlainDataRecord(plan.expectedLocation, locationKeys)) {
      return rejected() as DestinationOperationResultV1;
    }
    const expectedLocation = plan.expectedLocation as Record<string, unknown>;
    if (
      (expectedLocation.protocol !== 'http:' && expectedLocation.protocol !== 'https:')
      || typeof expectedLocation.hostname !== 'string'
      || !safeHostnamePattern.test(expectedLocation.hostname)
      || typeof expectedLocation.port !== 'string'
      || !/^(?:|[0-9]{1,5})$/.test(expectedLocation.port)
      || typeof expectedLocation.pathname !== 'string'
      || !/^\/[\x21-\x7e]*$/.test(expectedLocation.pathname)
      || expectedLocation.username !== ''
      || expectedLocation.password !== ''
      || expectedLocation.search !== ''
      || expectedLocation.hash !== ''
    ) return rejected() as DestinationOperationResultV1;

    if (!isPlainDataRecord(plan.expectedForm, formKeys)) return rejected() as DestinationOperationResultV1;
    const expectedForm = plan.expectedForm as Record<string, unknown>;
    if (!isPlainDataRecord(expectedForm.selector, selectorKeys)) return rejected() as DestinationOperationResultV1;
    const formSelector = expectedForm.selector as Record<string, unknown>;
    if (
      formSelector.kind !== 'id'
      || typeof formSelector.value !== 'string'
      || !safeIdPattern.test(formSelector.value)
      || expectedForm.tag !== 'form'
      || expectedForm.id !== formSelector.value
      || typeof expectedForm.name !== 'string'
      || !safeTokenPattern.test(expectedForm.name)
      || expectedForm.method !== 'post'
      || typeof expectedForm.action !== 'string'
      || !/^(?:https?|http):\/\/[\x21-\x7e]+$/.test(expectedForm.action)
      || typeof expectedForm.markerAttribute !== 'string'
      || !safeAttributePattern.test(expectedForm.markerAttribute)
      || typeof expectedForm.markerValue !== 'string'
      || !safeTokenPattern.test(expectedForm.markerValue)
    ) return rejected() as DestinationOperationResultV1;

    if (!isDenseArray(plan.structuralFingerprint, 65)) return rejected() as DestinationOperationResultV1;
    const fingerprint = plan.structuralFingerprint as unknown[];
    const stringSlots = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
      18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 38, 39,
      45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 57, 59, 64,
    ];
    if (stringSlots.some((index) => typeof fingerprint[index] !== 'string')) {
      return rejected() as DestinationOperationResultV1;
    }
    if (
      fingerprint[0] !== fingerprintSchema
      || fingerprint[1] !== expectedLocation.protocol
      || fingerprint[2] !== expectedLocation.hostname
      || fingerprint[3] !== expectedLocation.port
      || fingerprint[4] !== expectedLocation.pathname
      || fingerprint[5] !== expectedLocation.username
      || fingerprint[6] !== expectedLocation.password
      || fingerprint[7] !== expectedLocation.search
      || fingerprint[8] !== expectedLocation.hash
      || fingerprint[9] !== expectedForm.tag
      || fingerprint[10] !== formSelector.kind
      || fingerprint[11] !== formSelector.value
      || fingerprint[12] !== expectedForm.id
      || fingerprint[13] !== expectedForm.name
      || fingerprint[14] !== expectedForm.method
      || fingerprint[15] !== expectedForm.action
      || fingerprint[16] !== expectedForm.markerAttribute
      || fingerprint[17] !== expectedForm.markerValue
      || fingerprint[18] !== 'category'
      || fingerprint[19] !== 'select'
      || fingerprint[20] !== 'id'
      || fingerprint[21] !== fingerprint[22]
      || typeof fingerprint[21] !== 'string'
      || !safeIdPattern.test(fingerprint[21])
      || typeof fingerprint[23] !== 'string'
      || !safeTokenPattern.test(fingerprint[23])
      || typeof fingerprint[24] !== 'string'
      || fingerprint[24].length === 0
      || fingerprint[25] !== 'section'
      || typeof fingerprint[26] !== 'string'
      || !safeAttributePattern.test(fingerprint[26])
      || typeof fingerprint[27] !== 'string'
      || !safeTokenPattern.test(fingerprint[27])
      || fingerprint[28] !== 'HTMLSelectElement.value'
      || !Number.isSafeInteger(fingerprint[29])
      || (fingerprint[29] as number) < 0
      || typeof fingerprint[30] !== 'string'
      || typeof fingerprint[31] !== 'string'
      || typeof fingerprint[32] !== 'boolean'
      || typeof fingerprint[33] !== 'boolean'
      || typeof fingerprint[34] !== 'boolean'
      || typeof fingerprint[35] !== 'boolean'
      || typeof fingerprint[36] !== 'boolean'
      || !Number.isSafeInteger(fingerprint[37])
      || (fingerprint[37] as number) < 0
      || typeof fingerprint[38] !== 'string'
      || typeof fingerprint[39] !== 'string'
      || fingerprint[40] !== false
      || fingerprint[41] !== false
      || typeof fingerprint[42] !== 'boolean'
      || typeof fingerprint[43] !== 'boolean'
      || typeof fingerprint[44] !== 'boolean'
      || fingerprint[29] === fingerprint[37]
      || fingerprint[30] === fingerprint[38]
      || fingerprint[45] !== 'description'
      || fingerprint[46] !== 'textarea'
      || fingerprint[47] !== 'id'
      || fingerprint[48] !== fingerprint[49]
      || typeof fingerprint[48] !== 'string'
      || !safeIdPattern.test(fingerprint[48])
      || typeof fingerprint[50] !== 'string'
      || !safeTokenPattern.test(fingerprint[50])
      || typeof fingerprint[51] !== 'string'
      || fingerprint[51].length === 0
      || fingerprint[52] !== 'section'
      || typeof fingerprint[53] !== 'string'
      || !safeAttributePattern.test(fingerprint[53])
      || typeof fingerprint[54] !== 'string'
      || !safeTokenPattern.test(fingerprint[54])
      || fingerprint[55] !== 'HTMLTextAreaElement.value'
      || typeof fingerprint[56] !== 'boolean'
      || typeof fingerprint[57] !== 'string'
      || typeof fingerprint[58] !== 'boolean'
      || typeof fingerprint[59] !== 'string'
      || !Number.isSafeInteger(fingerprint[60])
      || (fingerprint[60] as number) < 0
      || !Number.isSafeInteger(fingerprint[61])
      || (fingerprint[61] as number) < 0
      || typeof fingerprint[62] !== 'boolean'
      || typeof fingerprint[63] !== 'boolean'
      || fingerprint[64] !== plan.adapterRevision
    ) return rejected() as DestinationOperationResultV1;

    let attemptId = '';
    let values: { category: string; description: string } | null = null;
    if (operation === 'preview') {
      if (plan.values !== null) return rejected() as DestinationOperationResultV1;
    } else {
      if (
        typeof plan.attemptId !== 'string'
        || !opaqueIdPattern.test(plan.attemptId)
        || !isPlainDataRecord(plan.values, valueKeys)
      ) return rejected() as DestinationOperationResultV1;
      const candidateValues = plan.values as Record<string, unknown>;
      if (
        typeof candidateValues.category !== 'string'
        || candidateValues.category !== fingerprint[38]
        || candidateValues.category.length === 0
        || typeof candidateValues.description !== 'string'
        || candidateValues.description.length < (fingerprint[60] as number)
        || candidateValues.description.length > (fingerprint[61] as number)
      ) return rejected() as DestinationOperationResultV1;
      attemptId = plan.attemptId;
      values = {
        category: candidateValues.category,
        description: candidateValues.description,
      };
    }

    const currentTime = () => Date.now();
    const deadlineReached = () => currentTime() >= (plan.operationNotAfterMs as number);
    if (deadlineReached()) {
      return operation === 'preview'
        ? previewMismatch('deadline-reached') as DestinationOperationResultV1
        : fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
    }
    if (window.top !== window) {
      return operation === 'preview'
        ? previewMismatch('not-top-frame') as DestinationOperationResultV1
        : fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
    }
    if (document.visibilityState !== 'visible') {
      return operation === 'preview'
        ? previewMismatch('document-not-visible') as DestinationOperationResultV1
        : fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
    }

    const expectedLocationHref = `${expectedLocation.protocol}//${expectedLocation.hostname}${
      expectedLocation.port === '' ? '' : `:${expectedLocation.port}`
    }${expectedLocation.pathname}`;
    const locationMatches = () => window.location.href === expectedLocationHref;
    if (!locationMatches()) {
      return operation === 'preview'
        ? previewMismatch('location-mismatch') as DestinationOperationResultV1
        : fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
    }

    const getAttribute = (node: Element, name: string) => Element.prototype.getAttribute.call(node, name);
    const hasAttribute = (node: Element, name: string) => Element.prototype.hasAttribute.call(node, name);
    const matches = (node: Element, selector: string) => Element.prototype.matches.call(node, selector);
    const allByTag = (root: Document | Element, tag: string): Element[] => {
      const collection = root instanceof Document
        ? Document.prototype.getElementsByTagName.call(root, tag)
        : Element.prototype.getElementsByTagName.call(root, tag);
      return Array.from(collection) as Element[];
    };
    const ownValueIsUnshadowed = (node: Element) => Object.getOwnPropertyDescriptor(node, 'value') === undefined;
    const readNative = (prototype: object, property: string, target: object) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor || typeof descriptor.get !== 'function') throw new Error('native-getter-unavailable');
      return descriptor.get.call(target) as unknown;
    };
    const nativeSetter = (prototype: object) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      return descriptor && typeof descriptor.set === 'function' ? descriptor.set : null;
    };
    const optgroupState = (option: HTMLOptionElement) => {
      const parent = option.parentElement;
      if (!(parent instanceof HTMLOptGroupElement)) {
        return { present: false, disabled: false, hidden: false };
      }
      return {
        present: true,
        disabled: readNative(HTMLOptGroupElement.prototype, 'disabled', parent) === true,
        hidden: hasAttribute(parent, 'hidden'),
      };
    };
    const nodeIsVisible = (node: HTMLElement, form: HTMLFormElement) => {
      if (!node.isConnected) return false;
      let cursor: HTMLElement | null = node;
      let reachedForm = false;
      while (cursor) {
        if (
          hasAttribute(cursor, 'hidden')
          || hasAttribute(cursor, 'inert')
          || getAttribute(cursor, 'aria-hidden') === 'true'
        ) return false;
        if (cursor === form) {
          reachedForm = true;
          break;
        }
        cursor = cursor.parentElement;
      }
      if (!reachedForm && node !== form) return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      const opacity = Number.parseFloat(style.opacity);
      if (Number.isFinite(opacity) && opacity === 0) return false;
      const rects = Element.prototype.getClientRects.call(node);
      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index];
        if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0) {
          return true;
        }
      }
      return false;
    };
    const findForm = (): HTMLFormElement | null => {
      const forms = allByTag(document, 'form').filter((candidate) => (
        getAttribute(candidate, 'id') === expectedForm.id
      ));
      if (forms.length !== 1 || !(forms[0] instanceof HTMLFormElement)) return null;
      return forms[0];
    };
    const inspectTarget = (
      form: HTMLFormElement,
      tag: 'select' | 'textarea',
      id: string,
      name: string,
      labelText: string,
      containerAttribute: string,
      containerValue: string,
    ) => {
      const targets = allByTag(form, tag).filter((candidate) => getAttribute(candidate, 'id') === id);
      if (targets.length !== 1) return null;
      const target = targets[0];
      if (getAttribute(target, 'name') !== name || !ownValueIsUnshadowed(target)) return null;
      const container = target.parentElement;
      if (
        !(container instanceof HTMLElement)
        || container.tagName.toLowerCase() !== 'section'
        || getAttribute(container, containerAttribute) !== containerValue
        || target.parentElement !== container
      ) return null;
      const labels = allByTag(container, 'label').filter((candidate) => (
        candidate.parentElement === container && getAttribute(candidate, 'for') === id
      ));
      if (
        labels.length !== 1
        || !(labels[0] instanceof HTMLLabelElement)
        || labels[0].textContent !== labelText
        || labels[0].parentElement !== container
      ) return null;
      if (!nodeIsVisible(form, form) || !nodeIsVisible(container, form) || !nodeIsVisible(labels[0], form) || !(target instanceof HTMLElement) || !nodeIsVisible(target, form)) {
        return null;
      }
      return { target, container, label: labels[0] };
    };

    type Inspection = {
      code: null | 'form-mismatch' | 'target-mismatch' | 'target-not-blank' | 'setter-unavailable';
      form?: HTMLFormElement;
      category?: HTMLSelectElement;
      description?: HTMLTextAreaElement;
    };
    const inspectContract = (
      expectedCategoryValue: string,
      expectedDescriptionValue: string,
    ): Inspection => {
      const form = findForm();
      if (!form) return { code: 'form-mismatch' };
      const formMethod = readNative(HTMLFormElement.prototype, 'method', form);
      const formAction = readNative(HTMLFormElement.prototype, 'action', form);
      if (
        getAttribute(form, 'id') !== expectedForm.id
        || getAttribute(form, 'name') !== expectedForm.name
        || formMethod !== expectedForm.method
        || formAction !== expectedForm.action
        || getAttribute(form, expectedForm.markerAttribute as string) !== expectedForm.markerValue
        || !nodeIsVisible(form, form)
      ) return { code: 'form-mismatch' };

      const categoryParts = inspectTarget(
        form,
        'select',
        fingerprint[22] as string,
        fingerprint[23] as string,
        fingerprint[24] as string,
        fingerprint[26] as string,
        fingerprint[27] as string,
      );
      const descriptionParts = inspectTarget(
        form,
        'textarea',
        fingerprint[49] as string,
        fingerprint[50] as string,
        fingerprint[51] as string,
        fingerprint[53] as string,
        fingerprint[54] as string,
      );
      if (
        !categoryParts
        || !(categoryParts.target instanceof HTMLSelectElement)
        || !descriptionParts
        || !(descriptionParts.target instanceof HTMLTextAreaElement)
      ) return { code: 'target-mismatch' };
      const categoryTarget = categoryParts.target;
      const descriptionTarget = descriptionParts.target;
      if (
        readNative(HTMLSelectElement.prototype, 'form', categoryTarget) !== form
        || readNative(HTMLTextAreaElement.prototype, 'form', descriptionTarget) !== form
        || readNative(HTMLSelectElement.prototype, 'disabled', categoryTarget) !== false
        || matches(categoryTarget, ':disabled')
        || readNative(HTMLSelectElement.prototype, 'multiple', categoryTarget) !== false
        || readNative(HTMLTextAreaElement.prototype, 'disabled', descriptionTarget) !== false
        || matches(descriptionTarget, ':disabled')
        || readNative(HTMLTextAreaElement.prototype, 'readOnly', descriptionTarget) !== fingerprint[63]
        || hasAttribute(descriptionTarget, 'minlength') !== fingerprint[56]
        || getAttribute(descriptionTarget, 'minlength') !== fingerprint[57]
        || hasAttribute(descriptionTarget, 'maxlength') !== fingerprint[58]
        || getAttribute(descriptionTarget, 'maxlength') !== fingerprint[59]
        || readNative(HTMLTextAreaElement.prototype, 'minLength', descriptionTarget) !== fingerprint[60]
        || readNative(HTMLTextAreaElement.prototype, 'maxLength', descriptionTarget) !== fingerprint[61]
        || readNative(HTMLTextAreaElement.prototype, 'required', descriptionTarget) !== fingerprint[62]
      ) return { code: 'target-mismatch' };

      const options = readNative(HTMLSelectElement.prototype, 'options', categoryTarget) as HTMLOptionsCollection;
      const selectedIndex = readNative(HTMLSelectElement.prototype, 'selectedIndex', categoryTarget);
      const categoryValue = readNative(HTMLSelectElement.prototype, 'value', categoryTarget);
      const descriptionValue = readNative(HTMLTextAreaElement.prototype, 'value', descriptionTarget);
      const neutral = options[fingerprint[29] as number];
      const mapped = options[fingerprint[37] as number];
      if (!neutral || !mapped || neutral === mapped) return { code: 'target-mismatch' };
      const optionRead = (property: string, option: HTMLOptionElement) => readNative(HTMLOptionElement.prototype, property, option);
      const neutralGroup = optgroupState(neutral);
      const mappedGroup = optgroupState(mapped);
      let selectedCount = 0;
      let mappedMatches = 0;
      for (let index = 0; index < options.length; index += 1) {
        const option = options[index];
        if (!option) continue;
        if (optionRead('selected', option) === true) selectedCount += 1;
        if (optionRead('value', option) === fingerprint[38] && optionRead('label', option) === fingerprint[39]) {
          mappedMatches += 1;
        }
      }
      if (
        optionRead('value', neutral) !== fingerprint[30]
        || optionRead('label', neutral) !== fingerprint[31]
        || optionRead('disabled', neutral) !== fingerprint[32]
        || hasAttribute(neutral, 'hidden') !== fingerprint[33]
        || neutralGroup.present !== fingerprint[34]
        || neutralGroup.disabled !== fingerprint[35]
        || neutralGroup.hidden !== fingerprint[36]
        || optionRead('value', mapped) !== fingerprint[38]
        || optionRead('label', mapped) !== fingerprint[39]
        || optionRead('disabled', mapped) !== false
        || hasAttribute(mapped, 'hidden') !== false
        || mappedGroup.present !== fingerprint[42]
        || mappedGroup.disabled !== fingerprint[43]
        || mappedGroup.hidden !== fingerprint[44]
        || mappedMatches !== 1
      ) return { code: 'target-mismatch' };
      if (
        selectedIndex !== (expectedCategoryValue === '' ? fingerprint[29] : fingerprint[37])
        || selectedCount !== 1
        || categoryValue !== expectedCategoryValue
        || descriptionValue !== expectedDescriptionValue
      ) return { code: 'target-not-blank' };
      if (!nativeSetter(HTMLSelectElement.prototype) || !nativeSetter(HTMLTextAreaElement.prototype)) {
        return { code: 'setter-unavailable' };
      }
      return { code: null, form, category: categoryTarget, description: descriptionTarget };
    };

    const initial = inspectContract('', '');
    if (initial.code) {
      return operation === 'preview'
        ? previewMismatch(initial.code) as DestinationOperationResultV1
        : fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
    }
    if (operation === 'preview') {
      return {
        schema: resultSchema,
        operation: 'preview',
        status: 'ready',
        fieldIds: ['category', 'description'],
      } as DestinationOperationResultV1;
    }

    let assignments = 0;
    try {
      if (!values || deadlineReached() || document.visibilityState !== 'visible' || !locationMatches()) {
        return fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
      }
      const beforeCategory = inspectContract('', '');
      if (
        beforeCategory.code
        || !beforeCategory.category
        || beforeCategory.form !== initial.form
        || beforeCategory.category !== initial.category
        || beforeCategory.description !== initial.description
      ) {
        return fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
      }
      if (deadlineReached() || document.visibilityState !== 'visible' || !locationMatches()) {
        return fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
      }
      const selectSetter = nativeSetter(HTMLSelectElement.prototype);
      if (!selectSetter || Object.getOwnPropertyDescriptor(beforeCategory.category, 'value') !== undefined) {
        return fillResult(attemptId, 'indeterminate') as DestinationOperationResultV1;
      }
      selectSetter.call(beforeCategory.category, values.category);
      assignments += 1;
      if (readNative(HTMLSelectElement.prototype, 'value', beforeCategory.category) !== values.category) {
        return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      }

      const beforeDescription = inspectContract(values.category, '');
      if (
        beforeDescription.code
        || !beforeDescription.description
        || beforeDescription.form !== initial.form
        || beforeDescription.category !== initial.category
        || beforeDescription.description !== initial.description
        || deadlineReached()
        || document.visibilityState !== 'visible'
        || !locationMatches()
      ) {
        return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      }
      const textareaSetter = nativeSetter(HTMLTextAreaElement.prototype);
      if (!textareaSetter || Object.getOwnPropertyDescriptor(beforeDescription.description, 'value') !== undefined) {
        return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      }
      textareaSetter.call(beforeDescription.description, values.description);
      assignments += 1;
      if (readNative(HTMLTextAreaElement.prototype, 'value', beforeDescription.description) !== values.description) {
        return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      }

      await Promise.resolve();
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (deadlineReached() || document.visibilityState !== 'visible' || !locationMatches()) {
        return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      }
      const readback = inspectContract(values.category, values.description);
      if (
        readback.code
        || readback.form !== initial.form
        || readback.category !== initial.category
        || readback.description !== initial.description
        || deadlineReached()
        || document.visibilityState !== 'visible'
        || !locationMatches()
      ) return fillResult(attemptId, 'partial') as DestinationOperationResultV1;
      return fillResult(attemptId, 'complete') as DestinationOperationResultV1;
    } catch {
      return fillResult(attemptId, assignments > 0 ? 'partial' : 'indeterminate') as DestinationOperationResultV1;
    }
  } catch {
    return rejected() as DestinationOperationResultV1;
  }
}

type DestinationInjectionValidationReason =
  | 'invalid-injection-result'
  | 'destination-document-mismatch'
  | 'destination-preview-mismatch'
  | 'destination-fill-mismatch';

type DestinationPreviewAccepted = Readonly<{
  status: 'accepted';
  documentId: string;
  result: Extract<DestinationOperationResultV1, { operation: 'preview'; status: 'ready' }>;
}>;

type DestinationFillAccepted = Readonly<{
  status: 'accepted';
  documentId: string;
  result: Extract<DestinationOperationResultV1, { operation: 'fill' }>;
}>;

type DestinationInjectionRejected = Readonly<{
  status: 'rejected';
  reason: DestinationInjectionValidationReason;
}>;

const INJECTION_RESULT_KEYS = Object.freeze(['frameId', 'documentId', 'result'] as const);
const PREVIEW_READY_KEYS = Object.freeze(['schema', 'operation', 'status', 'fieldIds'] as const);
const FILL_RESULT_KEYS = Object.freeze(['schema', 'operation', 'attemptId', 'fieldIds', 'status'] as const);
const DOCUMENT_ID_PATTERN = /^[\x21-\x7e]{1,128}$/;
const ATTEMPT_ID_PATTERN = /^[0-9a-f]{32}$/;

function readPlainDataRecord(value: unknown, expectedKeys: readonly string[], ordered: boolean) {
  try {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length) return null;
    for (let index = 0; index < expectedKeys.length; index += 1) {
      if (typeof keys[index] !== 'string') return null;
      if (ordered ? keys[index] !== expectedKeys[index] : !expectedKeys.includes(keys[index] as string)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, expectedKeys[index]!);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readFieldIds(value: unknown): DestinationFieldIdsV1 | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== 2) return null;
    if (Reflect.ownKeys(value).join(',') !== '0,1,length') return null;
    return value[0] === 'category' && value[1] === 'description'
      ? Object.freeze(['category', 'description'] as const)
      : null;
  } catch {
    return null;
  }
}

function readSingleInjectionResult(value: unknown): Readonly<{ documentId: string; result: unknown }> | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== 1) return null;
    if (Reflect.ownKeys(value).join(',') !== '0,length') return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, '0');
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    const item = readPlainDataRecord(descriptor.value, INJECTION_RESULT_KEYS, false);
    if (
      !item
      || item.frameId !== 0
      || typeof item.documentId !== 'string'
      || !DOCUMENT_ID_PATTERN.test(item.documentId)
    ) return null;
    return Object.freeze({ documentId: item.documentId, result: item.result });
  } catch {
    return null;
  }
}

function readReadyPreview(value: unknown) {
  const result = readPlainDataRecord(value, PREVIEW_READY_KEYS, true);
  if (
    !result
    || result.schema !== DESTINATION_OPERATION_RESULT_SCHEMA
    || result.operation !== 'preview'
    || result.status !== 'ready'
  ) return null;
  const fields = readFieldIds(result.fieldIds);
  if (!fields) return null;
  return Object.freeze({
    schema: DESTINATION_OPERATION_RESULT_SCHEMA,
    operation: 'preview' as const,
    status: 'ready' as const,
    fieldIds: fields,
  });
}

function readFillResult(value: unknown) {
  const result = readPlainDataRecord(value, FILL_RESULT_KEYS, true);
  if (
    !result
    || result.schema !== DESTINATION_OPERATION_RESULT_SCHEMA
    || result.operation !== 'fill'
    || typeof result.attemptId !== 'string'
    || !ATTEMPT_ID_PATTERN.test(result.attemptId)
    || (result.status !== 'complete' && result.status !== 'partial' && result.status !== 'indeterminate')
  ) return null;
  const fields = readFieldIds(result.fieldIds);
  if (!fields) return null;
  return Object.freeze({
    schema: DESTINATION_OPERATION_RESULT_SCHEMA,
    operation: 'fill' as const,
    attemptId: result.attemptId,
    fieldIds: fields,
    status: result.status,
  });
}

export function validateDestinationPreviewInjectionResult(
  injectionResults: unknown,
): DestinationPreviewAccepted | DestinationInjectionRejected {
  const injection = readSingleInjectionResult(injectionResults);
  if (!injection) return Object.freeze({ status: 'rejected', reason: 'invalid-injection-result' });
  const result = readReadyPreview(injection.result);
  if (!result) return Object.freeze({ status: 'rejected', reason: 'destination-preview-mismatch' });
  return Object.freeze({ status: 'accepted', documentId: injection.documentId, result });
}

export function validateDestinationRepreflightInjectionResult(
  injectionResults: unknown,
  expectedDocumentId: unknown,
): DestinationPreviewAccepted | DestinationInjectionRejected {
  if (typeof expectedDocumentId !== 'string' || !DOCUMENT_ID_PATTERN.test(expectedDocumentId)) {
    return Object.freeze({ status: 'rejected', reason: 'destination-document-mismatch' });
  }
  const validated = validateDestinationPreviewInjectionResult(injectionResults);
  if (validated.status !== 'accepted') return validated;
  if (validated.documentId !== expectedDocumentId) {
    return Object.freeze({ status: 'rejected', reason: 'destination-document-mismatch' });
  }
  return validated;
}

export function validateDestinationFillInjectionResult(
  injectionResults: unknown,
  expectedDocumentId: unknown,
  expectedAttemptId: unknown,
): DestinationFillAccepted | DestinationInjectionRejected {
  if (
    typeof expectedDocumentId !== 'string'
    || !DOCUMENT_ID_PATTERN.test(expectedDocumentId)
    || typeof expectedAttemptId !== 'string'
    || !ATTEMPT_ID_PATTERN.test(expectedAttemptId)
  ) return Object.freeze({ status: 'rejected', reason: 'destination-fill-mismatch' });
  const injection = readSingleInjectionResult(injectionResults);
  if (!injection) return Object.freeze({ status: 'rejected', reason: 'invalid-injection-result' });
  if (injection.documentId !== expectedDocumentId) {
    return Object.freeze({ status: 'rejected', reason: 'destination-document-mismatch' });
  }
  const result = readFillResult(injection.result);
  if (!result || result.attemptId !== expectedAttemptId) {
    return Object.freeze({ status: 'rejected', reason: 'destination-fill-mismatch' });
  }
  return Object.freeze({ status: 'accepted', documentId: injection.documentId, result });
}
