import * as React from "react";

export const usePacketFactory = (ws: WebSocket | undefined) => {
  const send = React.useCallback((packet: any) => {
    ws?.send(JSON.stringify(packet));
  }, [ws])

  const sendMessage = React.useCallback((message: string) => {
    send({
      type: 'MESSAGE',
      payload: message
    });
  }, [send]);

  const setUserName = React.useCallback((username?: string) => {
    send({
      type: 'SET_USERNAME',
      payload: username
    })
  }, [send])

  const createRoom = React.useCallback((roomName?: string, password?: string) => {
    send({
      type: 'CREATE_ROOM',
      payload: {
        roomName,
        password
      }
    })
  }, [send])

  const joinRoom = React.useCallback((roomName?: string, password?: string) => {
    send({
      type: 'JOIN_ROOM',
      payload: {
        roomName,
        password
      }
    })
  }, [send])

  const setVote = React.useCallback((vote: number) => {
    send({
      type: 'SET_VOTE',
      payload: vote
    })
  }, [send])

  const uncoverCards = React.useCallback(() => {
    send({
      type: 'UNCOVER_CARDS'
    })
  }, [send])

  const resetVoting = React.useCallback(() => {
    send({
      type: 'RESET_VOTING'
    })
  }, [send])

  const quitRoom = React.useCallback(() => {
    send({
      type: 'QUIT_ROOM'
    })
  }, [send])

  return {
    sendMessage,
    setUserName,
    createRoom,
    joinRoom,
    setVote,
    uncoverCards,
    resetVoting,
    quitRoom
  }
};
