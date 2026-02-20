import type {
  AppLocale,
  DisplayCurrency,
} from '../common/i18n/locale';

declare module 'express-serve-static-core' {
  interface Request {
    locale: AppLocale;
    displayCurrency: DisplayCurrency;
  }
}
