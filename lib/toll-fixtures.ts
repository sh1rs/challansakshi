import type { TollReviewAnswers } from './toll-domain';

export interface TollFixture {
  id: 'different-vehicle' | 'duplicate' | 'aligned';
  label: string;
  description: string;
  refs: { issuerLabel: string; tagSuffix: string; vehicleSuffix: string; transactionSuffix: string; amount: string; plaza: string; eventDateTime: string; secondEventDateTime: string };
  answers: TollReviewAnswers;
}

const base: TollReviewAnswers = {
  concern: 'unrecognised', sourceVerified: true, timestampType: 'reader-read', plazaScope: 'national-highway',
  passingImageStatus: 'readable', passingPlateObservation: 'different', vehicleClassObservation: 'different',
  secondDebitPresent: false, samePlaza: false, closeInTime: false, creditAdjustment: 'not-checked',
  alternateReceipt: 'not-applicable', tariffOrPassRecord: 'not-applicable', acknowledgement: 'not-supplied',
  plazaRecorded: true, directionKnown: true, secondTimestampRecorded: false, vehicleSuffixRecorded: true,
  recordedIntervalMinutes: null,
  officialSourceSelected: true, tagSuffixRecorded: true, transactionSuffixRecorded: true, eventTimestampRecorded: true, amountRecorded: true,
  tagMappingVerified: true, alternateReceiptEventMatch: false, tariffOrPassConflictConfirmed: false, reconciliationConfirmed: true,
};

export const tollFixtures: TollFixture[] = [
  {
    id: 'different-vehicle', label: 'Different vehicle', description: 'Linked vehicle: blue hatchback. Passing image: white SUV.',
    refs: { issuerLabel: 'Demo Bank', tagSuffix: '4721', vehicleSuffix: '2248', transactionSuffix: '8034', amount: '135', plaza: 'Sakshi Toll Plaza (fictional)', eventDateTime: '2026-08-25T09:14', secondEventDateTime: '' },
    answers: { ...base },
  },
  {
    id: 'duplicate', label: 'Possible duplicate', description: 'Two same-plaza debits; no credit in the checked period.',
    refs: { issuerLabel: 'Demo Bank', tagSuffix: '6190', vehicleSuffix: '9072', transactionSuffix: '1811', amount: '190', plaza: 'Nayi Disha Plaza (fictional)', eventDateTime: '2026-08-24T18:05', secondEventDateTime: '2026-08-24T18:11' },
    answers: { ...base, concern: 'duplicate', passingImageStatus: 'not-supplied', passingPlateObservation: 'not-supplied', vehicleClassObservation: 'not-supplied', secondDebitPresent: true, samePlaza: true, closeInTime: true, creditAdjustment: 'not-visible-in-checked-period', secondTimestampRecorded: true, recordedIntervalMinutes: 6 },
  },
  {
    id: 'aligned', label: 'Records align', description: 'Tag, image, class, reader time, and debit agree.',
    refs: { issuerLabel: 'Demo Bank', tagSuffix: '3552', vehicleSuffix: '6413', transactionSuffix: '2269', amount: '110', plaza: 'Seva Setu Plaza (fictional)', eventDateTime: '2026-08-23T07:42', secondEventDateTime: '' },
    answers: { ...base, concern: 'record-check', passingPlateObservation: 'match', vehicleClassObservation: 'match' },
  },
];
