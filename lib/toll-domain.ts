export type TollConcern = 'unrecognised' | 'duplicate' | 'paid-another-way' | 'fare-or-class' | 'pass-or-discount' | 'tag-lifecycle' | 'plaza-incident' | 'record-check' | 'not-sure';
export type TollRecordStatus = 'readable' | 'unclear' | 'not-supplied' | 'not-applicable' | 'official-verification';
export type TollAssessmentKind =
  | 'unrecognised-issuer-route'
  | 'possible-vehicle-mismatch'
  | 'possible-duplicate-pattern'
  | 'possible-alternate-payment-conflict'
  | 'possible-fare-or-pass-conflict'
  | 'already-corrected'
  | 'records-align'
  | 'insufficient';
export type TollRoute = 'issuer' | 'issuer-and-1033' | '1033' | 'no-dispute' | 'verify-records';

export interface TollReviewAnswers {
  concern: TollConcern;
  sourceVerified: boolean;
  timestampType: 'reader-read' | 'debit-posted' | 'sms-received' | 'unknown';
  plazaScope: 'national-highway' | 'state-city-private' | 'unknown';
  passingImageStatus: TollRecordStatus;
  passingPlateObservation: 'match' | 'different' | 'unclear' | 'not-supplied';
  vehicleClassObservation: 'match' | 'different' | 'unclear' | 'not-supplied';
  secondDebitPresent: boolean;
  samePlaza: boolean;
  closeInTime: boolean;
  creditAdjustment: 'visible' | 'not-visible-in-checked-period' | 'not-checked';
  alternateReceipt: TollRecordStatus;
  tariffOrPassRecord: TollRecordStatus;
  acknowledgement: TollRecordStatus;
  plazaRecorded: boolean;
  directionKnown: boolean;
  secondTimestampRecorded: boolean;
  vehicleSuffixRecorded: boolean;
  recordedIntervalMinutes: number | null;
  officialSourceSelected: boolean;
  tagSuffixRecorded: boolean;
  transactionSuffixRecorded: boolean;
  eventTimestampRecorded: boolean;
  amountRecorded: boolean;
  tagMappingVerified: boolean;
  alternateReceiptEventMatch: boolean;
  tariffOrPassConflictConfirmed: boolean;
  reconciliationConfirmed: boolean;
}

export interface TollAssessment {
  finding: TollAssessmentKind;
  route: TollRoute;
  title: string;
  reasons: string[];
  limitations: string[];
  shouldPrepareIssuerNote: boolean;
}

export interface TollPassportItem {
  id: string;
  label: string;
  status: TollRecordStatus;
  why: string;
}

const baseLimitations = [
  'Based only on your answers. TollSakshi did not inspect or authenticate any bank, issuer, plaza, vehicle, or toll record.',
  'This does not prove fraud, cloning, who drove, historical vehicle location, or entitlement to a refund.',
  'The issuer must apply the current NETC process and verify account records.',
];

/**
 * Compares two citizen-entered `datetime-local` values without applying any
 * NETC eligibility threshold. A negative result means the second entry is
 * earlier than the first; null means either value is absent or invalid.
 */
export function calculateRecordedIntervalMinutes(first: string, second: string): number | null {
  const parse = (value: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const timestamp = Date.UTC(year, month - 1, day, hour, minute);
    const date = new Date(timestamp);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
      || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute) return null;
    return timestamp;
  };
  const firstTime = parse(first);
  const secondTime = parse(second);
  if (firstTime === null || secondTime === null) return null;
  return Math.round((secondTime - firstTime) / 60_000);
}

