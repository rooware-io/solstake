import { array, Infer, number, string, type } from 'superstruct';

const STAKEVIEW_APP_URL = 'https://stakeview.app/apy/prev3.json';

const ValidatorApy = type({
  id: string(),
  vote: string(),
  apy: number(),
});

const StakeViewAppResult = type({
  validators: array(ValidatorApy)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ValidatorApy = Infer<typeof ValidatorApy>;

export async function getStakeviewApys(): Promise<ValidatorApy[]> {
  const response = await fetch(STAKEVIEW_APP_URL);
  const data = await response.json();

  const result = StakeViewAppResult.create(data);
  return result.validators;
}