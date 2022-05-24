import css from "./RoomView.module.scss";
import styles from "../../App.module.scss";
import cx from "classnames";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleArrowLeft } from "@fortawesome/free-solid-svg-icons";

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
  handleVote: (vote: number | undefined) => void;
  handleUncoverCards: () => void;
  handleResetVoting: () => void;
  handleBackClick: () => void;
};

const VOTING_OPTIONS = [0, 1, 2, 3, 5, 8, 13];

const getCardPosition = (
  index: number,
  maxCards: number,
  tableRect: DOMRect
) => {
  const offset = Math.PI / 2;

  const fraction = index / maxCards;

  const angle = 360 * fraction;
  const radians = (angle * Math.PI) / 180 + offset;

  const x = (Math.sin(radians) * tableRect.width) / 2 + tableRect.width / 2;
  const y = (-Math.cos(radians) * tableRect.height) / 2 + tableRect.height / 2;

  return { x, y };
};

export const RoomView = ({
  roomInfo,
  handleVote,
  handleUncoverCards,
  handleResetVoting,
  handleBackClick,
}: PropsType) => {
  const [userVote, setUserVote] = React.useState<number>();
  const [timeCounter, setTimeCounter] = React.useState<number>(3);

  const [tableRef, setTableRef] = React.useState<HTMLDivElement | null>();

  const handleVoteClick = React.useCallback(
    (vote: number) => {
      if (vote !== userVote) {
        handleVote(vote);
        setUserVote(vote);
        return;
      }
      handleVote(undefined);
      setUserVote(undefined);
    },
    [handleVote, userVote]
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

  const tableRect = React.useMemo(
    () => tableRef?.getBoundingClientRect(),
    [tableRef]
  );

  return (
    <div className={css.roomView}>
      <h2 className={css.averageScore}>
        {!roomInfo.cardsCovered && <>Average vote: <strong>{averageVote.toFixed(2)}</strong></>}
      </h2>

      <div className={css.table} ref={(newRef) => setTableRef(newRef)}>
        {showCounter && <div className={css.timeCounter}>{timeCounter}</div>}
        {everyoneVoted && roomInfo.cardsCovered && !roomInfo.lockedVoting && (
          <button className={css.button} onClick={handleUncoverCards}>
            Uncover cards
          </button>
        )}
        {!roomInfo.cardsCovered && (
          <button className={css.button} onClick={handleResetVoting}>
            Reset voting
          </button>
        )}

        {tableRect &&
          roomInfo.users.map((user, index) => {
            const pos = getCardPosition(
              index,
              roomInfo.users.length,
              tableRect
            );

            return (
              <div
                className={cx(css.card, {
                  [css.userVoted]: user.hasVoted,
                  [css.cardTurned]: !roomInfo.cardsCovered,
                })}
                key={`${user}_${index}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
              >
                {user.name} {user.vote && <strong>{user.vote}</strong>}
              </div>
            );
          })}
      </div>
      <FontAwesomeIcon onClick={handleBackClick} className={styles.backButton} icon={faCircleArrowLeft} />
      {/* 
      <h1>Room name: {roomInfo.roomName}</h1>      
      */}
      {!roomInfo.lockedVoting && (
        <div className={css.votingOptions}>
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
    </div>
  );
};
