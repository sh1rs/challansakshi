import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  digestCanonicalExtensionHandoffEnvelopeCore,
  digestExtensionDescriptionCore,
} from '../../lib/extension-handoff-envelope-core';
import {
  DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
  WORKER_REQUEST_SCHEMA,
  WORKER_RESPONSE_SCHEMA,
  buildAcknowledgeAffectedPersonInspectionRequest,
  buildClearStagedFieldsRequest,
  buildFillEmptyReviewedFieldsRequest,
  buildLoadReviewedFieldsRequest,
  buildPreviewCurrentPageRequest,
  buildResetForDeviceOwnerRequest,
  type SourcePreviewBindingWireV1,
} from '../src/message-contract';
import {
  EXTENSION_SESSION_STATE_KEY,
  SESSION_STATE_SCHEMA,
  validateSessionState,
} from '../src/service-worker';

const envelope = Object.freeze({
  schema: 'challansakshi.extension-handoff/v1',
  mode: 'synthetic',
  packId: '22222222222222222222222222222222',
  resultRevisionId: '33333333333333333333333333333333',
  packRevisionId: '44444444444444444444444444444444',
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
});

const sourceFixtureUrl = 'http://127.0.0.1:3000/demo/extension-fixture/source';
const destinationFixtureUrl = 'http://127.0.0.1:3000/demo/extension-fixture/destination';

