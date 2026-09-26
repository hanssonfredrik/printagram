import { common, errors } from './common';
import { landing } from './landing';
import { choose } from './choose';
import { connect } from './connect';
import { exportFlow } from './exportFlow';
import { select } from './select';
import { preview } from './preview';
import { checkout } from './checkout';
import { done } from './done';
import { books } from './books';
import { auth } from './auth';
import { share } from './share';

/** English is the source of truth: Swedish must have exactly the same shape (checked by tsc). */
export const en = {
  common,
  errors,
  landing,
  choose,
  connect,
  exportFlow,
  select,
  preview,
  checkout,
  done,
  books,
  auth,
  share,
};

export type Messages = typeof en;
