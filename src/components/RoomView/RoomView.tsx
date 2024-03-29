import css from "./RoomView.module.scss";
import styles from "../../App.module.scss";
import sleepingStyles from "./sleepingStyles.module.scss";
import cx from "classnames";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useTableResize } from "../../hooks/useTableResize";
import { useCopiedToClipBoardInfo } from "../../hooks/useCopiedToClipboardInfo";

type User = {
  name: string;
  vote: number | undefined | null;
  hasVoted: boolean;
  isIdling: boolean;
  id: string;
};

export type RoomInfo = {
  roomName: string;
  users: User[];
  lockedVoting: boolean;
  cardsCovered: boolean;
  key: string;
  userId: string;
};

type PropsType = {
  roomInfo: RoomInfo;
  handleVote: (vote: number | undefined) => void;
  handleUncoverCards: () => void;
  handleResetVoting: () => void;
  handleBackClick: () => void;
  handleWakeUpClick: (id: string) => void;
};

const VOTING_OPTIONS = [0, 0.5, 1, 2, 3, 5, 8, 13];

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
  handleWakeUpClick,
}: PropsType) => {
  const [userVote, setUserVote] = React.useState<number>();
  const [sharedRoom, setSharedRoom] = React.useState(false);
  const [timeCounter, setTimeCounter] = React.useState<number>(3);

  const { tableRect, setTableRef } = useTableResize();

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

  const { showCopyInfo, visibleCopyInfo } = useCopiedToClipBoardInfo();

  const shareLink = `${window.location.origin}?roomKey=${roomInfo.key}`;

  const handleShareInputClick = React.useCallback(() => {
    navigator.clipboard.writeText(shareLink);
    showCopyInfo();
  }, [shareLink, showCopyInfo]);

  const everyoneVoted = !roomInfo.users.find((user) => !user.hasVoted);

  const showCounter = roomInfo.lockedVoting && roomInfo.cardsCovered;

  const averageVote =
    roomInfo.users.reduce((prev, curr) => prev + (curr.vote || 0), 0) /
    roomInfo.users.length;

  return (
    <div className={css.roomView}>
      <div className={css.shareContainer}>
        <button onClick={() => setSharedRoom(true)} className={css.shareButton}>
          Share room
        </button>
        {sharedRoom && (
          <input value={shareLink} onClick={handleShareInputClick} readOnly />
        )}
        {visibleCopyInfo && <p>Link copied to clipboard!</p>}
      </div>
      <h2 className={css.averageScore}>
        {!roomInfo.cardsCovered && (
          <>
            Average vote: <strong>{averageVote.toFixed(2)}</strong>
          </>
        )}
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
                {user.name}
                {user.isIdling && (
                  <div
                    onClick={() => {
                      if (roomInfo.userId !== user.id) {
                        handleWakeUpClick(user.id);
                      }
                    }}
                    className={cx(sleepingStyles.container, {
                      [sleepingStyles.clickable]: roomInfo.userId !== user.id,
                    })}
                  >
                    <div className={sleepingStyles.bubble}>
                      {roomInfo.userId !== user.id && (
                        <div className={sleepingStyles.description}>
                          Wake up!
                        </div>
                      )}
                      <div className={sleepingStyles.char1}>Z</div>
                      <div className={sleepingStyles.char2}>Z</div>
                      <div className={sleepingStyles.char3}>Z</div>
                      <div className={sleepingStyles.triangle}></div>
                    </div>
                  </div>
                )}
                {(user.vote || user.vote === 0) && <strong>{user.vote}</strong>}
              </div>
            );
          })}
      </div>
      <FontAwesomeIcon
        onClick={handleBackClick}
        className={styles.backButton}
        icon={faCircleArrowLeft}
      />
      {/* 
      <h1>Room name: {roomInfo.roomName}</h1>      
      */}

      <div className={css.votingOptions}>
        {!roomInfo.lockedVoting &&
          VOTING_OPTIONS.map((option) => (
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
    </div>
  );
};