export function assessTollReview(answers: TollReviewAnswers): TollAssessment {
  if (!answers.sourceVerified) {
    return {
      finding: 'insufficient', route: 'verify-records', title: 'Verify the transaction in the issuer’s official service first',
      reasons: ['The debit has not yet been independently checked in the issuer app, site, or statement.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: false,
    };
  }

  if (!answers.reconciliationConfirmed) {
    return {
      finding: 'insufficient', route: 'verify-records', title: 'Confirm the final same-transaction review',
      reasons: ['The final source, identifier, event, and comparison entries have not been confirmed as belonging to the same official transaction.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: false,
    };
  }

  if (answers.concern === 'plaza-incident') {
    const national = answers.plazaScope === 'national-highway';
    return {
      finding: 'insufficient', route: national ? '1033' : 'verify-records',
      title: national ? 'National Highway plaza-support route' : 'Identify the responsible plaza authority',
      reasons: [national ? 'You recorded an operational problem at a National Highway toll plaza.' : '1033 is not assumed to cover state, city, parking, or private plazas.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: false,
    };
  }

  if (answers.concern === 'duplicate') {
    if (answers.creditAdjustment === 'visible') {
      return {
        finding: 'already-corrected', route: 'no-dispute', title: 'A corresponding credit is already visible',
        reasons: ['You recorded that a credit adjustment is visible in the period you checked.'],
        limitations: [...baseLimitations, 'Confirm that the credited amount and transaction reference actually reconcile before closing the case.'],
        shouldPrepareIssuerNote: false,
      };
    }
    if (answers.secondDebitPresent && answers.samePlaza && answers.closeInTime
      && answers.creditAdjustment === 'not-visible-in-checked-period'
      && answers.timestampType === 'reader-read'
      && answers.plazaRecorded
      && answers.directionKnown
      && answers.secondTimestampRecorded
      && answers.recordedIntervalMinutes !== null
      && answers.recordedIntervalMinutes >= 0) {
      return {
        finding: 'possible-duplicate-pattern', route: 'issuer', title: 'Citizen-reported two-debit pattern — issuer review needed',
        reasons: [`You marked two issuer-recorded debits at the same plaza as related; the entered reader times are ${answers.recordedIntervalMinutes} minutes apart.`, 'You did not find a corresponding credit in the statement period you checked.'],
        limitations: [...baseLimitations, 'TollSakshi does not decide whether this interval meets the current NETC duplicate-validation rule. The issuer must apply the rule in force when it reviews the transactions.'],
        shouldPrepareIssuerNote: true,
      };
    }
    return {
      finding: 'insufficient', route: 'verify-records', title: 'More transaction context is needed',
      reasons: [answers.recordedIntervalMinutes !== null && answers.recordedIntervalMinutes < 0
        ? 'The second entered timestamp is earlier than the first. Correct the entries before asking for a two-debit review.'
        : 'The supplied answers do not yet establish two valid reader-time entries, a recorded plaza and direction, a citizen-reported related pair, and checked credit status.'], limitations: baseLimitations, shouldPrepareIssuerNote: false,
    };
  }

  if (answers.concern === 'unrecognised') {
    if (answers.passingImageStatus === 'readable' && answers.passingPlateObservation === 'different'
      && answers.vehicleSuffixRecorded && answers.tagMappingVerified) {
      return {
        finding: 'possible-vehicle-mismatch', route: 'issuer', title: 'Possible toll-vehicle mismatch',
        reasons: ['You recorded that the passing image is readable and its plate suffix differs from the FASTag-linked vehicle suffix.'],
        limitations: baseLimitations, shouldPrepareIssuerNote: true,
      };
    }
    return {
      finding: 'unrecognised-issuer-route', route: 'issuer', title: 'Unrecognised by citizen — issuer evidence route',
      reasons: [!answers.vehicleSuffixRecorded || !answers.tagMappingVerified
        ? 'A vehicle suffix verified in the official FASTag account mapping was not recorded, so the image comparison cannot be anchored.'
        : answers.passingImageStatus === 'readable' && answers.passingPlateObservation === 'match'
          ? 'You recorded a matching passing image, so this limited packet does not support a vehicle conflict; the issuer must verify the unrecognised crossing.'
          : 'You do not recognise the crossing, but the supplied answers do not contain a readable, anchored vehicle conflict.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: true,
    };
  }

  if (answers.concern === 'record-check') {
    const completeEvent = answers.officialSourceSelected && answers.tagSuffixRecorded && answers.transactionSuffixRecorded
      && answers.plazaRecorded && answers.directionKnown && answers.eventTimestampRecorded && answers.amountRecorded
      && answers.timestampType === 'reader-read' && answers.tagMappingVerified;
    if (answers.passingPlateObservation === 'match' && answers.vehicleClassObservation === 'match'
      && answers.passingImageStatus === 'readable' && answers.vehicleSuffixRecorded && completeEvent) {
      return {
        finding: 'records-align', route: 'no-dispute', title: 'The entered toll records appear consistent',
        reasons: ['You recorded that the known crossing, tag-linked vehicle, passing-image plate, and vehicle class align.'],
        limitations: [...baseLimitations, 'A matching packet does not itself establish liability or who drove.'], shouldPrepareIssuerNote: false,
      };
    }
    return {
      finding: 'insufficient', route: 'verify-records', title: answers.passingPlateObservation === 'match' && answers.vehicleClassObservation === 'match'
        ? 'Vehicle fields align; the full toll event is not reconciled'
        : 'The known crossing cannot yet be reconciled',
      reasons: ['A verified official source, tag and transaction suffixes, mapped vehicle suffix, reader time, plaza, direction, amount, readable passing image, and matching plate/class were not all recorded.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: false,
    };
  }

  if (answers.concern === 'paid-another-way') {
    const supported = answers.alternateReceipt === 'readable' && answers.alternateReceiptEventMatch
      && answers.plazaRecorded && answers.directionKnown && answers.eventTimestampRecorded && answers.amountRecorded
      && answers.timestampType === 'reader-read';
    const national = answers.plazaScope === 'national-highway';
    return {
      finding: supported ? 'possible-alternate-payment-conflict' : 'insufficient',
      route: supported ? (national ? 'issuer-and-1033' : 'issuer') : 'verify-records',
      title: supported ? 'Possible alternate-payment conflict' : 'Check the alternate-payment record',
      reasons: [supported
        ? 'You recorded a readable alternate-payment receipt and confirmed its plaza, date/time, direction, and amount match the entered toll event.'
        : answers.alternateReceipt === 'readable'
          ? 'A readable receipt was recorded, but its plaza, reader-read date/time, direction, and amount were not fully anchored to the entered event.'
          : 'A readable receipt tied to the same plaza event was not recorded.'],
      limitations: [...baseLimitations, 'The receipt still needs plaza, date, time, direction, amount, and transaction reconciliation.'], shouldPrepareIssuerNote: supported,
    };
  }

  if (answers.concern === 'fare-or-class' || answers.concern === 'pass-or-discount') {
    const record = answers.tariffOrPassRecord === 'readable' && answers.tariffOrPassConflictConfirmed
      && answers.plazaRecorded && answers.directionKnown && answers.eventTimestampRecorded && answers.amountRecorded
      && answers.timestampType === 'reader-read';
    return {
      finding: record ? 'possible-fare-or-pass-conflict' : 'insufficient', route: record ? 'issuer' : 'verify-records',
      title: record ? 'Possible fare, class, pass, or discount conflict' : 'Date-effective official record needed',
      reasons: [record ? 'You confirmed that a readable, date-effective official tariff or pass record for the entered plaza event conflicts with the debit.' : 'A readable date-effective official record, explicit conflict comparison, plaza, direction, reader-read event time, and amount were not all recorded.'],
      limitations: [...baseLimitations, 'A current tariff cannot be assumed to apply to an earlier transaction.'], shouldPrepareIssuerNote: record,
    };
  }

  if (answers.concern === 'tag-lifecycle') {
    const hasAck = answers.acknowledgement === 'readable';
    return {
      finding: 'insufficient', route: hasAck ? 'issuer' : 'verify-records',
      title: hasAck ? 'Track the acknowledged issuer request' : 'Find the issuer acknowledgement first',
      reasons: [hasAck ? 'You recorded a readable acknowledgement for a tag closure, refund, or status request.' : 'No issuer acknowledgement was recorded.'],
      limitations: baseLimitations, shouldPrepareIssuerNote: hasAck,
    };
  }

  return { finding: 'insufficient', route: 'verify-records', title: 'Choose the closest transaction concern', reasons: ['The selected answers do not support a specific evidence route yet.'], limitations: baseLimitations, shouldPrepareIssuerNote: false };
}

export function buildTollPassport(answers: TollReviewAnswers, refs: { tagSuffix: string; vehicleSuffix: string; transactionSuffix: string; plaza: string }): TollPassportItem[] {
  const entered = (value: string): TollRecordStatus => value.trim() ? 'readable' : 'not-supplied';
  return [
    { id: 'TP1', label: 'Official account transaction record', status: answers.sourceVerified && answers.officialSourceSelected ? 'readable' : 'not-supplied', why: 'Shows the debit in an independently opened official account service.' },
    { id: 'TP2', label: 'Transaction reference suffix', status: entered(refs.transactionSuffix), why: 'Distinguishes nearby debits without exposing the full reference.' },
    { id: 'TP3', label: 'Timestamp meaning', status: answers.timestampType === 'unknown' ? 'unclear' : 'readable', why: 'Keeps reader, posting, and SMS times distinct.' },
    { id: 'TP4', label: 'Plaza / direction', status: refs.plaza.trim() && answers.directionKnown ? 'readable' : refs.plaza.trim() ? 'unclear' : 'not-supplied', why: 'Anchors the toll event.' },
    { id: 'TP5', label: 'FASTag suffix', status: entered(refs.tagSuffix), why: 'Keeps the tag reference minimised.' },
    { id: 'TP6', label: 'Official tag-mapping vehicle suffix', status: answers.tagMappingVerified ? entered(refs.vehicleSuffix) : 'official-verification', why: 'Anchors the tag-to-image comparison.' },
    { id: 'TP7', label: 'Citizen-recorded vehicle-class comparison', status: answers.vehicleClassObservation === 'not-supplied' ? 'not-supplied' : answers.vehicleClassObservation === 'unclear' ? 'unclear' : 'official-verification', why: 'Records your comparison; TollSakshi inspected no vehicle or image.' },
    { id: 'TP8', label: 'Citizen front vehicle / tag photo', status: 'not-supplied', why: 'Kept privately by the citizen, not received here.' },
    { id: 'TP9', label: 'Toll passing image', status: answers.passingImageStatus, why: 'May show the vehicle, plate, and event time.' },
    { id: 'TP10', label: 'Citizen-reported second debit entry', status: answers.concern === 'duplicate' ? (answers.secondDebitPresent ? 'official-verification' : 'not-supplied') : 'not-applicable', why: 'Share the full second reference only through the official account channel.' },
    { id: 'TP11', label: 'Credit adjustment check', status: answers.concern === 'duplicate' ? (answers.creditAdjustment === 'not-checked' ? 'unclear' : 'readable') : 'not-applicable', why: 'Checks whether a credit already resolves the debit.' },
    { id: 'TP12', label: 'Alternate payment receipt', status: answers.concern === 'paid-another-way' ? answers.alternateReceipt : 'not-applicable', why: 'Supports a paid-another-way comparison.' },
    { id: 'TP13', label: 'Date-effective tariff / pass comparison', status: answers.concern === 'fare-or-class' || answers.concern === 'pass-or-discount' ? (answers.tariffOrPassConflictConfirmed ? answers.tariffOrPassRecord : 'unclear') : 'not-applicable', why: 'Must apply to this event; current rates cannot prove an earlier conflict.' },
    { id: 'TP14', label: 'Issuer acknowledgement', status: answers.acknowledgement, why: 'Supports follow-up and response tracking.' },
  ];
}

export interface TollWorksheetInput {
  issuerLabel: string;
  tagSuffix: string;
  vehicleSuffix: string;
  transactionSuffix: string;
  amount: string;
  plaza: string;
  eventDateTime: string;
  secondEventDateTime?: string;
  answers: TollReviewAnswers;
  assessment: TollAssessment;
  synthetic?: boolean;
}

export function buildTollWorksheet(input: TollWorksheetInput): string {
  if (!input.assessment.shouldPrepareIssuerNote) {
    return [
      input.synthetic ? 'SYNTHETIC FIXTURE — NOT A REAL TRANSACTION' : 'TOLLSAKSHI — FASTAG TRANSACTION SELF-REVIEW SUMMARY',
      ...(input.synthetic ? ['TOLLSAKSHI — FICTIONAL FASTAG SELF-REVIEW SUMMARY'] : []),
      'Based only on your answers. TollSakshi did not inspect or authenticate any bank, issuer, plaza, vehicle, or toll record.',
      '',
      'NO ISSUER DISPUTE NOTE PREPARED',
      'This result does not support preparing a transaction dispute note from the entered records.',
      '',
      'RULE-BASED SELF-REVIEW RESULT',
      input.assessment.title,
      ...input.assessment.reasons.map((reason) => `- ${reason}`),
      '',
      'SAFE NEXT STEP',
      '- Follow the route shown in the result, verify the current official process, and do not describe the transaction as duplicate, fraudulent, or incorrect unless the responsible official record supports that description.',
      '',
      'IMPORTANT LIMITS',
      ...input.assessment.limitations.map((item) => `- ${item}`),
    ].join('\n');
  }
  return [
    ...(input.synthetic ? ['SYNTHETIC FIXTURE — NOT A REAL TRANSACTION'] : []),
    'TOLLSAKSHI — FASTAG TRANSACTION SELF-REVIEW',
    'Based only on your answers. TollSakshi did not inspect or authenticate any bank, issuer, plaza, vehicle, or toll record.',
    '',
    'PURPOSE',
    'A local, user-controlled preparation note for contacting the verified official account provider for this FASTag. It is not a chargeback, official filing, fraud finding, or refund promise.',
    '',
    `Concern: ${input.answers.concern.replaceAll('-', ' ')}`,
    `Official account source selected: ${input.issuerLabel || '[not selected]'}`,
    `FASTag suffix: ${input.tagSuffix ? `…${input.tagSuffix}` : '[not entered]'}`,
    `Vehicle suffix: ${input.vehicleSuffix ? `…${input.vehicleSuffix}` : '[not entered]'}`,
    `Transaction reference suffix: ${input.transactionSuffix ? `…${input.transactionSuffix}` : '[not entered]'}`,
    `Amount: ${input.amount ? `INR ${input.amount}` : '[not entered]'}`,
    `Plaza: ${input.plaza || '[not entered]'}`,
    `Timestamp entered: ${input.eventDateTime || '[not entered]'}`,
    `Second timestamp entered: ${input.secondEventDateTime || '[not entered / not applicable]'}`,
    `Timestamp meaning: ${input.answers.timestampType.replaceAll('-', ' ')}`,
    '',
    'RULE-BASED SELF-REVIEW RESULT',
    input.assessment.title,
    ...input.assessment.reasons.map((reason) => `- ${reason}`),
    '',
    'NEUTRAL OFFICIAL ACCOUNT-PROVIDER REQUEST (EDIT BEFORE USE)',
    'Please review the FASTag transaction identified by the full reference I will provide only through the verified official service for this FASTag—my bank/issuer service or, for an NHAI FASTag, the IHMCL customer portal or 1033. Please confirm the reader-read time, plaza and lane/direction, linked vehicle record, passing-image evidence, amount/class basis, and any credit adjustment or reversal. If this concern involves two transactions, I will provide both full references and amounts only through that official service; please apply the current NETC duplicate-validation rule rather than relying on my description of their timing. Please provide a dated acknowledgement and reasoned response.',
    '',
    'MANUAL FOLLOW-UP LEDGER (COMPLETE OUTSIDE TOLLSAKSHI)',
    'Reported date: [ ]',
    'Official account-provider acknowledgement suffix: [LAST 4 ONLY]',
    'Statement checked through: [ ]',
    'Current status: [ ]',
    'Credit / reversal amount and date, if any: [ ]',
    'Response supplied passing image / plate / reader time / plaza / fare basis: [ ]',
    '',
    'IMPORTANT LIMITS',
    ...input.assessment.limitations.map((item) => `- ${item}`),
    '- For a bank-issued FASTag, contact the issuer through an independently verified app, website, branch, or NPCI issuer directory. For an NHAI FASTag or NHAI Prepaid Wallet, use the verified IHMCL customer portal or 1033. Do not use a contact from the debit message.',
  ].join('\n');
}
