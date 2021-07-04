import { Tooltip, Typography } from "@material-ui/core";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { ValidatorScore } from '../utils/validatorsApp';

function ScoreIcon(props: {header: string, score: number}) {
    const {header, score} = props;
  
    // score between -2 and 2
    return (
      <Tooltip title={`${header} Score = ${score}`}>
        <span>
          { score >= 0 ?
            <FontAwesomeIcon icon={faCircle} className={`score-${score}`} /> :
            <FontAwesomeIcon icon={faMinusCircle} className={score === -1 ? 'text-warning' : 'text-danger'} />
          }
          {' '}
        </span>
      </Tooltip>
    );
  }

export function ValidatorScoreTray(props: {validatorScore: ValidatorScore}) {
    const { validatorScore } = props;
    return (
      <Typography>
        <ScoreIcon header="Root Distance" score={validatorScore.root_distance_score} />
        <ScoreIcon header="Vote Distance" score={validatorScore.vote_distance_score} />
        <ScoreIcon header="Skipped Slot" score={validatorScore.skipped_slot_score} />
        <ScoreIcon header="Published Info" score={validatorScore.published_information_score} />
        <ScoreIcon header="Software Version" score={validatorScore.software_version_score} />
        <ScoreIcon header="Security Report" score={validatorScore.security_report_score} />
        {validatorScore.stake_concentration_score < 0 &&
          <ScoreIcon header="Stake concentration" score={validatorScore.stake_concentration_score} />
        }
        {(validatorScore?.data_center_concentration_score && (validatorScore.data_center_concentration_score < 0)) &&
          <ScoreIcon header="Data Center Centration" score={validatorScore.data_center_concentration_score} />
        }
        ({validatorScore.total_score})
      </Typography>
    );
  }