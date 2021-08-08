import { type, string, number, nullable, array, Infer } from 'superstruct';

let BASE_URL = 'https://www.validators.app/api/v1/validators';
if (process.env.NODE_ENV !== 'production') {
  BASE_URL = 'https://cors-anywhere.herokuapp.com/' + BASE_URL; // Do not forget to activate the endpoint
}
else {
  console.log('Use production validators app endpoint')
}

const ValidatorScore = type({
  account: string(),
  total_score: number(),
  root_distance_score: number(),
  vote_distance_score: number(),
  skipped_slot_score: number(),
  software_version: nullable(string()),
  software_version_score: number(),
  stake_concentration_score: number(),
  data_center_concentration_score: nullable(number()),
  published_information_score: number(),
  security_report_score: number(),
});
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ValidatorScore = Infer<typeof ValidatorScore>;

export const ValidatorList = array(ValidatorScore);
// eslint-disable-next-line @typescript-eslint/no-redeclare
type ValidatorList = Infer<typeof ValidatorList>;

export async function getValidatorScores(cluster: string): Promise<ValidatorList> {
  if (cluster === 'mainnet-beta') {
    cluster = 'mainnet'; // Rename cluster to validators app convention
  }

  const response = await fetch(`${BASE_URL}/${cluster}.json?order=score`, {
    headers: {
      'Token': process.env.REACT_APP_VALIDATORS_APP_TOKEN as string
    }
  });
  const data = await response.json();
  const validatorList = ValidatorList.create(data);
  return validatorList;
}