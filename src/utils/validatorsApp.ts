import { type, string, number, nullable, array, Infer } from 'superstruct';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://www.validators.app/api/v1/validators'

// TODO: Add tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEST_DATA = `[{
  "network":"testnet",
  "account":"123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY",
  "name":"Example Name",
  "keybase_id":null,
  "www_url":"https://www.example.com",
  "details":"Example validator located anywhere.",
  "created_at":"2020-05-24T19:07:38.222Z",
  "updated_at":"2020-05-24T19:07:38.222Z",
  "total_score":10,
  "root_distance_score:2,
  "vote_distance_score":2,
  "skipped_slot_score":2,
  "software_version":"1.2.3 devbuild",
  "software_version_score":2,
  "stake_concentration_score":0,
  "data_center_concentration_score":0,
  "published_information_score":0,
  "security_report_score":0,
  "active_stake":100000,
  "commission":10,
  "delinquent":false,
  "data_center_key":"24940-FI-Helsinki",
  "data_center_host":"host-name",
  "autonomous_system_number":24940,
  "vote_account":"123JiW1rwJ4JM5BxYqFkBi6wQJ52pt6qUH88JDqrtU9i",
  "skipped_slots":664,
  "skipped_slot_percent":"0.5155",
  "ping_time":"205.703",
  "url":"https://www.validators.app/api/v1/validators/testnet/123vij84ecQEKUvQ7gYMKxKwKF6PbYSzCzzURYA4xULY.json"
}]`;

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
  const response = await fetch(`${BASE_URL}/${cluster}.json?order=score`, {
    headers: {
      'Token': 'XTrLiy8bhfpJcwD73JMWtsAg'
    }
  }); // `${BASE_URL}/${cluster}.json?order=score`); validatorsapp_validators.json
  const data = await response.json();
  const validatorList = ValidatorList.create(data);
  return validatorList;
}