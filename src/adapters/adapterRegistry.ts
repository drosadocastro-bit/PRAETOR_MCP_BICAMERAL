import type { DatasetAdapter } from './DatasetAdapter.js';
import { SyntheticDatasetAdapter } from './SyntheticDatasetAdapter.js';
import { PraetorError } from '../errors.js';

const syntheticAdapter = new SyntheticDatasetAdapter();

export function getActiveDatasetAdapter(): DatasetAdapter {
  const requested = process.env.PRAETOR_DATASET_ADAPTER?.trim().toLowerCase() ?? 'synthetic';
  if (requested === 'synthetic') {
    return syntheticAdapter;
  }
  if (requested === 'external') {
    throw new PraetorError('unavailable_adapter', 'The external dataset adapter is not implemented.');
  }
  throw new PraetorError('unavailable_adapter', 'The requested dataset adapter is unavailable.');
}
