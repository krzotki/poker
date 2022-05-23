import React from "react";
import css from './ErrorPopup.module.scss';

type PropsType = {
  message: string;
};

export const ErrorPopup = ({ message }: PropsType) => {
  return <div className={css.popup}>{message}</div>;
};
