import { common, errors } from './common';
import { landing } from './landing';
import { choose } from './choose';
import { connect } from './connect';
import { google } from './google';
import { exportFlow } from './exportFlow';
import { select } from './select';
import { preview } from './preview';
import { checkout } from './checkout';
import { done } from './done';
import { books } from './books';
import { auth } from './auth';
import { share } from './share';
import { about } from './about';
import { legal } from './legal';

/** English is the source of truth: Swedish must have exactly the same shape (checked by tsc). */
export const en = {
  common,
  errors,
  landing,
  choose,
  connect,
  google,
  exportFlow,
  select,
  preview,
  checkout,
  done,
  books,
  auth,
  share,
  about,
  legal,
};

export type Messages = typeof en;