type RuntimeMessageListener = (
  request: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => unknown;
type StartupListener = () => unknown;
type RemovedListener = (tabId: number, removeInfo: unknown) => unknown;
type ReplacedListener = (addedTabId: number, removedTabId: number) => unknown;
type AlarmListener = (alarm: unknown) => unknown;

function makeEvent<T extends (...args: never[]) => unknown>() {
  const listeners: T[] = [];
  return {
    listeners,
    addListener(listener: T) {
      listeners.push(listener);
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeChromeHarness() {
  const calls: Array<{ name: string; value?: unknown }> = [];
  const onMessage = makeEvent<RuntimeMessageListener>();
  const onStartup = makeEvent<StartupListener>();
  const onInstalled = makeEvent<StartupListener>();
  const onRemoved = makeEvent<RemovedListener>();
  const onReplaced = makeEvent<ReplacedListener>();
  const onAlarm = makeEvent<AlarmListener>();
  let activeTabId = 17;
  const activeTabIds: Array<number | Promise<number>> = [];
  const tabGetResults: Array<unknown | Promise<unknown>> = [];
  let sessionStored: unknown;
  let localStored: unknown;
  const scriptResults: Array<unknown | Promise<unknown>> = [];
  const failures = new Map<string, number>();
  const callCounts = new Map<string, number>();
  const failureOccurrences = new Map<string, Set<number>>();
  const sessionSetDelays: Array<Promise<void>> = [];
  const alarmCreateDelays = new Map<string, Array<Promise<void>>>();
  let randomSeed = 1;

  function maybeFail(name: string) {
    const occurrence = (callCounts.get(name) ?? 0) + 1;
    callCounts.set(name, occurrence);
    if (failureOccurrences.get(name)?.delete(occurrence)) {
      throw new Error(`controlled ${name} failure at ${occurrence}`);
    }
    const remaining = failures.get(name) ?? 0;
    if (remaining <= 0) return;
    failures.set(name, remaining - 1);
    throw new Error(`controlled ${name} failure`);
  }

  const storageArea = (kind: 'session' | 'local') => ({
    async setAccessLevel(value: unknown) {
      calls.push({ name: `${kind}.setAccessLevel`, value });
      maybeFail(`${kind}.setAccessLevel`);
    },
    async get(key: unknown) {
      calls.push({ name: `${kind}.get`, value: key });
      maybeFail(`${kind}.get`);
      const stored = kind === 'session' ? sessionStored : localStored;
      return stored === undefined ? {} : {
        [kind === 'session' ? EXTENSION_SESSION_STATE_KEY : 'challansakshi.safety-ledger.v1']:
          clone(stored),
      };
    },
    async set(items: Record<string, unknown>) {
      calls.push({ name: `${kind}.set`, value: clone(items) });
      maybeFail(`${kind}.set`);
      const key = kind === 'session'
        ? EXTENSION_SESSION_STATE_KEY
        : 'challansakshi.safety-ledger.v1';
      if (kind === 'session') sessionStored = clone(items[key]);
      else localStored = clone(items[key]);
      const delay = kind === 'session' ? sessionSetDelays.shift() : undefined;
      if (delay) await delay;
    },
    async remove(key: unknown) {
      calls.push({ name: `${kind}.remove`, value: key });
      maybeFail(`${kind}.remove`);
      if (kind === 'session') sessionStored = undefined;
      else localStored = undefined;
    },
    async clear() {
      calls.push({ name: `${kind}.clear` });
      throw new Error('clear is forbidden');
    },
  });

  const chromeMock = {
    runtime: {
      onMessage,
      onStartup,
      onInstalled,
    },
    tabs: {
      onRemoved,
      onReplaced,
      async query(value: unknown) {
        calls.push({ name: 'tabs.query', value });
        maybeFail('tabs.query');
        return [{ id: await (activeTabIds.shift() ?? activeTabId) }];
      },
      async get(tabId: number) {
        calls.push({ name: 'tabs.get', value: tabId });
        maybeFail('tabs.get');
        return await (tabGetResults.shift() ?? {
          id: tabId,
          url: tabId === 17
            ? sourceFixtureUrl
            : tabId === 29
              ? destinationFixtureUrl
              : 'https://unrelated.example.test/',
        });
      },
    },
    scripting: {
      async executeScript(value: unknown) {
        calls.push({ name: 'scripting.executeScript', value });
        maybeFail('scripting.executeScript');
        if (scriptResults.length === 0) throw new Error('missing scripted result');
        return scriptResults.shift();
      },
    },
    storage: {
      session: storageArea('session'),
      local: storageArea('local'),
    },
    alarms: {
      onAlarm,
      async create(name: string, value: unknown) {
        calls.push({ name: `alarms.create:${name}`, value });
        maybeFail(`alarms.create:${name}`);
        const delay = alarmCreateDelays.get(name)?.shift();
        if (delay) await delay;
      },
      async clear(name: string) {
        calls.push({ name: `alarms.clear:${name}` });
        maybeFail(`alarms.clear:${name}`);
        return true;
      },
    },
  };

  return {
    chromeMock,
    calls,
    events: { onMessage, onStartup, onInstalled, onRemoved, onReplaced, onAlarm },
    scriptResults,
    setActiveTabId(value: number) {
      activeTabId = value;
    },
    queueActiveTabIds(...values: number[]) {
      activeTabIds.push(...values);
    },
    queueActiveTabResults(...values: Array<number | Promise<number>>) {
      activeTabIds.push(...values);
    },
    queueTabGetResults(...values: Array<unknown | Promise<unknown>>) {
      tabGetResults.push(...values);
    },
    queueSessionSetDelays(...values: Array<Promise<void>>) {
      sessionSetDelays.push(...values);
    },
    queueAlarmCreateDelays(name: string, ...values: Array<Promise<void>>) {
      const selected = alarmCreateDelays.get(name) ?? [];
      selected.push(...values);
      alarmCreateDelays.set(name, selected);
    },
    failNext(name: string, count = 1) {
      failures.set(name, (failures.get(name) ?? 0) + count);
    },
    failOnFutureOccurrence(name: string, offset: number) {
      const occurrence = (callCounts.get(name) ?? 0) + offset;
      const selected = failureOccurrences.get(name) ?? new Set<number>();
      selected.add(occurrence);
      failureOccurrences.set(name, selected);
    },
    setSession(value: unknown) {
      sessionStored = value;
    },
    setLocal(value: unknown) {
      localStored = value;
    },
    session: () => sessionStored,
    local: () => localStored,
    crypto: {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        if (!(array instanceof Uint8Array)) throw new Error('unexpected random target');
        array.fill(randomSeed);
        randomSeed += 1;
        return array as T;
      },
    },
  };
}

const popupSender = Object.freeze({
  url: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html',
  id: 'abcdefghijklmnopabcdefghijklmnop',
});

async function settleMicrotasks() {
  for (let index = 0; index < 64; index += 1) await Promise.resolve();
}

async function settleUntil(predicate: () => boolean) {
  for (let index = 0; index < 1_024; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('bounded microtask condition was not reached');
}

async function loadWorker(harness: ReturnType<typeof makeChromeHarness>) {
  vi.resetModules();
  vi.stubGlobal('chrome', harness.chromeMock);
  vi.stubGlobal('self', { location: { origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' } });
  vi.stubGlobal('crypto', harness.crypto);
  await import('../src/service-worker');
  await settleMicrotasks();
}

type ObservedWorkerResponse = Readonly<{
  schema: string;
  command: string | null;
  state: string;
  code: string;
  preview: Readonly<{ description: string }>;
  sourcePreviewBinding: SourcePreviewBindingWireV1;
  generation: string;
  packId: string;
  effectiveExpiresAtMs: number;
  warning: Readonly<{ state: string }>;
}>;

function sendMessage(harness: ReturnType<typeof makeChromeHarness>, request: unknown) {
  return new Promise<ObservedWorkerResponse>((resolve) => {
    const returned = harness.events.onMessage.listeners[0]?.(
      request,
      popupSender,
      (response) => resolve(response as ObservedWorkerResponse),
    );
    expect(returned).toBe(true);
  });
}

function sourceAccepted(documentId = 'source-document-A') {
  return [{
    frameId: 0,
    documentId,
    result: { status: 'accepted', envelope: clone(envelope) },
  }];
}

function destinationReady(documentId = 'destination-document-A') {
  return [{
    frameId: 0,
    documentId,
    result: {
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'preview',
      status: 'ready',
      fieldIds: ['category', 'description'],
    },
  }];
}

function fillComplete(attemptId: string, documentId = 'destination-document-A') {
  return [{
    frameId: 0,
    documentId,
    result: {
      schema: 'challansakshi.destination-operation-result/v1',
      operation: 'fill',
      attemptId,
      fieldIds: ['category', 'description'],
      status: 'complete',
    },
  }];
}

function fillResult(
  attemptId: string,
  status: 'complete' | 'partial' | 'indeterminate',
  documentId = 'destination-document-A',
) {
  const result = fillComplete(attemptId, documentId);
  result[0]!.result.status = status;
  return result;
}

function stagedState(destination: null | { destinationTabId: number; destinationDocumentId: string } = {
  destinationTabId: 29,
  destinationDocumentId: 'destination-document-A',
}) {
  return {
    schema: SESSION_STATE_SCHEMA,
    state: 'staged' as const,
    generation: '11111111111111111111111111111111',
    envelope,
    importedAtMs: Date.UTC(2026, 8, 3, 8, 1),
    effectiveExpiresAtMs: Date.UTC(2026, 8, 3, 8, 10),
    sourceTabId: 17,
    sourceDocumentId: 'source-document-A',
    destination,
  };
}

function consumingState() {
  return {
    schema: SESSION_STATE_SCHEMA,
    state: 'consuming' as const,
    generation: '11111111111111111111111111111111',
    armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    packId: envelope.packId,
    attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    replayUntil: Date.UTC(2026, 8, 3, 8, 10),
    attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
    destinationTabId: 29,
    destinationDocumentId: 'destination-document-A',
  };
}

function liveLedger(session = consumingState()) {
  return {
    schema: 'challansakshi.safety-ledger/v1',
    records: [{
      state: 'unresolved-live' as const,
      armNonce: session.armNonce,
      packId: session.packId,
      replayUntil: session.replayUntil,
    }],
  };
}

async function beginFill(
  harness: ReturnType<typeof makeChromeHarness>,
  finalResult: unknown | Promise<unknown>,
) {
  harness.setSession(stagedState());
  harness.setActiveTabId(29);
  await loadWorker(harness);
  harness.calls.length = 0;
  harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted(), finalResult);
  return sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
    29,
    '11111111111111111111111111111111',
    envelope.packId,
    Date.UTC(2026, 8, 3, 8, 10),
  ));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 8, 3, 8, 1));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const PREPARED_DISPATCH_KEYS = Object.freeze([
  'status',
  'consuming',
  'fillPlan',
  'sourceAuthorization',
  'sourceImportedAtMs',
] as const);

function unwrapPreparationExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) current = current.expression;
  return current;
}

function directCallName(expression: ts.Expression): string | null {
  const selected = unwrapPreparationExpression(expression);
  if (!ts.isCallExpression(selected)) return null;
  const callee = unwrapPreparationExpression(selected.expression);
  if (ts.isIdentifier(callee)) return callee.text;
  if (
    ts.isPropertyAccessExpression(callee)
    && ts.isIdentifier(callee.expression)
    && callee.expression.text === 'Object'
    && callee.name.text === 'freeze'
  ) return 'Object.freeze';
  return null;
}

function propertyName(property: ts.ObjectLiteralElementLike): string | null {
  if (!property.name) return null;
  return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
    ? property.name.text
    : null;
}

function frozenObject(expression: ts.Expression): ts.ObjectLiteralExpression | null {
  const selected = unwrapPreparationExpression(expression);
  if (
    !ts.isCallExpression(selected)
    || directCallName(selected) !== 'Object.freeze'
    || selected.arguments.length !== 1
  ) return null;
  const argument = selected.arguments[0];
  return argument && ts.isObjectLiteralExpression(argument) ? argument : null;
}

function preparedReturn(
  file: ts.SourceFile,
  fn: ts.FunctionDeclaration,
): ReadonlyMap<string, ts.Expression> | null {
  const matches: Array<ReadonlyMap<string, ts.Expression>> = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionLike(node) && node !== fn) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const object = frozenObject(node.expression);
      if (object) {
        const entries = new Map<string, ts.Expression>();
        let valid = true;
        for (const property of object.properties) {
          const name = propertyName(property);
          const expression = ts.isPropertyAssignment(property)
            ? property.initializer
            : ts.isShorthandPropertyAssignment(property)
              ? property.name
              : null;
          if (!name || !expression || entries.has(name)) {
            valid = false;
            break;
          }
          entries.set(name, expression);
        }
        const status = entries.get('status');
        if (
          valid
          && status
          && ts.isStringLiteral(unwrapPreparationExpression(status))
          && (unwrapPreparationExpression(status) as ts.StringLiteral).text === 'prepared'
        ) matches.push(entries);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return matches.length === 1 ? matches[0]! : null;
}

function serviceWorkerProgramDiagnostics(source: string): readonly string[] {
  const configPath = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
  const serviceWorkerPath = ts.sys.resolvePath(
    fileURLToPath(new URL('../src/service-worker.ts', import.meta.url)),
  );
  const configRead = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configRead.error) {
    return [ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n')];
  }
  const config = ts.parseJsonConfigFileContent(
    configRead.config,
    ts.sys,
    dirname(configPath),
    undefined,
    configPath,
  );
  if (config.errors.length > 0) {
    return config.errors.map((diagnostic) => (
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    ));
  }
  const host = ts.createCompilerHost(config.options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => (
    ts.sys.resolvePath(fileName) === serviceWorkerPath
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  );
  const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
    host,
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (!diagnostic.file || diagnostic.start === undefined) return message;
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1}: ${message}`;
  });
}

function analyzePayloadFreeFillPreparation(source: string): readonly string[] {
  const file = ts.createSourceFile(
    'service-worker.analysis.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const issues: string[] = [];
  const report = (message: string) => {
    if (!issues.includes(message)) issues.push(message);
  };
  const outer = file.statements.find((statement): statement is ts.FunctionDeclaration => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'prepareFillDispatch'
  ));
  if (!outer?.body) return ['outer fill-preparation helper must exist at file scope'];
  const requestParameter = outer.parameters.length === 1 && ts.isIdentifier(outer.parameters[0]!.name)
    ? outer.parameters[0]!.name
    : null;
  if (!requestParameter) report('outer helper must have one direct request parameter');

  const directAwaits: ts.AwaitExpression[] = [];
  const assignmentNodes: ts.BinaryExpression[] = [];
  const localNames = new Set<string>();
  const visitOuter = (node: ts.Node) => {
    if (ts.isFunctionLike(node) && node !== outer) {
      report('outer nested functions are forbidden');
      return;
    }
    if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
      report('outer binding patterns are forbidden');
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      localNames.add(node.name.text);
    }
    if (ts.isAwaitExpression(node)) directAwaits.push(node);
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) assignmentNodes.push(node);
    if (
      ts.isPrefixUnaryExpression(node)
      && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
    ) report('outer mutation syntax is forbidden');
    if (ts.isPostfixUnaryExpression(node)) report('outer mutation syntax is forbidden');
    if (ts.isDeleteExpression(node)) report('outer mutation syntax is forbidden');
    if (ts.isSpreadElement(node) || ts.isSpreadAssignment(node)) {
      report('outer spread syntax is forbidden');
    }
    if (
      ts.isElementAccessExpression(node)
      || (ts.isPropertyAccessExpression(node) && node.questionDotToken)
      || (ts.isCallExpression(node) && node.questionDotToken)
      || (ts.isComputedPropertyName(node))
    ) report('outer computed or optional syntax is forbidden');
    ts.forEachChild(node, visitOuter);
  };
  visitOuter(outer);

  const callExpression = (expression: ts.Expression): ts.CallExpression | null => {
    const selected = unwrapPreparationExpression(expression);
    return ts.isCallExpression(selected) ? selected : null;
  };
  const singleDeclaration = (
    statement: ts.Statement | undefined,
    declarationKind: 'const' | 'let',
  ): ts.VariableDeclaration | null => {
    if (!statement || !ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
      return null;
    }
    const isExpectedKind = declarationKind === 'const'
      ? Boolean(statement.declarationList.flags & ts.NodeFlags.Const)
      : Boolean(statement.declarationList.flags & ts.NodeFlags.Let);
    return isExpectedKind ? statement.declarationList.declarations[0]! : null;
  };
  const exactIdentifier = (expression: ts.Expression | undefined, name: string | null) => (
    Boolean(expression && name && ts.isIdentifier(expression) && expression.text === name)
  );
  const exactProperty = (
    expression: ts.Expression | undefined,
    owner: string | null,
    member: string,
  ) => Boolean(
    expression
    && owner
    && ts.isPropertyAccessExpression(expression)
    && !expression.questionDotToken
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === owner
    && expression.name.text === member,
  );
  const exactString = (expression: ts.Expression | undefined, value: string) => (
    Boolean(expression && ts.isStringLiteral(expression) && expression.text === value)
  );

  const preparationAwaits = directAwaits.filter((awaited) => {
    const call = callExpression(awaited.expression);
    return Boolean(
      requestParameter
      && call
      && ts.isIdentifier(call.expression)
      && call.arguments.length === 1
      && exactIdentifier(call.arguments[0], requestParameter.text)
      && ts.isVariableDeclaration(awaited.parent)
      && awaited.parent.initializer === awaited
      && ts.isIdentifier(awaited.parent.name),
    );
  });
  if (preparationAwaits.length !== 1) report('outer helper must have one structural preparation await');
  const preparationAwait = preparationAwaits[0] ?? null;
  const preparationCall = preparationAwait ? callExpression(preparationAwait.expression) : null;
  const innerName = preparationCall && ts.isIdentifier(preparationCall.expression)
    ? preparationCall.expression.text
    : null;
  const inner = innerName
    ? file.statements.find((statement): statement is ts.FunctionDeclaration => (
      ts.isFunctionDeclaration(statement) && statement.name?.text === innerName
    ))
    : null;
  if (!inner?.body) report('structurally discovered preparation helper must resolve at file scope');

  const statements = outer.body.statements;
  let grammarMatches = statements.length === 11;
  const rootDeclaration = singleDeclaration(statements[0], 'let');
  const rootName = rootDeclaration && ts.isIdentifier(rootDeclaration.name)
    ? rootDeclaration.name.text
    : null;
  grammarMatches &&= Boolean(
    rootName
    && rootDeclaration?.type?.getText(file).replaceAll(' ', '') === 'PreparedFillDispatch|null'
    && rootDeclaration.initializer?.kind === ts.SyntaxKind.NullKeyword,
  );

  const preparationBlock = statements[1] && ts.isBlock(statements[1]) ? statements[1] : null;
  grammarMatches &&= preparationBlock?.statements.length === 3;
  const resultDeclaration = singleDeclaration(preparationBlock?.statements[0], 'const');
  const resultName = resultDeclaration && ts.isIdentifier(resultDeclaration.name)
    ? resultDeclaration.name.text
    : null;
  grammarMatches &&= Boolean(
    resultName
    && resultDeclaration?.initializer === preparationAwait,
  );

  const guard = preparationBlock?.statements[1];
  let guardedReturn: ts.ReturnStatement | null = null;
  if (guard && ts.isIfStatement(guard) && !guard.elseStatement && ts.isBlock(guard.thenStatement)) {
    const condition = guard.expression;
    const left = ts.isBinaryExpression(condition)
      && condition.operatorToken.kind === ts.SyntaxKind.BarBarToken
      ? unwrapPreparationExpression(condition.left)
      : null;
    const right = ts.isBinaryExpression(condition)
      && condition.operatorToken.kind === ts.SyntaxKind.BarBarToken
      ? condition.right
      : null;
    const missingStatus = left && ts.isPrefixUnaryExpression(left)
      && left.operator === ts.SyntaxKind.ExclamationToken
      ? unwrapPreparationExpression(left.operand)
      : null;
    grammarMatches &&= Boolean(
      missingStatus
      && ts.isBinaryExpression(missingStatus)
      && missingStatus.operatorToken.kind === ts.SyntaxKind.InKeyword
      && exactString(missingStatus.left, 'status')
      && exactIdentifier(missingStatus.right, resultName)
      && right
      && ts.isBinaryExpression(right)
      && right.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      && exactProperty(right.left, resultName, 'status')
      && exactString(right.right, 'prepared')
      && guard.thenStatement.statements.length === 1
      && ts.isReturnStatement(guard.thenStatement.statements[0]),
    );
    guardedReturn = guard.thenStatement.statements.length === 1
      && ts.isReturnStatement(guard.thenStatement.statements[0])
      ? guard.thenStatement.statements[0]
      : null;
  } else {
    grammarMatches = false;
  }
  grammarMatches &&= Boolean(
    guardedReturn?.expression
    && ts.isAsExpression(guardedReturn.expression)
    && guardedReturn.expression.type.getText(file) === 'WorkerResponseV1'
    && exactIdentifier(guardedReturn.expression.expression, resultName),
  );

  const transferStatement = preparationBlock?.statements[2];
  const transfer = transferStatement && ts.isExpressionStatement(transferStatement)
    && ts.isBinaryExpression(transferStatement.expression)
    ? transferStatement.expression
    : null;
  grammarMatches &&= Boolean(
    transfer
    && transfer.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && exactIdentifier(transfer.left, rootName)
    && ts.isAsExpression(transfer.right)
    && transfer.right.type.getText(file) === 'PreparedFillDispatch'
    && exactIdentifier(transfer.right.expression, resultName),
  );

  const memberNames = new Map<string, string>();
  for (const [index, member] of PREPARED_DISPATCH_KEYS.slice(1).entries()) {
    const declaration = singleDeclaration(statements[index + 2], 'const');
    const localName = declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : null;
    if (localName) memberNames.set(member, localName);
    grammarMatches &&= Boolean(localName && exactProperty(declaration?.initializer, rootName, member));
  }

  const killStatement = statements[6];
  const kill = killStatement && ts.isExpressionStatement(killStatement)
    && ts.isBinaryExpression(killStatement.expression)
    ? killStatement.expression
    : null;
  grammarMatches &&= Boolean(
    kill
    && kill.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && exactIdentifier(kill.left, rootName)
    && kill.right.kind === ts.SyntaxKind.NullKeyword,
  );

  const exactAwaitStatement = (
    statement: ts.Statement | undefined,
    callee: string,
    argument: string,
  ): ts.AwaitExpression | null => {
    if (!statement || !ts.isExpressionStatement(statement) || !ts.isAwaitExpression(statement.expression)) {
      return null;
    }
    const call = callExpression(statement.expression.expression);
    return call
      && ts.isIdentifier(call.expression)
      && call.expression.text === callee
      && call.arguments.length === 1
      && exactIdentifier(call.arguments[0], argument)
      ? statement.expression
      : null;
  };
  const clearSession = exactAwaitStatement(statements[7], 'clearAlarm', 'SESSION_EXPIRY_ALARM');
  const clearWatchdog = exactAwaitStatement(statements[8], 'clearAlarm', 'ATTEMPT_WATCHDOG_ALARM');
  grammarMatches &&= Boolean(clearSession && clearWatchdog);

  const watchdog = statements[9];
  let createWatchdog: ts.AwaitExpression | null = null;
  let watchdogReturn: ts.ReturnStatement | null = null;
  if (watchdog && ts.isIfStatement(watchdog) && !watchdog.elseStatement && ts.isBlock(watchdog.thenStatement)) {
    const condition = unwrapPreparationExpression(watchdog.expression);
    const negated = ts.isPrefixUnaryExpression(condition)
      && condition.operator === ts.SyntaxKind.ExclamationToken
      ? unwrapPreparationExpression(condition.operand)
      : null;
    createWatchdog = negated && ts.isAwaitExpression(negated) ? negated : null;
    const createCall = createWatchdog ? callExpression(createWatchdog.expression) : null;
    grammarMatches &&= Boolean(
      createCall
      && ts.isIdentifier(createCall.expression)
      && createCall.expression.text === 'createAlarm'
      && createCall.arguments.length === 2
      && exactIdentifier(createCall.arguments[0], 'ATTEMPT_WATCHDOG_ALARM')
      && exactProperty(createCall.arguments[1], memberNames.get('consuming') ?? null, 'attemptNotAfterMs')
      && watchdog.thenStatement.statements.length === 1
      && ts.isReturnStatement(watchdog.thenStatement.statements[0]),
    );
    watchdogReturn = watchdog.thenStatement.statements.length === 1
      && ts.isReturnStatement(watchdog.thenStatement.statements[0])
      ? watchdog.thenStatement.statements[0]
      : null;
  } else {
    grammarMatches = false;
  }
  const cancellation = watchdogReturn?.expression ? callExpression(watchdogReturn.expression) : null;
  const rejection = cancellation?.arguments[1] ? callExpression(cancellation.arguments[1]) : null;
  const requestCommand = rejection?.arguments[0]
    && ts.isPropertyAccessExpression(rejection.arguments[0])
    && !rejection.arguments[0].questionDotToken
    && requestParameter
    && ts.isIdentifier(rejection.arguments[0].expression)
    && rejection.arguments[0].expression.text === requestParameter.text
    && rejection.arguments[0].name.text === 'command'
    ? rejection.arguments[0].expression
    : null;
  grammarMatches &&= Boolean(
    cancellation
    && ts.isIdentifier(cancellation.expression)
    && cancellation.expression.text === 'cancelBeforeDispatch'
    && cancellation.arguments.length === 2
    && exactIdentifier(cancellation.arguments[0], memberNames.get('consuming') ?? null)
    && rejection
    && ts.isIdentifier(rejection.expression)
    && rejection.expression.text === 'buildRejectedWorkerResponse'
    && rejection.arguments.length === 2
    && requestCommand
    && exactString(rejection.arguments[1], 'operation-failed'),
  );

  const outerReturn = preparedReturn(file, outer);
  const finalStatement = statements[10];
  grammarMatches &&= Boolean(
    finalStatement
    && ts.isReturnStatement(finalStatement)
    && finalStatement.expression
    && ts.isCallExpression(finalStatement.expression)
    && outerReturn
    && JSON.stringify([...outerReturn.keys()]) === JSON.stringify(PREPARED_DISPATCH_KEYS),
  );
  if (outerReturn) {
    const status = unwrapPreparationExpression(outerReturn.get('status')!);
    grammarMatches &&= ts.isStringLiteral(status) && status.text === 'prepared';
    for (const member of PREPARED_DISPATCH_KEYS.slice(1)) {
      grammarMatches &&= exactIdentifier(outerReturn.get(member), memberNames.get(member) ?? null);
    }
  }

  const allowedAssignments = new Set<ts.BinaryExpression>();
  if (transfer) allowedAssignments.add(transfer);
  if (kill) allowedAssignments.add(kill);
  const parameterNames = new Set(outer.parameters.flatMap((parameter) => (
    ts.isIdentifier(parameter.name) ? [parameter.name.text] : []
  )));
  for (const assignment of assignmentNodes) {
    const directLocal = ts.isIdentifier(assignment.left)
      && localNames.has(assignment.left.text)
      && !parameterNames.has(assignment.left.text);
    if (!directLocal) report('outer assignment target must be a declared direct local');
    if (!allowedAssignments.has(assignment)) {
      report('outer assignments are limited to direct root transfer and null kill');
    }
  }

  const expectedAwaits = new Set([
    preparationAwait,
    clearSession,
    clearWatchdog,
    createWatchdog,
  ].filter((value): value is ts.AwaitExpression => value !== null));
  if (directAwaits.length !== 4 || directAwaits.some((awaited) => !expectedAwaits.has(awaited))) {
    report('outer helper must contain exactly the four classified awaits');
  }
  const expectedRequestReads = new Set<ts.Identifier>();
  const preparationRequest = preparationCall?.arguments[0];
  if (preparationRequest && ts.isIdentifier(preparationRequest)) expectedRequestReads.add(preparationRequest);
  if (requestCommand) expectedRequestReads.add(requestCommand);
  const actualRequestReads: ts.Identifier[] = [];
  const collectRequestReads = (node: ts.Node) => {
    if (ts.isFunctionLike(node) && node !== outer) return;
    if (
      requestParameter
      && ts.isIdentifier(node)
      && node.text === requestParameter.text
      && node !== requestParameter
    ) actualRequestReads.push(node);
    ts.forEachChild(node, collectRequestReads);
  };
  collectRequestReads(outer);
  if (
    actualRequestReads.length !== expectedRequestReads.size
    || actualRequestReads.some((read) => !expectedRequestReads.has(read))
  ) report('outer request reads are limited to preparation input and fixed rejection command');

  if (!grammarMatches) report('outer statements do not match closed preparation grammar');
  if (!inner?.body) return issues;

  const innerReturn = preparedReturn(file, inner);
  if (!innerReturn || JSON.stringify([...innerReturn.keys()]) !== JSON.stringify(PREPARED_DISPATCH_KEYS)) {
    issues.push('inner success return must be the exact closed prepared bundle');
  } else {
    const innerBindings = new Map<string, ts.VariableDeclaration[]>();
    const collectInnerBindings = (node: ts.Node) => {
      if (ts.isFunctionLike(node) && node !== inner) return;
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const declarations = innerBindings.get(node.name.text) ?? [];
        declarations.push(node);
        innerBindings.set(node.name.text, declarations);
      }
      ts.forEachChild(node, collectInnerBindings);
    };
    collectInnerBindings(inner);
    const declarationForIdentifier = (identifier: ts.Identifier) => {
      const declarations = innerBindings.get(identifier.text) ?? [];
      return declarations.length === 1 ? declarations[0]! : null;
    };
    const declarationFor = (expression: ts.Expression | undefined) => (
      expression && ts.isIdentifier(expression) ? declarationForIdentifier(expression) : null
    );

    const fileBindings = new Map<string, ts.Node[]>();
    const addFileBinding = (name: string, node: ts.Node) => {
      const bindings = fileBindings.get(name) ?? [];
      bindings.push(node);
      fileBindings.set(name, bindings);
    };
    for (const statement of file.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        addFileBinding(statement.name.text, statement);
      } else if (ts.isClassDeclaration(statement) && statement.name) {
        addFileBinding(statement.name.text, statement);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) addFileBinding(declaration.name.text, declaration);
        }
      } else if (ts.isImportDeclaration(statement) && statement.importClause) {
        if (statement.importClause.name) {
          addFileBinding(statement.importClause.name.text, statement.importClause);
        }
        const imports = statement.importClause.namedBindings;
        if (imports && ts.isNamespaceImport(imports)) addFileBinding(imports.name.text, imports);
        if (imports && ts.isNamedImports(imports)) {
          for (const specifier of imports.elements) addFileBinding(specifier.name.text, specifier);
        }
      }
    }

    const protectedBindings = new Set([
      'sourceBinding',
      'buildDestinationFillPlan',
      'reconcileLifecycle',
      'writeSessionState',
      'newOpaque',
      'nextOperationDeadline',
      'fixedBlocker',
      'makePreviewPlan',
      'routeFailure',
      'actionTabMatches',
      'runSourceReprobe',
      'stagedPreviewTiming',
      'validateDestinationRepreflightInjectionResult',
      'isPositiveTime',
      'liveFromSession',
      'readyLedger',
      'armUnresolvedLive',
      'cancelBeforeDispatch',
      'buildFixedWorkerResponse',
      'buildRejectedWorkerResponse',
      'Object',
      'Date',
      'SESSION_STATE_SCHEMA',
      'chrome',
      'selectedDestinationInjectedFunction',
    ]);
    const innerShadows = new Set<string>();
    const recordBindingName = (name: ts.BindingName) => {
      if (ts.isIdentifier(name)) {
        if (protectedBindings.has(name.text)) innerShadows.add(name.text);
        return;
      }
      for (const element of name.elements) {
        if (!ts.isOmittedExpression(element)) recordBindingName(element.name);
      }
    };
    const collectInnerShadows = (node: ts.Node) => {
      if (node !== inner && ts.isFunctionLike(node)) {
        if (ts.isFunctionDeclaration(node) && node.name && protectedBindings.has(node.name.text)) {
          innerShadows.add(node.name.text);
        }
        for (const parameter of node.parameters) recordBindingName(parameter.name);
      }
      if (node !== inner && ts.isClassDeclaration(node) && node.name) {
        if (protectedBindings.has(node.name.text)) innerShadows.add(node.name.text);
      }
      if (ts.isVariableDeclaration(node)) recordBindingName(node.name);
      if (ts.isParameter(node)) recordBindingName(node.name);
      if (ts.isCatchClause(node) && node.variableDeclaration) {
        recordBindingName(node.variableDeclaration.name);
      }
      ts.forEachChild(node, collectInnerShadows);
    };
    collectInnerShadows(inner);

    const canonicalFileFunction = (name: string) => {
      const bindings = fileBindings.get(name) ?? [];
      return bindings.length === 1
        && ts.isFunctionDeclaration(bindings[0]!)
        && !innerShadows.has(name);
    };
    const canonicalFileVariable = (name: string) => {
      const bindings = fileBindings.get(name) ?? [];
      return bindings.length === 1
        && ts.isVariableDeclaration(bindings[0]!)
        && !innerShadows.has(name);
    };
    const canonicalImport = (name: string, moduleName: string) => {
      const bindings = fileBindings.get(name) ?? [];
      if (bindings.length !== 1 || !ts.isImportSpecifier(bindings[0]!) || innerShadows.has(name)) {
        return false;
      }
      const specifier = bindings[0]! as ts.ImportSpecifier;
      const importDeclaration = specifier.parent.parent.parent;
      return (!specifier.propertyName || specifier.propertyName.text === name)
        && specifier.name.text === name
        && ts.isImportDeclaration(importDeclaration)
        && ts.isStringLiteral(importDeclaration.moduleSpecifier)
        && importDeclaration.moduleSpecifier.text === moduleName;
    };
    const canonicalGlobal = (name: string) => (
      (fileBindings.get(name) ?? []).length === 0 && !innerShadows.has(name)
    );
    const canonicalHelpers = Object.freeze({
      sourceBinding: canonicalFileFunction('sourceBinding'),
      buildDestinationFillPlan: canonicalImport('buildDestinationFillPlan', './destination-adapters'),
      reconcileLifecycle: canonicalFileFunction('reconcileLifecycle'),
      writeSessionState: canonicalFileFunction('writeSessionState'),
      newOpaque: canonicalFileFunction('newOpaque'),
      nextOperationDeadline: canonicalFileFunction('nextOperationDeadline'),
      fixedBlocker: canonicalFileFunction('fixedBlocker'),
      makePreviewPlan: canonicalFileFunction('makePreviewPlan'),
      routeFailure: canonicalFileFunction('routeFailure'),
      actionTabMatches: canonicalFileFunction('actionTabMatches'),
      runSourceReprobe: canonicalFileFunction('runSourceReprobe'),
      stagedPreviewTiming: canonicalFileFunction('stagedPreviewTiming'),
      validateDestinationRepreflightInjectionResult: canonicalImport(
        'validateDestinationRepreflightInjectionResult',
        './fill-page',
      ),
      isPositiveTime: canonicalFileFunction('isPositiveTime'),
      liveFromSession: canonicalFileFunction('liveFromSession'),
      readyLedger: canonicalFileFunction('readyLedger'),
      armUnresolvedLive: canonicalImport('armUnresolvedLive', './safety-ledger'),
      cancelBeforeDispatch: canonicalFileFunction('cancelBeforeDispatch'),
      buildFixedWorkerResponse: canonicalImport('buildFixedWorkerResponse', './message-contract'),
      buildRejectedWorkerResponse: canonicalImport('buildRejectedWorkerResponse', './message-contract'),
      objectFreeze: canonicalGlobal('Object'),
      date: canonicalGlobal('Date'),
      sessionSchema: canonicalFileVariable('SESSION_STATE_SCHEMA'),
      chrome: canonicalGlobal('chrome'),
      selectedDestinationInjectedFunction: canonicalImport(
        'selectedDestinationInjectedFunction',
        './destination-adapters',
      ),
    });
    if (!canonicalHelpers.objectFreeze) {
      report('Object.freeze intrinsic is shadowed or noncanonical');
    }
    if (!canonicalHelpers.writeSessionState) {
      report('inner session write helper is shadowed or noncanonical');
    }
    if (
      !canonicalHelpers.fixedBlocker
      || !canonicalHelpers.makePreviewPlan
      || !canonicalHelpers.routeFailure
      || !canonicalHelpers.actionTabMatches
      || !canonicalHelpers.runSourceReprobe
      || !canonicalHelpers.stagedPreviewTiming
      || !canonicalHelpers.validateDestinationRepreflightInjectionResult
      || !canonicalHelpers.isPositiveTime
      || !canonicalHelpers.chrome
      || !canonicalHelpers.selectedDestinationInjectedFunction
    ) report('inner authoritative call helper is shadowed or noncanonical');
    if (
      !canonicalHelpers.liveFromSession
      || !canonicalHelpers.readyLedger
      || !canonicalHelpers.armUnresolvedLive
      || !canonicalHelpers.cancelBeforeDispatch
      || !canonicalHelpers.buildFixedWorkerResponse
      || !canonicalHelpers.buildRejectedWorkerResponse
    ) report('inner durability suffix helper is shadowed or noncanonical');

    const directFrozenObject = (expression: ts.Expression | undefined) => {
      if (
        !expression
        || !canonicalHelpers.objectFreeze
        || !ts.isCallExpression(expression)
        || expression.arguments.length !== 1
        || !ts.isPropertyAccessExpression(expression.expression)
        || expression.expression.questionDotToken
        || !ts.isIdentifier(expression.expression.expression)
        || expression.expression.expression.text !== 'Object'
        || expression.expression.name.text !== 'freeze'
        || !ts.isObjectLiteralExpression(expression.arguments[0]!)
      ) return null;
      return expression.arguments[0]!;
    };
    const exactObjectEntries = (
      object: ts.ObjectLiteralExpression | null,
      keys: readonly string[],
      allowShorthand: boolean,
    ): ReadonlyMap<string, ts.Expression> | null => {
      if (!object || object.properties.length !== keys.length) return null;
      const entries = new Map<string, ts.Expression>();
      for (const [index, key] of keys.entries()) {
        const property = object.properties[index];
        if (
          !property
          || !property.name
          || !ts.isIdentifier(property.name)
          || property.name.text !== key
        ) return null;
        if (ts.isPropertyAssignment(property)) entries.set(key, property.initializer);
        else if (allowShorthand && ts.isShorthandPropertyAssignment(property)) {
          entries.set(key, property.name);
        } else return null;
      }
      return entries;
    };
    const syntaxPath = (expression: ts.Expression, allowOptional: boolean) => {
      const members: string[] = [];
      let cursor: ts.Expression = expression;
      while (ts.isPropertyAccessExpression(cursor)) {
        if (!allowOptional && cursor.questionDotToken) return null;
        members.unshift(cursor.name.text);
        cursor = cursor.expression;
      }
      return ts.isIdentifier(cursor) ? Object.freeze({ root: cursor, members }) : null;
    };
    const exactDeclarationPath = (
      expression: ts.Expression | undefined,
      declaration: ts.VariableDeclaration | null,
      members: readonly string[],
    ) => {
      if (!expression || !declaration) return false;
      const path = syntaxPath(expression, false);
      return Boolean(
        path
        && declarationForIdentifier(path.root) === declaration
        && JSON.stringify(path.members) === JSON.stringify(members),
      );
    };
    const directCall = (
      expression: ts.Expression | undefined,
      name: string,
      canonical: boolean,
    ): ts.CallExpression | null => (
      canonical
      && expression
      && ts.isCallExpression(expression)
      && ts.isIdentifier(expression.expression)
      && expression.expression.text === name
        ? expression
        : null
    );
    const directAwaitedCall = (
      expression: ts.Expression | undefined,
      name: string,
      canonical: boolean,
    ) => (
      expression && ts.isAwaitExpression(expression)
        ? directCall(expression.expression, name, canonical)
        : null
    );
    const isStagedRoleDeclaration = (
      declaration: ts.VariableDeclaration | null,
      lifecycleDeclaration: ts.VariableDeclaration | null,
    ) => {
      if (!declaration?.initializer || !ts.isConditionalExpression(declaration.initializer)) return false;
      const conditional = declaration.initializer;
      const condition = conditional.condition;
      if (
        !ts.isBinaryExpression(condition)
        || condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
        || !ts.isStringLiteral(condition.right)
        || condition.right.text !== 'staged'
        || conditional.whenFalse.kind !== ts.SyntaxKind.NullKeyword
      ) return false;
      const conditionPath = syntaxPath(condition.left, true);
      const selectedPath = syntaxPath(conditional.whenTrue, false);
      return Boolean(
        conditionPath
        && selectedPath
        && lifecycleDeclaration
        && declarationForIdentifier(conditionPath.root) === lifecycleDeclaration
        && declarationForIdentifier(selectedPath.root) === lifecycleDeclaration
        && JSON.stringify(conditionPath.members) === JSON.stringify(['session', 'state'])
        && JSON.stringify(selectedPath.members) === JSON.stringify(['session']),
      );
    };

    const allInnerDeclarations = [...innerBindings.values()].flat();
    const lifecycleCandidates = allInnerDeclarations.filter((declaration) => {
      const call = directAwaitedCall(
        declaration.initializer,
        'reconcileLifecycle',
        canonicalHelpers.reconcileLifecycle,
      );
      return call?.arguments.length === 0;
    });
    const lifecycleDeclaration = lifecycleCandidates.length === 1 ? lifecycleCandidates[0]! : null;
    const stagedCandidates = allInnerDeclarations.filter((declaration) => (
      isStagedRoleDeclaration(declaration, lifecycleDeclaration)
    ));
    const stagedDeclaration = stagedCandidates.length === 1 ? stagedCandidates[0]! : null;
    if (!lifecycleDeclaration || !stagedDeclaration) {
      report('inner staged root has an invalid canonical lifecycle origin');
    }

    const sourceBindingDeclaration = declarationFor(innerReturn.get('sourceAuthorization'));
    const sourceBindingCall = directCall(
      sourceBindingDeclaration?.initializer,
      'sourceBinding',
      canonicalHelpers.sourceBinding,
    );
    const sourceBindingArgument = sourceBindingCall?.arguments.length === 1
      && ts.isIdentifier(sourceBindingCall.arguments[0]!)
      ? sourceBindingCall.arguments[0]
      : null;
    const sourceAuthorizationValid = Boolean(
      sourceBindingDeclaration?.type?.getText(file) === 'SourcePreviewBindingV1'
      && sourceBindingCall
      && sourceBindingArgument
      && declarationForIdentifier(sourceBindingArgument) === stagedDeclaration,
    );
    if (!canonicalHelpers.sourceBinding) {
      report('inner sourceAuthorization helper is shadowed or noncanonical');
    }
    if (!sourceAuthorizationValid) {
      report('inner sourceAuthorization has an invalid staged origin');
    }

    const importedAtDeclaration = declarationFor(innerReturn.get('sourceImportedAtMs'));
    if (!exactDeclarationPath(
      importedAtDeclaration?.initializer,
      sourceAuthorizationValid ? stagedDeclaration : null,
      ['importedAtMs'],
    )) report('inner sourceImportedAtMs has an invalid staged origin');

    const previewPlanCandidates = allInnerDeclarations.filter((declaration) => {
      const call = directCall(
        declaration.initializer,
        'makePreviewPlan',
        canonicalHelpers.makePreviewPlan,
      );
      return Boolean(
        call
        && call.arguments.length === 2
        && exactDeclarationPath(call.arguments[0], stagedDeclaration, ['envelope'])
        && exactDeclarationPath(call.arguments[1], stagedDeclaration, ['effectiveExpiresAtMs']),
      );
    });
    const previewPlanDeclaration = previewPlanCandidates.length === 1 ? previewPlanCandidates[0]! : null;
    const attemptedAtCandidates = allInnerDeclarations.filter((declaration) => {
      if (!canonicalHelpers.date || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
        return false;
      }
      const call = declaration.initializer;
      return call.arguments.length === 0
        && ts.isPropertyAccessExpression(call.expression)
        && !call.expression.questionDotToken
        && ts.isIdentifier(call.expression.expression)
        && call.expression.expression.text === 'Date'
        && call.expression.name.text === 'now';
    });
    const attemptedAtDeclaration = attemptedAtCandidates.length === 1 ? attemptedAtCandidates[0]! : null;
    const adapterExpiryCandidates = allInnerDeclarations.filter((declaration) => {
      if (!canonicalHelpers.date || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
        return false;
      }
      const call = declaration.initializer;
      return call.arguments.length === 1
        && ts.isPropertyAccessExpression(call.expression)
        && !call.expression.questionDotToken
        && ts.isIdentifier(call.expression.expression)
        && call.expression.expression.text === 'Date'
        && call.expression.name.text === 'parse'
        && exactDeclarationPath(call.arguments[0], previewPlanDeclaration, ['adapter', 'expiresAt']);
    });
    const adapterExpiryDeclaration = adapterExpiryCandidates.length === 1
      ? adapterExpiryCandidates[0]!
      : null;

    const attemptDeadlineCandidates = allInnerDeclarations.filter((declaration) => {
      const call = directCall(
        declaration.initializer,
        'nextOperationDeadline',
        canonicalHelpers.nextOperationDeadline,
      );
      return Boolean(
        call
        && call.arguments.length === 3
        && declarationFor(call.arguments[0]) === attemptedAtDeclaration
        && exactDeclarationPath(call.arguments[1], stagedDeclaration, ['effectiveExpiresAtMs'])
        && declarationFor(call.arguments[2]) === adapterExpiryDeclaration,
      );
    });
    const attemptDeadlineDeclaration = attemptDeadlineCandidates.length === 1
      ? attemptDeadlineCandidates[0]!
      : null;
    if (!attemptDeadlineDeclaration) {
      report('inner attemptNotAfterMs has an invalid canonical origin');
    }

    const exactArray = (expression: ts.Expression | undefined, length: number) => (
      expression && ts.isArrayLiteralExpression(expression) && expression.elements.length === length
        ? expression
        : null
    );
    const nonceCandidates = allInnerDeclarations.filter((declaration) => {
      const call = directCall(declaration.initializer, 'newOpaque', canonicalHelpers.newOpaque);
      const exclusions = exactArray(call?.arguments.length === 1 ? call.arguments[0] : undefined, 2);
      return Boolean(
        exclusions
        && exactDeclarationPath(exclusions.elements[0], stagedDeclaration, ['generation'])
        && exactDeclarationPath(exclusions.elements[1], stagedDeclaration, ['envelope', 'packId']),
      );
    });
    const nonceDeclaration = nonceCandidates.length === 1 ? nonceCandidates[0]! : null;
    if (!nonceDeclaration) report('inner armNonce has an invalid canonical origin');

    const attemptIdCandidates = allInnerDeclarations.filter((declaration) => {
      const call = directCall(declaration.initializer, 'newOpaque', canonicalHelpers.newOpaque);
      const exclusions = exactArray(call?.arguments.length === 1 ? call.arguments[0] : undefined, 3);
      const nonceFallback = exclusions?.elements[2];
      return Boolean(
        exclusions
        && exactDeclarationPath(exclusions.elements[0], stagedDeclaration, ['generation'])
        && exactDeclarationPath(exclusions.elements[1], stagedDeclaration, ['envelope', 'packId'])
        && nonceFallback
        && ts.isBinaryExpression(nonceFallback)
        && nonceFallback.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        && declarationFor(nonceFallback.left) === nonceDeclaration
        && ts.isStringLiteral(nonceFallback.right)
        && nonceFallback.right.text === '',
      );
    });
    const attemptIdDeclaration = attemptIdCandidates.length === 1 ? attemptIdCandidates[0]! : null;
    if (!attemptIdDeclaration) report('inner attemptId has an invalid canonical origin');

    const armingKeys = [
      'schema', 'state', 'generation', 'envelope', 'importedAtMs', 'effectiveExpiresAtMs',
      'sourceTabId', 'sourceDocumentId', 'destination', 'armNonce', 'attemptId', 'replayUntil',
      'attemptNotAfterMs',
    ] as const;
    const armingCandidates = allInnerDeclarations.filter((declaration) => (
      declaration.type?.getText(file) === 'ArmingSessionStateV1'
      && directFrozenObject(declaration.initializer)
    ));
    const armingDeclaration = armingCandidates.length === 1 ? armingCandidates[0]! : null;
    const armingEntries = exactObjectEntries(
      directFrozenObject(armingDeclaration?.initializer),
      armingKeys,
      true,
    );
    const armingOrigins: Readonly<Record<typeof armingKeys[number], boolean>> = Object.freeze({
      schema: Boolean(
        canonicalHelpers.sessionSchema
        && armingEntries?.get('schema')
        && ts.isIdentifier(armingEntries.get('schema')!)
        && (armingEntries.get('schema') as ts.Identifier).text === 'SESSION_STATE_SCHEMA',
      ),
      state: Boolean(
        armingEntries?.get('state')
        && ts.isStringLiteral(armingEntries.get('state')!)
        && (armingEntries.get('state') as ts.StringLiteral).text === 'arming',
      ),
      generation: exactDeclarationPath(armingEntries?.get('generation'), stagedDeclaration, ['generation']),
      envelope: exactDeclarationPath(armingEntries?.get('envelope'), stagedDeclaration, ['envelope']),
      importedAtMs: exactDeclarationPath(
        armingEntries?.get('importedAtMs'), stagedDeclaration, ['importedAtMs'],
      ),
      effectiveExpiresAtMs: exactDeclarationPath(
        armingEntries?.get('effectiveExpiresAtMs'), stagedDeclaration, ['effectiveExpiresAtMs'],
      ),
      sourceTabId: exactDeclarationPath(armingEntries?.get('sourceTabId'), stagedDeclaration, ['sourceTabId']),
      sourceDocumentId: exactDeclarationPath(
        armingEntries?.get('sourceDocumentId'), stagedDeclaration, ['sourceDocumentId'],
      ),
      destination: exactDeclarationPath(
        armingEntries?.get('destination'), stagedDeclaration, ['destination'],
      ),
      armNonce: declarationFor(armingEntries?.get('armNonce')) === nonceDeclaration,
      attemptId: declarationFor(armingEntries?.get('attemptId')) === attemptIdDeclaration,
      replayUntil: exactDeclarationPath(
        armingEntries?.get('replayUntil'), stagedDeclaration, ['effectiveExpiresAtMs'],
      ),
      attemptNotAfterMs: declarationFor(armingEntries?.get('attemptNotAfterMs'))
        === attemptDeadlineDeclaration,
    });
    if (!armingEntries || armingKeys.some((key) => !armingOrigins[key])) {
      report('inner arming object has invalid durable shape or origins');
    }

    const consumingDeclaration = declarationFor(innerReturn.get('consuming')!);
    const consumingKeys = [
      'schema', 'state', 'generation', 'armNonce', 'packId', 'attemptId', 'replayUntil',
      'attemptNotAfterMs', 'destinationTabId', 'destinationDocumentId',
    ] as const;
    const consumingEntries = exactObjectEntries(
      directFrozenObject(consumingDeclaration?.initializer),
      consumingKeys,
      false,
    );
    const consumingOrigins: Readonly<Record<typeof consumingKeys[number], boolean>> = Object.freeze({
      schema: Boolean(
        canonicalHelpers.sessionSchema
        && consumingEntries?.get('schema')
        && ts.isIdentifier(consumingEntries.get('schema')!)
        && (consumingEntries.get('schema') as ts.Identifier).text === 'SESSION_STATE_SCHEMA',
      ),
      state: Boolean(
        consumingEntries?.get('state')
        && ts.isStringLiteral(consumingEntries.get('state')!)
        && (consumingEntries.get('state') as ts.StringLiteral).text === 'consuming',
      ),
      generation: exactDeclarationPath(consumingEntries?.get('generation'), armingDeclaration, ['generation']),
      armNonce: exactDeclarationPath(consumingEntries?.get('armNonce'), armingDeclaration, ['armNonce']),
      packId: exactDeclarationPath(consumingEntries?.get('packId'), armingDeclaration, ['envelope', 'packId']),
      attemptId: exactDeclarationPath(consumingEntries?.get('attemptId'), armingDeclaration, ['attemptId']),
      replayUntil: exactDeclarationPath(
        consumingEntries?.get('replayUntil'), armingDeclaration, ['replayUntil'],
      ),
      attemptNotAfterMs: exactDeclarationPath(
        consumingEntries?.get('attemptNotAfterMs'), armingDeclaration, ['attemptNotAfterMs'],
      ),
      destinationTabId: exactDeclarationPath(
        consumingEntries?.get('destinationTabId'),
        armingDeclaration,
        ['destination', 'destinationTabId'],
      ),
      destinationDocumentId: exactDeclarationPath(
        consumingEntries?.get('destinationDocumentId'),
        armingDeclaration,
        ['destination', 'destinationDocumentId'],
      ),
    });
    if (
      consumingDeclaration?.type?.getText(file) !== 'ConsumingSessionStateV1'
      || !consumingEntries
    ) report('inner consuming member must originate from the exact payload-free tuple');
    for (const property of consumingKeys) {
      if (!consumingOrigins[property]) {
        report(`inner consuming tuple property "${property}" has an invalid origin`);
      }
    }

    const exactDeclarationIdentifier = (
      expression: ts.Expression | undefined,
      declaration: ts.VariableDeclaration | null,
    ) => Boolean(
      expression
      && declaration
      && ts.isIdentifier(expression)
      && declarationForIdentifier(expression) === declaration,
    );
    const exactDeclarationProperty = (
      expression: ts.Expression | undefined,
      declaration: ts.VariableDeclaration | null,
      member: string,
    ) => Boolean(
      expression
      && declaration
      && ts.isPropertyAccessExpression(expression)
      && !expression.questionDotToken
      && expression.name.text === member
      && exactDeclarationIdentifier(expression.expression, declaration),
    );
    const exactStatusComparison = (
      expression: ts.Expression | undefined,
      declaration: ts.VariableDeclaration | null,
      operator: ts.SyntaxKind,
      status: string,
    ) => Boolean(
      expression
      && ts.isBinaryExpression(expression)
      && expression.operatorToken.kind === operator
      && exactDeclarationProperty(expression.left, declaration, 'status')
      && exactString(expression.right, status),
    );
    const exactOptionalSessionStateComparison = (
      expression: ts.Expression | undefined,
      declaration: ts.VariableDeclaration | null,
      state: string,
    ) => {
      if (
        !expression
        || !ts.isBinaryExpression(expression)
        || expression.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken
        || !ts.isPropertyAccessExpression(expression.left)
        || !expression.left.questionDotToken
        || expression.left.name.text !== 'state'
        || !exactString(expression.right, state)
      ) return false;
      return exactDeclarationProperty(expression.left.expression, declaration, 'session');
    };
    const innerRequest = inner.parameters.length === 1 && ts.isIdentifier(inner.parameters[0]!.name)
      ? inner.parameters[0]!.name
      : null;
    const exactRequestCommand = (expression: ts.Expression | undefined) => Boolean(
      expression
      && innerRequest
      && ts.isPropertyAccessExpression(expression)
      && !expression.questionDotToken
      && expression.name.text === 'command'
      && ts.isIdentifier(expression.expression)
      && expression.expression.text === innerRequest.text,
    );
    const exactResponseCall = (
      expression: ts.Expression | undefined,
      name: 'buildFixedWorkerResponse' | 'buildRejectedWorkerResponse',
      reason: string,
    ) => {
      const call = directCall(expression, name, canonicalHelpers[name]);
      return Boolean(
        call
        && call.arguments.length === 2
        && exactRequestCommand(call.arguments[0])
        && exactString(call.arguments[1], reason),
      );
    };
    const exactCancellationCall = (
      expression: ts.Expression | undefined,
      session: ts.VariableDeclaration | null,
    ) => {
      const call = directCall(
        expression,
        'cancelBeforeDispatch',
        canonicalHelpers.cancelBeforeDispatch,
      );
      return Boolean(
        call
        && call.arguments.length === 2
        && exactDeclarationIdentifier(call.arguments[0], session)
        && exactResponseCall(call.arguments[1], 'buildRejectedWorkerResponse', 'operation-failed'),
      );
    };
    const directConstDeclaration = (statement: ts.Statement | undefined) => {
      const declaration = singleDeclaration(statement, 'const');
      return declaration && ts.isIdentifier(declaration.name) ? declaration : null;
    };

    const innerStatements = [...inner.body!.statements];
    const armingStatement = armingDeclaration?.parent.parent;
    const consumingStatement = consumingDeclaration?.parent.parent;
    const armingStatementIndex = armingStatement && ts.isVariableStatement(armingStatement)
      ? innerStatements.indexOf(armingStatement)
      : -1;
    const suffix = armingStatementIndex >= 0 ? innerStatements.slice(armingStatementIndex) : [];
    let suffixMatches = Boolean(
      canonicalHelpers.writeSessionState
      && canonicalHelpers.liveFromSession
      && canonicalHelpers.readyLedger
      && canonicalHelpers.armUnresolvedLive
      && canonicalHelpers.cancelBeforeDispatch
      && canonicalHelpers.buildFixedWorkerResponse
      && canonicalHelpers.buildRejectedWorkerResponse
      && innerRequest
      && suffix.length === 10
      && suffix[0] === armingStatement,
    );

    const armedSessionDeclaration = directConstDeclaration(suffix[1]);
    const armedSessionWrite = directAwaitedCall(
      armedSessionDeclaration?.initializer,
      'writeSessionState',
      canonicalHelpers.writeSessionState,
    );
    suffixMatches &&= Boolean(
      armedSessionWrite
      && armedSessionWrite.arguments.length === 1
      && exactDeclarationIdentifier(armedSessionWrite.arguments[0], armingDeclaration),
    );

    const armingGuard = suffix[2] && ts.isIfStatement(suffix[2]) ? suffix[2] : null;
    const armingGuardCondition = armingGuard && ts.isBinaryExpression(armingGuard.expression)
      ? armingGuard.expression
      : null;
    suffixMatches &&= Boolean(
      armingGuard
      && !armingGuard.elseStatement
      && armingGuardCondition
      && armingGuardCondition.operatorToken.kind === ts.SyntaxKind.BarBarToken
      && exactStatusComparison(
        armingGuardCondition.left,
        armedSessionDeclaration,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        'ready',
      )
      && exactOptionalSessionStateComparison(
        armingGuardCondition.right,
        armedSessionDeclaration,
        'arming',
      )
      && ts.isBlock(armingGuard.thenStatement)
      && armingGuard.thenStatement.statements.length === 1,
    );
    const armingFailureReturn = armingGuard && ts.isBlock(armingGuard.thenStatement)
      && armingGuard.thenStatement.statements.length === 1
      && ts.isReturnStatement(armingGuard.thenStatement.statements[0])
      ? armingGuard.thenStatement.statements[0]
      : null;
    const armingFailure = armingFailureReturn?.expression;
    suffixMatches &&= Boolean(
      armingFailure
      && ts.isConditionalExpression(armingFailure)
      && exactStatusComparison(
        armingFailure.condition,
        armedSessionDeclaration,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        'quarantined',
      )
      && exactResponseCall(armingFailure.whenTrue, 'buildFixedWorkerResponse', 'quarantined')
      && exactResponseCall(
        armingFailure.whenFalse,
        'buildRejectedWorkerResponse',
        'storage-unavailable',
      ),
    );

    const liveDeclaration = directConstDeclaration(suffix[3]);
    const liveCall = directCall(
      liveDeclaration?.initializer,
      'liveFromSession',
      canonicalHelpers.liveFromSession,
    );
    suffixMatches &&= Boolean(
      liveCall
      && liveCall.arguments.length === 1
      && exactDeclarationIdentifier(liveCall.arguments[0], armingDeclaration),
    );

    const armedLedgerDeclaration = directConstDeclaration(suffix[4]);
    const armedLedgerCall = directAwaitedCall(
      armedLedgerDeclaration?.initializer,
      'armUnresolvedLive',
      canonicalHelpers.armUnresolvedLive,
    );
    const readyLedgerCall = directCall(
      armedLedgerCall?.arguments[0],
      'readyLedger',
      canonicalHelpers.readyLedger,
    );
    suffixMatches &&= Boolean(
      armedLedgerCall
      && armedLedgerCall.arguments.length === 2
      && readyLedgerCall
      && readyLedgerCall.arguments.length === 1
      && exactDeclarationPath(readyLedgerCall.arguments[0], lifecycleDeclaration, ['ledger'])
      && exactDeclarationIdentifier(armedLedgerCall.arguments[1], liveDeclaration),
    );

    const ledgerGuard = suffix[5] && ts.isIfStatement(suffix[5]) ? suffix[5] : null;
    suffixMatches &&= Boolean(
      ledgerGuard
      && !ledgerGuard.elseStatement
      && exactStatusComparison(
        ledgerGuard.expression,
        armedLedgerDeclaration,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        'confirmed',
      )
      && ts.isBlock(ledgerGuard.thenStatement)
      && ledgerGuard.thenStatement.statements.length === 2,
    );
    const cancellationDeclaration = ledgerGuard && ts.isBlock(ledgerGuard.thenStatement)
      ? directConstDeclaration(ledgerGuard.thenStatement.statements[0])
      : null;
    const cancellationAwait = cancellationDeclaration?.initializer
      && ts.isAwaitExpression(cancellationDeclaration.initializer)
      ? cancellationDeclaration.initializer
      : null;
    suffixMatches &&= Boolean(
      cancellationAwait
      && exactCancellationCall(cancellationAwait.expression, armingDeclaration),
    );
    const cancellationReturn = ledgerGuard && ts.isBlock(ledgerGuard.thenStatement)
      && ts.isReturnStatement(ledgerGuard.thenStatement.statements[1])
      ? ledgerGuard.thenStatement.statements[1]
      : null;
    const cancellationBranch = cancellationReturn?.expression;
    suffixMatches &&= Boolean(
      cancellationBranch
      && ts.isConditionalExpression(cancellationBranch)
      && exactStatusComparison(
        cancellationBranch.condition,
        armedLedgerDeclaration,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        'quarantined',
      )
      && exactResponseCall(cancellationBranch.whenTrue, 'buildFixedWorkerResponse', 'quarantined')
      && exactDeclarationIdentifier(cancellationBranch.whenFalse, cancellationDeclaration),
    );

    suffixMatches &&= suffix[6] === consumingStatement;
    const consumedDeclaration = directConstDeclaration(suffix[7]);
    const consumedWrite = directAwaitedCall(
      consumedDeclaration?.initializer,
      'writeSessionState',
      canonicalHelpers.writeSessionState,
    );
    suffixMatches &&= Boolean(
      consumedWrite
      && consumedWrite.arguments.length === 1
      && exactDeclarationIdentifier(consumedWrite.arguments[0], consumingDeclaration),
    );

    const consumingGuard = suffix[8] && ts.isIfStatement(suffix[8]) ? suffix[8] : null;
    const consumingGuardCondition = consumingGuard && ts.isBinaryExpression(consumingGuard.expression)
      ? consumingGuard.expression
      : null;
    suffixMatches &&= Boolean(
      consumingGuard
      && !consumingGuard.elseStatement
      && consumingGuardCondition
      && consumingGuardCondition.operatorToken.kind === ts.SyntaxKind.BarBarToken
      && exactStatusComparison(
        consumingGuardCondition.left,
        consumedDeclaration,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        'ready',
      )
      && exactOptionalSessionStateComparison(
        consumingGuardCondition.right,
        consumedDeclaration,
        'consuming',
      )
      && ts.isBlock(consumingGuard.thenStatement)
      && consumingGuard.thenStatement.statements.length === 1,
    );
    const consumingFailureReturn = consumingGuard && ts.isBlock(consumingGuard.thenStatement)
      && ts.isReturnStatement(consumingGuard.thenStatement.statements[0])
      ? consumingGuard.thenStatement.statements[0]
      : null;
    suffixMatches &&= Boolean(
      consumingFailureReturn?.expression
      && exactCancellationCall(consumingFailureReturn.expression, armingDeclaration),
    );

    const preparedReturnStatement = suffix[9] && ts.isReturnStatement(suffix[9])
      ? suffix[9]
      : null;
    const suffixPreparedEntries = directFrozenObject(preparedReturnStatement?.expression);
    const exactSuffixPreparedEntries = exactObjectEntries(
      suffixPreparedEntries,
      PREPARED_DISPATCH_KEYS,
      true,
    );
    suffixMatches &&= Boolean(
      exactSuffixPreparedEntries
      && PREPARED_DISPATCH_KEYS.every(
        (key) => exactSuffixPreparedEntries.get(key) === innerReturn.get(key),
      ),
    );
    if (!suffixMatches) report('inner durability suffix does not match closed grammar');

    const fillPlan = innerReturn.get('fillPlan')!;
    const fillPlanRoot = ts.isPropertyAccessExpression(fillPlan)
      && !fillPlan.questionDotToken
      && fillPlan.name.text === 'plan'
      && ts.isIdentifier(fillPlan.expression)
      ? declarationForIdentifier(fillPlan.expression)
      : null;
    const fillPlanCall = directCall(
      fillPlanRoot?.initializer,
      'buildDestinationFillPlan',
      canonicalHelpers.buildDestinationFillPlan,
    );
    const fillPlanInputs = exactObjectEntries(
      fillPlanCall?.arguments.length === 1 && ts.isObjectLiteralExpression(fillPlanCall.arguments[0]!)
        ? fillPlanCall.arguments[0]!
        : null,
      ['envelope', 'effectiveExpiresAtMs', 'operationNotAfterMs', 'attemptId'],
      true,
    );
    const fillPlanShapeValid = Boolean(
      fillPlanCall
      && fillPlanInputs,
    );
    if (!canonicalHelpers.buildDestinationFillPlan) {
      report('inner fillPlan helper is shadowed or noncanonical');
    }
    if (!fillPlanShapeValid) report('inner fillPlan must originate from the closed fill-plan builder');
    if (
      !fillPlanShapeValid
      || !exactDeclarationPath(
        fillPlanInputs?.get('envelope'), sourceAuthorizationValid ? stagedDeclaration : null, ['envelope'],
      )
      || !exactDeclarationPath(
        fillPlanInputs?.get('effectiveExpiresAtMs'),
        sourceAuthorizationValid ? stagedDeclaration : null,
        ['effectiveExpiresAtMs'],
      )
    ) report('inner fillPlan has invalid staged inputs');

    if (
      !fillPlanShapeValid
      || !attemptIdDeclaration
      || !attemptDeadlineDeclaration
      || declarationFor(fillPlanInputs?.get('attemptId')) !== attemptIdDeclaration
      || declarationFor(fillPlanInputs?.get('operationNotAfterMs')) !== attemptDeadlineDeclaration
    ) report('inner fillPlan has invalid attempt inputs');

    const authoritativeRoles = [
      lifecycleDeclaration,
      stagedDeclaration,
      previewPlanDeclaration,
      attemptedAtDeclaration,
      adapterExpiryDeclaration,
      attemptDeadlineDeclaration,
      nonceDeclaration,
      attemptIdDeclaration,
      fillPlanRoot,
      sourceBindingDeclaration,
      importedAtDeclaration,
      armingDeclaration,
      armedSessionDeclaration,
      liveDeclaration,
      armedLedgerDeclaration,
      consumingDeclaration,
      consumedDeclaration,
    ] as const;
    const presentAuthoritativeRoles = authoritativeRoles.filter(
      (declaration): declaration is ts.VariableDeclaration => declaration !== null,
    );
    const isDirectSingleConst = (declaration: ts.VariableDeclaration) => {
      const declarationList = declaration.parent;
      const statement = declarationList.parent;
      return ts.isVariableDeclarationList(declarationList)
        && declarationList.declarations.length === 1
        && Boolean(declarationList.flags & ts.NodeFlags.Const)
        && ts.isVariableStatement(statement)
        && statement.parent === inner.body;
    };
    let authoritativeRolesValid = Boolean(
      authoritativeRoles.every((declaration) => declaration !== null)
      && new Set(presentAuthoritativeRoles).size === authoritativeRoles.length
      && presentAuthoritativeRoles.every(isDirectSingleConst),
    );
    const authoritativeSet = new Set(presentAuthoritativeRoles);
    const authoritativeOrigin = new Map<ts.VariableDeclaration, ts.VariableDeclaration>();
    for (const declaration of presentAuthoritativeRoles) {
      authoritativeOrigin.set(declaration, declaration);
    }
    const rootDeclaration = (expression: ts.Expression | undefined) => {
      if (!expression) return null;
      let selected = unwrapPreparationExpression(expression);
      while (ts.isPropertyAccessExpression(selected) || ts.isElementAccessExpression(selected)) {
        selected = unwrapPreparationExpression(selected.expression);
      }
      return ts.isIdentifier(selected) ? declarationForIdentifier(selected) : null;
    };
    let discoveredAlias = true;
    while (discoveredAlias) {
      discoveredAlias = false;
      for (const declaration of allInnerDeclarations) {
        if (authoritativeOrigin.has(declaration)) continue;
        const root = rootDeclaration(declaration.initializer);
        const origin = root ? authoritativeOrigin.get(root) : null;
        if (origin) {
          authoritativeOrigin.set(declaration, origin);
          discoveredAlias = true;
        }
      }
    }
    const authoritativeRoot = (expression: ts.Expression | undefined) => {
      const declaration = rootDeclaration(expression);
      return declaration ? authoritativeOrigin.get(declaration) ?? null : null;
    };
    if (
      allInnerDeclarations.some((declaration) => (
        !authoritativeSet.has(declaration) && authoritativeOrigin.has(declaration)
      ))
    ) authoritativeRolesValid = false;

    const writeRoots = (expression: ts.Expression): ReadonlySet<ts.VariableDeclaration> => {
      const selected = unwrapPreparationExpression(expression);
      const directRoot = authoritativeRoot(selected);
      if (directRoot) return new Set([directRoot]);
      const roots = new Set<ts.VariableDeclaration>();
      const include = (nested: ts.Expression) => {
        for (const root of writeRoots(nested)) roots.add(root);
      };
      if (ts.isObjectLiteralExpression(selected)) {
        for (const property of selected.properties) {
          if (ts.isShorthandPropertyAssignment(property)) include(property.name);
          else if (ts.isPropertyAssignment(property)) include(property.initializer);
          else if (ts.isSpreadAssignment(property)) include(property.expression);
        }
      } else if (ts.isArrayLiteralExpression(selected)) {
        for (const element of selected.elements) {
          if (ts.isOmittedExpression(element)) continue;
          include(ts.isSpreadElement(element) ? element.expression : element);
        }
      } else if (
        ts.isBinaryExpression(selected)
        && selected.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) include(selected.left);
      return roots;
    };
    const writeTargets: ts.Expression[] = [];
    const writes = new Map<ts.VariableDeclaration, number[]>();
    const recordWrite = (target: ts.Expression, positionNode: ts.Node) => {
      writeTargets.push(target);
      for (const root of writeRoots(target)) {
        const positions = writes.get(root) ?? [];
        positions.push(positionNode.getStart(file));
        writes.set(root, positions);
      }
    };
    const collectWrites = (node: ts.Node) => {
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) recordWrite(node.left, node);
      if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
        && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
      ) recordWrite(node.operand, node);
      if (ts.isDeleteExpression(node)) recordWrite(node.expression, node);
      if (
        (ts.isForInStatement(node) || ts.isForOfStatement(node))
        && !ts.isVariableDeclarationList(node.initializer)
      ) recordWrite(node.initializer, node);
      ts.forEachChild(node, collectWrites);
    };
    collectWrites(inner);

    const inside = (node: ts.Node, ancestor: ts.Node) => {
      let selected: ts.Node | undefined = node;
      while (selected) {
        if (selected === ancestor) return true;
        if (selected === inner) return false;
        selected = selected.parent;
      }
      return false;
    };
    const declarationNameContains = (declaration: ts.VariableDeclaration, node: ts.Node) => (
      inside(node, declaration.name)
    );
    const isReferenceIdentifier = (identifier: ts.Identifier) => {
      const parent = identifier.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
      if (
        (ts.isPropertyAssignment(parent)
          || ts.isMethodDeclaration(parent)
          || ts.isGetAccessorDeclaration(parent)
          || ts.isSetAccessorDeclaration(parent))
        && parent.name === identifier
      ) return false;
      if (ts.isBindingElement(parent) && parent.propertyName === identifier) return false;
      return true;
    };
    const lastAuthoritativeUse = new Map<ts.VariableDeclaration, number>();
    const collectAuthoritativeUses = (node: ts.Node) => {
      if (ts.isIdentifier(node) && isReferenceIdentifier(node)) {
        const declaration = declarationForIdentifier(node);
        const origin = declaration ? authoritativeOrigin.get(declaration) : null;
        if (
          origin
          && !declarationNameContains(declaration!, node)
          && !writeTargets.some((target) => inside(node, target))
        ) {
          lastAuthoritativeUse.set(
            origin,
            Math.max(lastAuthoritativeUse.get(origin) ?? 0, node.getStart(file)),
          );
        }
      }
      ts.forEachChild(node, collectAuthoritativeUses);
    };
    collectAuthoritativeUses(inner);
    for (const [root, positions] of writes) {
      const lastUse = lastAuthoritativeUse.get(root) ?? 0;
      if (positions.some((position) => position > root.end && position <= lastUse)) {
        authoritativeRolesValid = false;
      }
    }

    const containsAuthoritativeReference = (node: ts.Node) => {
      let contains = false;
      const visit = (selected: ts.Node) => {
        if (contains) return;
        if (ts.isIdentifier(selected) && isReferenceIdentifier(selected)) {
          const declaration = declarationForIdentifier(selected);
          if (declaration && authoritativeOrigin.has(declaration)) {
            contains = true;
            return;
          }
        }
        ts.forEachChild(selected, visit);
      };
      visit(node);
      return contains;
    };
    const innerCalls: ts.CallExpression[] = [];
    const collectInnerCalls = (node: ts.Node) => {
      if (node !== inner && ts.isFunctionLike(node)) return;
      if (ts.isCallExpression(node)) innerCalls.push(node);
      ts.forEachChild(node, collectInnerCalls);
    };
    collectInnerCalls(inner);
    const callsNamed = (name: string) => innerCalls.filter((call) => (
      ts.isIdentifier(call.expression) && call.expression.text === name
    ));
    const certifiedCalls = new Set<ts.CallExpression>();
    const certifiedAggregates = new Set<ts.ObjectLiteralExpression | ts.ArrayLiteralExpression>();
    const certifiedAssignments = new Set<ts.BinaryExpression>();
    let canonicalRoleCallsValid = true;
    const certifyAggregateTree = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
        certifiedAggregates.add(node);
      }
      ts.forEachChild(node, certifyAggregateTree);
    };
    const certifyNamedCalls = (
      name: string,
      canonical: boolean,
      predicates: readonly ((call: ts.CallExpression) => boolean)[],
    ) => {
      const calls = callsNamed(name).sort((left, right) => left.pos - right.pos);
      const valid = canonical
        && calls.length === predicates.length
        && calls.every((call, index) => predicates[index]!(call));
      if (!valid) {
        canonicalRoleCallsValid = false;
        return;
      }
      for (const call of calls) {
        certifiedCalls.add(call);
        certifyAggregateTree(call);
      }
    };
    const exactRequestProperty = (expression: ts.Expression | undefined, member: string) => Boolean(
      expression
      && innerRequest
      && ts.isPropertyAccessExpression(expression)
      && !expression.questionDotToken
      && expression.name.text === member
      && ts.isIdentifier(expression.expression)
      && expression.expression.text === innerRequest.text
    );
    const callFromDeclaration = (
      declaration: ts.VariableDeclaration | null,
      name: string,
      canonical: boolean,
    ) => directCall(declaration?.initializer, name, canonical);

    const blockerCalls = callsNamed('fixedBlocker');
    certifyNamedCalls('fixedBlocker', canonicalHelpers.fixedBlocker, [
      (call) => call === blockerCalls[0]
        && call.arguments.length === 2
        && exactRequestCommand(call.arguments[0])
        && exactDeclarationIdentifier(call.arguments[1], lifecycleDeclaration),
    ]);
    const previewPlanCall = callFromDeclaration(
      previewPlanDeclaration,
      'makePreviewPlan',
      canonicalHelpers.makePreviewPlan,
    );
    certifyNamedCalls('makePreviewPlan', canonicalHelpers.makePreviewPlan, [
      (call) => call === previewPlanCall
        && call.arguments.length === 2
        && exactDeclarationPath(call.arguments[0], stagedDeclaration, ['envelope'])
        && exactDeclarationPath(call.arguments[1], stagedDeclaration, ['effectiveExpiresAtMs']),
    ]);
    certifyNamedCalls('routeFailure', canonicalHelpers.routeFailure, [
      (call) => call.arguments.length === 2
        && exactRequestCommand(call.arguments[0])
        && exactDeclarationIdentifier(call.arguments[1], previewPlanDeclaration),
      (call) => call.arguments.length === 2
        && exactRequestCommand(call.arguments[0])
        && exactDeclarationIdentifier(call.arguments[1], fillPlanRoot),
    ]);
    certifyNamedCalls('actionTabMatches', canonicalHelpers.actionTabMatches, [
      (call) => call.arguments.length === 2
        && exactRequestProperty(call.arguments[0], 'actionTabId')
        && exactDeclarationPath(
          call.arguments[1],
          previewPlanDeclaration,
          ['adapter', 'expectedLocation'],
        ),
    ]);
    certifyNamedCalls('sourceBinding', canonicalHelpers.sourceBinding, [
      (call) => call === sourceBindingCall
        && call.arguments.length === 1
        && exactDeclarationIdentifier(call.arguments[0], stagedDeclaration),
    ]);
    certifyNamedCalls('runSourceReprobe', canonicalHelpers.runSourceReprobe, [
      (call) => call.arguments.length === 3
        && exactDeclarationIdentifier(call.arguments[0], stagedDeclaration)
        && exactDeclarationPath(
          call.arguments[1],
          previewPlanDeclaration,
          ['plan', 'operationNotAfterMs'],
        )
        && exactDeclarationIdentifier(call.arguments[2], sourceBindingDeclaration),
    ]);
    certifyNamedCalls('stagedPreviewTiming', canonicalHelpers.stagedPreviewTiming, [
      (call) => call.arguments.length === 2
        && exactDeclarationIdentifier(call.arguments[0], stagedDeclaration)
        && exactDeclarationIdentifier(call.arguments[1], previewPlanDeclaration),
      (call) => call.arguments.length === 2
        && exactDeclarationIdentifier(call.arguments[0], stagedDeclaration)
        && exactDeclarationIdentifier(call.arguments[1], previewPlanDeclaration),
    ]);
    certifyNamedCalls(
      'validateDestinationRepreflightInjectionResult',
      canonicalHelpers.validateDestinationRepreflightInjectionResult,
      [
        (call) => call.arguments.length === 2
          && ts.isIdentifier(call.arguments[0]!)
          && exactDeclarationPath(
            call.arguments[1],
            stagedDeclaration,
            ['destination', 'destinationDocumentId'],
          ),
      ],
    );
    certifyNamedCalls('isPositiveTime', canonicalHelpers.isPositiveTime, [
      (call) => call.arguments.length === 1
        && exactDeclarationIdentifier(call.arguments[0], adapterExpiryDeclaration),
    ]);
    const deadlineCall = callFromDeclaration(
      attemptDeadlineDeclaration,
      'nextOperationDeadline',
      canonicalHelpers.nextOperationDeadline,
    );
    certifyNamedCalls('nextOperationDeadline', canonicalHelpers.nextOperationDeadline, [
      (call) => call === deadlineCall,
    ]);
    const nonceCall = callFromDeclaration(nonceDeclaration, 'newOpaque', canonicalHelpers.newOpaque);
    const attemptIdCall = callFromDeclaration(
      attemptIdDeclaration,
      'newOpaque',
      canonicalHelpers.newOpaque,
    );
    certifyNamedCalls('newOpaque', canonicalHelpers.newOpaque, [
      (call) => call === nonceCall,
      (call) => call === attemptIdCall,
    ]);
    certifyNamedCalls(
      'buildDestinationFillPlan',
      canonicalHelpers.buildDestinationFillPlan,
      [(call) => call === fillPlanCall],
    );
    certifyNamedCalls('writeSessionState', canonicalHelpers.writeSessionState, [
      (call) => call === armedSessionWrite,
      (call) => call === consumedWrite,
    ]);
    certifyNamedCalls('liveFromSession', canonicalHelpers.liveFromSession, [
      (call) => call === liveCall,
    ]);
    certifyNamedCalls('readyLedger', canonicalHelpers.readyLedger, [
      (call) => call === readyLedgerCall,
    ]);
    certifyNamedCalls('armUnresolvedLive', canonicalHelpers.armUnresolvedLive, [
      (call) => call === armedLedgerCall,
    ]);
    const firstCancellationCall = cancellationAwait
      ? directCall(
        cancellationAwait.expression,
        'cancelBeforeDispatch',
        canonicalHelpers.cancelBeforeDispatch,
      )
      : null;
    const secondCancellationCall = directCall(
      consumingFailureReturn?.expression,
      'cancelBeforeDispatch',
      canonicalHelpers.cancelBeforeDispatch,
    );
    certifyNamedCalls('cancelBeforeDispatch', canonicalHelpers.cancelBeforeDispatch, [
      (call) => call === firstCancellationCall
        && exactCancellationCall(call, armingDeclaration),
      (call) => call === secondCancellationCall
        && exactCancellationCall(call, armingDeclaration),
    ]);

    const dateParseCalls = innerCalls.filter((call) => (
      ts.isPropertyAccessExpression(call.expression)
      && !call.expression.questionDotToken
      && ts.isIdentifier(call.expression.expression)
      && call.expression.expression.text === 'Date'
      && call.expression.name.text === 'parse'
    ));
    if (
      !canonicalHelpers.date
      || dateParseCalls.length !== 1
      || dateParseCalls[0]!.arguments.length !== 1
      || !exactDeclarationPath(
        dateParseCalls[0]!.arguments[0],
        previewPlanDeclaration,
        ['adapter', 'expiresAt'],
      )
    ) canonicalRoleCallsValid = false;
    else certifiedCalls.add(dateParseCalls[0]!);

    const freezeCalls = innerCalls.filter((call) => (
      ts.isPropertyAccessExpression(call.expression)
      && !call.expression.questionDotToken
      && ts.isIdentifier(call.expression.expression)
      && call.expression.expression.text === 'Object'
      && call.expression.name.text === 'freeze'
    ));
    const expectedFreezeObjects = [
      directFrozenObject(armingDeclaration?.initializer),
      directFrozenObject(consumingDeclaration?.initializer),
      suffixPreparedEntries,
    ];
    if (
      !canonicalHelpers.objectFreeze
      || expectedFreezeObjects.some((object) => object === null)
      || freezeCalls.length !== expectedFreezeObjects.length
      || freezeCalls.some((call, index) => call.arguments[0] !== expectedFreezeObjects[index])
    ) canonicalRoleCallsValid = false;
    else {
      for (const call of freezeCalls) {
        certifiedCalls.add(call);
        certifyAggregateTree(call);
      }
    }

    const executeScriptCalls = innerCalls.filter((call) => {
      const execute = call.expression;
      return ts.isPropertyAccessExpression(execute)
        && !execute.questionDotToken
        && execute.name.text === 'executeScript'
        && ts.isPropertyAccessExpression(execute.expression)
        && !execute.expression.questionDotToken
        && execute.expression.name.text === 'scripting'
        && ts.isIdentifier(execute.expression.expression)
        && execute.expression.expression.text === 'chrome';
    });
    const executeScriptCall = executeScriptCalls.length === 1 ? executeScriptCalls[0]! : null;
    const executeEntries = exactObjectEntries(
      executeScriptCall?.arguments.length === 1
        && ts.isObjectLiteralExpression(executeScriptCall.arguments[0]!)
        ? executeScriptCall.arguments[0]!
        : null,
      ['target', 'world', 'func', 'args'],
      false,
    );
    const executeTarget = executeEntries?.get('target');
    const targetEntries = exactObjectEntries(
      executeTarget && ts.isObjectLiteralExpression(executeTarget) ? executeTarget : null,
      ['tabId', 'frameIds'],
      false,
    );
    const frameIds = targetEntries?.get('frameIds');
    const executeFunc = executeEntries?.get('func');
    const executeArgs = executeEntries?.get('args');
    const executeScriptValid = Boolean(
      canonicalHelpers.chrome
      && canonicalHelpers.selectedDestinationInjectedFunction
      && executeScriptCall
      && executeEntries
      && targetEntries
      && exactDeclarationPath(
        targetEntries.get('tabId'),
        stagedDeclaration,
        ['destination', 'destinationTabId'],
      )
      && frameIds
      && ts.isArrayLiteralExpression(frameIds)
      && frameIds.elements.length === 1
      && ts.isNumericLiteral(frameIds.elements[0]!)
      && frameIds.elements[0]!.text === '0'
      && exactString(executeEntries.get('world'), 'ISOLATED')
      && executeFunc
      && ts.isNonNullExpression(executeFunc)
      && ts.isIdentifier(executeFunc.expression)
      && executeFunc.expression.text === 'selectedDestinationInjectedFunction'
      && executeArgs
      && ts.isArrayLiteralExpression(executeArgs)
      && executeArgs.elements.length === 1
      && exactDeclarationPath(executeArgs.elements[0], previewPlanDeclaration, ['plan'])
    );
    if (!executeScriptValid) canonicalRoleCallsValid = false;
    else {
      certifiedCalls.add(executeScriptCall!);
      certifyAggregateTree(executeScriptCall!);
      let parent: ts.Node = executeScriptCall!;
      while (parent.parent && parent.parent !== inner) {
        parent = parent.parent;
        if (
          ts.isBinaryExpression(parent)
          && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && inside(executeScriptCall!, parent.right)
        ) {
          certifiedAssignments.add(parent);
          break;
        }
      }
    }
    if (!canonicalRoleCallsValid) {
      report('inner authoritative call helper is shadowed or noncanonical');
    }

    const allowedRoleReturns = new Set<ts.ReturnStatement>([
      armingFailureReturn,
      cancellationReturn,
      consumingFailureReturn,
      preparedReturnStatement,
    ].filter((statement): statement is ts.ReturnStatement => statement !== null));
    const topLevelCertifiedCall = (expression: ts.Expression) => {
      let selected = unwrapPreparationExpression(expression);
      if (ts.isAwaitExpression(selected)) selected = unwrapPreparationExpression(selected.expression);
      return ts.isCallExpression(selected) && certifiedCalls.has(selected);
    };
    let outboundFlowValid = true;
    const collectOutboundFlow = (node: ts.Node) => {
      if (node !== inner && ts.isFunctionLike(node)) {
        if (containsAuthoritativeReference(node)) outboundFlowValid = false;
        return;
      }
      if (node !== inner && (ts.isClassDeclaration(node) || ts.isClassExpression(node))) {
        outboundFlowValid = false;
        return;
      }
      if (
        ts.isVariableDeclaration(node)
        && !ts.isIdentifier(node.name)
        && node.initializer
        && containsAuthoritativeReference(node.initializer)
      ) outboundFlowValid = false;
      if (
        ts.isVariableDeclaration(node)
        && !authoritativeSet.has(node)
        && node.initializer
        && containsAuthoritativeReference(node.initializer)
        && !topLevelCertifiedCall(node.initializer)
      ) outboundFlowValid = false;
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        && containsAuthoritativeReference(node.right)
        && !certifiedAssignments.has(node)
      ) outboundFlowValid = false;
      if (
        (ts.isForInStatement(node) || ts.isForOfStatement(node))
        && (
          containsAuthoritativeReference(node.expression)
          || containsAuthoritativeReference(node.initializer)
        )
      ) outboundFlowValid = false;
      if (
        (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node))
        && containsAuthoritativeReference(node)
        && !certifiedAggregates.has(node)
      ) outboundFlowValid = false;
      if (
        (ts.isTemplateExpression(node) || ts.isTaggedTemplateExpression(node))
        && containsAuthoritativeReference(node)
      ) outboundFlowValid = false;
      if (
        (ts.isCallExpression(node) || ts.isNewExpression(node))
        && containsAuthoritativeReference(node)
        && !(ts.isCallExpression(node) && certifiedCalls.has(node))
      ) outboundFlowValid = false;
      if (
        (ts.isSpreadElement(node) || ts.isSpreadAssignment(node))
        && containsAuthoritativeReference(node.expression)
        && !certifiedAggregates.has(node.parent as ts.ObjectLiteralExpression | ts.ArrayLiteralExpression)
      ) outboundFlowValid = false;
      if (
        ts.isReturnStatement(node)
        && node.expression
        && containsAuthoritativeReference(node.expression)
        && !allowedRoleReturns.has(node)
      ) outboundFlowValid = false;
      if (
        (ts.isThrowStatement(node) || ts.isYieldExpression(node))
        && containsAuthoritativeReference(node)
      ) {
        outboundFlowValid = false;
      }
      ts.forEachChild(node, collectOutboundFlow);
    };
    collectOutboundFlow(inner);
    if (!outboundFlowValid) {
      report('inner authoritative values must not escape certified outbound flow');
      authoritativeRolesValid = false;
    }
    if (!authoritativeRolesValid) {
      report('inner authoritative roles must be immutable direct const declarations');
    }
  }

  return issues;
}

describe('closed extension session state', () => {
  it('reconstructs the exact staged union and rejects reordered or accessor-controlled state', () => {
    const staged = {
      schema: SESSION_STATE_SCHEMA,
      state: 'staged',
      generation: '11111111111111111111111111111111',
      envelope,
      importedAtMs: Date.UTC(2026, 8, 3, 8, 1),
      effectiveExpiresAtMs: Date.UTC(2026, 8, 3, 8, 10),
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      destination: null,
    };
    expect(EXTENSION_SESSION_STATE_KEY).toBe('challansakshi.session-state.v1');
    expect(SESSION_STATE_SCHEMA).toBe('challansakshi.session-state/v1');
    const validated = validateSessionState(JSON.parse(JSON.stringify(staged)));
    expect(validated).toEqual({ status: 'ready', session: staged });
    if (validated.status === 'ready' && validated.session.state === 'staged') {
      expect(Object.isFrozen(validated.session)).toBe(true);
      expect(Object.isFrozen(validated.session.envelope)).toBe(true);
    }

    expect(validateSessionState({
      state: 'staged',
      schema: SESSION_STATE_SCHEMA,
      generation: staged.generation,
      envelope,
      importedAtMs: staged.importedAtMs,
      effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      destination: null,
    })).toEqual({ status: 'quarantined' });

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schema', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return SESSION_STATE_SCHEMA;
      },
    });
    expect(validateSessionState(hostile)).toEqual({ status: 'quarantined' });
    expect(getterCalls).toBe(0);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(() => validateSessionState(revoked.proxy)).not.toThrow();
    expect(validateSessionState(revoked.proxy)).toEqual({ status: 'quarantined' });
    expect(validateSessionState(Object.assign({ ...staged }, { [Symbol('hidden')]: true })))
      .toEqual({ status: 'quarantined' });

    let stateReads = 0;
    const mutatingState = new Proxy(staged, {
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if (key !== 'state' || !descriptor || !('value' in descriptor)) return descriptor;
        stateReads += 1;
        return { ...descriptor, value: stateReads < 3 ? 'staged' : 'arming' };
      },
    });
    expect(validateSessionState(mutatingState)).toEqual({ status: 'quarantined' });
    expect(stateReads).toBe(3);
  });

  it('validates every exact session member and settlement intent ordering', () => {
    const staged = stagedState();
    const arming = {
      schema: SESSION_STATE_SCHEMA,
      state: 'arming',
      generation: staged.generation,
      envelope,
      importedAtMs: staged.importedAtMs,
      effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
      sourceTabId: staged.sourceTabId,
      sourceDocumentId: staged.sourceDocumentId,
      destination: staged.destination,
      armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      replayUntil: staged.effectiveExpiresAtMs,
      attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
    };
    const consuming = consumingState();
    const settling = {
      ...consuming,
      state: 'settling',
      intended: {
        cause: 'injection-result',
        terminal: {
          state: 'replay', packId: consuming.packId,
          replayUntil: consuming.replayUntil, outcome: 'complete',
        },
      },
    };
    for (const member of [staged, arming, consuming, settling]) {
      const parsed = validateSessionState(clone(member));
      expect(parsed.status, member.state).toBe('ready');
      if (parsed.status === 'ready') expect(Object.keys(parsed.session)).toEqual(Object.keys(member));
    }
    expect(validateSessionState({ ...consuming, attemptNotAfterMs: consuming.replayUntil + 1 }))
      .toEqual({ status: 'quarantined' });
    expect(validateSessionState({
      ...consuming,
      replayUntil: Number.MAX_SAFE_INTEGER,
      attemptNotAfterMs: Number.MAX_SAFE_INTEGER,
    })).toEqual({ status: 'quarantined' });
    expect(validateSessionState({ ...arming, attemptId: arming.armNonce }))
      .toEqual({ status: 'quarantined' });
    expect(validateSessionState({ ...consuming, attemptId: consuming.armNonce }))
      .toEqual({ status: 'quarantined' });
    expect(validateSessionState({ ...consuming, destinationDocumentId: 'space is forbidden' }))
      .toEqual({ status: 'quarantined' });
    expect(validateSessionState({
      ...settling,
      intended: {
        cause: 'destination-tab-removed',
        terminal: {
          state: 'replay', packId: consuming.packId,
          replayUntil: consuming.replayUntil, outcome: 'complete',
        },
      },
    })).toEqual({ status: 'quarantined' });
    expect(validateSessionState(Object.assign({ ...consuming }, { extra: true })))
      .toEqual({ status: 'quarantined' });
  });
});

describe('callback worker boundary', () => {
  it('rejects an invalid sender exactly once before any Chrome or storage access', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    expect(harness.events.onMessage.listeners).toHaveLength(1);
    const responses: unknown[] = [];
    const returned = harness.events.onMessage.listeners[0]?.(
      buildPreviewCurrentPageRequest(17),
      { url: 'https://example.test/', id: 'external' },
      (response: unknown) => responses.push(response),
    );
    expect(returned).toBe(true);
    expect(responses).toEqual([{
      schema: WORKER_RESPONSE_SCHEMA,
      command: null,
      state: 'rejected',
      code: 'invalid-sender',
    }]);
    expect(harness.calls).toEqual([]);
  });

  it('rejects a malformed request with no state access and registers every lifecycle listener once', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    const responses: unknown[] = [];
    const returned = harness.events.onMessage.listeners[0]?.(
      { schema: WORKER_REQUEST_SCHEMA, command: 'preview-current-page', actionTabId: 17, extra: true },
      popupSender,
      (response: unknown) => responses.push(response),
    );
    expect(returned).toBe(true);
    expect(responses).toEqual([{
      schema: WORKER_RESPONSE_SCHEMA,
      command: null,
      state: 'rejected',
      code: 'invalid-request',
    }]);
    expect(harness.calls).toEqual([]);
    expect(harness.events.onStartup.listeners).toHaveLength(1);
    expect(harness.events.onInstalled.listeners).toHaveLength(1);
    expect(harness.events.onRemoved.listeners).toHaveLength(1);
    expect(harness.events.onReplaced.listeners).toHaveLength(1);
    expect(harness.events.onAlarm.listeners).toHaveLength(1);
  });
});

describe('serialized handoff lifecycle', () => {
  it('ends the payload-bearing preparation scope before final authorization and dispatch', () => {
    const source = readFileSync(new URL('../src/service-worker.ts', import.meta.url), 'utf8');
    const file = ts.createSourceFile(
      'service-worker.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const namedFunction = (name: string) => {
      let found: ts.FunctionDeclaration | undefined;
      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
        ts.forEachChild(node, visit);
      };
      visit(file);
      expect(found, `${name} must exist`).toBeDefined();
      return found!;
    };
    const preparation = namedFunction('prepareFillDispatch');
    const preparationRequest = preparation.parameters.length === 1
      && ts.isIdentifier(preparation.parameters[0]!.name)
      ? preparation.parameters[0]!.name.text
      : null;
    const preparationCallees: string[] = [];
    const findPreparationCallee = (node: ts.Node) => {
      if (ts.isFunctionLike(node) && node !== preparation) return;
      if (ts.isAwaitExpression(node)) {
        const call = unwrapPreparationExpression(node.expression);
        if (
          ts.isCallExpression(call)
          && ts.isIdentifier(call.expression)
          && call.arguments.length === 1
          && preparationRequest
          && ts.isIdentifier(call.arguments[0])
          && call.arguments[0].text === preparationRequest
          && ts.isVariableDeclaration(node.parent)
          && node.parent.initializer === node
        ) preparationCallees.push(call.expression.text);
      }
      ts.forEachChild(node, findPreparationCallee);
    };
    findPreparationCallee(preparation);
    expect(preparationCallees).toHaveLength(1);
    const payloadPreparation = file.statements.find((statement): statement is ts.FunctionDeclaration => (
      ts.isFunctionDeclaration(statement) && statement.name?.text === preparationCallees[0]
    ));
    expect(payloadPreparation, 'structurally discovered preparation helper must exist').toBeDefined();
    const fill = namedFunction('fillEmptyReviewedFields');
    expect(payloadPreparation!.body).toBeDefined();
    expect(preparation.body).toBeDefined();
    expect(fill.body).toBeDefined();
    expect(analyzePayloadFreeFillPreparation(source)).toEqual([]);

    const replaceExactlyOnce = (
      input: string,
      anchor: string,
      replacement: string,
      label: string,
    ) => {
      expect(input.split(anchor), `${label} anchor count`).toHaveLength(2);
      const mutated = input.replace(anchor, replacement);
      expect(mutated, `${label} insertion anchor`).not.toBe(input);
      return mutated;
    };
    const analyzeMutation = (mutated: string, label: string, typecheck = false) => {
      const parsed = ts.createSourceFile(
        `${label}.mutation.ts`,
        mutated,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const diagnostics = (parsed as ts.SourceFile & {
        readonly parseDiagnostics: readonly ts.Diagnostic[];
      }).parseDiagnostics;
      expect.soft(diagnostics, `${label} parse diagnostics`).toEqual([]);
      if (typecheck) {
        expect.soft(
          serviceWorkerProgramDiagnostics(mutated),
          `${label} extension-program diagnostics`,
        ).toEqual([]);
      }
      return analyzePayloadFreeFillPreparation(mutated);
    };

    const armingNames: string[] = [];
    const collectArmingRoot = (node: ts.Node) => {
      if (ts.isFunctionLike(node) && node !== payloadPreparation) return;
      if (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.type?.getText(file) === 'ArmingSessionStateV1'
      ) armingNames.push(node.name.text);
      ts.forEachChild(node, collectArmingRoot);
    };
    collectArmingRoot(payloadPreparation!);
    expect(armingNames).toHaveLength(1);
    const armingName = armingNames[0]!;
    const schemaOriginMutation = replaceExactlyOnce(
      source,
      [
        '  const consuming: ConsumingSessionStateV1 = Object.freeze({',
        '    schema: SESSION_STATE_SCHEMA,',
      ].join('\n'),
      [
        '  const consuming: ConsumingSessionStateV1 = Object.freeze({',
        `    schema: ${armingName}.schema,`,
      ].join('\n'),
      'consuming schema origin',
    );
    expect.soft(analyzeMutation(schemaOriginMutation, 'consuming schema origin')).toContain(
      'inner consuming tuple property "schema" has an invalid origin',
    );
    const stateOriginMutation = replaceExactlyOnce(
      source,
      [
        '  const consuming: ConsumingSessionStateV1 = Object.freeze({',
        '    schema: SESSION_STATE_SCHEMA,',
        "    state: 'consuming',",
      ].join('\n'),
      [
        '  const consuming: ConsumingSessionStateV1 = Object.freeze({',
        '    schema: SESSION_STATE_SCHEMA,',
        "    state: 'arming',",
      ].join('\n'),
      'consuming state origin',
    );
    expect.soft(analyzeMutation(stateOriginMutation, 'consuming state origin')).toContain(
      'inner consuming tuple property "state" has an invalid origin',
    );
    for (const [property, validOrigin, invalidOrigin] of [
      ['generation', `${armingName}.generation`, `${armingName}.envelope.packId`],
      ['armNonce', `${armingName}.armNonce`, `${armingName}.attemptId`],
      ['packId', `${armingName}.envelope.packId`, `${armingName}.generation`],
      ['attemptId', `${armingName}.attemptId`, `${armingName}.envelope.resultRevisionId`],
      ['replayUntil', `${armingName}.replayUntil`, `${armingName}.attemptNotAfterMs`],
      ['attemptNotAfterMs', `${armingName}.attemptNotAfterMs`, `${armingName}.replayUntil`],
      ['destinationTabId', `${armingName}.destination.destinationTabId`, `${armingName}.sourceTabId`],
      [
        'destinationDocumentId',
        `${armingName}.destination.destinationDocumentId`,
        `${armingName}.sourceDocumentId`,
      ],
    ] as const) {
      const label = `consuming ${property} origin`;
      const originMutation = replaceExactlyOnce(
        source,
        `    ${property}: ${validOrigin},`,
        `    ${property}: ${invalidOrigin},`,
        label,
      );
      expect.soft(analyzeMutation(originMutation, label), label).toContain(
        `inner consuming tuple property "${property}" has an invalid origin`,
      );
    }

    const alternateSourceBindingMutation = replaceExactlyOnce(
      source,
      '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
      [
        '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(',
        '    lifecycle.session as StagedSessionStateV1,',
        '  );',
      ].join('\n'),
      'alternate source-binding staged root',
    );
    expect.soft(
      analyzeMutation(alternateSourceBindingMutation, 'alternate source-binding staged root'),
    ).toContain('inner sourceAuthorization has an invalid staged origin');

    const alternateImportedTimeMutation = replaceExactlyOnce(
      source,
      '  const sourceImportedAtMs = staged.importedAtMs;',
      [
        '  const sourceImportedAtMs =',
        '    (lifecycle.session as StagedSessionStateV1).importedAtMs;',
      ].join('\n'),
      'alternate imported-time staged root',
    );
    expect.soft(
      analyzeMutation(alternateImportedTimeMutation, 'alternate imported-time staged root'),
    ).toContain('inner sourceImportedAtMs has an invalid staged origin');

    const alternateFillStagedInputsMutation = replaceExactlyOnce(
      source,
      [
        '    envelope: staged.envelope,',
        '    effectiveExpiresAtMs: staged.effectiveExpiresAtMs,',
      ].join('\n'),
      [
        '    envelope: (lifecycle.session as StagedSessionStateV1).envelope,',
        '    effectiveExpiresAtMs:',
        '      (lifecycle.session as StagedSessionStateV1).effectiveExpiresAtMs,',
      ].join('\n'),
      'alternate fill-plan staged inputs',
    );
    expect.soft(
      analyzeMutation(alternateFillStagedInputsMutation, 'alternate fill-plan staged inputs'),
    ).toContain('inner fillPlan has invalid staged inputs');

    const alternateFillAttemptInputsMutation = replaceExactlyOnce(
      source,
      [
        '  const fillBuilt = buildDestinationFillPlan({',
        '    envelope: staged.envelope,',
        '    effectiveExpiresAtMs: staged.effectiveExpiresAtMs,',
        '    operationNotAfterMs: attemptNotAfterMs,',
        '    attemptId,',
      ].join('\n'),
      [
        '  const alternateAttemptDeadline = staged.effectiveExpiresAtMs;',
        '  const alternateAttemptId = staged.envelope.resultRevisionId;',
        '  const fillBuilt = buildDestinationFillPlan({',
        '    envelope: staged.envelope,',
        '    effectiveExpiresAtMs: staged.effectiveExpiresAtMs,',
        '    operationNotAfterMs: alternateAttemptDeadline,',
        '    attemptId: alternateAttemptId,',
      ].join('\n'),
      'alternate fill-plan attempt inputs',
    );
    expect.soft(
      analyzeMutation(alternateFillAttemptInputsMutation, 'alternate fill-plan attempt inputs'),
    ).toContain('inner fillPlan has invalid attempt inputs');

    const computedArmingOverrideMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        '  const arming: ArmingSessionStateV1 = Object.freeze({',
        [
          "  const computedAttemptKey = ['attempt', 'Id'].join('');",
          '  const arming: ArmingSessionStateV1 = Object.freeze({',
        ].join('\n'),
        'computed spread arming key',
      ),
      [
        '    attemptId,',
        '    replayUntil: staged.effectiveExpiresAtMs,',
      ].join('\n'),
      [
        '    attemptId,',
        '    ...{ [computedAttemptKey]: staged.envelope.resultRevisionId },',
        '    replayUntil: staged.effectiveExpiresAtMs,',
      ].join('\n'),
      'computed spread arming override',
    );
    expect.soft(
      analyzeMutation(computedArmingOverrideMutation, 'computed spread arming override', true),
    ).toContain('inner arming object has invalid durable shape or origins');

    const alternateLifecycleMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        [
          "): Promise<WorkerResponseV1 | PreparedFillDispatch> {",
          '  const lifecycle = await reconcileLifecycle();',
          '  const blocker = fixedBlocker(request.command, lifecycle);',
        ].join('\n'),
        [
          "): Promise<WorkerResponseV1 | PreparedFillDispatch> {",
          '  const lifecycle = await reconcileLifecycle();',
          '  const alternateLifecycle = await reconcileLifecycle();',
          "  if (alternateLifecycle.status !== 'ready') {",
          "    return buildFixedWorkerResponse(request.command, 'quarantined');",
          '  }',
          '  const blocker = fixedBlocker(request.command, lifecycle);',
        ].join('\n'),
        'alternate lifecycle declaration',
      ),
      "  const staged = lifecycle.session?.state === 'staged' ? lifecycle.session : null;",
      [
        "  const staged = alternateLifecycle.session?.state === 'staged'",
        '    ? alternateLifecycle.session',
        '    : null;',
      ].join('\n'),
      'alternate lifecycle staged root',
    );
    expect.soft(
      analyzeMutation(alternateLifecycleMutation, 'alternate lifecycle staged root', true),
    ).toContain('inner staged root has an invalid canonical lifecycle origin');

    const sourceBindingShadowMutation = replaceExactlyOnce(
      source,
      '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
      [
        '  function sourceBinding(',
        '    session: StagedSessionStateV1 | ArmingSessionStateV1,',
        '  ): SourcePreviewBindingV1 {',
        '    return Object.freeze({',
        "      schema: 'challansakshi.source-preview-binding/v1',",
        '      sourceTabId: session.sourceTabId,',
        '      sourceDocumentId: session.sourceDocumentId,',
        '      canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(session.envelope),',
        '      previewNotAfterMs: Date.parse(session.envelope.expiresAt),',
        '    });',
        '  }',
        '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
      ].join('\n'),
      'local sourceBinding shadow',
    );
    expect.soft(
      analyzeMutation(sourceBindingShadowMutation, 'local sourceBinding shadow', true),
    ).toContain('inner sourceAuthorization helper is shadowed or noncanonical');

    const fillBuilderShadowMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        '  const fillBuilt = buildDestinationFillPlan({',
        [
          '  const canonicalFillPlanBuilder = buildDestinationFillPlan;',
          '  {',
          '    const buildDestinationFillPlan = canonicalFillPlanBuilder;',
          '    const fillBuilt = buildDestinationFillPlan({',
        ].join('\n'),
        'local fill-plan builder shadow declaration',
      ),
      '    sourceImportedAtMs,\n  });\n}\n\nasync function prepareFillDispatch(',
      [
        '    sourceImportedAtMs,',
        '  });',
        '  }',
        '}',
        '',
        'async function prepareFillDispatch(',
      ].join('\n'),
      'local fill-plan builder shadow scope',
    );
    expect.soft(
      analyzeMutation(fillBuilderShadowMutation, 'local fill-plan builder shadow', true),
    ).toContain('inner fillPlan helper is shadowed or noncanonical');

    const sessionWriterShadowMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        '  const arming: ArmingSessionStateV1 = Object.freeze({',
        [
          '  const canonicalSessionWriter = writeSessionState;',
          '  {',
          '    const writeSessionState = canonicalSessionWriter;',
          '    const arming: ArmingSessionStateV1 = Object.freeze({',
        ].join('\n'),
        'local session writer shadow declaration',
      ),
      '    sourceImportedAtMs,\n  });\n}\n\nasync function prepareFillDispatch(',
      [
        '    sourceImportedAtMs,',
        '  });',
        '  }',
        '}',
        '',
        'async function prepareFillDispatch(',
      ].join('\n'),
      'local session writer shadow scope',
    );
    expect.soft(
      analyzeMutation(sessionWriterShadowMutation, 'local session writer shadow', true),
    ).toContain('inner session write helper is shadowed or noncanonical');

    for (const [label, anchor, replacement, diagnostic] of [
      [
        'nonce input substitution',
        '  const armNonce = newOpaque([staged.generation, staged.envelope.packId]);',
        '  const armNonce = newOpaque([staged.envelope.packId, staged.generation]);',
        'inner armNonce has an invalid canonical origin',
      ],
      [
        'attempt ID input substitution',
        "  const attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        '  const attemptId = newOpaque([staged.generation, staged.envelope.packId, staged.generation]);',
        'inner attemptId has an invalid canonical origin',
      ],
      [
        'attempt deadline input substitution',
        [
          '  const attemptNotAfterMs = nextOperationDeadline(',
          '    attemptedAtMs,',
          '    staged.effectiveExpiresAtMs,',
          '    adapterExpiresAtMs,',
          '  );',
        ].join('\n'),
        [
          '  const attemptNotAfterMs = nextOperationDeadline(',
          '    adapterExpiresAtMs,',
          '    staged.effectiveExpiresAtMs,',
          '    attemptedAtMs,',
          '  );',
        ].join('\n'),
        'inner attemptNotAfterMs has an invalid canonical origin',
      ],
    ] as const) {
      const generatedOriginMutation = replaceExactlyOnce(source, anchor, replacement, label);
      expect.soft(analyzeMutation(generatedOriginMutation, label, true), label).toContain(diagnostic);
    }

    const objectShadowMutation = replaceExactlyOnce(
      source,
      "declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__:",
      [
        'const Object = globalThis.Object;',
        '',
        "declare const __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__:",
      ].join('\n'),
      'file-scope Object shadow',
    );
    expect.soft(analyzeMutation(objectShadowMutation, 'file-scope Object shadow', true)).toContain(
      'Object.freeze intrinsic is shadowed or noncanonical',
    );

    const expectDurabilitySuffixRejection = (mutated: string, label: string) => {
      expect.soft(analyzeMutation(mutated, label, true), label).toContain(
        'inner durability suffix does not match closed grammar',
      );
    };
    const decoyArmingWriteMutation = replaceExactlyOnce(
      source,
      '  const armedSession = await writeSessionState(arming);',
      [
        '  const decoyArmedSession = await writeSessionState(arming);',
        '  const armedSession = await writeSessionState(staged);',
      ].join('\n'),
      'decoy arming write with wrong checked write',
    );
    expectDurabilitySuffixRejection(
      decoyArmingWriteMutation,
      'decoy arming write with wrong checked write',
    );
    const decoyConsumingWriteMutation = replaceExactlyOnce(
      source,
      '  const consumed = await writeSessionState(consuming);',
      [
        '  const decoyConsumed = await writeSessionState(consuming);',
        '  const consumed = await writeSessionState(staged);',
      ].join('\n'),
      'decoy consuming write with wrong checked write',
    );
    expectDurabilitySuffixRejection(
      decoyConsumingWriteMutation,
      'decoy consuming write with wrong checked write',
    );

    for (const [label, anchor, replacement] of [
      [
        'false-gated arming readback',
        "  if (armedSession.status !== 'ready' || armedSession.session?.state !== 'arming') {",
        "  if ((armedSession.status !== 'ready' || armedSession.session?.state !== 'arming') && Boolean(0)) {",
      ],
      [
        'false-gated armed ledger',
        "  if (armedLedger.status !== 'confirmed') {",
        "  if (false && armedLedger.status !== 'confirmed') {",
      ],
      [
        'false-gated consuming readback',
        "  if (consumed.status !== 'ready' || consumed.session?.state !== 'consuming') {",
        "  if ((consumed.status !== 'ready' || consumed.session?.state !== 'consuming') && false) {",
      ],
    ] as const) {
      expectDurabilitySuffixRejection(
        replaceExactlyOnce(source, anchor, replacement, label),
        label,
      );
    }

    const shadowDurabilityHelper = (name: string) => replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        '  const arming: ArmingSessionStateV1 = Object.freeze({',
        [
          `  const canonical${name[0]!.toUpperCase()}${name.slice(1)} = ${name};`,
          '  {',
          `    const ${name} = canonical${name[0]!.toUpperCase()}${name.slice(1)};`,
          '    const arming: ArmingSessionStateV1 = Object.freeze({',
        ].join('\n'),
        `${name} shadow declaration`,
      ),
      '    sourceImportedAtMs,\n  });\n}\n\nasync function prepareFillDispatch(',
      [
        '    sourceImportedAtMs,',
        '  });',
        '  }',
        '}',
        '',
        'async function prepareFillDispatch(',
      ].join('\n'),
      `${name} shadow scope`,
    );
    for (const helper of [
      'liveFromSession',
      'readyLedger',
      'armUnresolvedLive',
      'cancelBeforeDispatch',
      'buildFixedWorkerResponse',
      'buildRejectedWorkerResponse',
    ] as const) {
      expectDurabilitySuffixRejection(
        shadowDurabilityHelper(helper),
        `${helper} local shadow`,
      );
    }

    const wrongLedgerResultMutation = replaceExactlyOnce(
      source,
      '  const armedLedger = await armUnresolvedLive(readyLedger(lifecycle.ledger), live);',
      [
        '  const canonicalArmedLedger =',
        '    await armUnresolvedLive(readyLedger(lifecycle.ledger), live);',
        '  const armedLedger = await Promise.resolve(canonicalArmedLedger);',
      ].join('\n'),
      'wrong armed-ledger result declaration',
    );
    expectDurabilitySuffixRejection(
      wrongLedgerResultMutation,
      'wrong armed-ledger result declaration',
    );

    const wrongLiveRootMutation = replaceExactlyOnce(
      source,
      '  const live = liveFromSession(arming);',
      [
        '  const armingAlias: ArmingSessionStateV1 = arming;',
        '  const decoyLive = liveFromSession(arming);',
        '  const live = liveFromSession(armingAlias);',
      ].join('\n'),
      'wrong live root with decoy correct call',
    );
    expectDurabilitySuffixRejection(
      wrongLiveRootMutation,
      'wrong live root with decoy correct call',
    );

    const wrongLedgerRootMutation = replaceExactlyOnce(
      source,
      '  const armedLedger = await armUnresolvedLive(readyLedger(lifecycle.ledger), live);',
      [
        '  const alternateLedger = lifecycle.ledger;',
        '  const armedLedger = await armUnresolvedLive(readyLedger(alternateLedger), live);',
      ].join('\n'),
      'wrong lifecycle ledger root',
    );
    expectDurabilitySuffixRejection(wrongLedgerRootMutation, 'wrong lifecycle ledger root');

    const wrongCancellationRootMutation = replaceExactlyOnce(
      source,
      [
        '    const cancelled = await cancelBeforeDispatch(',
        '      arming,',
        "      buildRejectedWorkerResponse(request.command, 'operation-failed'),",
        '    );',
      ].join('\n'),
      [
        '    const cancellationAlias: ArmingSessionStateV1 = arming;',
        '    const decoyCancelled = await cancelBeforeDispatch(',
        '      arming,',
        "      buildRejectedWorkerResponse(request.command, 'operation-failed'),",
        '    );',
        '    const cancelled = await cancelBeforeDispatch(',
        '      cancellationAlias,',
        "      buildRejectedWorkerResponse(request.command, 'operation-failed'),",
        '    );',
      ].join('\n'),
      'wrong cancellation root with decoy correct call',
    );
    expectDurabilitySuffixRejection(
      wrongCancellationRootMutation,
      'wrong cancellation root with decoy correct call',
    );

    const insertedSuffixStatementMutation = replaceExactlyOnce(
      source,
      [
        '  if (consumed.status !== \'ready\' || consumed.session?.state !== \'consuming\') {',
        "    return cancelBeforeDispatch(arming, buildRejectedWorkerResponse(request.command, 'operation-failed'));",
        '  }',
        '  return Object.freeze({',
      ].join('\n'),
      [
        '  if (consumed.status !== \'ready\' || consumed.session?.state !== \'consuming\') {',
        "    return cancelBeforeDispatch(arming, buildRejectedWorkerResponse(request.command, 'operation-failed'));",
        '  }',
        '  void consuming.attemptId;',
        '  return Object.freeze({',
      ].join('\n'),
      'inserted statement before prepared return',
    );
    expectDurabilitySuffixRejection(
      insertedSuffixStatementMutation,
      'inserted statement before prepared return',
    );

    const expectAuthoritativeImmutabilityRejection = (mutated: string, label: string) => {
      expect.soft(analyzeMutation(mutated, label, true), label).toContain(
        'inner authoritative roles must be immutable direct const declarations',
      );
    };
    for (const [label, declarationAnchor, mutableDeclaration, reassignment] of [
      [
        'attempt ID reassignment',
        "  const attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        "  let attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        '  attemptId = staged.envelope.resultRevisionId;',
      ],
      [
        'nonce reassignment',
        '  const armNonce = newOpaque([staged.generation, staged.envelope.packId]);',
        '  let armNonce = newOpaque([staged.generation, staged.envelope.packId]);',
        '  armNonce = staged.envelope.resultRevisionId;',
      ],
      [
        'attempt deadline reassignment',
        '  const attemptNotAfterMs = nextOperationDeadline(',
        '  let attemptNotAfterMs = nextOperationDeadline(',
        '  attemptNotAfterMs = staged.effectiveExpiresAtMs;',
      ],
    ] as const) {
      const mutableRole = replaceExactlyOnce(source, declarationAnchor, mutableDeclaration, label);
      const reassignedRole = replaceExactlyOnce(
        mutableRole,
        '  const arming: ArmingSessionStateV1 = Object.freeze({',
        `${reassignment}\n  const arming: ArmingSessionStateV1 = Object.freeze({`,
        `${label} write`,
      );
      expectAuthoritativeImmutabilityRejection(reassignedRole, label);
    }

    const lifecycleReassignmentMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        [
          '): Promise<WorkerResponseV1 | PreparedFillDispatch> {',
          '  const lifecycle = await reconcileLifecycle();',
          '  const blocker = fixedBlocker(request.command, lifecycle);',
        ].join('\n'),
        [
          '): Promise<WorkerResponseV1 | PreparedFillDispatch> {',
          '  let lifecycle = await reconcileLifecycle();',
          '  const blocker = fixedBlocker(request.command, lifecycle);',
        ].join('\n'),
        'mutable canonical lifecycle',
      ),
      '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
      [
        '  const replacementLifecycle = await reconcileLifecycle();',
        "  if (replacementLifecycle.status !== 'ready') {",
        "    return buildFixedWorkerResponse(request.command, 'quarantined');",
        '  }',
        '  lifecycle = replacementLifecycle;',
        '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
      ].join('\n'),
      'canonical lifecycle reassignment',
    );
    expectAuthoritativeImmutabilityRejection(
      lifecycleReassignmentMutation,
      'canonical lifecycle reassignment',
    );

    for (const [label, declarationAnchor, mutableDeclaration, reassignment] of [
      [
        'source authorization reassignment',
        '  const sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
        '  let sourceAuthorization: SourcePreviewBindingV1 = sourceBinding(staged);',
        '  sourceAuthorization = sourceBinding(arming);',
      ],
      [
        'source imported time reassignment',
        '  const sourceImportedAtMs = staged.importedAtMs;',
        '  let sourceImportedAtMs = staged.importedAtMs;',
        '  sourceImportedAtMs = arming.importedAtMs;',
      ],
    ] as const) {
      const mutableRole = replaceExactlyOnce(source, declarationAnchor, mutableDeclaration, label);
      const reassignedRole = replaceExactlyOnce(
        mutableRole,
        [
          "    return cancelBeforeDispatch(arming, buildRejectedWorkerResponse(request.command, 'operation-failed'));",
          '  }',
          '  return Object.freeze({',
        ].join('\n'),
        [
          "    return cancelBeforeDispatch(arming, buildRejectedWorkerResponse(request.command, 'operation-failed'));",
          '  }',
          reassignment,
          '  return Object.freeze({',
        ].join('\n'),
        `${label} write`,
      );
      expectAuthoritativeImmutabilityRejection(reassignedRole, label);
    }

    for (const [label, write] of [
      [
        'authoritative property write',
        '  (arming as unknown as { attemptId: string }).attemptId = staged.envelope.resultRevisionId;',
      ],
      [
        'authoritative element write',
        "  (arming as unknown as Record<string, unknown>)['attemptId'] = staged.envelope.resultRevisionId;",
      ],
      [
        'authoritative property delete',
        '  delete (arming as unknown as { attemptId?: string }).attemptId;',
      ],
    ] as const) {
      const objectWriteMutation = replaceExactlyOnce(
        source,
        '  const live = liveFromSession(arming);',
        `${write}\n  const live = liveFromSession(arming);`,
        label,
      );
      expectAuthoritativeImmutabilityRejection(objectWriteMutation, label);
    }

    for (const [label, write] of [
      ['authoritative scalar update', '  attemptNotAfterMs++;'],
      ['authoritative scalar compound assignment', '  attemptNotAfterMs += 1;'],
    ] as const) {
      const mutableDeadline = replaceExactlyOnce(
        source,
        '  const attemptNotAfterMs = nextOperationDeadline(',
        '  let attemptNotAfterMs = nextOperationDeadline(',
        `${label} declaration`,
      );
      const scalarWriteMutation = replaceExactlyOnce(
        mutableDeadline,
        '  const armNonce = newOpaque([staged.generation, staged.envelope.packId]);',
        `${write}\n  const armNonce = newOpaque([staged.generation, staged.envelope.packId]);`,
        label,
      );
      expectAuthoritativeImmutabilityRejection(scalarWriteMutation, label);
    }

    for (const [label, write] of [
      [
        'authoritative scalar logical assignment',
        '  attemptId ||= staged.envelope.resultRevisionId;',
      ],
      [
        'authoritative scalar destructuring assignment',
        '  ({ attemptId } = { attemptId: staged.envelope.resultRevisionId });',
      ],
    ] as const) {
      const mutableAttemptId = replaceExactlyOnce(
        source,
        "  const attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        "  let attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        `${label} declaration`,
      );
      const scalarWriteMutation = replaceExactlyOnce(
        mutableAttemptId,
        '  const fillBuilt = buildDestinationFillPlan({',
        `${write}\n  const fillBuilt = buildDestinationFillPlan({`,
        label,
      );
      expectAuthoritativeImmutabilityRejection(scalarWriteMutation, label);
    }

    const multipleDeclarationMutation = replaceExactlyOnce(
      source,
      '  const attemptedAtMs = Date.now();',
      '  const attemptedAtMs = Date.now(), attemptedAtWitness = attemptedAtMs;',
      'authoritative multi-declaration statement',
    );
    expectAuthoritativeImmutabilityRejection(
      multipleDeclarationMutation,
      'authoritative multi-declaration statement',
    );

    const transitiveAliasWriteMutation = replaceExactlyOnce(
      source,
      '  const live = liveFromSession(arming);',
      [
        '  const durableAlias = arming;',
        '  const envelopeAlias = durableAlias.envelope;',
        "  (envelopeAlias as unknown as { packId: string }).packId = 'aliased-pack';",
        '  const live = liveFromSession(arming);',
      ].join('\n'),
      'transitive authoritative alias write',
    );
    expectAuthoritativeImmutabilityRejection(
      transitiveAliasWriteMutation,
      'transitive authoritative alias write',
    );

    const authoritativeCallSinkMutation = replaceExactlyOnce(
      source,
      '  const live = liveFromSession(arming);',
      '  void JSON.stringify(arming);\n  const live = liveFromSession(arming);',
      'authoritative call sink',
    );
    expectAuthoritativeImmutabilityRejection(
      authoritativeCallSinkMutation,
      'authoritative call sink',
    );

    const authoritativeClosureEscapeMutation = replaceExactlyOnce(
      source,
      '  const live = liveFromSession(arming);',
      [
        '  const readDurableLater = () => arming;',
        '  void readDurableLater;',
        '  const live = liveFromSession(arming);',
      ].join('\n'),
      'authoritative closure escape',
    );
    expectAuthoritativeImmutabilityRejection(
      authoritativeClosureEscapeMutation,
      'authoritative closure escape',
    );

    const authoritativeForOfWriteMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        "  const attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        "  let attemptId = newOpaque([staged.generation, staged.envelope.packId, armNonce ?? '']);",
        'authoritative for-of declaration',
      ),
      '  const fillBuilt = buildDestinationFillPlan({',
      [
        '  for (attemptId of [staged.envelope.resultRevisionId]) {',
        '    break;',
        '  }',
        '  const fillBuilt = buildDestinationFillPlan({',
      ].join('\n'),
      'authoritative for-of write',
    );
    expectAuthoritativeImmutabilityRejection(
      authoritativeForOfWriteMutation,
      'authoritative for-of write',
    );

    const renamedAliasMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  const freshlyNamedCarrier = (prepared as unknown as { envelope: unknown }).envelope;',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'renamed alias',
    );
    const mutationIssues = analyzeMutation(renamedAliasMutation, 'renamed alias');
    expect(mutationIssues).toContain(
      'outer statements do not match closed preparation grammar',
    );
    const nestedPayloadMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  const freshlyNamedValues = prepared.fillPlan.values;',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'nested fill-plan values',
    );
    expect(analyzeMutation(nestedPayloadMutation, 'nested fill-plan values')).toContain(
      'outer statements do not match closed preparation grammar',
    );
    const returnedPayloadMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  if (request.actionTabId < 0) {',
        '    return (prepared as unknown as { envelope: WorkerResponseV1 }).envelope;',
        '  }',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'direct payload return',
    );
    expect(analyzeMutation(returnedPayloadMutation, 'direct payload return')).toContain(
      'outer statements do not match closed preparation grammar',
    );
    const objectDestructuringMutation = replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
        [
          '  const { envelope: objectCarrier } = prepared as unknown as { envelope: unknown };',
          '  prepared = null;',
          '  await clearAlarm(SESSION_EXPIRY_ALARM);',
        ].join('\n'),
        'object destructuring declaration',
      ),
      '  await clearAlarm(ATTEMPT_WATCHDOG_ALARM);',
      '  await clearAlarm(ATTEMPT_WATCHDOG_ALARM);\n  void objectCarrier;',
      'object destructuring read',
    );
    expect.soft(analyzeMutation(objectDestructuringMutation, 'object destructuring')).toContain(
      'outer binding patterns are forbidden',
    );
    const arrayDestructuringMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  const [arrayCarrier] = prepared as unknown as readonly [unknown];',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'array destructuring',
    );
    expect.soft(analyzeMutation(arrayDestructuringMutation, 'array destructuring')).toContain(
      'outer binding patterns are forbidden',
    );
    const propertySinkMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  (request as unknown as { parked: unknown }).parked =',
        '    (prepared as unknown as { envelope: unknown }).envelope;',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'request property sink',
    );
    expect.soft(analyzeMutation(propertySinkMutation, 'request property sink')).toContain(
      'outer assignment target must be a declared direct local',
    );
    const elementSinkMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        "  (request as unknown as Record<string, unknown>)['parked'] =",
        '    (prepared as unknown as { envelope: unknown }).envelope;',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'request element sink',
    );
    expect.soft(analyzeMutation(elementSinkMutation, 'request element sink')).toContain(
      'outer assignment target must be a declared direct local',
    );
    const nestedCaptureMutation = replaceExactlyOnce(
      source,
      '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
      [
        '  const captureRoot = () => prepared;',
        '  prepared = null;',
        '  await clearAlarm(SESSION_EXPIRY_ALARM);',
      ].join('\n'),
      'nested closure capture',
    );
    expect.soft(analyzeMutation(nestedCaptureMutation, 'nested closure capture')).toContain(
      'outer nested functions are forbidden',
    );
    const extraInnerMemberMutation = replaceExactlyOnce(
      source,
      '    sourceImportedAtMs,\n  });\n}\n\nasync function prepareFillDispatch(',
      [
        '    sourceImportedAtMs,',
        '    parkedEnvelope: staged.envelope,',
        '  });',
        '}',
        '',
        'async function prepareFillDispatch(',
      ].join('\n'),
      'extra inner success member',
    );
    expect.soft(analyzeMutation(extraInnerMemberMutation, 'extra inner success member')).toContain(
      'inner success return must be the exact closed prepared bundle',
    );
    const extraOuterMemberMutation = replaceExactlyOnce(
      source,
      '    sourceImportedAtMs,\n  });\n}\n\nasync function fillEmptyReviewedFields(',
      [
        '    sourceImportedAtMs,',
        '    parkedValues: fillPlan.values,',
        '  });',
        '}',
        '',
        'async function fillEmptyReviewedFields(',
      ].join('\n'),
      'extra outer success member',
    );
    expect.soft(analyzeMutation(extraOuterMemberMutation, 'extra outer success member')).toContain(
      'outer statements do not match closed preparation grammar',
    );
    const renamedInnerMutation = source.replaceAll(
      'preparePayloadBearingFill',
      'structurallyRenamedPreparation',
    );
    expect(renamedInnerMutation).not.toBe(source);
    expect.soft(analyzeMutation(renamedInnerMutation, 'renamed inner helper')).toEqual([]);
    for (const [label, insertedSyntax] of [
      [
        'call sink',
        '  capturePayload((prepared as unknown as { envelope: unknown }).envelope);',
      ],
      [
        'aggregate held across await',
        [
          '  void {',
          '    parked: (prepared as unknown as { envelope: unknown }).envelope,',
          '    resumed: await clearAlarm(SESSION_EXPIRY_ALARM),',
          '  };',
        ].join('\n'),
      ],
      [
        'try finally pending completion',
        [
          '  try {',
          '    return (prepared as unknown as { envelope: WorkerResponseV1 }).envelope;',
          '  } finally {',
          '    await clearAlarm(SESSION_EXPIRY_ALARM);',
          '  }',
        ].join('\n'),
      ],
      [
        'class static storage',
        [
          '  class PayloadStore {',
          '    static parked = (prepared as unknown as { envelope: unknown }).envelope;',
          '  }',
        ].join('\n'),
      ],
    ] as const) {
      const implicitStorageMutation = replaceExactlyOnce(
        source,
        '  prepared = null;\n  await clearAlarm(SESSION_EXPIRY_ALARM);',
        [insertedSyntax, '  prepared = null;', '  await clearAlarm(SESSION_EXPIRY_ALARM);'].join('\n'),
        label,
      );
      expect(analyzeMutation(implicitStorageMutation, label), label).toContain(
        'outer statements do not match closed preparation grammar',
      );
    }

    const expectAuthoritativeOutboundRejection = (mutated: string, label: string) => {
      expect.soft(analyzeMutation(mutated, label, true), label).toContain(
        'inner authoritative values must not escape certified outbound flow',
      );
    };
    const insertBeforeArming = (inserted: string, label: string) => replaceExactlyOnce(
      source,
      '  const arming: ArmingSessionStateV1 = Object.freeze({',
      `${inserted}\n  const arming: ArmingSessionStateV1 = Object.freeze({`,
      label,
    );

    for (const [label, inserted] of [
      [
        'authoritative request property RHS',
        '  (request as unknown as { parked: unknown }).parked = staged;',
      ],
      [
        'authoritative for-of carrier',
        [
          '  for (const survivor of [staged]) {',
          '    (request as unknown as { parked: unknown }).parked = survivor;',
          '  }',
        ].join('\n'),
      ],
      [
        'authoritative aggregate across await',
        [
          '  void Object.freeze({',
          '    parked: staged,',
          '    resumed: await clearAlarm(SESSION_EXPIRY_ALARM),',
          '  });',
        ].join('\n'),
      ],
      [
        'authoritative class storage',
        [
          '  class PayloadVault {',
          '    static parked = lifecycle;',
          '    [staged!.envelope.packId]() { return staged; }',
          '  }',
          '  void PayloadVault;',
        ].join('\n'),
      ],
      ['authoritative call sink', '  void JSON.stringify(staged);'],
      [
        'authoritative constructor sink',
        '  void new (class { constructor(_value: unknown) {} })(staged);',
      ],
      [
        'authoritative tagged-template sink',
        [
          '  void String.raw(',
          "    { raw: [''] } as unknown as TemplateStringsArray,",
          '    staged as unknown as string,',
          '  );',
        ].join('\n'),
      ],
      ['authoritative dynamic-import sink', '  void import(staged as unknown as string);'],
      [
        'authoritative aggregate carriers',
        [
          '  void [staged];',
          '  void { parked: staged };',
          '  void { ...(staged as unknown as Record<string, unknown>) };',
          '  void `${staged as unknown as string}`;',
        ].join('\n'),
      ],
      [
        'authoritative return throw finally sinks',
        [
          '  try {',
          '    if (request.actionTabId < 0) return staged as unknown as WorkerResponseV1;',
          '    if (request.actionTabId < -1) throw lifecycle;',
          '  } finally {',
          '    await Promise.resolve();',
          '  }',
        ].join('\n'),
      ],
      [
        'authoritative closure capture',
        [
          '  const retainStaged = () => staged;',
          '  void retainStaged;',
        ].join('\n'),
      ],
      [
        'authoritative direct assignment RHS',
        [
          '  let parkedDirect: unknown;',
          '  parkedDirect = staged;',
          '  void parkedDirect;',
        ].join('\n'),
      ],
      [
        'authoritative alias assignment RHS',
        [
          '  const renamedDurableCarrier = staged;',
          '  let parkedAlias: unknown;',
          '  parkedAlias = renamedDurableCarrier;',
          '  void parkedAlias;',
        ].join('\n'),
      ],
      [
        'authoritative projection assignment RHS',
        [
          '  const renamedEnvelopeCarrier = staged.envelope;',
          '  let parkedProjection: unknown;',
          '  parkedProjection = renamedEnvelopeCarrier;',
          '  void parkedProjection;',
        ].join('\n'),
      ],
    ] as const) {
      expectAuthoritativeOutboundRejection(insertBeforeArming(inserted, label), label);
    }

    const shadowPrefixHelper = (name: string) => replaceExactlyOnce(
      replaceExactlyOnce(
        source,
        [
          "): Promise<WorkerResponseV1 | PreparedFillDispatch> {",
          '  const lifecycle = await reconcileLifecycle();',
        ].join('\n'),
        [
          "): Promise<WorkerResponseV1 | PreparedFillDispatch> {",
          `  const canonical${name[0]!.toUpperCase()}${name.slice(1)} = ${name};`,
          '  {',
          `    const ${name} = canonical${name[0]!.toUpperCase()}${name.slice(1)};`,
          '    const lifecycle = await reconcileLifecycle();',
        ].join('\n'),
        `${name} outbound shadow declaration`,
      ),
      '    sourceImportedAtMs,\n  });\n}\n\nasync function prepareFillDispatch(',
      [
        '    sourceImportedAtMs,',
        '  });',
        '  }',
        '}',
        '',
        'async function prepareFillDispatch(',
      ].join('\n'),
      `${name} outbound shadow scope`,
    );
    for (const helper of ['fixedBlocker', 'actionTabMatches', 'runSourceReprobe'] as const) {
      expect.soft(
        analyzeMutation(shadowPrefixHelper(helper), `${helper} outbound shadow`, true),
        `${helper} outbound shadow`,
      ).toContain('inner authoritative call helper is shadowed or noncanonical');
    }

    const extraCanonicalCallMutation = insertBeforeArming(
      '  void fixedBlocker(request.command, lifecycle);',
      'extra canonical authoritative call',
    );
    expectAuthoritativeOutboundRejection(
      extraCanonicalCallMutation,
      'extra canonical authoritative call',
    );

    const preparedReturns: string[][] = [];
    const collectPreparedReturns = (node: ts.Node) => {
      if (
        ts.isReturnStatement(node)
        && node.expression
        && ts.isCallExpression(node.expression)
        && node.expression.arguments.length === 1
        && ts.isObjectLiteralExpression(node.expression.arguments[0]!)
      ) {
        const keys = node.expression.arguments[0]!.properties.map((property) => (
          property.name && ts.isIdentifier(property.name) ? property.name.text : ''
        ));
        if (keys.includes('consuming')) preparedReturns.push(keys);
      }
      ts.forEachChild(node, collectPreparedReturns);
    };
    collectPreparedReturns(payloadPreparation!);
    expect(preparedReturns).toEqual([[
      'status',
      'consuming',
      'fillPlan',
      'sourceAuthorization',
      'sourceImportedAtMs',
    ]]);

    const payloadStatements = payloadPreparation!.body!.statements;
    const consumingWriteIndex = payloadStatements.findIndex((statement) => (
      statement.getText(file).includes('await writeSessionState(consuming)')
    ));
    expect(consumingWriteIndex).toBeGreaterThanOrEqual(0);
    const confirmationIndex = consumingWriteIndex + 1;
    expect(payloadStatements[confirmationIndex]?.getText(file)).toContain("consumed.status !== 'ready'");
    const immediateReturnIndex = confirmationIndex + 1;
    expect(payloadStatements[immediateReturnIndex]?.getText(file)).toContain('return Object.freeze({');
    expect(immediateReturnIndex).toBe(payloadStatements.length - 1);
    const awaitsAfterConsumingWrite: string[] = [];
    for (const statement of payloadStatements.slice(consumingWriteIndex + 1)) {
      const visit = (node: ts.Node) => {
        if (ts.isAwaitExpression(node)) awaitsAfterConsumingWrite.push(node.getText(file));
        ts.forEachChild(node, visit);
      };
      visit(statement);
    }
    expect(awaitsAfterConsumingWrite).toEqual([]);

    const statements = fill.body!.statements;
    const statementIndex = (needle: string) => statements.findIndex(
      (statement) => statement.getText(file).includes(needle),
    );
    const finalProbeIndex = statementIndex('runSourceReprobe');
    const clearPreparationIndex = statementIndex('prepared = null');
    const clearBindingIndex = statementIndex('sourceAuthorization = null');
    const finalTabCheckIndex = statementIndex('actionTabMatches');
    const dispatchIndex = statements.findIndex((statement) => (
      statement.getText(file).includes('chrome.scripting.executeScript')
    ));
    expect(finalProbeIndex).toBeGreaterThanOrEqual(0);
    expect(clearPreparationIndex).toBeGreaterThanOrEqual(0);
    expect(finalProbeIndex).toBeGreaterThan(clearPreparationIndex);
    expect(clearBindingIndex).toBeGreaterThan(finalProbeIndex);
    expect(finalTabCheckIndex).toBeGreaterThan(clearBindingIndex);
    expect(dispatchIndex).toBeGreaterThan(finalTabCheckIndex);
    const forbiddenAwaits: string[] = [];
    for (const statement of statements.slice(finalTabCheckIndex + 1, dispatchIndex)) {
      const visit = (node: ts.Node) => {
        if (ts.isAwaitExpression(node)) forbiddenAwaits.push(node.getText(file));
        ts.forEachChild(node, visit);
      };
      visit(statement);
    }
    expect(forbiddenAwaits).toEqual([]);
  }, 240_000);

  it('requires an exact own-data source tab URL before the source probe', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults({ id: 17, url: sourceFixtureUrl });
    harness.scriptResults.push(sourceAccepted());

    expect(await sendMessage(harness, buildPreviewCurrentPageRequest(17)))
      .toMatchObject({ state: 'source-preview' });
    expect(harness.calls.slice(-2).map((call) => call.name)).toEqual([
      'tabs.get',
      'scripting.executeScript',
    ]);
  });

  it.each([
    ['missing URL', () => ({ id: 17 })],
    ['URL accessor', () => Object.defineProperty({ id: 17 }, 'url', {
      enumerable: true,
      get: () => sourceFixtureUrl,
    })],
    ['descriptor-hostile proxy', () => new Proxy({ id: 17, url: sourceFixtureUrl }, {
      getOwnPropertyDescriptor: () => { throw new Error('hostile descriptor trap'); },
    })],
    ['mismatched ID', () => ({ id: 18, url: sourceFixtureUrl })],
    ['malformed URL', () => ({ id: 17, url: 'not a URL' })],
    ['wrong protocol', () => ({
      id: 17, url: 'https://127.0.0.1:3000/demo/extension-fixture/source',
    })],
    ['hostname suffix', () => ({
      id: 17, url: 'http://127.0.0.1.evil.test:3000/demo/extension-fixture/source',
    })],
    ['wrong port', () => ({
      id: 17, url: 'http://127.0.0.1:3001/demo/extension-fixture/source',
    })],
    ['wrong source path', () => ({
      id: 17, url: 'http://127.0.0.1:3000/demo/extension-fixture/source/extra',
    })],
    ['source-destination role swap', () => ({ id: 17, url: destinationFixtureUrl })],
    ['unexpected search', () => ({ id: 17, url: `${sourceFixtureUrl}?goal=verify` })],
    ['unexpected hash', () => ({ id: 17, url: `${sourceFixtureUrl}#review` })],
    ['userinfo', () => ({
      id: 17, url: 'http://citizen@127.0.0.1:3000/demo/extension-fixture/source',
    })],
  ] as const)('rejects a source tab with %s before scripting or state mutation', async (
    _label,
    makeTab,
  ) => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults(makeTab());

    expect(await sendMessage(harness, buildPreviewCurrentPageRequest(17))).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'rejected',
      code: 'action-tab-mismatch',
    });
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
    expect(harness.calls.some((call) => call.name.endsWith('.set'))).toBe(false);
    expect(harness.calls.some((call) => call.name.endsWith('.remove'))).toBe(false);
  });

  it.each([
    ['exact URL', () => ({ id: 29, url: destinationFixtureUrl }), true],
    ['missing URL', () => ({ id: 29 }), false],
    ['URL accessor', () => Object.defineProperty({ id: 29 }, 'url', {
      enumerable: true,
      get: () => destinationFixtureUrl,
    }), false],
    ['descriptor-hostile proxy', () => new Proxy({ id: 29, url: destinationFixtureUrl }, {
      getOwnPropertyDescriptor: () => { throw new Error('hostile descriptor trap'); },
    }), false],
    ['mismatched ID', () => ({ id: 30, url: destinationFixtureUrl }), false],
    ['malformed URL', () => ({ id: 29, url: 'not a URL' }), false],
    ['wrong protocol', () => ({
      id: 29, url: 'https://127.0.0.1:3000/demo/extension-fixture/destination',
    }), false],
    ['source role swap', () => ({ id: 29, url: sourceFixtureUrl }), false],
    ['hostname lookalike', () => ({
      id: 29, url: 'http://127.0.0.11:3000/demo/extension-fixture/destination',
    }), false],
    ['wrong port', () => ({
      id: 29, url: 'http://127.0.0.1:3001/demo/extension-fixture/destination',
    }), false],
    ['wrong path', () => ({
      id: 29, url: 'http://127.0.0.1:3000/demo/extension-fixture/destination/help',
    }), false],
    ['unexpected search', () => ({ id: 29, url: `${destinationFixtureUrl}?next=1` }), false],
    ['unexpected hash', () => ({ id: 29, url: `${destinationFixtureUrl}#form` }), false],
    ['userinfo', () => ({
      id: 29, url: 'http://helper@127.0.0.1:3000/demo/extension-fixture/destination',
    }), false],
  ] as const)('cross-checks the destination tab %s before destination scripting', async (
    _label,
    makeTab,
    accepted,
  ) => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults(makeTab());
    if (accepted) harness.scriptResults.push(sourceAccepted(), destinationReady());

    const response = await sendMessage(harness, buildPreviewCurrentPageRequest(29));
    expect(response.state).toBe(accepted ? 'destination-preview' : 'staged');
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript'))
      .toHaveLength(accepted ? 2 : 0);
    if (!accepted) {
      expect(harness.calls.some((call) => call.name.endsWith('.set'))).toBe(false);
      expect(harness.session()).toEqual(stagedState(null));
    }
  });

  it('checks the retained source tab URL before destination preview scripting', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults(
      { id: 29, url: destinationFixtureUrl },
      { id: 17 },
    );
    harness.scriptResults.push(sourceAccepted(), destinationReady());

    const response = await sendMessage(harness, buildPreviewCurrentPageRequest(29));

    expect(response).toMatchObject({ state: 'rejected', code: 'source-unavailable' });
    expect(harness.calls.filter((call) => call.name === 'tabs.get').map((call) => call.value))
      .toEqual([29, 17]);
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
    expect(harness.session()).toBeUndefined();
  });

  it('checks the retained source tab URL before fill preflight scripting', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults(
      { id: 29, url: destinationFixtureUrl },
      { id: 17, url: `${sourceFixtureUrl}#changed` },
    );
    harness.scriptResults.push(sourceAccepted(), destinationReady());

    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));

    expect(response).toMatchObject({ state: 'rejected', code: 'source-unavailable' });
    expect(harness.calls.filter((call) => call.name === 'tabs.get').map((call) => call.value))
      .toEqual([29, 17]);
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toBeUndefined();
  });

  it('rechecks the retained source tab URL after consuming and before final authorization', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.queueTabGetResults(
      { id: 29, url: destinationFixtureUrl },
      { id: 17, url: sourceFixtureUrl },
      { id: 17 },
    );
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted());

    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));

    expect(response).toMatchObject({ state: 'rejected', code: 'source-binding-changed' });
    expect(harness.calls.filter((call) => call.name === 'tabs.get').map((call) => call.value))
      .toEqual([29, 17, 17]);
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(2);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('rejects Load tab-binding mismatch before any tab or page access and without mutation', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    const binding = {
      schema: 'challansakshi.source-preview-binding/v1' as const,
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(envelope),
      previewNotAfterMs: Date.UTC(2026, 8, 3, 8, 10),
    };

    expect(await sendMessage(harness, buildLoadReviewedFieldsRequest(29, binding))).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'load-reviewed-fields',
      state: 'rejected',
      code: 'action-tab-mismatch',
    });
    expect(harness.calls.some((call) => call.name === 'tabs.query')).toBe(false);
    expect(harness.calls.some((call) => call.name === 'tabs.get')).toBe(false);
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
    expect(harness.calls.some((call) => call.name.endsWith('.set'))).toBe(false);
    expect(harness.calls.some((call) => call.name.endsWith('.remove'))).toBe(false);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toBeUndefined();
  });

  it('previews, stages, binds, arms, erases payload, dispatches once, and settles complete', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.scriptResults.push(sourceAccepted());

    const sourcePreview = await sendMessage(harness, buildPreviewCurrentPageRequest(17));
    expect(sourcePreview.state).toBe('source-preview');
    expect(sourcePreview.preview.description).toBe(envelope.description);
    expect(harness.session()).toBeUndefined();

    harness.scriptResults.push(sourceAccepted());
    const staged = await sendMessage(harness, buildLoadReviewedFieldsRequest(
      17,
      sourcePreview.sourcePreviewBinding,
    ));
    expect(staged).toMatchObject({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'load-reviewed-fields',
      state: 'staged',
      packId: envelope.packId,
    });
    expect(harness.session()).toMatchObject({ state: 'staged', destination: null });

    harness.setActiveTabId(29);
    harness.scriptResults.push(sourceAccepted(), destinationReady());
    const destinationPreview = await sendMessage(harness, buildPreviewCurrentPageRequest(29));
    expect(destinationPreview.state).toBe('destination-preview');
    expect(destinationPreview.preview.description).toBe(envelope.description);
    expect(harness.session()).toMatchObject({
      state: 'staged',
      destination: { destinationTabId: 29, destinationDocumentId: 'destination-document-A' },
    });

    harness.calls.length = 0;
    let finishFill!: (value: unknown) => void;
    const deferredFill = new Promise<unknown>((resolve) => {
      finishFill = resolve;
    });
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted(), deferredFill);
    const fillResponsePromise = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29,
      destinationPreview.generation,
      destinationPreview.packId,
      destinationPreview.effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));

    expect(harness.session()).toMatchObject({ state: 'consuming', destinationTabId: 29 });
    expect(JSON.stringify(harness.session())).not.toContain(envelope.description);
    expect(harness.local()).toMatchObject({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{ state: 'unresolved-live', packId: envelope.packId }],
    });
    expect(JSON.stringify(harness.local())).not.toContain(envelope.description);

    const fillCalls = harness.calls.filter((call) => call.name === 'scripting.executeScript');
    expect(fillCalls).toHaveLength(4);
    expect(fillCalls.map((call) => {
      const details = call.value as { target: unknown; world: unknown };
      return { target: details.target, world: details.world };
    })).toEqual([
      { target: { tabId: 17, frameIds: [0] }, world: 'ISOLATED' },
      { target: { tabId: 29, frameIds: [0] }, world: 'ISOLATED' },
      { target: { tabId: 17, frameIds: [0] }, world: 'ISOLATED' },
      {
        target: { tabId: 29, documentIds: ['destination-document-A'] },
        world: 'ISOLATED',
      },
    ]);
    const finalDetails = fillCalls[3]?.value as {
      target: unknown;
      world: unknown;
      args: Array<{ attemptId: string }>;
    };
    expect(finalDetails.target).toEqual({ tabId: 29, documentIds: ['destination-document-A'] });
    expect(finalDetails.world).toBe('ISOLATED');
    const attemptedId = finalDetails.args[0].attemptId as string;

    const concurrent = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29,
      destinationPreview.generation,
      destinationPreview.packId,
      destinationPreview.effectiveExpiresAtMs,
    ));
    expect(concurrent.state).toBe('unresolved-live');
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(4);

    finishFill(fillComplete(attemptedId));
    expect(await fillResponsePromise).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'success',
    });
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'replay',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        outcome: 'complete',
      }],
    });

    const names = harness.calls.map((call) => call.name);
    const armingIndex = harness.calls.findIndex((call) => (
      call.name === 'session.set' && JSON.stringify(call.value).includes('"state":"arming"')
    ));
    const localArmIndex = harness.calls.findIndex((call) => (
      call.name === 'local.set' && JSON.stringify(call.value).includes('unresolved-live')
    ));
    const consumingIndex = harness.calls.findIndex((call) => (
      call.name === 'session.set' && JSON.stringify(call.value).includes('"state":"consuming"')
    ));
    const finalDispatchIndex = names.lastIndexOf('scripting.executeScript');
    expect(armingIndex).toBeGreaterThan(1);
    expect(localArmIndex).toBeGreaterThan(armingIndex);
    expect(consumingIndex).toBeGreaterThan(localArmIndex);
    expect(finalDispatchIndex).toBeGreaterThan(consumingIndex);
    expect(names).not.toContain('session.clear');
    expect(names).not.toContain('local.clear');
  });

  it('serializes a genuinely simultaneous Fill double-click to one dispatch', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishLookup!: (value: number) => void;
    const lookup = new Promise<number>((resolve) => { finishLookup = resolve; });
    let finishFill!: (value: unknown) => void;
    const fill = new Promise<unknown>((resolve) => { finishFill = resolve; });
    harness.queueActiveTabResults(lookup);
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted(), fill);
    const request = buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    );

    const first = sendMessage(harness, request);
    const second = sendMessage(harness, request);
    await settleUntil(() => harness.calls.some((call) => call.name === 'tabs.query'));
    expect(harness.calls.filter((call) => call.name === 'tabs.query')).toHaveLength(1);
    finishLookup(29);
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));

    expect(await second).toMatchObject({ state: 'unresolved-live' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(4);
    finishFill(fillComplete('02020202020202020202020202020202'));
    expect(await first).toMatchObject({ state: 'success' });
  });

  it.each([
    ['import', (binding: SourcePreviewBindingWireV1) => buildLoadReviewedFieldsRequest(17, binding)],
    ['clear', () => buildClearStagedFieldsRequest(
      stagedState().generation,
      envelope.packId,
      stagedState().effectiveExpiresAtMs,
    )],
  ] as const)('serializes concurrent %s versus Fill behind the consuming lock', async (
    _label,
    buildRacer,
  ) => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishLookup!: (value: number) => void;
    const lookup = new Promise<number>((resolve) => { finishLookup = resolve; });
    let finishFill!: (value: unknown) => void;
    const fill = new Promise<unknown>((resolve) => { finishFill = resolve; });
    harness.queueActiveTabResults(lookup);
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted(), fill);
    const fillResponse = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    const binding = {
      schema: 'challansakshi.source-preview-binding/v1' as const,
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(envelope),
      previewNotAfterMs: stagedState().effectiveExpiresAtMs,
    };
    const racerResponse = sendMessage(harness, buildRacer(binding));
    await settleUntil(() => harness.calls.some((call) => call.name === 'tabs.query'));
    finishLookup(29);
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));

    expect(await racerResponse).toMatchObject({ state: 'unresolved-live' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(4);
    finishFill(fillComplete('02020202020202020202020202020202'));
    expect(await fillResponse).toMatchObject({ state: 'success' });
  });

  it('serializes an expiry alarm behind an in-flight replacement Load and keeps the new stage', async () => {
    const revisedDescription = 'Please review the newly confirmed fictional replacement pack.';
    const revisedEnvelope = {
      ...envelope,
      resultRevisionId: '55555555555555555555555555555555',
      packRevisionId: '66666666666666666666666666666666',
      description: revisedDescription,
      descriptionDigest: digestExtensionDescriptionCore(revisedDescription),
    };
    const revisedBinding = {
      schema: 'challansakshi.source-preview-binding/v1' as const,
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(revisedEnvelope),
      previewNotAfterMs: Date.parse(revisedEnvelope.expiresAt),
    };
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(17);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const probe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(probe);
    const response = sendMessage(harness, buildLoadReviewedFieldsRequest(17, revisedBinding));
    await settleUntil(() => harness.calls.some((call) => call.name === 'scripting.executeScript'));
    harness.events.onAlarm.listeners[0]?.({ name: 'session-expiry' });
    finishProbe([{
      frameId: 0,
      documentId: 'source-document-A',
      result: { status: 'accepted', envelope: revisedEnvelope },
    }]);

    expect(await response).toMatchObject({ state: 'staged', packId: envelope.packId });
    await settleMicrotasks();
    expect(harness.session()).toMatchObject({
      state: 'staged',
      envelope: { description: revisedDescription },
    });
  });

  it('caps preview work at a still-valid adapter expiry inside the final 30 seconds', async () => {
    const nowMs = Date.parse('2026-10-02T23:59:40.000Z');
    const effectiveExpiresAtMs = Date.parse('2026-10-03T00:00:10.000Z');
    const nearAdapterExpiryEnvelope = {
      ...envelope,
      issuedAt: '2026-10-02T23:59:20.000Z',
      expiresAt: '2026-10-03T00:00:10.000Z',
    };
    vi.setSystemTime(nowMs);
    const harness = makeChromeHarness();
    harness.setSession({
      ...stagedState(null),
      envelope: nearAdapterExpiryEnvelope,
      importedAtMs: nowMs,
      effectiveExpiresAtMs,
    });
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.scriptResults.push(
      [{
        frameId: 0,
        documentId: 'source-document-A',
        result: { status: 'accepted', envelope: nearAdapterExpiryEnvelope },
      }],
      destinationReady(),
    );

    const response = await sendMessage(harness, buildPreviewCurrentPageRequest(29));
    expect(response).toMatchObject({ state: 'destination-preview' });
    const injections = harness.calls.filter((call) => call.name === 'scripting.executeScript');
    expect(injections).toHaveLength(2);
    const sourceDetails = injections[0]?.value as {
      args: Array<{ operationNotAfterMs: number }>;
    };
    const destinationDetails = injections[1]?.value as {
      args: Array<{ operationNotAfterMs: number }>;
    };
    const adapterExpiresAtMs = Date.parse('2026-10-03T00:00:00.000Z');
    expect(sourceDetails.args[0]?.operationNotAfterMs).toBe(adapterExpiresAtMs);
    expect(destinationDetails.args[0]?.operationNotAfterMs).toBe(adapterExpiresAtMs);
  });

  it('physically expires a staged payload if its source binding elapses during re-probe', async () => {
    const expiresAtMs = stagedState().effectiveExpiresAtMs;
    vi.setSystemTime(expiresAtMs - 1);
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const deferredProbe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(deferredProbe);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(29));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 1
    ));
    vi.setSystemTime(expiresAtMs);
    finishProbe(sourceAccepted());
    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
  });

  it('physically expires a staged payload when action-tab lookup crosses its deadline', async () => {
    const expiresAtMs = stagedState().effectiveExpiresAtMs;
    vi.setSystemTime(expiresAtMs - 1);
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.failNext('alarms.create:session-expiry');
    let finishLookup!: (value: number) => void;
    const deferredLookup = new Promise<number>((resolve) => { finishLookup = resolve; });
    harness.queueActiveTabResults(deferredLookup);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(29));
    await settleUntil(() => harness.calls.some((call) => call.name === 'tabs.query'));

    vi.setSystemTime(expiresAtMs);
    finishLookup(41);

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
  });

  it('physically expires an existing stage when load action-tab lookup crosses its deadline', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.scriptResults.push(sourceAccepted());
    const preview = await sendMessage(harness, buildPreviewCurrentPageRequest(17));
    harness.scriptResults.push(sourceAccepted());
    await sendMessage(harness, buildLoadReviewedFieldsRequest(17, preview.sourcePreviewBinding));
    harness.calls.length = 0;
    let finishLookup!: (value: number) => void;
    const deferredLookup = new Promise<number>((resolve) => { finishLookup = resolve; });
    harness.queueActiveTabResults(deferredLookup);
    const response = sendMessage(harness, buildLoadReviewedFieldsRequest(
      17,
      preview.sourcePreviewBinding,
    ));
    await settleUntil(() => harness.calls.some((call) => call.name === 'tabs.query'));

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishLookup(41);

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
  });

  it('physically expires a newly written stage if session storage completes after expiry', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.scriptResults.push(sourceAccepted());
    const preview = await sendMessage(harness, buildPreviewCurrentPageRequest(17));
    harness.calls.length = 0;
    let finishStorage!: () => void;
    const deferredStorage = new Promise<void>((resolve) => { finishStorage = resolve; });
    harness.queueSessionSetDelays(deferredStorage);
    harness.scriptResults.push(sourceAccepted());
    const response = sendMessage(harness, buildLoadReviewedFieldsRequest(
      17,
      preview.sourcePreviewBinding,
    ));
    await settleUntil(() => harness.calls.some((call) => call.name === 'session.set'));

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishStorage();

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
  });

  it('replaces an existing same-source stage when the newly reviewed envelope revision changed', async () => {
    const revisedDescription = 'Please review the newly confirmed fictional vehicle-class mismatch.';
    const revisedEnvelope = {
      ...envelope,
      resultRevisionId: '55555555555555555555555555555555',
      packRevisionId: '66666666666666666666666666666666',
      description: revisedDescription,
      descriptionDigest: digestExtensionDescriptionCore(revisedDescription),
    };
    const revisedBinding = {
      schema: 'challansakshi.source-preview-binding/v1' as const,
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      canonicalEnvelopeDigest: digestCanonicalExtensionHandoffEnvelopeCore(revisedEnvelope),
      previewNotAfterMs: Date.parse(revisedEnvelope.expiresAt),
    };
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(17);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.scriptResults.push([{
      frameId: 0,
      documentId: 'source-document-A',
      result: { status: 'accepted', envelope: revisedEnvelope },
    }]);

    const response = await sendMessage(harness, buildLoadReviewedFieldsRequest(17, revisedBinding));

    expect(response).toMatchObject({ state: 'staged', packId: envelope.packId });
    expect(harness.session()).toMatchObject({
      state: 'staged',
      envelope: {
        resultRevisionId: revisedEnvelope.resultRevisionId,
        packRevisionId: revisedEnvelope.packRevisionId,
        description: revisedDescription,
        descriptionDigest: revisedEnvelope.descriptionDigest,
      },
      destination: null,
    });
    expect(harness.session()).not.toMatchObject({ generation: stagedState().generation });
  });

  it('physically expires a fill stage before action-tab mismatch when lookup crosses its deadline', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishLookup!: (value: number) => void;
    const deferredLookup = new Promise<number>((resolve) => { finishLookup = resolve; });
    harness.queueActiveTabResults(deferredLookup);
    const response = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => harness.calls.some((call) => call.name === 'tabs.query'));

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishLookup(41);

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
  });

  it('reconciles a stage that expires while its alarm refresh is awaiting completion', async () => {
    const expiresAtMs = stagedState().effectiveExpiresAtMs;
    vi.setSystemTime(expiresAtMs - 1);
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishAlarm!: () => void;
    const deferredAlarm = new Promise<void>((resolve) => { finishAlarm = resolve; });
    harness.queueAlarmCreateDelays('session-expiry', deferredAlarm);
    const response = sendMessage(harness, buildClearStagedFieldsRequest(
      '99999999999999999999999999999999',
      envelope.packId,
      expiresAtMs,
    ));
    await settleUntil(() => harness.calls.some(
      (call) => call.name === 'alarms.create:session-expiry',
    ));

    vi.setSystemTime(expiresAtMs);
    finishAlarm();

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
  });

  it('never exposes a destination preview delivered at the effective expiry boundary', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishDestination!: (value: unknown) => void;
    const deferredDestination = new Promise<unknown>((resolve) => { finishDestination = resolve; });
    harness.scriptResults.push(sourceAccepted(), deferredDestination);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(29));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 2
    ));

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishDestination(destinationReady());

    expect(await response).toMatchObject({ state: 'expired' });
    expect(harness.session()).toBeUndefined();
  });

  it('keeps a late destination-ready result payload-free after only its operation window elapses', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState(null));
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishDestination!: (value: unknown) => void;
    const deferredDestination = new Promise<unknown>((resolve) => { finishDestination = resolve; });
    harness.scriptResults.push(sourceAccepted(), deferredDestination);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(29));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 2
    ));
    const destinationCall = harness.calls.filter(
      (call) => call.name === 'scripting.executeScript',
    )[1]?.value as { args: Array<{ operationNotAfterMs: number }> };

    vi.setSystemTime(destinationCall.args[0]!.operationNotAfterMs);
    finishDestination(destinationReady());

    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'staged',
      generation: stagedState().generation,
      packId: envelope.packId,
      effectiveExpiresAtMs: stagedState().effectiveExpiresAtMs,
    });
    expect(harness.session()).toMatchObject({ state: 'staged', destination: null });
  });

  it('returns adapter-disabled without values when destination readiness arrives at adapter expiry', async () => {
    const nowMs = Date.parse('2026-10-02T23:59:40.000Z');
    const effectiveExpiresAtMs = Date.parse('2026-10-03T00:00:10.000Z');
    const nearAdapterExpiryEnvelope = {
      ...envelope,
      issuedAt: '2026-10-02T23:59:20.000Z',
      expiresAt: '2026-10-03T00:00:10.000Z',
    };
    vi.setSystemTime(nowMs);
    const harness = makeChromeHarness();
    harness.setSession({
      ...stagedState(null),
      envelope: nearAdapterExpiryEnvelope,
      importedAtMs: nowMs,
      effectiveExpiresAtMs,
    });
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishDestination!: (value: unknown) => void;
    const deferredDestination = new Promise<unknown>((resolve) => { finishDestination = resolve; });
    harness.scriptResults.push([{
      frameId: 0,
      documentId: 'source-document-A',
      result: { status: 'accepted', envelope: nearAdapterExpiryEnvelope },
    }], deferredDestination);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(29));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 2
    ));

    vi.setSystemTime(Date.parse('2026-10-03T00:00:00.000Z'));
    finishDestination(destinationReady());

    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'adapter-disabled',
    });
    expect(harness.session()).toMatchObject({ state: 'staged', destination: null });
  });

  it('returns staged on an unrelated page and keeps Clear truthfully available', async () => {
    const harness = makeChromeHarness();
    harness.setSession({
      schema: SESSION_STATE_SCHEMA,
      state: 'staged',
      generation: '11111111111111111111111111111111',
      envelope,
      importedAtMs: Date.UTC(2026, 8, 3, 8, 1),
      effectiveExpiresAtMs: Date.UTC(2026, 8, 3, 8, 10),
      sourceTabId: 17,
      sourceDocumentId: 'source-document-A',
      destination: { destinationTabId: 29, destinationDocumentId: 'destination-document-A' },
    });
    harness.setActiveTabId(41);
    await loadWorker(harness);
    harness.calls.length = 0;
    expect(await sendMessage(harness, buildPreviewCurrentPageRequest(41))).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'preview-current-page',
      state: 'staged',
      generation: '11111111111111111111111111111111',
      packId: envelope.packId,
      effectiveExpiresAtMs: Date.UTC(2026, 8, 3, 8, 10),
    });
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);

    expect(await sendMessage(harness, buildClearStagedFieldsRequest(
      '11111111111111111111111111111111',
      envelope.packId,
      Date.UTC(2026, 8, 3, 8, 10),
    ))).toMatchObject({ state: 'empty' });
    expect(harness.session()).toBeUndefined();
  });

  it('orphan-locks missing session correlation and ignores unknown alarms without state access', async () => {
    const harness = makeChromeHarness();
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'unresolved-live',
        armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
      }],
    });
    await loadWorker(harness);
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'unresolved-orphaned',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
      }],
    });

    harness.calls.length = 0;
    harness.events.onAlarm.listeners[0]?.({ name: 'not-a-known-alarm' });
    await settleMicrotasks();
    expect(harness.calls).toEqual([]);
  });

  it.each(['onStartup', 'onInstalled'] as const)(
    'orphan-locks %s recovery and ignores reuse of the old numeric destination tab ID',
    async (eventName) => {
      const harness = makeChromeHarness();
      const consuming = consumingState();
      await loadWorker(harness);
      harness.setLocal(liveLedger(consuming));
      harness.calls.length = 0;

      harness.events[eventName].listeners[0]?.();
      await settleUntil(() => (
        harness.local() as { records?: Array<{ state?: string }> } | undefined
      )?.records?.[0]?.state === 'unresolved-orphaned');
      const orphaned = clone(harness.local());
      expect(orphaned).toEqual({
        schema: 'challansakshi.safety-ledger/v1',
        records: [{
          state: 'unresolved-orphaned',
          packId: envelope.packId,
          replayUntil: consuming.replayUntil,
        }],
      });

      await settleMicrotasks();
      harness.calls.length = 0;
      harness.events.onRemoved.listeners[0]?.(
        consuming.destinationTabId,
        Object.defineProperty({}, 'unexpected', {
          get: () => { throw new Error('must not read removeInfo'); },
        }),
      );
      await settleMicrotasks();
      expect(harness.calls).toEqual([{
        name: 'session.get', value: EXTENSION_SESSION_STATE_KEY,
      }]);
      expect(harness.local()).toEqual(orphaned);
    },
  );

  it('discards unrelated tab removals and replacements after only the minimum session read', async () => {
    const harness = makeChromeHarness();
    const consuming = consumingState();
    harness.setSession(consuming);
    harness.setLocal(liveLedger(consuming));
    await loadWorker(harness);

    harness.calls.length = 0;
    harness.events.onRemoved.listeners[0]?.(41, Object.defineProperty({}, 'unexpected', {
      get: () => { throw new Error('must not read removeInfo'); },
    }));
    await settleMicrotasks();
    expect(harness.calls).toEqual([{
      name: 'session.get', value: EXTENSION_SESSION_STATE_KEY,
    }]);
    expect(harness.session()).toEqual(consuming);
    expect(harness.local()).toEqual(liveLedger(consuming));

    harness.calls.length = 0;
    harness.events.onReplaced.listeners[0]?.(50, 41);
    await settleMicrotasks();
    expect(harness.calls).toEqual([{
      name: 'session.get', value: EXTENSION_SESSION_STATE_KEY,
    }]);
    expect(harness.session()).toEqual(consuming);
    expect(harness.local()).toEqual(liveLedger(consuming));

    harness.calls.length = 0;
    harness.events.onReplaced.listeners[0]?.(50, 29);
    await settleMicrotasks();
    expect(harness.calls.some((call) => call.name === 'local.get')).toBe(true);
    expect(harness.calls.some((call) => call.name === 'local.set')).toBe(false);
    expect(harness.session()).toEqual(consuming);
    expect(harness.local()).toEqual(liveLedger(consuming));
  });

  it('settles an exact same-session destination close and never treats replacement as closure', async () => {
    const consuming = {
      schema: SESSION_STATE_SCHEMA,
      state: 'consuming',
      generation: '11111111111111111111111111111111',
      armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      packId: envelope.packId,
      attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      replayUntil: Date.UTC(2026, 8, 3, 8, 10),
      attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
      destinationTabId: 29,
      destinationDocumentId: 'destination-document-A',
    };
    const live = {
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'unresolved-live',
        armNonce: consuming.armNonce,
        packId: consuming.packId,
        replayUntil: consuming.replayUntil,
      }],
    };
    const harness = makeChromeHarness();
    harness.setSession(consuming);
    harness.setLocal(live);
    await loadWorker(harness);
    harness.events.onReplaced.listeners[0]?.(50, 29);
    await settleMicrotasks();
    expect(harness.local()).toEqual(live);

    harness.events.onRemoved.listeners[0]?.(29, Object.defineProperty({}, 'isWindowClosing', {
      get: () => { throw new Error('must not read removeInfo'); },
    }));
    await settleMicrotasks();
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'replay',
        packId: envelope.packId,
        replayUntil: consuming.replayUntil,
        outcome: 'closed-unresolved',
      }],
    });
  });

  it('acknowledges an exact warning and resets only an orphan with absent session proof', async () => {
    const warningHarness = makeChromeHarness();
    warningHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'needs-review',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        warningExpiresAt: Date.UTC(2026, 8, 4, 8, 1),
      }],
    });
    await loadWorker(warningHarness);
    expect(await sendMessage(warningHarness, buildAcknowledgeAffectedPersonInspectionRequest(
      envelope.packId,
      Date.UTC(2026, 8, 3, 8, 10),
      Date.UTC(2026, 8, 4, 8, 1),
    ))).toMatchObject({ state: 'empty' });
    expect(warningHarness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'inspected' }],
    });

    const resetHarness = makeChromeHarness();
    resetHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'unresolved-orphaned',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
      }],
    });
    await loadWorker(resetHarness);
    expect(await sendMessage(resetHarness, buildResetForDeviceOwnerRequest({
      schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
      type: 'reset-for-device-owner',
      allRelevantOfficialTabsAndBrowserProcessesClosed: true,
    }))).toMatchObject({ state: 'empty' });
    expect(resetHarness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('keeps device-owner reset subordinate to warning, live, and staged blockers', async () => {
    const warningHarness = makeChromeHarness();
    const warningRecord = {
      state: 'needs-review' as const,
      packId: envelope.packId,
      replayUntil: Date.UTC(2026, 8, 3, 8, 10),
      warningExpiresAt: Date.UTC(2026, 8, 4, 8, 1),
    };
    warningHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1', records: [warningRecord],
    });
    await loadWorker(warningHarness);
    const resetRequest = buildResetForDeviceOwnerRequest({
      schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
      type: 'reset-for-device-owner',
      allRelevantOfficialTabsAndBrowserProcessesClosed: true,
    });
    const warningResponse = await sendMessage(warningHarness, resetRequest);
    expect(warningResponse).toMatchObject({
      state: 'needs-review', warning: { state: 'needs-review' },
    });
    expect(Object.hasOwn(warningResponse, 'code')).toBe(false);
    expect(warningHarness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [warningRecord],
    });

    const liveHarness = makeChromeHarness();
    const consuming = consumingState();
    liveHarness.setSession(consuming);
    liveHarness.setLocal(liveLedger(consuming));
    await loadWorker(liveHarness);
    expect(await sendMessage(liveHarness, resetRequest))
      .toMatchObject({ state: 'unresolved-live' });
    expect(liveHarness.session()).toEqual(consuming);
    expect(liveHarness.local()).toEqual(liveLedger(consuming));

    const stagedHarness = makeChromeHarness();
    stagedHarness.setSession(stagedState());
    await loadWorker(stagedHarness);
    expect(await sendMessage(stagedHarness, resetRequest)).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'reset-for-device-owner',
      state: 'rejected',
      code: 'reset-not-allowed',
    });
    expect(stagedHarness.session()).toEqual(stagedState());
  });

  it.each([
    ['partial', 'partial', 'partial'],
    ['indeterminate', 'needs-review', 'indeterminate'],
  ] as const)('settles an exact %s result as the frozen warning response', async (
    resultStatus,
    responseState,
    responseCode,
  ) => {
    const harness = makeChromeHarness();
    const response = await beginFill(
      harness,
      fillResult('02020202020202020202020202020202', resultStatus),
    );
    expect(response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: responseState,
      code: responseCode,
      warning: {
        state: 'needs-review',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        warningExpiresAt: Date.UTC(2026, 8, 4, 8, 1),
      },
    });
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({ records: [{ state: 'needs-review' }] });
  });

  it('settles an exact complete result received at the deadline as late-complete', async () => {
    const harness = makeChromeHarness();
    let finish!: (value: unknown) => void;
    const deferred = new Promise<unknown>((resolve) => { finish = resolve; });
    const response = beginFill(harness, deferred);
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));
    vi.setSystemTime(Date.UTC(2026, 8, 3, 8, 1, 30));
    finish(fillComplete('02020202020202020202020202020202'));
    expect(await response).toMatchObject({
      state: 'needs-review', code: 'late-complete',
      warning: { state: 'needs-review' },
    });
    expect(harness.local()).toMatchObject({ records: [{ state: 'needs-review' }] });
  });

  it.each([
    ['transport rejection', () => Promise.reject(new Error('transport'))],
    ['malformed fulfillment', () => []],
  ])('keeps exact correlation unresolved after %s and never retries', async (_label, makeResult) => {
    const harness = makeChromeHarness();
    const response = await beginFill(harness, makeResult());
    expect(response).toMatchObject({ state: 'unresolved-live' });
    expect(harness.session()).toMatchObject({ state: 'consuming' });
    expect(harness.local()).toMatchObject({ records: [{ state: 'unresolved-live' }] });
    const dispatchCount = harness.calls.filter((call) => call.name === 'scripting.executeScript').length;
    expect(await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29,
      '11111111111111111111111111111111',
      envelope.packId,
      Date.UTC(2026, 8, 3, 8, 10),
    ))).toMatchObject({ state: 'unresolved-live' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(dispatchCount);
  });

  it('keeps close settlement byte-identical when the in-flight result arrives later', async () => {
    const harness = makeChromeHarness();
    let finish!: (value: unknown) => void;
    const deferred = new Promise<unknown>((resolve) => { finish = resolve; });
    const response = beginFill(harness, deferred);
    await settleUntil(() => (
      (harness.session() as { state?: unknown } | undefined)?.state === 'consuming'
      && harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));
    harness.events.onRemoved.listeners[0]?.(29, Object.defineProperty({}, 'unexpected', {
      get: () => { throw new Error('must not read removeInfo'); },
    }));
    await settleMicrotasks();
    const closedReplay = clone(harness.local());
    expect(closedReplay).toMatchObject({ records: [{ state: 'replay', outcome: 'closed-unresolved' }] });
    finish(fillComplete('02020202020202020202020202020202'));
    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'operation-failed',
    });
    expect(harness.local()).toEqual(closedReplay);
  });

  it.each(['session.get', 'local.get'] as const)(
    'ignores an exactly closed callback before a failing %s and performs zero canonical work',
    async (operation) => {
      const harness = makeChromeHarness();
      let finish!: (value: unknown) => void;
      const deferred = new Promise<unknown>((resolve) => { finish = resolve; });
      const response = beginFill(harness, deferred);
      await settleUntil(() => (
        (harness.session() as { state?: unknown } | undefined)?.state === 'consuming'
        && harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
      ));
      harness.events.onRemoved.listeners[0]?.(29, {});
      await settleUntil(() => harness.session() === undefined && (
        harness.local() as { records?: Array<{ outcome?: unknown }> } | undefined
      )?.records?.[0]?.outcome === 'closed-unresolved' && harness.calls.some(
        (call) => call.name === 'alarms.create:ledger-cleanup',
      ));
      await settleMicrotasks();
      const canonicalAfterClose = clone(harness.local());
      harness.calls.length = 0;
      harness.failNext(operation);

      finish(fillComplete('02020202020202020202020202020202'));

      expect(await response).toEqual({
        schema: WORKER_RESPONSE_SCHEMA,
        command: 'fill-empty-reviewed-fields',
        state: 'rejected',
        code: 'operation-failed',
      });
      expect(harness.calls).toEqual([]);
      expect(harness.session()).toBeUndefined();
      expect(harness.local()).toEqual(canonicalAfterClose);
    },
  );

  it('does not apply one closed tuple marker to a distinct later fill tuple', async () => {
    const harness = makeChromeHarness();
    let finishFirst!: (value: unknown) => void;
    const firstDeferred = new Promise<unknown>((resolve) => { finishFirst = resolve; });
    const firstResponse = beginFill(harness, firstDeferred);
    await settleUntil(() => (
      (harness.session() as { state?: unknown } | undefined)?.state === 'consuming'
      && harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));
    harness.events.onRemoved.listeners[0]?.(29, {});
    await settleUntil(() => harness.session() === undefined && (
      harness.local() as { records?: Array<{ outcome?: unknown }> } | undefined
    )?.records?.[0]?.outcome === 'closed-unresolved');

    const secondEnvelope = Object.freeze({
      ...clone(envelope),
      packId: '55555555555555555555555555555555',
      resultRevisionId: '66666666666666666666666666666666',
      packRevisionId: '77777777777777777777777777777777',
    });
    const secondGeneration = '88888888888888888888888888888888';
    harness.setSession({
      ...stagedState(),
      generation: secondGeneration,
      envelope: secondEnvelope,
    });
    const secondSourceAccepted = () => [{
      frameId: 0,
      documentId: 'source-document-A',
      result: { status: 'accepted', envelope: clone(secondEnvelope) },
    }];
    let finishSecond!: (value: unknown) => void;
    const secondDeferred = new Promise<unknown>((resolve) => { finishSecond = resolve; });
    harness.calls.length = 0;
    harness.scriptResults.push(
      secondSourceAccepted(), destinationReady(), secondSourceAccepted(), secondDeferred,
    );
    const secondResponse = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, secondGeneration, secondEnvelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));
    const secondDispatch = harness.calls.filter(
      (call) => call.name === 'scripting.executeScript',
    ).at(-1)?.value as { args?: Array<{ attemptId?: string }> } | undefined;
    const secondAttemptId = secondDispatch?.args?.[0]?.attemptId;
    expect(secondAttemptId).toMatch(/^[0-9a-f]{32}$/);
    finishSecond(fillComplete(secondAttemptId!));

    expect(await secondResponse).toMatchObject({ state: 'success' });
    finishFirst(fillComplete('02020202020202020202020202020202'));
    expect(await firstResponse).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'operation-failed',
    });
  });

  it('classifies a late fill as closed even when the expired close replay was pruned', async () => {
    const harness = makeChromeHarness();
    let finish!: (value: unknown) => void;
    const deferred = new Promise<unknown>((resolve) => { finish = resolve; });
    const response = beginFill(harness, deferred);
    await settleUntil(() => (
      (harness.session() as { state?: unknown } | undefined)?.state === 'consuming'
      && harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 4
    ));
    harness.calls.length = 0;
    vi.setSystemTime(Date.UTC(2026, 8, 3, 8, 10));

    harness.events.onRemoved.listeners[0]?.(29, Object.defineProperty({}, 'unexpected', {
      get: () => { throw new Error('must not read removeInfo'); },
    }));
    await settleUntil(() => harness.session() === undefined && (
      harness.local() as { records?: unknown[] } | undefined
    )?.records?.length === 0);
    const closeWrites = harness.calls.filter((call) => call.name === 'local.set');
    expect(closeWrites.map((call) => call.value)).toEqual([
      {
        'challansakshi.safety-ledger.v1': {
          schema: 'challansakshi.safety-ledger/v1',
          records: [{
            state: 'replay',
            packId: envelope.packId,
            replayUntil: Date.UTC(2026, 8, 3, 8, 10),
            outcome: 'closed-unresolved',
          }],
        },
      },
      {
        'challansakshi.safety-ledger.v1': {
          schema: 'challansakshi.safety-ledger/v1',
          records: [],
        },
      },
    ]);
    const canonicalAfterClose = clone(harness.local());

    finish(fillComplete('02020202020202020202020202020202'));
    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'operation-failed',
    });
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toEqual(canonicalAfterClose);
  });

  it('orphan-locks a completion whose session correlation disappeared and quarantines a mismatch', async () => {
    const absentHarness = makeChromeHarness();
    let finishAbsent!: (value: unknown) => void;
    const absentDeferred = new Promise<unknown>((resolve) => { finishAbsent = resolve; });
    const absentResponse = beginFill(absentHarness, absentDeferred);
    await settleUntil(() => (
      absentHarness.session() as { state?: unknown } | undefined
    )?.state === 'consuming');
    absentHarness.setSession(undefined);
    finishAbsent(fillComplete('02020202020202020202020202020202'));
    expect(await absentResponse).toMatchObject({ state: 'unresolved-orphaned' });
    expect(absentHarness.local()).toMatchObject({ records: [{ state: 'unresolved-orphaned' }] });

    const mismatchHarness = makeChromeHarness();
    let finishMismatch!: (value: unknown) => void;
    const mismatchDeferred = new Promise<unknown>((resolve) => { finishMismatch = resolve; });
    const mismatchResponse = beginFill(mismatchHarness, mismatchDeferred);
    await settleUntil(() => (
      mismatchHarness.session() as { state?: unknown } | undefined
    )?.state === 'consuming');
    mismatchHarness.setSession({
      ...mismatchHarness.session() as object,
      attemptId: 'cccccccccccccccccccccccccccccccc',
    });
    finishMismatch(fillComplete('02020202020202020202020202020202'));
    expect(await mismatchResponse).toMatchObject({ state: 'quarantined' });
    expect(mismatchHarness.local()).toMatchObject({ records: [{ state: 'unresolved-live' }] });
  });

  it.each(['without', 'with'] as const)(
    'recovers an arming crash %s the exact local marker as cancelled-before-dispatch',
    async (marker) => {
      const harness = makeChromeHarness();
      const staged = stagedState();
      const arming = {
        schema: SESSION_STATE_SCHEMA,
        state: 'arming',
        generation: staged.generation,
        envelope,
        importedAtMs: staged.importedAtMs,
        effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
        sourceTabId: staged.sourceTabId,
        sourceDocumentId: staged.sourceDocumentId,
        destination: staged.destination,
        armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        replayUntil: staged.effectiveExpiresAtMs,
        attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
      };
      harness.setSession(arming);
      if (marker === 'with') {
        harness.setLocal(liveLedger({ ...consumingState(), armNonce: arming.armNonce }));
      }
      await loadWorker(harness);
      expect(harness.session()).toBeUndefined();
      expect(harness.local()).toEqual({
        schema: 'challansakshi.safety-ledger/v1',
        records: [{
          state: 'replay', packId: envelope.packId,
          replayUntil: arming.replayUntil, outcome: 'cancelled-before-dispatch',
        }],
      });
    },
  );

  it('quarantines impossible unrelated blockers before arming or settling recovery', async () => {
    const staged = stagedState();
    const arming = {
      schema: SESSION_STATE_SCHEMA,
      state: 'arming' as const,
      generation: staged.generation,
      envelope,
      importedAtMs: staged.importedAtMs,
      effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
      sourceTabId: staged.sourceTabId,
      sourceDocumentId: staged.sourceDocumentId,
      destination: staged.destination,
      armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      replayUntil: staged.effectiveExpiresAtMs,
      attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
    };
    const unrelated = {
      state: 'unresolved-orphaned' as const,
      packId: '11111111111111111111111111111111',
      replayUntil: Date.UTC(2026, 8, 3, 8, 9),
    };
    const armingHarness = makeChromeHarness();
    armingHarness.setSession(arming);
    armingHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1', records: [unrelated],
    });
    await loadWorker(armingHarness);
    expect(armingHarness.session()).toEqual(arming);
    expect(armingHarness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [unrelated],
    });

    const consuming = consumingState();
    const terminal = {
      state: 'replay' as const,
      packId: consuming.packId,
      replayUntil: consuming.replayUntil,
      outcome: 'complete' as const,
    };
    const settling = {
      ...consuming,
      state: 'settling' as const,
      intended: { cause: 'injection-result' as const, terminal },
    };
    const settlingHarness = makeChromeHarness();
    settlingHarness.setSession(settling);
    settlingHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1', records: [unrelated, terminal],
    });
    await loadWorker(settlingHarness);
    expect(settlingHarness.session()).toEqual(settling);
    expect(settlingHarness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [unrelated, terminal],
    });
  });

  it('finishes both settling crash windows before pruning or handling new work', async () => {
    for (const terminalAlreadyWritten of [false, true]) {
      const harness = makeChromeHarness();
      const consuming = consumingState();
      const terminal = {
        state: 'replay' as const,
        packId: consuming.packId,
        replayUntil: consuming.replayUntil,
        outcome: 'complete' as const,
      };
      harness.setSession({
        ...consuming,
        state: 'settling',
        intended: { cause: 'injection-result', terminal },
      });
      harness.setLocal(terminalAlreadyWritten
        ? { schema: 'challansakshi.safety-ledger/v1', records: [terminal] }
        : liveLedger(consuming));
      await loadWorker(harness);
      expect(harness.session()).toBeUndefined();
      expect(harness.local()).toEqual({
        schema: 'challansakshi.safety-ledger/v1', records: [terminal],
      });
    }
  });

  it.each([
    ['injection-result', 'complete'],
    ['cancelled-before-dispatch', 'cancelled-before-dispatch'],
    ['destination-tab-removed', 'closed-unresolved'],
  ] as const)(
    'reconciles an expired %s settling crash before pruning (%s)',
    async (cause, outcome) => {
      for (const terminalAlreadyWritten of [false, true]) {
        const harness = makeChromeHarness();
        const consuming = consumingState();
        const terminal = {
          state: 'replay' as const,
          packId: consuming.packId,
          replayUntil: consuming.replayUntil,
          outcome,
        };
        harness.setSession({
          ...consuming,
          state: 'settling',
          intended: { cause, terminal },
        });
        harness.setLocal(terminalAlreadyWritten
          ? { schema: 'challansakshi.safety-ledger/v1', records: [terminal] }
          : liveLedger(consuming));
        vi.setSystemTime(consuming.replayUntil);

        await loadWorker(harness);

        expect(harness.session()).toBeUndefined();
        expect(harness.local()).toEqual({
          schema: 'challansakshi.safety-ledger/v1', records: [],
        });
        if (!terminalAlreadyWritten) {
          expect(harness.calls.filter((call) => call.name === 'local.set').map(
            (call) => call.value,
          )).toContainEqual({
            'challansakshi.safety-ledger.v1': {
              schema: 'challansakshi.safety-ledger/v1', records: [terminal],
            },
          });
        }
      }
    },
  );

  it.each(['without', 'with'] as const)(
    'reconciles an expired arming crash %s its local marker before pruning',
    async (marker) => {
      const harness = makeChromeHarness();
      const staged = stagedState();
      const arming = {
        schema: SESSION_STATE_SCHEMA,
        state: 'arming' as const,
        generation: staged.generation,
        envelope,
        importedAtMs: staged.importedAtMs,
        effectiveExpiresAtMs: staged.effectiveExpiresAtMs,
        sourceTabId: staged.sourceTabId,
        sourceDocumentId: staged.sourceDocumentId,
        destination: staged.destination,
        armNonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        attemptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        replayUntil: staged.effectiveExpiresAtMs,
        attemptNotAfterMs: Date.UTC(2026, 8, 3, 8, 1, 30),
      };
      harness.setSession(arming);
      if (marker === 'with') harness.setLocal(liveLedger(consumingState()));
      vi.setSystemTime(arming.replayUntil);

      await loadWorker(harness);

      expect(harness.session()).toBeUndefined();
      expect(harness.local()).toEqual({
        schema: 'challansakshi.safety-ledger/v1', records: [],
      });
      expect(harness.calls.filter((call) => call.name === 'local.set').map(
        (call) => call.value,
      )).toContainEqual({
        'challansakshi.safety-ledger.v1': {
          schema: 'challansakshi.safety-ledger/v1',
          records: [{
            state: 'replay',
            packId: envelope.packId,
            replayUntil: arming.replayUntil,
            outcome: 'cancelled-before-dispatch',
          }],
        },
      });
    },
  );

  it('cancels before dispatch when the watchdog cannot be established', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.failNext('alarms.create:attempt-watchdog');
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted());
    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    expect(response).toMatchObject({ state: 'rejected', code: 'operation-failed' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(2);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('removes a staged payload if its required expiry alarm cannot be established', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.scriptResults.push(sourceAccepted());
    const preview = await sendMessage(harness, buildPreviewCurrentPageRequest(17));
    harness.failNext('alarms.create:session-expiry');
    harness.scriptResults.push(sourceAccepted());
    const response = await sendMessage(harness, buildLoadReviewedFieldsRequest(
      17,
      preview.sourcePreviewBinding,
    ));
    expect(response).toMatchObject({ state: 'rejected', code: 'operation-failed' });
    expect(harness.session()).toBeUndefined();
  });

  it('does not hide a confirmed complete terminal when ledger-cleanup scheduling fails', async () => {
    const harness = makeChromeHarness();
    harness.failNext('alarms.create:ledger-cleanup');
    const response = await beginFill(
      harness,
      fillComplete('02020202020202020202020202020202'),
    );
    expect(response).toMatchObject({ state: 'success' });
    expect(harness.local()).toMatchObject({ records: [{ state: 'replay', outcome: 'complete' }] });
  });

  it('settles a last-moment action-tab change as cancellation and dispatches no fill', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.queueActiveTabIds(29, 41);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.scriptResults.push(sourceAccepted(), destinationReady(), sourceAccepted());
    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    expect(response).toMatchObject({ state: 'rejected', code: 'action-tab-mismatch' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(3);
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('cancels before dispatch if the final source recheck changes the effective expiry', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    const changedEnvelope = {
      ...envelope,
      expiresAt: '2026-09-03T08:09:00.000Z',
    };
    harness.scriptResults.push(
      sourceAccepted(),
      destinationReady(),
      [{
        frameId: 0,
        documentId: 'source-document-A',
        result: { status: 'accepted', envelope: changedEnvelope },
      }],
    );
    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    expect(response).toMatchObject({ state: 'rejected', code: 'source-binding-changed' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(3);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('prunes a cancellation replay that expires while canonical scheduling is delayed', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishScheduling!: () => void;
    const scheduling = new Promise<void>((resolve) => { finishScheduling = resolve; });
    harness.queueAlarmCreateDelays('ledger-cleanup', scheduling);
    const changedEnvelope = {
      ...envelope,
      expiresAt: '2026-09-03T08:09:00.000Z',
    };
    harness.scriptResults.push(
      sourceAccepted(),
      destinationReady(),
      [{
        frameId: 0,
        documentId: 'source-document-A',
        result: { status: 'accepted', envelope: changedEnvelope },
      }],
    );
    const response = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => harness.calls.some(
      (call) => call.name === 'alarms.create:ledger-cleanup',
    ));
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishScheduling();

    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'source-binding-changed',
    });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('reports storage unavailable when expired cancellation pruning cannot be confirmed', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.failOnFutureOccurrence('local.set', 3);
    let finishProbe!: (value: unknown) => void;
    const deferredProbe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(sourceAccepted(), destinationReady(), deferredProbe);
    const response = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 3
    ));
    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishProbe(sourceAccepted());

    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'storage-unavailable',
    });
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('cancels before dispatch as expired if the binding elapses during the final source recheck', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const deferredProbe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(sourceAccepted(), destinationReady(), deferredProbe);
    const responsePromise = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 3
    ));

    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    finishProbe(sourceAccepted());

    expect(await responsePromise).toMatchObject({ state: 'expired' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(3);
    expect(harness.session()).toBeUndefined();
    expect(harness.calls.filter((call) => call.name === 'local.set').map(
      (call) => call.value,
    )).toContainEqual({
      'challansakshi.safety-ledger.v1': {
        schema: 'challansakshi.safety-ledger/v1',
        records: [{
          state: 'replay',
          packId: envelope.packId,
          replayUntil: stagedState().effectiveExpiresAtMs,
          outcome: 'cancelled-before-dispatch',
        }],
      },
    });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('cancels before dispatch as expired if the operation deadline elapses during the final source recheck', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const deferredProbe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(sourceAccepted(), destinationReady(), deferredProbe);
    const responsePromise = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 3
    ));

    const consuming = harness.session() as { attemptNotAfterMs: number };
    vi.setSystemTime(consuming.attemptNotAfterMs);
    finishProbe([{
      frameId: 0,
      documentId: 'source-document-A',
      result: { status: 'rejected', code: 'deadline-reached' },
    }]);

    expect(await responsePromise).toMatchObject({ state: 'expired' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(3);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('gives elapsed-operation expiry precedence over a changed final source binding', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const deferredProbe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(sourceAccepted(), destinationReady(), deferredProbe);
    const responsePromise = sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    await settleUntil(() => (
      harness.calls.filter((call) => call.name === 'scripting.executeScript').length === 3
    ));

    const consuming = harness.session() as { attemptNotAfterMs: number };
    vi.setSystemTime(consuming.attemptNotAfterMs);
    finishProbe([{
      frameId: 0,
      documentId: 'source-document-A',
      result: {
        status: 'accepted',
        envelope: { ...envelope, expiresAt: '2026-09-03T08:09:00.000Z' },
      },
    }]);

    expect(await responsePromise).toMatchObject({ state: 'expired' });
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(3);
    expect(harness.session()).toBeUndefined();
    expect(harness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it('keeps unresolved state pinned at watchdog time and exposes persisted warnings without a code', async () => {
    const unresolvedHarness = makeChromeHarness();
    const consuming = consumingState();
    unresolvedHarness.setSession(consuming);
    unresolvedHarness.setLocal(liveLedger(consuming));
    await loadWorker(unresolvedHarness);
    vi.setSystemTime(consuming.attemptNotAfterMs + 1);
    unresolvedHarness.events.onAlarm.listeners[0]?.({ name: 'attempt-watchdog' });
    await settleMicrotasks();
    expect(unresolvedHarness.session()).toEqual(consuming);
    expect(unresolvedHarness.local()).toEqual(liveLedger(consuming));

    const warningHarness = makeChromeHarness();
    warningHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'needs-review', packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        warningExpiresAt: Date.UTC(2026, 8, 4, 8, 1),
      }],
    });
    await loadWorker(warningHarness);
    const warning = await sendMessage(warningHarness, buildPreviewCurrentPageRequest(17));
    expect(warning).toMatchObject({ state: 'needs-review', warning: { state: 'needs-review' } });
    expect(Object.hasOwn(warning, 'code')).toBe(false);
    expect(warningHarness.calls.some((call) => call.name === 'tabs.query')).toBe(false);
  });

  it('does not return a warning that expires while ledger cleanup scheduling is delayed', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    const warningExpiresAt = Date.UTC(2026, 8, 3, 8, 1, 1);
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'needs-review',
        packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 1, 0, 500),
        warningExpiresAt,
      }],
    });
    harness.calls.length = 0;
    let finishScheduling!: () => void;
    const scheduling = new Promise<void>((resolve) => { finishScheduling = resolve; });
    harness.queueAlarmCreateDelays('ledger-cleanup', scheduling);
    harness.scriptResults.push(sourceAccepted());
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(17));
    await settleUntil(() => harness.calls.some(
      (call) => call.name === 'alarms.create:ledger-cleanup',
    ));

    vi.setSystemTime(warningExpiresAt);
    finishScheduling();

    expect(await response).toMatchObject({ state: 'source-preview' });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('does not replay-block a source preview after the same-pack replay expires during its probe', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    const replayUntil = Date.UTC(2026, 8, 3, 8, 1, 1);
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{ state: 'replay', packId: envelope.packId, replayUntil, outcome: 'complete' }],
    });
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const probe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(probe);
    const response = sendMessage(harness, buildPreviewCurrentPageRequest(17));
    await settleUntil(() => harness.calls.some((call) => call.name === 'scripting.executeScript'));

    vi.setSystemTime(replayUntil);
    finishProbe(sourceAccepted());

    expect(await response).toMatchObject({ state: 'source-preview' });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('does not replay-block Load after the same-pack replay expires during its re-probe', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    harness.scriptResults.push(sourceAccepted());
    const preview = await sendMessage(harness, buildPreviewCurrentPageRequest(17));
    const replayUntil = Date.UTC(2026, 8, 3, 8, 1, 1);
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{ state: 'replay', packId: envelope.packId, replayUntil, outcome: 'complete' }],
    });
    harness.calls.length = 0;
    let finishProbe!: (value: unknown) => void;
    const probe = new Promise<unknown>((resolve) => { finishProbe = resolve; });
    harness.scriptResults.push(probe);
    const response = sendMessage(harness, buildLoadReviewedFieldsRequest(
      17,
      preview.sourcePreviewBinding,
    ));
    await settleUntil(() => harness.calls.some((call) => call.name === 'scripting.executeScript'));

    vi.setSystemTime(replayUntil);
    finishProbe(sourceAccepted());

    expect(await response).toMatchObject({ state: 'staged', packId: envelope.packId });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('does not return a just-created warning after it expires during final scheduling', async () => {
    const harness = makeChromeHarness();
    let finishScheduling!: () => void;
    const scheduling = new Promise<void>((resolve) => { finishScheduling = resolve; });
    harness.queueAlarmCreateDelays('ledger-cleanup', scheduling);
    const response = beginFill(
      harness,
      fillResult('02020202020202020202020202020202', 'partial'),
    );
    await settleUntil(() => harness.calls.some(
      (call) => call.name === 'alarms.create:ledger-cleanup',
    ));
    vi.setSystemTime(Date.UTC(2026, 8, 4, 8, 1));
    finishScheduling();

    expect(await response).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'fill-empty-reviewed-fields',
      state: 'rejected',
      code: 'operation-failed',
    });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('allows reset of quarantined local state only with independently absent session', async () => {
    const harness = makeChromeHarness();
    harness.setLocal({ schema: 'unknown', records: [] });
    await loadWorker(harness);
    expect(await sendMessage(harness, buildResetForDeviceOwnerRequest({
      schema: DEVICE_OWNER_RESET_ATTESTATION_SCHEMA,
      type: 'reset-for-device-owner',
      allRelevantOfficialTabsAndBrowserProcessesClosed: true,
    }))).toMatchObject({ state: 'empty' });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('rejects stale fill and clear tuples before any page access or mutation', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    expect(await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29,
      'ffffffffffffffffffffffffffffffff',
      envelope.packId,
      stagedState().effectiveExpiresAtMs,
    ))).toMatchObject({ state: 'rejected', code: 'stale-session' });
    expect(await sendMessage(harness, buildClearStagedFieldsRequest(
      stagedState().generation,
      envelope.packId,
      stagedState().effectiveExpiresAtMs - 1,
    ))).toMatchObject({ state: 'rejected', code: 'stale-session' });
    expect(harness.calls.some((call) => call.name === 'tabs.query')).toBe(false);
    expect(harness.calls.some((call) => call.name === 'scripting.executeScript')).toBe(false);
    expect(harness.session()).toEqual(stagedState());
  });

  it('physically removes expired staged payload on the next command and reports expired', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    await loadWorker(harness);
    vi.setSystemTime(stagedState().effectiveExpiresAtMs);
    expect(await sendMessage(harness, buildClearStagedFieldsRequest(
      stagedState().generation,
      envelope.packId,
      stagedState().effectiveExpiresAtMs,
    ))).toEqual({
      schema: WORKER_RESPONSE_SCHEMA,
      command: 'clear-staged-fields',
      state: 'expired',
    });
    expect(harness.session()).toBeUndefined();
  });

  it('blocks source preview replay and capacity before returning any reviewed value DTO', async () => {
    const replayHarness = makeChromeHarness();
    replayHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'replay', packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10), outcome: 'complete',
      }],
    });
    await loadWorker(replayHarness);
    replayHarness.scriptResults.push(sourceAccepted());
    expect(await sendMessage(replayHarness, buildPreviewCurrentPageRequest(17)))
      .toMatchObject({ state: 'rejected', code: 'replay-blocked' });

    const capacityHarness = makeChromeHarness();
    capacityHarness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: Array.from({ length: 32 }, (_, index) => ({
        state: 'replay',
        packId: index.toString(16).padStart(32, '0'),
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        outcome: 'complete',
      })),
    });
    await loadWorker(capacityHarness);
    capacityHarness.scriptResults.push(sourceAccepted());
    expect(await sendMessage(capacityHarness, buildPreviewCurrentPageRequest(17)))
      .toMatchObject({ state: 'rejected', code: 'ledger-capacity-reached' });
  });

  it('fails closed without dispatch when arming session or local marker persistence fails', async () => {
    const sessionHarness = makeChromeHarness();
    sessionHarness.setSession(stagedState());
    sessionHarness.setActiveTabId(29);
    await loadWorker(sessionHarness);
    sessionHarness.calls.length = 0;
    sessionHarness.failNext('session.set');
    sessionHarness.scriptResults.push(sourceAccepted(), destinationReady());
    expect(await sendMessage(sessionHarness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ))).toMatchObject({ state: 'rejected', code: 'storage-unavailable' });
    expect(sessionHarness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(2);

    const localHarness = makeChromeHarness();
    localHarness.setSession(stagedState());
    localHarness.setActiveTabId(29);
    await loadWorker(localHarness);
    localHarness.calls.length = 0;
    localHarness.failNext('local.set');
    localHarness.scriptResults.push(sourceAccepted(), destinationReady());
    expect(await sendMessage(localHarness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ))).toMatchObject({ state: 'rejected', code: 'operation-failed' });
    expect(localHarness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(2);
    expect(localHarness.session()).toBeUndefined();
    expect(localHarness.local()).toMatchObject({
      records: [{ state: 'replay', outcome: 'cancelled-before-dispatch' }],
    });
  });

  it.each([
    ['settling session write', 'session.set', 3],
    ['terminal local write', 'local.set', 2],
    ['terminal session removal', 'session.remove', 1],
  ] as const)('retains conservative recovery state on %s failure', async (
    _label,
    operation,
    occurrence,
  ) => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setActiveTabId(29);
    await loadWorker(harness);
    harness.calls.length = 0;
    harness.failOnFutureOccurrence(operation, occurrence);
    harness.scriptResults.push(
      sourceAccepted(), destinationReady(), sourceAccepted(),
      fillComplete('02020202020202020202020202020202'),
    );
    const response = await sendMessage(harness, buildFillEmptyReviewedFieldsRequest(
      29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
    ));
    expect(['unresolved-live', 'rejected']).toContain(response.state);
    expect(harness.calls.filter((call) => call.name === 'scripting.executeScript')).toHaveLength(4);
    expect(JSON.stringify(harness.local())).not.toContain(envelope.description);
    expect(JSON.stringify(harness.session())).not.toContain(envelope.description);
  });

  it('prunes an expired warning without inventing inspection and rejects stale acknowledgement', async () => {
    const harness = makeChromeHarness();
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'needs-review', packId: envelope.packId,
        replayUntil: Date.UTC(2026, 8, 3, 8, 10),
        warningExpiresAt: Date.UTC(2026, 8, 4, 8, 1),
      }],
    });
    vi.setSystemTime(Date.UTC(2026, 8, 4, 8, 1));
    await loadWorker(harness);
    expect(await sendMessage(harness, buildAcknowledgeAffectedPersonInspectionRequest(
      envelope.packId,
      Date.UTC(2026, 8, 3, 8, 10),
      Date.UTC(2026, 8, 4, 8, 1),
    ))).toMatchObject({ state: 'rejected', code: 'acknowledgement-not-available' });
    expect(harness.local()).toEqual({
      schema: 'challansakshi.safety-ledger/v1', records: [],
    });
  });

  it('uses only exact one-shot alarm names and exact when-only payloads', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.setLocal({
      schema: 'challansakshi.safety-ledger/v1',
      records: [{
        state: 'replay', packId: 'ffffffffffffffffffffffffffffffff',
        replayUntil: Date.UTC(2026, 8, 3, 8, 9), outcome: 'complete',
      }],
    });
    await loadWorker(harness);
    const alarmCalls = harness.calls.filter((call) => call.name.startsWith('alarms.'));
    expect(new Set(alarmCalls.map((call) => call.name.replace(/^alarms\.(?:clear|create):/, ''))))
      .toEqual(new Set(['session-expiry', 'ledger-cleanup', 'attempt-watchdog']));
    for (const call of alarmCalls.filter((item) => item.name.startsWith('alarms.create:'))) {
      expect(Object.keys(call.value as object)).toEqual(['when']);
      expect(Number.isSafeInteger((call.value as { when: number }).when)).toBe(true);
    }
  });

  it('never clears an existing canonical alarm before a best-effort reconciliation refresh', async () => {
    const harness = makeChromeHarness();
    harness.setSession(stagedState());
    harness.failNext('alarms.create:session-expiry');
    await loadWorker(harness);
    expect(harness.session()).toEqual(stagedState());
    expect(harness.calls.some((call) => call.name === 'alarms.create:session-expiry')).toBe(true);
    expect(harness.calls.some((call) => call.name === 'alarms.clear:session-expiry')).toBe(false);
  });

  it('checks local replay and route status before lower-precedence command failures', async () => {
    const buildPreview = vi.fn(() => Object.freeze({ status: 'unsupported' as const }));
    vi.doMock('../src/destination-adapters', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/destination-adapters')>();
      return { ...actual, buildDestinationPreviewPlan: buildPreview };
    });
    try {
      const replayHarness = makeChromeHarness();
      replayHarness.setLocal({
        schema: 'challansakshi.safety-ledger/v1',
        records: [{
          state: 'replay', packId: envelope.packId,
          replayUntil: Date.UTC(2026, 8, 3, 8, 10), outcome: 'complete',
        }],
      });
      await loadWorker(replayHarness);
      replayHarness.scriptResults.push(sourceAccepted());
      expect(await sendMessage(replayHarness, buildPreviewCurrentPageRequest(17)))
        .toMatchObject({ state: 'rejected', code: 'replay-blocked' });
      expect(buildPreview).not.toHaveBeenCalled();

      const fillHarness = makeChromeHarness();
      fillHarness.setSession(stagedState(null));
      await loadWorker(fillHarness);
      fillHarness.calls.length = 0;
      expect(await sendMessage(fillHarness, buildFillEmptyReviewedFieldsRequest(
        29, stagedState().generation, envelope.packId, stagedState().effectiveExpiresAtMs,
      ))).toMatchObject({ state: 'unsupported' });
      expect(buildPreview).toHaveBeenCalledTimes(1);
      expect(fillHarness.calls.some((call) => call.name === 'tabs.query')).toBe(false);
    } finally {
      vi.doUnmock('../src/destination-adapters');
      vi.resetModules();
    }
  });

  it('keeps callback messaging single-shot even when the response channel throws', async () => {
    const harness = makeChromeHarness();
    await loadWorker(harness);
    let sends = 0;
    expect(() => harness.events.onMessage.listeners[0]?.(
      { schema: WORKER_REQUEST_SCHEMA, command: 'preview-current-page', actionTabId: 17, extra: true },
      popupSender,
      () => {
        sends += 1;
        throw new Error('popup closed');
      },
    )).not.toThrow();
    await settleMicrotasks();
    expect(sends).toBe(1);
  });
});
