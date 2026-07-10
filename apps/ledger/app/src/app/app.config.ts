import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { provideLedgerStore } from '@nge/ledger-store';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The app ships no zone.js — every screen change-detects via signals.
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    // Root @ngrx/store first, then the Ledger feature slice + effects
    // (provideLedgerStore registers only the feature) — so LedgerFacade's Store
    // injection resolves. AppComponent fires the one-shot load().
    provideStore(),
    provideLedgerStore(),
  ],
};
