import css from "./RoomView.module.scss";
import cx from "classnames";
import React from "react";

type User = {
  name: string;
  vote: number | undefined | null;
  hasVoted: boolean;
};

export type RoomInfo = {
  roomName: string;
  users: User[];
  lockedVoting: boolean;
  cardsCovered: boolean;
};

type PropsType = {
  roomInfo: RoomInfo;
  handleVote: (vote: number) => void;
  handleUncoverCards: () => void;
  handleResetVoting: () => void;
};

const VOTING_OPTIONS = [0, 1, 2, 3, 5, 8, 13];

export const RoomView = ({
  roomInfo,
  handleVote,
  handleUncoverCards,
  handleResetVoting,
}: PropsType) => {
  const [userVote, setUserVote] = React.useState<number>();
  const [timeCounter, setTimeCounter] = React.useState<number>(3);

  const handleVoteClick = React.useCallback(
    (vote: number) => {
      handleVote(vote);
      setUserVote(vote);
    },
    [handleVote]
  );

  React.useEffect(() => {
    if (!roomInfo.cardsCovered) {
      setUserVote(undefined);
      setTimeCounter(3);
    }
  }, [roomInfo.cardsCovered]);

  React.useEffect(() => {
    if (roomInfo.lockedVoting && roomInfo.cardsCovered) {
      const interval = setInterval(
        () => setTimeCounter((time) => time - 1),
        1000
      );

      return () => {
        clearInterval(interval);
      };
    }
  }, [roomInfo.lockedVoting, roomInfo.cardsCovered]);

  const everyoneVoted = !roomInfo.users.find((user) => !user.hasVoted);

  const showCounter = roomInfo.lockedVoting && roomInfo.cardsCovered;

  const averageVote =
    roomInfo.users.reduce((prev, curr) => prev + (curr.vote || 0), 0) /
    roomInfo.users.length;

  return (
    <div>
      <h1>Room name: {roomInfo.roomName}</h1>
      <p>Connected users:</p>
      {roomInfo.users.map((user, index) => (
        <p
          className={cx({
            [css.userVoted]: user.hasVoted,
          })}
          key={`${user}_${index}`}
        >
          {user.name} {user.vote && <strong>{user.vote}</strong>}
        </p>
      ))}
      {everyoneVoted && roomInfo.cardsCovered && !roomInfo.lockedVoting && (
        <button onClick={handleUncoverCards}>Uncover cards</button>
      )}
      {!roomInfo.cardsCovered && (
        <button onClick={handleResetVoting}>Reset voting</button>
      )}
      {!roomInfo.lockedVoting && (
        <div>
          Vote:
          {VOTING_OPTIONS.map((option) => (
            <button
              className={cx(css.voteOption, {
                [css.selected]: userVote === option,
              })}
              onClick={() => handleVoteClick(option)}
              key={option}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {showCounter && <h1 className={css.timeCounter}>{timeCounter}</h1>}
      {!roomInfo.cardsCovered && <h2>Average vote: {averageVote.toFixed(2)}</h2>}
    </div>
  );
};
