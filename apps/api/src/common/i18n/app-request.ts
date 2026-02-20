import type { Request } from 'express';
import type { AppLocale, DisplayCurrency } from './locale';

export interface AppRequest extends Request {
  locale: AppLocale;
  displayCurrency: DisplayCurrency;
}
